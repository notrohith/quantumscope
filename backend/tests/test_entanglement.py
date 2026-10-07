import asyncio

import httpx
import numpy as np
import pytest
from qiskit import QuantumCircuit
from qiskit.quantum_info import Pauli, Statevector

from app.api import routes
from app.main import app
from app.models.schemas import BellState, EntanglementRequest
from app.simulation.entanglement import (
    OUTCOMES,
    SimulationError,
    normalize_counts,
    prepare_bell_state,
    sample_measurements,
    simulate_entanglement,
)
from app.simulation.metrics import exact_metrics, serialize_metric, target_bell_state

def request(method, url, **kwargs):
    """Exercise the ASGI app directly without Starlette's deprecated httpx adapter."""
    async def send():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            return await client.request(method, url, **kwargs)
    return asyncio.run(send())

STATES = [
    ("phi_plus", 1, ("00", "11"), 1, -1),
    ("phi_minus", 1, ("00", "11"), -1, 1),
    ("psi_plus", -1, ("01", "10"), 1, 1),
    ("psi_minus", -1, ("01", "10"), -1, -1),
]


def test_health():
    response = request("GET", "/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok", "service": "quantumscope-backend", "simulation_engine": "qiskit-aer"
    }


@pytest.mark.parametrize("state,zz,outcomes,xx,yy", STATES)
def test_bell_endpoint(state, zz, outcomes, xx, yy):
    response = request("POST", "/simulate/entanglement", json={"state": state, "shots": 2048, "seed": 42})
    assert response.status_code == 200
    data = response.json()
    for field in ("concurrence", "fidelity", "reducedEntropy"):
        assert data[field] == pytest.approx(1, abs=1e-10)
    assert data["zzCorrelation"] == pytest.approx(zz)
    assert data["engine"] == "qiskit-aer"
    assert data["state"] == state
    assert data["bitOrder"] == "q0q1"
    assert list(data["counts"]) == list(OUTCOMES)
    assert [row["outcome"] for row in data["measurements"]] == list(OUTCOMES)
    assert sum(data["counts"].values()) == data["shots"] == 2048
    assert sum(row["probability"] for row in data["measurements"]) == pytest.approx(1)
    for row in data["measurements"]:
        outcome = row["outcome"]
        assert row["probability"] == data["counts"][outcome] / 2048
        if outcome in outcomes:
            assert row["probability"] == pytest.approx(0.5, abs=0.08)
        else:
            assert data["counts"][outcome] == 0


@pytest.mark.parametrize("state,zz,outcomes,xx,yy", STATES)
def test_phase_sensitive_state_preparation(state, zz, outcomes, xx, yy):
    vector = Statevector.from_instruction(prepare_bell_state(BellState(state)))
    assert vector.expectation_value(Pauli("XX")).real == pytest.approx(xx)
    assert vector.expectation_value(Pauli("YY")).real == pytest.approx(yy)
    assert vector.expectation_value(Pauli("ZZ")).real == pytest.approx(zz)
    # Wrong target has zero fidelity, preventing a constant or Phi+-only implementation.
    wrong = BellState.PHI_MINUS if state == "phi_plus" else BellState.PHI_PLUS
    assert exact_metrics(vector, target_bell_state(wrong))["fidelity"] == pytest.approx(0, abs=1e-12)


def test_metrics_are_computed_for_non_bell_state():
    metrics = exact_metrics(Statevector.from_label("00"), target_bell_state(BellState.PHI_PLUS))
    assert metrics["concurrence"] == pytest.approx(0)
    assert metrics["fidelity"] == pytest.approx(0.5)
    assert metrics["reduced_entropy"] == pytest.approx(0)
    assert metrics["zz_correlation"] == pytest.approx(1)


@pytest.mark.parametrize("shots", [512, 1024, 2048, 4096, 8192])
def test_shots_and_exact_metric_independence(shots):
    data = simulate_entanglement(EntanglementRequest(state="phi_plus", shots=shots))
    assert sum(data.counts.values()) == shots
    assert data.concurrence == data.fidelity == data.reduced_entropy == 1


def test_reproducible_seed():
    request = EntanglementRequest(state="psi_minus", shots=1024, seed=1234)
    assert simulate_entanglement(request) == simulate_entanglement(request)


@pytest.mark.parametrize("qubit,label", [(0, "10"), (1, "01")])
def test_asymmetric_aer_bit_order(qubit, label):
    circuit = QuantumCircuit(2)
    circuit.x(qubit)
    counts = sample_measurements(circuit, 512, 42)
    assert counts[label] == 512
    assert list(counts) == list(OUTCOMES)
    assert sum(counts.values()) == 512


def test_normalize_counts_preserves_zeros_and_order():
    assert normalize_counts({"01": 7, "10": 3}) == {"00": 0, "01": 3, "10": 7, "11": 0}


@pytest.mark.parametrize("payload", [
    {"state": "unknown", "shots": 2048},
    {"state": "Bell Φ+", "shots": 2048},  # UI labels are mapped by the API client.
    {"state": "phi_plus", "shots": 0},
    {"state": "phi_plus", "shots": -1},
    {"state": "phi_plus", "shots": 100},
    {"state": "phi_plus", "shots": 1000000},
    {"state": "phi_plus", "shots": True},
    {"state": "phi_plus", "shots": "2048"},
    {"state": "phi_plus", "shots": 2048.5},
    {"state": "phi_plus", "seed": -1},
    {"state": "phi_plus", "seed": 2**32},
    {"state": "phi_plus", "seed": True},
    {"state": "phi_plus", "unknown": 1},
    {},
])
def test_validation(payload):
    assert request("POST", "/simulate/entanglement", json=payload).status_code == 422


@pytest.mark.parametrize("error,status,message", [
    (SimulationError("private detail"), 503, "Qiskit Aer simulation failed. Please retry."),
    (RuntimeError("private detail"), 500, "An internal simulation error occurred."),
])
def test_safe_errors(monkeypatch, error, status, message):
    def fail(_):
        raise error
    monkeypatch.setattr(routes, "simulate_entanglement", fail)
    response = request("POST", "/simulate/entanglement", json={"state": "phi_plus"})
    assert response.status_code == status
    assert response.json() == {"detail": message}
    assert "private detail" not in response.text


@pytest.mark.parametrize("origin,allowed", [("http://localhost:3000", True), ("https://example.com", False)])
def test_cors(origin, allowed):
    response = request("OPTIONS", "/simulate/entanglement", headers={
        "Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"
    })
    assert response.status_code == (200 if allowed else 400)
    assert response.headers.get("access-control-allow-origin") == (origin if allowed else None)


def test_serialization_boundary():
    assert serialize_metric(0.9999999999999998) == 1.0
    assert not np.signbit(serialize_metric(-1e-15))
    with pytest.raises(ValueError):
        serialize_metric(float("nan"))
