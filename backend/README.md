# QuantumScope backend

FastAPI plus real Bell-state, Noise Lab, and qubit illumination-inspired simulation, and matched control comparison. Hardware access and persistence remain unimplemented.

## Run locally

Tested with Python 3.12.13. Use Python 3.12+ with compatible wheels for the pinned dependencies.

```bash
cd /Users/rohith/Documents/ChatGPT/QUANT/backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
export ALLOWED_ORIGINS=http://localhost:3000
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

For runtime-only installation, use `requirements.txt`. On this Mac, the tested Python is `/opt/homebrew/bin/python3.12`; the system `python3` is 3.9 and must not be used. Configuration is read from the process environment. `backend/.env.example` is documentation, not automatically loaded.

In another terminal:

```bash
cd /Users/rohith/Documents/ChatGPT/QUANT/backend
source .venv/bin/activate
python -m pytest -q
python -m pip check
```

## Endpoints

- `GET /health`: `{ "status": "ok", "service": "quantumscope-backend", "simulation_engine": "qiskit-aer" }`. Confirms this service is reachable; not a hardware health check or per-request simulation test.
- `POST /simulate/entanglement`: runs one ideal two-qubit experiment.
- Interactive OpenAPI documentation: http://localhost:8000/docs.
- `POST /simulate/noise`: exact mixed-state noise metrics, sampled measurements, and an exact sweep.
- `POST /simulate/illumination`: Bell receiver with separate H0/H1 repeated detection trials.
- `POST /simulate/compare`: matched transmitters and environments, empirical ROC/AUC, and background-error sweep.

Example request:

```bash
curl http://localhost:8000/simulate/entanglement \
  -H 'Content-Type: application/json' \
  -d '{"state":"phi_plus","shots":2048,"seed":42}'
```

State IDs: `phi_plus`, `phi_minus`, `psi_plus`, `psi_minus`. The frontend converts existing human-readable labels at its API boundary. `shots` defaults to 2048; allowed integer values are 512, 1024, 2048, 4096, 8192. `seed` defaults to 42 and accepts integers from 0 to 2^32−1. Booleans, noninteger shots, unknown fields, unsupported states, and invalid ranges return HTTP 422.

The response retains the frontend's `concurrence`, `fidelity`, `reducedEntropy`, `zzCorrelation`, and `measurements` fields. It also returns `state`, `shots`, `seed`, `counts`, `engine: "qiskit-aer"`, and `bitOrder: "q0q1"`. Probabilities appear only in `measurements` (fractions, not percentages); no duplicate probability map is included. Every response contains all four outcomes, including zero counts.

Aer execution failures return HTTP 503 with a short message. Unexpected failures return HTTP 500 with a generic message. Server logs retain diagnostics, while HTTP responses never include raw tracebacks.

## Scientific implementation

`prepare_bell_state` begins from |00>, applies H(q0), then CX(q0,q1). Ψ states add X(q1). Minus states add Z(q0). Thus in displayed q0q1 order the states are:

- Φ+: (|00> + |11>)/√2
- Φ−: (|00> − |11>)/√2
- Ψ+: (|01> + |10>)/√2
- Ψ−: (|01> − |10>)/√2

There are two independent branches after preparation:

1. `Statevector.from_instruction` constructs the exact unmeasured state. Qiskit's `concurrence`, `state_fidelity` against an independently defined matching Bell reference, `entropy(partial_trace(state, [1]), base=2)`, and `expectation_value(Pauli("ZZ"))` calculate the metrics. No metric is inferred from shot counts. Scalars are converted to native floats and rounded to 12 decimal places only at response serialization, normalizing negative zero.
2. A copy of the circuit receives measurements. `AerSimulator(method="statevector", max_parallel_threads=1)` executes the transpiled circuit for the requested shot count. Returned probabilities equal actual counts divided by shots. Seed 42 is used by default for stable presentation results; an optional request seed overrides it. Identical requests are reproducible in the tested software environment; exact random sequences are not guaranteed across future versions or platforms.

### Bit and operator ordering

Qiskit state amplitudes and Pauli strings use q1q0: the rightmost Pauli acts on q0. The UI's counts and measurement labels explicitly use **q0q1**: left bit = q0, right bit = q1. Measurements map q0 to c0 and q1 to c1; Aer returns c1c0 strings, which are reversed exactly once by `normalize_counts`. Statevector references remain in Qiskit's native ordering. ZZ is symmetric under reversal, so tests also measure asymmetric |10> and |01> preparations to verify the mapping independently.

Computational-basis histograms cannot distinguish a Bell state's plus/minus relative phase. Phase-sensitive XX and YY expectations are tested internally but intentionally not added to the API or UI.

## CORS

Only `http://localhost:3000` is allowed by default, with GET/POST and Content-Type; credentials are disabled. Override using a comma-separated `ALLOWED_ORIGINS` process variable. Opening the frontend at another origin, including `http://127.0.0.1:3000`, requires adding that exact origin. No wildcard production policy is enabled.

## References

- [Qiskit quantum-information API](https://quantum.cloud.ibm.com/docs/en/api/qiskit/quantum_info)
- [AerSimulator API](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.AerSimulator.html)

## Noise Lab contract and physics

```bash
curl http://localhost:8000/simulate/noise \
  -H 'Content-Type: application/json' \
  -d '{"state":"phi_plus","model":"readout_error","strength":0.2,"shots":2048,"seed":42}'
```

`state`, `model`, and `strength` are required. Model IDs: `depolarizing`, `amplitude_damping`, `phase_damping`, `readout_error`. Strength is a number in [0, 0.5]. Shots and seed have the same validation/defaults as Entanglement. Unexpected fields and invalid values return 422. Runtime failures use the same sanitized 503/500 responses.

Placement: prepare the selected ideal Bell state, then apply the SAME supported single-qubit channel ONCE to q0 and ONCE to q1, independently, before measuring. There is no gate-dependent or correlated noise. Readout error instead acts on each measured classical bit only.

- `depolarizing_error(p, 1)`: E(ρ)=(1−p)ρ+p I/2. Thus p is the mixing parameter; total nonidentity Pauli-error probability is 3p/4.
- `amplitude_damping_error(γ, excited_state_population=0)`: zero-temperature |1>→|0> decay with probability γ. Φ and Ψ responses can differ.
- `phase_damping_error(p)`: populations unchanged; each single-qubit off-diagonal scales by √(1−p). This is not a phase-flip probability.
- `ReadoutError([[1−p,p],[p,1−p]])`: independent symmetric classical bit flips. Underlying concurrence, fidelity, entropy, and quantum ZZ remain unchanged.

`noise_models.py` constructs Aer errors. `noise.py` creates the ideal `DensityMatrix`, converts a channel with `to_quantumchannel()` (SuperOp), and applies `evolve` on qargs [0], then [1]. Shared `exact_metrics` supports pure and mixed states; fidelity uses the matching independent Bell reference. Reduced subsystem entropy is S(Tr_q1 ρ) in bits and is not a standalone mixed-state entanglement measure.

The sampling circuit appends the same quantum-error instruction on both qubits after preparation, then measures with `AerSimulator(method="density_matrix")`. For readout it instead passes an Aer `NoiseModel` containing local readout errors. Counts pass through the shared q0q1 normalization. Measured ZZ = (n00+n11−n01−n10)/shots; exact quantum ZZ = Tr(ρ ZZ).

Response fields: request metadata, counts, measurements, initialConcurrence, finalConcurrence, fidelity, reducedEntropy, quantumZZCorrelation, measuredZZCorrelation, trend, engine, bitOrder. Established `model`/`strength` and `trend`/`noise` names are retained. There are no duplicate correlation fields. Entanglement's API is unchanged. See the actual tested [request](examples/noise-request.json) and [full response](examples/noise-response.json).

`trend` contains exactly 11 points at 0,.05,…,.5, each with noise, concurrence, fidelity, reducedEntropy, quantumZZCorrelation, measuredZZCorrelation. All sweep values are exact. Its measuredZZCorrelation is the **expected recorded correlation**, calculated from classical transition probabilities for readout; it is not the finite-shot top-level measuredZZCorrelation. The classical transform uses the tensor product of the transposed row-stochastic readout matrices. Only the selected strength is transpiled and sampled. Seed affects measurements but never the exact sweep.

Tests compare depolarizing sweeps with analytic Bell-mixture formulas, amplitude damping with analytic populations and Φ/Ψ concurrence, phase damping with preserved populations/coherence decay, and readout with ±(1−2p)². An independently constructed Werner mixture checks mixed-state concurrence. Density matrices are checked for trace, Hermiticity, and positive semidefiniteness. The Noise endpoint contains no target model; illumination is implemented separately below.

Model references: [Aer noise API](https://qiskit.github.io/qiskit-aer/apidocs/aer_noise.html), [depolarizing](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.depolarizing_error.html), [phase damping](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.phase_damping_error.html).

## Illumination-inspired target model

This is a discrete-variable qubit model inspired by quantum illumination and does not reproduce the full bosonic optical quantum-illumination protocol. No canonical 6 dB advantage, optical bath equivalence, or radar-equivalent performance is claimed.

`illumination.py` reuses Bell preparation, Aer sampling, count normalization, and supported Qiskit channels. Native matrix order is q1q0: q0 signal, q1 ideal local idler.

- Prepare ρBell = |Φ+⟩⟨Φ+|.
- Let D_p act on signal as (1−p)ρ + p(I_signal/2 ⊗ Tr_signal ρ), with tensor factors arranged in native q1q0 order.
- H1 = D_c ∘ D_b ∘ AD_(1−η)(ρBell), on q0 only.
- H0 = D_c ∘ D_b(|0⟩⟨0|_signal ⊗ ρ_idler), where ρ_idler=I/2 and the signal is an independent replacement. In code, native ordering is `idler.tensor(signal)`.
- Reflectivity η ∈ [0,1] controls excited-state survival through amplitude damping. Background b ∈ [0,1] controls environmental mixing. Propagation c ∈ [0,.5] adds depolarizing decoherence. D_b and D_c share the same mathematical family and have combined visibility (1−b)(1−c); they are not separately identifiable from these observations.
- At η=0 the hypotheses coincide; at b=1 both become I/4. H0 has no signal–idler correlations. Neither hypothesis changes the reduced stored idler.

Apply inverse Bell transform CX(q0,q1), H(q0), then measure. The 00 receiver outcome projects onto Φ+. Exact receiver probabilities are calculated from the density matrices. An independent analytic sanity reference is p0=1/4 and p1=1/4+(1−b)(1−c)(η+2√η)/4. The implementation computes probabilities with Qiskit, not this formula.

Threshold τ=(p0+p1)/2 is deterministic exact-model calibration, calculated before evaluation samples. It presumes the chosen model parameters are known; it is not claimed to optimize error or generalize to unknown environments. Classify score > τ as target, score ≤ τ as no target.

For each hypothesis, draw `trials` independent Binomial(shots,p_h) Bell-match counts with independent NumPy SeedSequence child streams. Each score is count/shots. This exactly reproduces the fixed-circuit IID Bell-match count distribution without retranspiling hundreds of identical circuits. Pd and Pfa are empirical decision fractions, Pm=1−Pd, and Pe=(Pfa+Pm)/2 under equal priors. Ensemble means are sampled. This does not model random target fluctuations between trials.

A third independent stream seeds one actual Aer observation of the user-selected hypothesis, using `set_density_matrix`, the inverse Bell receiver, and shared density-matrix sampling. Its receiverScore and full four-outcome histogram are separate from evaluation trials. Toggling targetPresent does not change the ensembles. Identical requests reproduce in the tested environment; sequences may change with library versions/platforms. Finite-trial rates are estimates, not posterior confidence; zero observed errors does not imply zero true error.

Request defaults: targetPresent=true, reflectivity=.1, backgroundNoise=.25, channelNoise=.1, shots=2048, trials=200, seed=42. Trials allow 100/200/500 per hypothesis. Shots allow 512/1024/2048/4096/8192. Seed is an integer in [0,2^32−1]. Pydantic rejects invalid types, ranges, unknown fields, and unsupported resources. The calibrated threshold is not a request parameter. Execution errors remain sanitized 503/500 responses.

Response: echoed request, receiverScore, threshold, decision, detectionProbability, falseAlarmProbability, missProbability, errorProbability, meanH0Score, meanH1Score, exactH0Score, exactH1Score, detectionCount, falseAlarmCount, counts, measurements, engine=qiskit-aer, model=qubit-illumination, bitOrder=q0q1, thresholdMethod=exact-model-midpoint, trialSampling=exact-probability-binomial. See [actual request](examples/illumination-request.json) and [full response](examples/illumination-response.json).

Tests check H0 product structure, retained idler, channel/state validity, coincidence at zero survival/full background, analytic Bell-projector probabilities, controlled monotonicity, receiver bit order, threshold ties, empirical-vs-binomial rates, metric identities, reproducibility, target-toggle independence, validation, and safe failures. Existing Entanglement/Noise regression tests remain active.

References: [Aer amplitude damping](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.amplitude_damping_error.html), [Aer state initialization](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.library.SetDensityMatrix.html), [NumPy binomial sampling](https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.binomial.html).

## Quantum-correlated vs unentangled control

`comparison.py` prepares Bell Φ+ or a product control state |+⟩_signal ⊗ I_reference/2. In native q1q0 order the control is `DensityMatrix(I/2).tensor(DensityMatrix.from_label("+"))`. The signal has the same Z populations (1/2,1/2) as the Bell signal, while using local coherence instead of entanglement. Both retain one qubit; the control reference is independent and uninformative. Preparation gate complexity, full marginal density matrices, and receiver architectures are not identical. The control is meaningful but is not claimed to be an optimal classical detector.

Both use `target_hypotheses` from `target_model.py`, also used by the original Illumination endpoint. H1 applies signal-only AD(1−η), D_b, D_c. H0 replaces signal independently with |0⟩ before D_b and D_c. Reference is retained without noise. Reflectivity, environmental parameters, shots, trials per hypothesis, and equal priors are matched. No extra loss is added to the control.

Quantum receiver: inverse Bell CX(0,1), H(0), success 00. Control receiver: H(0), score signal X=+ regardless of reference; in native q1q0 probabilities sum indices 0 and 2. H0 has no X coherence and H1 can retain it. Independent analytic control probabilities for tests are p0=1/2 and p1=1/2+(1−b)(1−c)√η/2. These formulas are not used to fabricate results.

All 40 receiver/state combinations (two strategies × two hypotheses × selected point plus nine sweep points) are evaluated in one `AerSimulator(method="density_matrix")` batch with `save_probabilities`. There are no measurements or stochastic trajectory instructions in this exact batch; `shots=1` is an execution setting and does not replace the user's shots per observation. Independent Binomial(request.shots,p_h) counts then generate the requested number of observations. `detection.py` shares sampling and metric calculations with Illumination. No additional dependency is required.

Each strategy uses τ=(p0+p1)/2 before sampling; strict score > τ declares H1. These different numerical thresholds use the same calibration rule, not a shared arbitrary numeric cutoff on different score scales. Pd/Pfa count H1 declarations in each hypothesis, Pm=1−Pd, Pe=(Pfa+Pm)/2. The threshold is not optimized on evaluation samples or claimed optimal. Parameters are presumed known for model calibration.

SeedSequence(seed) spawns a stream per selected/sweep point, then per strategy, then per hypothesis, using the same IID binomial/independent-stream policy as Illumination. Neither seed selection nor identical favorable random numbers are used to guarantee advantage. Standalone Illumination retains its original stream policy and outputs. Repeated requests reproduce in the tested environment; streams may differ across versions/platforms.

ROC construction sorts all distinct observed scores, sweeps strict thresholds downward, moves tied scores together, and adds decisions below/above all scores. FPR and TPR increase from (0,0) to (1,1), retaining vertical segments. Duplicate identical points are removed, not inconvenient outcomes. NumPy trapezoidal integration computes AUC in returned point order. ROC and AUC are empirical; no smoothing, reordering by favorable outcomes, or automatic inversion is performed. AUC may be below .5 under sampling variation.

Background sweep: 0,.1,…,.8. Each point holds reflectivity, propagation noise, shots, trials, and priors fixed for both strategies. Each uses a fresh independent ensemble and midpoint calibration. Selected-point and sweep estimates can differ even at the same background because they use different samples. No strict finite-sample monotonicity is assumed.

Request defaults: reflectivity=.1, backgroundNoise=.25, channelNoise=.1, shots=2048, trials=500, seed=42. Trials accept 200/500/1000. Shared `TargetRequest` retains the original range/type validation; unknown fields, including targetPresent, are rejected. Response echoes settings and includes quantum/control metrics, resource counts, ROC/AUC, nine-point sweep, equal priors, exact-model-midpoint thresholdMethod, exact-probability-binomial trialSampling, model=qubit-comparison, engine=qiskit-aer. See the actual [request](examples/comparison-request.json) and [full response](examples/comparison-response.json).

Confidence intervals are omitted. All probabilities derived from trial counts are labeled estimates, including zero observed errors. No significance or universal advantage claim is made. No hardware, optical bosonic model, or experiment persistence is added.
