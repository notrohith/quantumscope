"""Physics checks use independent references, not implementation fixtures."""
import numpy as np
import pytest
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix
from app.api import routes
from app.models.schemas import BellState, NoiseRequest, NoiseType
from app.simulation.entanglement import SimulationError, prepare_bell_state
from app.simulation.metrics import exact_metrics, target_bell_state
from app.simulation.noise import expected_recorded_probabilities, noisy_density_matrix, sample_noisy_measurements, simulate_noise
from tests.test_entanglement import request


def run(model="depolarizing", strength=0.2, state="phi_plus", **kwargs):
    return simulate_noise(NoiseRequest(state=state, model=model, strength=strength, **kwargs))


@pytest.mark.parametrize("state", list(BellState))
@pytest.mark.parametrize("model", list(NoiseType))
def test_identity_and_half_strength_endpoint(state, model):
    for strength in (0, 0.5):
        response = request("POST", "/simulate/noise", json={"state": state, "model": model, "strength": strength, "shots": 512})
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["state"] == state and data["model"] == model
        assert data["strength"] == strength and data["seed"] == 42
        assert data["engine"] == "qiskit-aer" and data["bitOrder"] == "q0q1"
        assert list(data["counts"]) == ["00", "01", "10", "11"]
        assert sum(data["counts"].values()) == data["shots"] == 512
        assert sum(row["probability"] for row in data["measurements"]) == pytest.approx(1)
        for row in data["measurements"]:
            assert row["probability"] == data["counts"][row["outcome"]] / 512
        counts = data["counts"]
        assert data["measuredZZCorrelation"] == (counts["00"] + counts["11"] - counts["01"] - counts["10"]) / 512
        assert [p["noise"] for p in data["trend"]] == [i / 20 for i in range(11)]
        if strength == 0:
            for metric in ("initialConcurrence", "finalConcurrence", "fidelity", "reducedEntropy"):
                assert data[metric] == pytest.approx(1, abs=1e-7)
            assert data["quantumZZCorrelation"] == (1 if state.value.startswith("phi") else -1)
        ideal = DensityMatrix.from_instruction(prepare_bell_state(state))
        density = noisy_density_matrix(ideal, model, strength)
        assert density.is_valid()
        assert np.trace(density.data) == pytest.approx(1)
        assert np.allclose(density.data, density.data.conj().T)
        assert np.linalg.eigvalsh(density.data).min() >= -1e-12


def test_independent_mixed_state_concurrence():
    bell = np.array([1, 0, 0, 1]) / np.sqrt(2)
    density = DensityMatrix(0.6 * np.outer(bell, bell) + 0.4 * np.eye(4) / 4)
    metrics = exact_metrics(density, target_bell_state(BellState.PHI_PLUS))
    assert metrics["concurrence"] == pytest.approx(0.4)
    assert metrics["fidelity"] == pytest.approx(0.7)
    assert metrics["reduced_entropy"] == pytest.approx(1)
    metrics = exact_metrics(DensityMatrix(np.diag([0.5, 0, 0, 0.5])), target_bell_state(BellState.PHI_PLUS))
    assert metrics["concurrence"] == pytest.approx(0)
    assert metrics["reduced_entropy"] == pytest.approx(1)


def test_depolarizing_analytic_sweep():
    data = run()
    for point in data.trend:
        visibility = (1 - point.noise) ** 2
        assert point.concurrence == pytest.approx(max(0, (3 * visibility - 1) / 2), abs=1e-7)
        assert point.fidelity == pytest.approx((1 + 3 * visibility) / 4)
        assert point.quantum_zz_correlation == pytest.approx(visibility)
    assert all(a.concurrence >= b.concurrence for a, b in zip(data.trend, data.trend[1:]))


def test_amplitude_damping_populations_and_state_dependence():
    ideal = DensityMatrix.from_instruction(prepare_bell_state(BellState.PHI_PLUS))
    density = noisy_density_matrix(ideal, NoiseType.AMPLITUDE_DAMPING, 0.3)
    assert density.probabilities() == pytest.approx([0.545, 0.105, 0.105, 0.245])
    phi, psi = run("amplitude_damping", 0.3), run("amplitude_damping", 0.3, "psi_plus")
    assert phi.final_concurrence == pytest.approx(0.49, abs=1e-7)
    assert psi.final_concurrence == pytest.approx(0.7, abs=1e-7)
    assert phi.counts["00"] > phi.counts["11"]
    assert phi.fidelity != run("depolarizing", 0.3).fidelity


def test_phase_damping_populations_and_coherence():
    ideal = DensityMatrix.from_instruction(prepare_bell_state(BellState.PHI_PLUS))
    density = noisy_density_matrix(ideal, NoiseType.PHASE_DAMPING, 0.3)
    assert density.probabilities() == pytest.approx([0.5, 0, 0, 0.5])
    assert density.data[0, 3] == pytest.approx(0.35)
    result = run("phase_damping", 0.3)
    assert result.final_concurrence == pytest.approx(0.7)
    assert result.fidelity == pytest.approx(0.85)
    assert result.counts["01"] == result.counts["10"] == 0


@pytest.mark.parametrize("state,sign", [("phi_plus", 1), ("psi_minus", -1)])
def test_readout_changes_only_classical_statistics(state, sign):
    clean, noisy = run("readout_error", 0, state), run("readout_error", 0.2, state)
    for field in ("initial_concurrence", "final_concurrence", "fidelity", "reduced_entropy", "quantum_zz_correlation"):
        assert getattr(clean, field) == getattr(noisy, field)
    assert noisy.quantum_zz_correlation == sign
    assert abs(noisy.measured_zz_correlation) < abs(clean.measured_zz_correlation)
    for point in noisy.trend:
        assert point.concurrence == pytest.approx(1, abs=1e-7)
        assert point.fidelity == 1
        assert point.measured_zz_correlation == pytest.approx(sign * (1 - 2 * point.noise)**2)
    ideal = DensityMatrix.from_instruction(prepare_bell_state(BellState(state)))
    assert expected_recorded_probabilities(ideal, NoiseType.READOUT_ERROR, 0.5) == pytest.approx([0.25]*4)


@pytest.mark.parametrize("model", list(NoiseType))
def test_seed_reproducibility_and_sampling_agrees_with_exact_distribution(model):
    result = run(model, 0.3, shots=8192, seed=1234)
    assert result == run(model, 0.3, shots=8192, seed=1234)
    ideal = DensityMatrix.from_instruction(prepare_bell_state(BellState.PHI_PLUS))
    density = noisy_density_matrix(ideal, model, 0.3)
    probabilities = expected_recorded_probabilities(density, model, 0.3)
    for row in result.measurements:
        assert row.probability == pytest.approx(probabilities[int(row.outcome[::-1], 2)], abs=0.04)
    other = run(model, 0.3, shots=512, seed=5678)
    assert result.trend == other.trend
    assert result.final_concurrence == other.final_concurrence


@pytest.mark.parametrize("model", list(NoiseType))
def test_noisy_sampler_asymmetric_bit_order(model):
    circuit = QuantumCircuit(2)
    circuit.x(0)
    counts = sample_noisy_measurements(circuit, NoiseRequest(state="phi_plus", model=model, strength=0, shots=512))
    assert counts == {"00": 0, "01": 0, "10": 512, "11": 0}


@pytest.mark.parametrize("patch", [
    {"state": "invalid"}, {"model": "invalid"}, {"strength": -0.01}, {"strength": 0.51},
    {"strength": True}, {"strength": "0.2"}, {"strength": None},
    {"shots": 100}, {"shots": True}, {"shots": "2048"},
    {"seed": -1}, {"seed": 2**32}, {"seed": 1.5}, {"seed": True}, {"extra": 0},
])
def test_request_validation(patch):
    payload = {"state": "phi_plus", "model": "depolarizing", "strength": 0.1, **patch}
    assert request("POST", "/simulate/noise", json=payload).status_code == 422


@pytest.mark.parametrize("error,status", [(SimulationError("private"), 503), (RuntimeError("private"), 500)])
def test_sanitized_errors(monkeypatch, error, status):
    def fail(_):
        raise error
    monkeypatch.setattr(routes, "simulate_noise", fail)
    response = request("POST", "/simulate/noise", json={"state": "phi_plus", "model": "depolarizing", "strength": 0.2})
    assert response.status_code == status
    assert "private" not in response.text
