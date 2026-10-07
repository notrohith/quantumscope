"""Actual HTTP smoke matrix and local timing report; never inserts browser history."""
import argparse
import json
import platform
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:8000")
parser.add_argument("--output", default="reports/final-smoke.json")
args = parser.parse_args()
base = dict(reflectivity=.1, backgroundNoise=.25, channelNoise=.1, shots=2048, seed=42)
cases = [("entanglement", state, dict(state=state, shots=2048, seed=42)) for state in ["phi_plus", "phi_minus", "psi_plus", "psi_minus"]]
cases += [("noise", model, dict(state="phi_plus", model=model, strength=.2, shots=2048, seed=42)) for model in ["depolarizing", "amplitude_damping", "phase_damping", "readout_error"]]
cases += [("illumination", label, dict(base, targetPresent=present, trials=200, **changes)) for label,present,changes in [("present",True,{}),("absent",False,{}),("low-noise",True,{"backgroundNoise":0,"channelNoise":0}),("high-noise",True,{"backgroundNoise":.95,"channelNoise":.4})]]
cases += [("compare",label,dict(base,trials=500,**changes)) for label,changes in [("same-conditions",{}),("weak-high-noise",{"reflectivity":.01,"backgroundNoise":.95,"channelNoise":.4}),("stronger-low-noise",{"reflectivity":.3,"backgroundNoise":.1,"channelNoise":.05})]]
records=[]
with httpx.Client(base_url=args.url, timeout=65) as client:
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/docs").status_code == 200
    for endpoint,label,payload in cases:
        start=time.perf_counter()
        response=client.post(f"/simulate/{endpoint}",json=payload)
        elapsed=time.perf_counter()-start
        response.raise_for_status()
        r=response.json()
        assert r["engine"] == "qiskit-aer"
        assert all(r[key] == value for key,value in payload.items())
        if endpoint == "entanglement": assert abs(r["concurrence"]-1)<1e-8
        if endpoint == "noise" and label == "readout_error": assert abs(r["finalConcurrence"]-1)<1e-8
        metrics=[r["quantum"],r["control"]] if endpoint=="compare" else [r] if endpoint=="illumination" else []
        for metric in metrics:
            for field in ["detectionProbability","falseAlarmProbability","errorProbability"]: assert 0<=metric[field]<=1
            assert abs(metric["errorProbability"]-(metric["falseAlarmProbability"]+1-metric["detectionProbability"])/2)<1e-10
            if "roc" in metric:
                assert all(0<=point[k]<=1 for point in metric["roc"] for k in ["detectionProbability","falseAlarmProbability"])
                assert metric["roc"][0] == dict(detectionProbability=0,falseAlarmProbability=0)
                assert metric["roc"][-1] == dict(detectionProbability=1,falseAlarmProbability=1)
        summary={k:r[k] for k in ["concurrence","finalConcurrence","fidelity","receiverScore","decision","detectionProbability","falseAlarmProbability","errorProbability"] if k in r}
        if endpoint=="compare": summary={k:{field:r[k][field] for field in ["detectionProbability","falseAlarmProbability","errorProbability","auc"]} for k in ["quantum","control"]}
        records.append(dict(endpoint=endpoint,case=label,request=payload,seconds=round(elapsed,6),result=summary))
        print(f"PASS {endpoint}/{label}: {elapsed:.4f}s")
report=dict(timestamp=datetime.now(timezone.utc).isoformat(),machine=platform.platform(),python=platform.python_version(),base_url=args.url,cases=records)
report["timings"]={e:dict(samples=len(v),min=round(min(v),6),median=round(statistics.median(v),6),max=round(max(v),6)) for e in ["entanglement","noise","illumination","compare"] if (v:=[r["seconds"] for r in records if r["endpoint"]==e])}
output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report["timings"],indent=2))
