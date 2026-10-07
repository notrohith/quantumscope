import numpy as np
import pytest
from qiskit.quantum_info import DensityMatrix, partial_trace, concurrence
from app.api import routes
from app.models.schemas import ComparisonRequest, IlluminationRequest
from app.simulation import comparison
from app.simulation.comparison import control_transmitter, receiver_probabilities, empirical_roc, simulate_comparison
from app.simulation.illumination import hypothesis_states, match_probability
from app.simulation.entanglement import SimulationError
from app.simulation.target_model import target_hypotheses
from tests.test_entanglement import request


def test_control_resources_and_receiver():
    state=control_transmitter()
    assert concurrence(state)==pytest.approx(0)
    assert partial_trace(state,[0]).data==pytest.approx(np.eye(2)/2)
    assert partial_trace(state,[1]).probabilities()==pytest.approx([.5,.5])
    assert state.data==pytest.approx(partial_trace(state,[0]).tensor(partial_trace(state,[1])).data)
    for eta,b,c in [(0,0,0),(1,0,0),(.1,.25,.1),(.03,.9,.5)]:
        h0,h1=target_hypotheses(state,eta,b,c)
        p0,p1=receiver_probabilities([(h0,"control"),(h1,"control")],42)
        assert p0==pytest.approx(.5)
        assert p1==pytest.approx(.5+(1-b)*(1-c)*np.sqrt(eta)/2)
        assert h0.is_valid() and h1.is_valid()
        assert concurrence(h1)==pytest.approx(0,abs=1e-7)
        if eta==0: assert h0.data==pytest.approx(h1.data)


def test_control_receiver_ignores_independent_reference():
    for ref in ("0","1"):
        state=DensityMatrix.from_label(ref).tensor(DensityMatrix.from_label("+"))
        assert receiver_probabilities([(state,"control")],42)==pytest.approx([1])


def test_quantum_receiver_matches_illumination():
    states=hypothesis_states(IlluminationRequest(reflectivity=.1,backgroundNoise=.25,channelNoise=.1))
    assert receiver_probabilities([(state,"quantum") for state in states],42)==pytest.approx([match_probability(s) for s in states])


def test_same_environment_function_and_resources(monkeypatch):
    seen=[]
    original=comparison.target_hypotheses
    def spy(state,eta,b,c):
        seen.append((eta,b,c))
        return original(state,eta,b,c)
    monkeypatch.setattr(comparison,"target_hypotheses",spy)
    result=simulate_comparison(ComparisonRequest(reflectivity=.3,backgroundNoise=.7,channelNoise=.2,shots=512,trials=200))
    assert seen[0]==seen[1]==(.3,.7,.2)
    for i in range(9): assert seen[2+2*i]==seen[3+2*i]==(.3,i/10,.2)
    assert result.quantum.shots==result.control.shots==512
    assert result.quantum.trials==result.control.trials==200
    assert result.priors=="equal"


def test_empirical_roc_ties_endpoints_and_auc():
    points,auc=empirical_roc(np.array([0,.5]),np.array([.5,1]))
    assert [(p.false_alarm_probability,p.detection_probability) for p in points]==[(0,0),(0,.5),(.5,1),(1,1)]
    assert auc==pytest.approx(.875)  # Pairwise wins plus half-credit for ties.
    _,same=empirical_roc(np.array([0,.5,1]),np.array([0,.5,1]))
    assert same==.5
    _,reversed_auc=empirical_roc(np.array([1,1]),np.array([0,0]))
    assert reversed_auc==0  # Never force a favorable-looking curve.


def test_endpoint_and_sweep_contract():
    response=request("POST","/simulate/compare",json={})
    assert response.status_code==200,response.text
    d=response.json()
    assert d["trials"]==500 and d["shots"]==2048 and d["seed"]==42
    assert d["engine"]=="qiskit-aer" and d["model"]=="qubit-comparison"
    assert [p["backgroundNoise"] for p in d["sweep"]]==[i/10 for i in range(9)]
    for name in ("quantum","control"):
        s=d[name]
        assert s["shots"]==d["shots"] and s["trials"]==d["trials"]
        roc=s["roc"]
        assert roc[0]=={"falseAlarmProbability":0,"detectionProbability":0}
        assert roc[-1]=={"falseAlarmProbability":1,"detectionProbability":1}
        for a,b in zip(roc,roc[1:]):
            assert 0<=a["falseAlarmProbability"]<=b["falseAlarmProbability"]<=1
            assert 0<=a["detectionProbability"]<=b["detectionProbability"]<=1
        assert s["auc"]==pytest.approx(np.trapezoid([p["detectionProbability"] for p in roc],[p["falseAlarmProbability"] for p in roc]))
        for metrics in [s]+[point[name] for point in d["sweep"]]:
            assert metrics["missProbability"]==1-metrics["detectionProbability"]
            assert metrics["errorProbability"]==(metrics["falseAlarmProbability"]+metrics["missProbability"])/2
            assert metrics["detectionProbability"]==metrics["detectionCount"]/d["trials"]
            assert metrics["falseAlarmProbability"]==metrics["falseAlarmCount"]/d["trials"]
            assert metrics["threshold"]==pytest.approx((metrics["exactH0Score"]+metrics["exactH1Score"])/2)


def test_seed_reproducibility_and_uninformative_case():
    req=ComparisonRequest(reflectivity=0,shots=512,trials=200)
    first=simulate_comparison(req)
    assert first==simulate_comparison(req)
    second=simulate_comparison(req.model_copy(update={"seed":7}))
    assert first.quantum.mean_h0_score!=second.quantum.mean_h0_score
    for strategy in (first.quantum,first.control):
        assert strategy.exact_h0_score==strategy.exact_h1_score
        assert strategy.error_probability==pytest.approx(.5,abs=.1)
        assert strategy.auc==pytest.approx(.5,abs=.1)
    # Do not require either strategy to outperform the other.


@pytest.mark.parametrize("trials",[200,500,1000])
def test_trial_choices(trials):
    assert simulate_comparison(ComparisonRequest(trials=trials,shots=512)).control.trials==trials


@pytest.mark.parametrize("payload",[
 {"reflectivity":-.1},{"reflectivity":1.1},{"backgroundNoise":1.1},{"channelNoise":.51},
 {"reflectivity":True},{"backgroundNoise":".1"},{"channelNoise":-.1},
 {"shots":100},{"shots":True},{"trials":100},{"trials":1001},{"trials":True},
 {"trials":500.5},{"seed":-1},{"seed":2**32},{"seed":True},{"targetPresent":True},{"unknown":1},
])
def test_validation(payload):
    assert request("POST","/simulate/compare",json=payload).status_code==422


@pytest.mark.parametrize("error,status",[(SimulationError("private"),503),(RuntimeError("private"),500)])
def test_safe_errors(monkeypatch,error,status):
    def fail(_): raise error
    monkeypatch.setattr(routes,"simulate_comparison",fail)
    response=request("POST","/simulate/compare",json={})
    assert response.status_code==status and "private" not in response.text
