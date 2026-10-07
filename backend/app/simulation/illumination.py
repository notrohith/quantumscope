"""Discrete-variable two-qubit illumination-inspired experiment, not an optical model.

q0 = signal, q1 = ideal stored idler. H1: AD(1-eta) on signal,
then D(background), then D(channel). H0: independently replace signal by |0>,
then apply the same D(background), D(channel); retain the reduced idler.
Consequently eta=0 makes H1 identical to H0, with no surviving original correlation.
"""

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix
from app.simulation.target_model import target_hypotheses
from app.simulation.detection import classify, score_ensembles, trial_statistics

from app.models.schemas import BellState, IlluminationRequest, IlluminationResponse, Measurement
from app.simulation.entanglement import OUTCOMES, prepare_bell_state, sample_measurements
from app.simulation.metrics import serialize_metric


def hypothesis_states(request: IlluminationRequest) -> tuple[DensityMatrix, DensityMatrix]:
    bell = DensityMatrix.from_instruction(prepare_bell_state(BellState.PHI_PLUS))
    return target_hypotheses(bell, request.reflectivity, request.background_noise, request.channel_noise)


def bell_receiver() -> QuantumCircuit:
    receiver = QuantumCircuit(2)
    receiver.cx(0, 1)
    receiver.h(0)
    return receiver


def match_probability(state: DensityMatrix) -> float:
    # Inverse Bell transform maps Phi+ to 00. Probability equals its Bell projector.
    value = float(state.evolve(bell_receiver()).probabilities()[0])
    return float(np.clip(value, 0, 1))  # Only floating-point boundary drift.


def sample_receiver(state: DensityMatrix, shots: int, seed: int) -> dict[str, int]:
    circuit = QuantumCircuit(2)
    # Aer-supported exact state initialization; sample the actual joint receiver.
    circuit.set_density_matrix(state)
    circuit.compose(bell_receiver(), inplace=True)
    return sample_measurements(circuit, shots, seed, method="density_matrix")


def simulate_illumination(request: IlluminationRequest) -> IlluminationResponse:
    h0, h1 = hypothesis_states(request)
    p0, p1 = match_probability(h0), match_probability(h1)
    # Deterministic model calibration, NOT fit to the evaluation trials or called optimal.
    threshold = serialize_metric((p0 + p1) / 2)
    seeds = np.random.SeedSequence(request.seed).spawn(3)
    # Each observation contains shots independent Bernoulli Bell-match measurements.
    # Binomial sampling is statistically equivalent to repeating this fixed circuit;
    # two vectorized ensembles avoid 2*trials redundant Aer jobs/transpilations.
    scores0, scores1 = score_ensembles(p0, p1, request.shots, request.trials, seeds)
    statistics = trial_statistics(scores0, scores1, threshold)
    # A separate observation in Aer. targetPresent chooses ONLY this observation;
    # both ensembles and their metrics are always generated with independent streams.
    aer_seed = int(seeds[2].generate_state(1, dtype=np.uint32)[0])
    counts = sample_receiver(h1 if request.target_present else h0, request.shots, aer_seed)
    score = counts["00"] / request.shots
    return IlluminationResponse(
        **request.model_dump(), counts=counts,
        measurements=[Measurement(outcome=o, probability=counts[o] / request.shots) for o in OUTCOMES],
        receiver_score=score, threshold=threshold,
        decision="target" if classify(score, threshold) else "no_target",
        **statistics,
        exact_h0_score=serialize_metric(p0), exact_h1_score=serialize_metric(p1),
    )
