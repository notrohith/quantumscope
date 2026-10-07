"""Resource-matched Bell vs separable coherent-signal comparison; no optimized benchmark.

Control: |+><+| signal with independent I/2 reference (native q1q0 tensor order).
Both signal Z populations are 1/2; one transmitted qubit and one retained qubit
per shot. Control X measurement detects surviving coherence; the independent
reference carries no hypothesis information and need not enter its statistic.
"""
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import DensityMatrix
from qiskit_aer import AerSimulator

from app.models.schemas import BellState, ComparisonRequest, ComparisonResponse, ComparisonStrategy, ComparisonSweepPoint, DetectionMetrics, ROCPoint
from app.simulation.entanglement import prepare_bell_state, SimulationError
from app.simulation.illumination import bell_receiver
from app.simulation.target_model import target_hypotheses
from app.simulation.detection import score_ensembles, trial_statistics
from app.simulation.metrics import serialize_metric


def control_transmitter():
    return DensityMatrix(np.eye(2)/2).tensor(DensityMatrix.from_label("+"))


def control_receiver():
    circuit = QuantumCircuit(2)
    circuit.h(0)  # X-basis on signal; success = displayed q0=0, either reference bit.
    return circuit


def receiver_probabilities(jobs, seed):
    """One exact Aer density-matrix batch. No Monte Carlo shots in calibration."""
    circuits = []
    for state, strategy in jobs:
        circuit = QuantumCircuit(2)
        circuit.set_density_matrix(state)
        circuit.compose(bell_receiver() if strategy == "quantum" else control_receiver(), inplace=True)
        circuit.save_probabilities()
        circuits.append(circuit)
    try:
        simulator = AerSimulator(method="density_matrix", max_parallel_threads=1)
        compiled = transpile(circuits, simulator, seed_transpiler=seed, optimization_level=0)
        result = simulator.run(compiled, shots=1, seed_simulator=seed).result()
        if not result.success:
            raise SimulationError("Aer comparison probability calculation failed")
        probabilities = []
        for index, (_, strategy) in enumerate(jobs):
            values = np.asarray(result.data(index)["probabilities"])
            # Native q1q0: q0=0 occupies indices 0 and 2.
            probability = values[0] if strategy == "quantum" else values[0]+values[2]
            probabilities.append(float(np.clip(probability, 0, 1)))
        return probabilities
    except SimulationError:
        raise
    except Exception as exc:
        raise SimulationError("Aer comparison execution failed") from exc


def empirical_roc(scores0, scores1):
    """All attainable strict-threshold decisions; ties move together; include endpoints."""
    thresholds = np.r_[1., np.unique(np.r_[scores0, scores1])[::-1], -1.]
    fpr = 1-np.searchsorted(np.sort(scores0), thresholds, side="right")/len(scores0)
    tpr = 1-np.searchsorted(np.sort(scores1), thresholds, side="right")/len(scores1)
    points = []
    for x,y in zip(fpr,tpr):
        point = ROCPoint(false_alarm_probability=float(x), detection_probability=float(y))
        if not points or point != points[-1]:
            points.append(point)
    auc = float(np.trapezoid([p.detection_probability for p in points], [p.false_alarm_probability for p in points]))
    return points, serialize_metric(auc)


def simulate_comparison(request: ComparisonRequest) -> ComparisonResponse:
    transmitters = {
        "quantum": DensityMatrix.from_instruction(prepare_bell_state(BellState.PHI_PLUS)),
        "control": control_transmitter(),
    }
    # Selected point and each sweep point have independent child streams. No seed search.
    backgrounds = [request.background_noise] + [i/10 for i in range(9)]
    point_seeds = np.random.SeedSequence(request.seed).spawn(len(backgrounds))
    jobs = []
    for background in backgrounds:
        for name, transmitter in transmitters.items():
            states = target_hypotheses(transmitter, request.reflectivity, background, request.channel_noise)
            jobs.extend((state, name) for state in states)
    probabilities = iter(receiver_probabilities(jobs, request.seed))
    selected = {}
    sweep = []
    for index, background in enumerate(backgrounds):
        strategies = {}
        strategy_seeds = point_seeds[index].spawn(2)
        for name, seed in zip(transmitters, strategy_seeds):
            p0,p1 = next(probabilities), next(probabilities)
            threshold = serialize_metric((p0+p1)/2)
            # Same per-hypothesis SeedSequence/binomial policy as Illumination,
            # separate strategy streams, identical sample sizes and equal priors.
            scores0,scores1 = score_ensembles(p0,p1,request.shots,request.trials,seed.spawn(3))
            metrics = DetectionMetrics(**trial_statistics(scores0,scores1,threshold), threshold=threshold,
                exact_h0_score=serialize_metric(p0), exact_h1_score=serialize_metric(p1))
            strategies[name] = metrics
            if index == 0:
                roc,auc = empirical_roc(scores0,scores1)
                selected[name] = ComparisonStrategy(**metrics.model_dump(), shots=request.shots, trials=request.trials, roc=roc, auc=auc)
        if index:
            sweep.append(ComparisonSweepPoint(background_noise=background, **strategies))
    return ComparisonResponse(**request.model_dump(), **selected, sweep=sweep)
