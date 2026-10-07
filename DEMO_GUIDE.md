# QuantumScope presentation — 7 minutes

## Before presenting

- Install dependencies and run both startup helpers from README. Prefer the tested local backend for the live demonstration.
- Open `/health`, then QuantumScope. Confirm **Connected**; use **Check connection** after restarting the backend.
- Rehearse at 1366×768 or the projector resolution. Keep terminal logs available.
- Export existing history before clearing it. Do not clear browser storage during the presentation.
- Preset buttons fill controls only. Each experiment requires clicking its Run button.

## Exact tested settings

All presets use 2048 shots and seed 42. The seed is the backend default where no seed control is shown.

| Lab / button                 | Settings                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Ideal Bell Pair              | Bell Φ+, 2048 shots                                                                         |
| Moderate Depolarizing Noise  | Bell Φ+, Depolarizing, strength 0.20, 2048 shots                                            |
| Readout comparison           | Same Bell state/shots and strength 0.20; change model to Readout Error                      |
| Weak Target / Moderate Noise | Target present, reflectivity 0.10, background 0.25, channel 0.10, 200 trials per hypothesis |
| Same Conditions Comparison   | Reflectivity 0.10, background 0.25, channel 0.10, 500 trials per hypothesis per strategy    |

Observed in the recorded local smoke run: moderate depolarization gave concurrence 0.46 and fidelity 0.73. Readout retained concurrence 1. The illumination observation had Bell-match score 0.375; its empirical Pd/Pfa/Pe were 1/0/0. Both comparison receivers had empirical Pe=0 and AUC=1 for the default preset. These are finite-trial results for this seed and model, not guarantees or evidence of universal advantage. Raw settings and actual outcomes are in `reports/final-smoke.json`.

A neutral optional stress case is reflectivity 0.01, background 0.95, channel 0.40, 2048 shots, 500 trials, seed 42. The recorded run gave quantum Pe=0.494 and control Pe=0.470. Show this only if time permits to explain that the app does not force a quantum win.

## Timed flow

**0:00–0:40 — Problem and scope.** Explain that the application explores quantum correlations and target decisions using a simplified two-qubit model. It is a simulator, not a complete optical or radar experiment.

**0:40–1:30 — Entangle a Bell pair.** Click Ideal Bell Pair, then Run Simulation. Point out concurrence 1 and sampled equal-bit outcomes. Switch the state to preview X/Z gates; explain that the previous result remains labeled until another run completes.

**1:30–2:30 — Add physical noise.** Open Noise, apply Moderate Depolarizing Noise, then Run. Show lower concurrence, the density-matrix sweep, and sampled measurements.

**2:30–3:10 — Separate readout from quantum noise.** Keep strength 0.20 and choose Readout Error; Run again. Quantum concurrence remains unchanged while recorded outcomes can flip. Follow the changed pipeline order.

**3:10–4:25 — Introduce and run target detection.** Follow signal, target/noise, return, and ideal stored idler into the Bell receiver. Apply Weak Target / Moderate Noise and Run. Distinguish the one-observation Bell-match score from Pd/Pfa estimated over repeated H0/H1 trials. The target toggle selects the observation, not which hypotheses are used for rate estimates.

**4:25–5:45 — Compare strategies.** Apply Same Conditions Comparison and Run. Explain matched resources and the unentangled |+⟩ control. Both can perform equally well here. Show ROC and the background sweep; do not present equality or a favorable point as universal quantum advantage.

**5:45–6:25 — Results and provenance.** Open Results, filter one experiment type, expand a record, identify Qiskit Aer/model/seed, and export CSV. History is browser-local; no database exists.

**6:25–7:00 — Limitations and future work.** State ideal idler, simplified channels, finite sampling, non-optimal receivers, and the absence of a full bosonic optical model. Mention future hardware, calibrated noise, tomography, idler noise, Gaussian/SPDC models, improved receivers, larger sweeps, and backend persistence as future work only.

## Emergency recovery

If the backend disconnects, do not substitute fictitious results. Explain the visible error, show saved real records or Methodology, restart `./scripts/start-backend.sh`, and click Check connection. For port conflicts or Python/dependency issues, follow README troubleshooting. Keep the locally built frontend and installed backend available if remote hosting becomes unreliable. No service-worker offline frontend is provided.
