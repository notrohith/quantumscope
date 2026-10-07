import numpy as np
import pytest
from qiskit.quantum_info import DensityMatrix, concurrence, partial_trace, state_fidelity
from scipy.stats import binom

from app.api import routes
from app.models.schemas import BellState, IlluminationRequest
from app.simulation.entanglement import SimulationError
from app.simulation.illumination import hypothesis_states, match_probability, classify, sample_receiver, simulate_illumination
from app.simulation.metrics import target_bell_state
from tests.test_entanglement import request


@pytest.mark.parametrize("eta,b,c", [(0, 0, 0), (1, 0, 0), (.1,.25,.1), (.02,.95,.5), (1,1,.5)])
def test_hypothesis_states_and_analytic_receiver(eta,b,c):
    h0,h1 = hypothesis_states(IlluminationRequest(reflectivity=eta, backgroundNoise=b, channelNoise=c))
    for rho in (h0,h1):
        assert rho.is_valid()
        assert np.trace(rho.data) == pytest.approx(1)
        assert np.allclose(rho.data, rho.data.conj().T)
        assert np.linalg.eigvalsh(rho.data).min() >= -1e-12
        # Signal channels never alter the ideal reduced idler.
        assert partial_trace(rho,[0]).data == pytest.approx(np.eye(2)/2)
    assert h0.data == pytest.approx(partial_trace(h0,[0]).tensor(partial_trace(h0,[1])).data)
    assert concurrence(h0) == pytest.approx(0)
    assert match_probability(h0) == pytest.approx(.25)
    # Independent analytic reference for AD(1-eta), then two depolarizing channels.
    expected = .25 + (1-b)*(1-c)*(eta+2*np.sqrt(eta))/4
    assert match_probability(h1) == pytest.approx(expected)
    assert match_probability(h1) == pytest.approx(state_fidelity(h1,target_bell_state(BellState.PHI_PLUS)))
    if eta == 0 or b == 1:
        assert h1.data == pytest.approx(h0.data)


def test_controlled_monotonic_separation():
    def separation(**kwargs):
        h0,h1 = hypothesis_states(IlluminationRequest(**kwargs))
        return match_probability(h1)-match_probability(h0)
    assert separation(reflectivity=1) > separation(reflectivity=.2) > separation(reflectivity=0)
    assert separation(backgroundNoise=0) > separation(backgroundNoise=.5) > separation(backgroundNoise=1)
    assert separation(channelNoise=0) > separation(channelNoise=.25) > separation(channelNoise=.5)


@pytest.mark.parametrize("state,outcome", [("phi_plus","00"),("phi_minus","10"),("psi_plus","01"),("psi_minus","11")])
def test_inverse_bell_receiver_and_output_order(state,outcome):
    rho=DensityMatrix(target_bell_state(BellState(state)))
    counts=sample_receiver(rho,512,42)
    assert counts[outcome]==512 and sum(counts.values())==512


@pytest.mark.parametrize("target", [True,False])
def test_endpoint_contract(target):
    response=request("POST","/simulate/illumination",json={"targetPresent":target})
    assert response.status_code==200, response.text
    d=response.json()
    assert d["targetPresent"] is target
    assert d["shots"]==2048 and d["trials"]==200 and d["seed"]==42
    assert d["model"]=="qubit-illumination" and d["engine"]=="qiskit-aer"
    assert d["thresholdMethod"]=="exact-model-midpoint"
    assert d["trialSampling"]=="exact-probability-binomial"
    assert d["bitOrder"]=="q0q1"
    assert list(d["counts"])==["00","01","10","11"]
    assert sum(d["counts"].values())==d["shots"]
    assert sum(row["probability"] for row in d["measurements"])==pytest.approx(1)
    assert d["receiverScore"]==d["counts"]["00"]/d["shots"]
    for row in d["measurements"]:
        assert row["probability"]==d["counts"][row["outcome"]]/d["shots"]
    assert d["decision"]==("target" if d["receiverScore"]>d["threshold"] else "no_target")
    for field in ("detectionProbability","falseAlarmProbability","missProbability","errorProbability"):
        assert 0<=d[field]<=1
    assert d["detectionProbability"]==d["detectionCount"]/d["trials"]
    assert d["falseAlarmProbability"]==d["falseAlarmCount"]/d["trials"]
    assert d["missProbability"]==1-d["detectionProbability"]
    assert d["errorProbability"]==(d["falseAlarmProbability"]+d["missProbability"])/2
    assert d["threshold"]==pytest.approx((d["exactH0Score"]+d["exactH1Score"])/2)


def test_threshold_tie_and_extremes():
    assert not classify(.25,.25)
    assert classify(.251,.25)
    ideal=simulate_illumination(IlluminationRequest(reflectivity=1,backgroundNoise=0,channelNoise=0))
    assert ideal.receiver_score==1 and ideal.exact_h1_score==1
    assert ideal.detection_probability==1 and ideal.false_alarm_probability==0
    assert ideal.error_probability==0
    lost=simulate_illumination(IlluminationRequest(reflectivity=0))
    assert lost.exact_h0_score==lost.exact_h1_score==lost.threshold==.25
    assert lost.error_probability==pytest.approx(.5,abs=.1)


def test_seed_reproducibility_and_toggle_only_selects_observation():
    req=IlluminationRequest(reflectivity=.03,backgroundNoise=.8,seed=100)
    present=simulate_illumination(req)
    assert present==simulate_illumination(req)
    absent=simulate_illumination(req.model_copy(update={"target_present":False}))
    for name in ("detection_count","false_alarm_count","mean_h0_score","mean_h1_score","threshold"):
        assert getattr(present,name)==getattr(absent,name)
    other=simulate_illumination(req.model_copy(update={"seed":101}))
    assert other.threshold==present.threshold
    assert (other.mean_h0_score,other.mean_h1_score)!=(present.mean_h0_score,present.mean_h1_score)


def test_empirical_trials_agree_with_binomial_reference():
    req=IlluminationRequest(reflectivity=.01,backgroundNoise=.8,shots=512,trials=500)
    result=simulate_illumination(req)
    cutoff=int(np.floor(result.threshold*req.shots))
    assert result.detection_probability==pytest.approx(binom.sf(cutoff,req.shots,result.exact_h1_score),abs=.08)
    assert result.false_alarm_probability==pytest.approx(binom.sf(cutoff,req.shots,result.exact_h0_score),abs=.08)
    assert result.mean_h0_score==pytest.approx(result.exact_h0_score,abs=.005)
    assert result.mean_h1_score==pytest.approx(result.exact_h1_score,abs=.005)


@pytest.mark.parametrize("shots,trials", [(512,100),(1024,200),(2048,500),(4096,100),(8192,500)])
def test_allowed_resources(shots,trials):
    d=simulate_illumination(IlluminationRequest(shots=shots,trials=trials))
    assert sum(d.counts.values())==shots
    assert d.detection_count<=trials and d.false_alarm_count<=trials


@pytest.mark.parametrize("payload", [
 {"targetPresent":"true"},{"targetPresent":1},{"reflectivity":-0.1},{"reflectivity":1.1},
 {"reflectivity":True},{"backgroundNoise":-1},{"backgroundNoise":1.1},{"backgroundNoise":"0.2"},
 {"channelNoise":.51},{"channelNoise":-0.1},{"shots":100},{"shots":True},{"shots":"2048"},
 {"trials":0},{"trials":1000},{"trials":True},{"trials":200.5},{"seed":-1},{"seed":2**32},
 {"seed":True},{"seed":1.2},{"threshold":.3},{"extra":"no"},
])
def test_validation(payload):
    assert request("POST","/simulate/illumination",json=payload).status_code==422


@pytest.mark.parametrize("error,status", [(SimulationError("private"),503),(RuntimeError("private"),500)])
def test_safe_errors(monkeypatch,error,status):
    def fail(_): raise error
    monkeypatch.setattr(routes,"simulate_illumination",fail)
    response=request("POST","/simulate/illumination",json={})
    assert response.status_code==status and "private" not in response.text
