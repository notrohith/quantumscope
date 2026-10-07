"""Supported Aer channels; strength is a per-qubit parameter, not a gate error rate."""

from qiskit_aer.noise import (
    NoiseModel, QuantumError, ReadoutError, amplitude_damping_error,
    depolarizing_error, phase_damping_error,
)

from app.models.schemas import NoiseType


def quantum_error(model: NoiseType, strength: float) -> QuantumError:
    if model == NoiseType.DEPOLARIZING:
        # E(rho) = (1-p) rho + p I/2. Total nonidentity Pauli probability = 3p/4.
        return depolarizing_error(strength, 1)
    if model == NoiseType.AMPLITUDE_DAMPING:
        # Zero-temperature decay |1> -> |0> with probability gamma.
        return amplitude_damping_error(strength, excited_state_population=0)
    if model == NoiseType.PHASE_DAMPING:
        # Single-qubit off-diagonals scale by sqrt(1-p); populations are unchanged.
        return phase_damping_error(strength)
    raise ValueError("Readout error is classical, not a quantum channel")


def readout_error(strength: float) -> ReadoutError:
    # Rows = actual bit, columns = recorded bit.
    return ReadoutError([[1 - strength, strength], [strength, 1 - strength]])


def readout_model(strength: float) -> NoiseModel:
    model = NoiseModel()
    error = readout_error(strength)
    for qubit in (0, 1):
        model.add_readout_error(error, [qubit])
    return model
