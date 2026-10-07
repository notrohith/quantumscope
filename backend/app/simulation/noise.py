"""Exact independent local channels on BOTH qubits AFTER ideal Bell preparation.

The sweep performs no shots or transpilation. Only the selected strength is
sampled in Aer. Readout errors act on recorded bits, never on the density matrix.
"""

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix

from app.models.schemas import Measurement, NoiseRequest, NoiseResponse, NoiseSweepPoint, NoiseType
from app.simulation.entanglement import OUTCOMES, prepare_bell_state, sample_measurements
from app.simulation.metrics import exact_metrics, serialize_metric, target_bell_state
from app.simulation.noise_models import quantum_error, readout_error, readout_model


def noisy_density_matrix(ideal: DensityMatrix, model: NoiseType, strength: float) -> DensityMatrix:
    if model == NoiseType.READOUT_ERROR:
        return ideal.copy()
    channel = quantum_error(model, strength).to_quantumchannel()
    return ideal.evolve(channel, qargs=[0]).evolve(channel, qargs=[1])


def expected_recorded_probabilities(state: DensityMatrix, model: NoiseType, strength: float) -> np.ndarray:
    """Native Qiskit q1q0 order. No sampling; independent classical bit transitions."""
    probabilities = state.probabilities()
    if model == NoiseType.READOUT_ERROR:
        transition = np.asarray(readout_error(strength).probabilities).T
        probabilities = np.kron(transition, transition) @ probabilities
    return probabilities


def sample_noisy_measurements(preparation: QuantumCircuit, request: NoiseRequest) -> dict[str, int]:
    circuit = preparation.copy()
    model = None
    if request.model == NoiseType.READOUT_ERROR:
        model = readout_model(request.strength)
    else:
        instruction = quantum_error(request.model, request.strength).to_instruction()
        for qubit in (0, 1):
            circuit.append(instruction, [qubit])
    return sample_measurements(circuit, request.shots, request.seed, method="density_matrix", noise_model=model)


def simulate_noise(request: NoiseRequest) -> NoiseResponse:
    preparation = prepare_bell_state(request.state)
    ideal = DensityMatrix.from_instruction(preparation)
    target = target_bell_state(request.state)
    initial = exact_metrics(ideal, target)
    final = noisy_density_matrix(ideal, request.model, request.strength)
    metrics = exact_metrics(final, target)
    counts = sample_noisy_measurements(preparation, request)
    measured_zz = (counts["00"] + counts["11"] - counts["01"] - counts["10"]) / request.shots
    trend = []
    for step in range(11):
        strength = step / 20
        density = noisy_density_matrix(ideal, request.model, strength)
        point = exact_metrics(density, target)
        probabilities = expected_recorded_probabilities(density, request.model, strength)
        expected_zz = float(np.dot([1, -1, -1, 1], probabilities))
        trend.append(NoiseSweepPoint(
            noise=strength,
            concurrence=serialize_metric(point["concurrence"]),
            fidelity=serialize_metric(point["fidelity"]),
            reduced_entropy=serialize_metric(point["reduced_entropy"]),
            quantum_zz_correlation=serialize_metric(point["zz_correlation"]),
            measured_zz_correlation=serialize_metric(expected_zz),
        ))
    return NoiseResponse(
        **request.model_dump(), counts=counts,
        measurements=[Measurement(outcome=outcome, probability=counts[outcome] / request.shots) for outcome in OUTCOMES],
        initial_concurrence=serialize_metric(initial["concurrence"]),
        final_concurrence=serialize_metric(metrics["concurrence"]),
        fidelity=serialize_metric(metrics["fidelity"]),
        reduced_entropy=serialize_metric(metrics["reduced_entropy"]),
        quantum_zz_correlation=serialize_metric(metrics["zz_correlation"]),
        measured_zz_correlation=serialize_metric(measured_zz),
        trend=trend,
    )
