"""Exact state metrics. Finite-shot counts are deliberately not accepted here."""

import math

import numpy as np
from qiskit.quantum_info import (
    DensityMatrix,
    Pauli,
    Statevector,
    concurrence,
    entropy,
    partial_trace,
    state_fidelity,
)

from app.models.schemas import BellState


def target_bell_state(state: BellState) -> Statevector:
    """Independent reference amplitudes, in Qiskit's |q1 q0> index order.

    API outcome strings instead use q0q1. For psi_minus this reference represents
    (|01> - |10>)/sqrt(2) when those displayed kets are read as q0q1.
    These are target states, not hard-coded metric or measurement results.
    """
    vectors = {
        BellState.PHI_PLUS: [1, 0, 0, 1],
        BellState.PHI_MINUS: [1, 0, 0, -1],
        BellState.PSI_PLUS: [0, 1, 1, 0],
        BellState.PSI_MINUS: [0, -1, 1, 0],
    }
    return Statevector(np.asarray(vectors[state], dtype=complex) / np.sqrt(2))


def exact_metrics(state: Statevector | DensityMatrix, target: Statevector) -> dict[str, float]:
    reduced = partial_trace(state, [1])  # Trace q1; retain q0.
    return {
        "concurrence": float(concurrence(state)),
        "fidelity": float(state_fidelity(state, target)),
        "reduced_entropy": float(entropy(reduced, base=2)),
        # In Qiskit, the rightmost Pauli acts on q0. ZZ is symmetric.
        "zz_correlation": float(np.real(state.expectation_value(Pauli("ZZ")))),
    }


def serialize_metric(value: float) -> float:
    """Normalize only at the response boundary, preserving internal precision."""
    if not math.isfinite(value):
        raise ValueError("Non-finite quantum metric")
    rounded = round(float(value), 12)
    return 0.0 if rounded == 0 else rounded
