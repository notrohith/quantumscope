"""Shared IID observation sampling and strict-threshold, equal-prior statistics."""
import numpy as np


def classify(score, threshold: float):
    return score > threshold


def score_ensembles(p0, p1, shots, trials, seeds):
    return tuple(np.random.default_rng(seed).binomial(shots, p, trials) / shots for seed, p in zip(seeds[:2], (p0, p1)))


def trial_statistics(scores0, scores1, threshold):
    false_alarms = int(np.count_nonzero(classify(scores0, threshold)))
    detections = int(np.count_nonzero(classify(scores1, threshold)))
    pd, pfa = detections / len(scores1), false_alarms / len(scores0)
    pm = 1-pd
    return dict(detection_count=detections, false_alarm_count=false_alarms,
                detection_probability=pd, false_alarm_probability=pfa,
                miss_probability=pm, error_probability=(pfa+pm)/2,
                mean_h0_score=float(np.mean(scores0)), mean_h1_score=float(np.mean(scores1)))
