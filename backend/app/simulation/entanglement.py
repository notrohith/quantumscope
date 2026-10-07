"""Explicit ideal preparation, exact analysis, and independent Aer sampling."""

from collections.abc import Mapping

from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel

from app.models.schemas import (
    BellState,
    EntanglementRequest,
    EntanglementResponse,
    Measurement,
)
from app.simulation.metrics import exact_metrics, serialize_metric, target_bell_state

OUTCOMES = ("00", "01", "10", "11")


class SimulationError(RuntimeError):
    """Aer could not produce a complete measurement result."""


def prepare_bell_state(state: BellState) -> QuantumCircuit:
    circuit = QuantumCircuit(2, name=state.value)
    circuit.h(0)
    circuit.cx(0, 1)
    if state in (BellState.PSI_PLUS, BellState.PSI_MINUS):
        circuit.x(1)  # q0q1: 00 -> 01 and 11 -> 10.
    if state in (BellState.PHI_MINUS, BellState.PSI_MINUS):
        circuit.z(0)  # Negate the component with q0=1.
    return circuit


def normalize_counts(raw: Mapping[str, int]) -> dict[str, int]:
    """Aer c1c0 -> displayed q0q1; q0 was measured into c0 and q1 into c1.

    Never guess endianness from symmetric Bell histograms. A separate asymmetric
    product-state test checks that q0=1, q1=0 is returned as '10'.
    """
    counts = dict.fromkeys(OUTCOMES, 0)
    for bits, count in raw.items():
        if bits not in OUTCOMES or count < 0:
            raise SimulationError("Unexpected measurement output")
        counts[bits[::-1]] += int(count)
    return counts


def sample_measurements(
    circuit: QuantumCircuit, shots: int, seed: int, *,
    method: str = "statevector", noise_model: NoiseModel | None = None,
) -> dict[str, int]:
    measured = circuit.copy()
    measured.measure_all()  # Single classical register; c_i receives q_i.
    simulator = AerSimulator(method=method, noise_model=noise_model, max_parallel_threads=1)
    try:
        compiled = transpile(measured, simulator, seed_transpiler=seed, optimization_level=0)
        result = simulator.run(compiled, shots=shots, seed_simulator=seed).result()
        if not result.success:
            raise SimulationError("Aer execution was unsuccessful")
        counts = normalize_counts(result.get_counts())
        if sum(counts.values()) != shots:
            raise SimulationError("Incomplete measurement counts")
        return counts
    except SimulationError:
        raise
    except Exception as exc:
        raise SimulationError("Aer measurement execution failed") from exc


def simulate_entanglement(request: EntanglementRequest) -> EntanglementResponse:
    preparation = prepare_bell_state(request.state)
    # Branch A: exact metrics BEFORE any measurement, independent of shots/seed.
    state = Statevector.from_instruction(preparation)
    metrics = exact_metrics(state, target_bell_state(request.state))
    # Branch B: real finite-shot Aer execution of a measured COPY of the circuit.
    counts = sample_measurements(preparation, request.shots, request.seed)
    # Computational-basis probabilities cannot distinguish relative +/- phase.
    measurements = [
        Measurement(outcome=outcome, probability=counts[outcome] / request.shots)
        for outcome in OUTCOMES
    ]
    return EntanglementResponse(
        state=request.state,
        shots=request.shots,
        seed=request.seed,
        counts=counts,
        measurements=measurements,
        **{name: serialize_metric(value) for name, value in metrics.items()},
    )
