# QuantumScope

Quantum Correlation & Illumination Simulator: an educational/research platform for exploring discrete-variable qubit models with real Qiskit Aer calculations.

**All four labs are live-only.** A disconnected backend produces an error, never substitute fixture results. This application does not reproduce a complete optical bosonic quantum illumination experiment.

## Architecture

```text
Next.js / React / TypeScript (browser)
  ├─ localStorage: latest 100 successful experiments + CSV export
  └─ HTTP → FastAPI / Python 3.12
              └─ Qiskit + Qiskit Aer + NumPy trial sampling
```

No backend database, authentication, quantum hardware execution, or required Docker installation.

## Features

- **Entanglement Lab:** Φ+, Φ−, Ψ+, Ψ−; exact state metrics, sampled Aer counts, and a state-aware conceptual circuit.
- **Noise Lab:** depolarizing, amplitude damping, phase damping, and classical readout flips; exact 11-point sweeps and sampled measurements.
- **Quantum Illumination:** a signal-only target/environment model, ideal stored idler, Bell receiver, H0/H1 trial ensembles, and a single Aer observation.
- **Quantum vs Control:** a specified unentangled control under matched resources, empirical ROC/AUC, and nine-point background sweeps.
- **Experiment Results:** browser-local history, search/type filters, date sorting, run details, confirmed clear, and filtered CSV.
- **Overview, Methodology, Demo Guide:** live activity, model documentation, and a concise presentation sequence.
- Preset buttons only populate controls; click **Run** to calculate.

## Requirements

- Node.js **20.19 or newer** compatible with the pinned frontend; `.nvmrc` selects Node 22. The final local validation used Node 25.9.0 / npm 11.12.0.
- **Python 3.12**, tested with 3.12.13 on macOS arm64. Use this version for the pinned scientific wheels; do not use the system Python 3.9.
- Internet for initial dependency installation. Once installed, local simulations require neither cloud credentials nor an internet connection. External documentation links do require internet.

## Installation

### Downloaded ZIP: setup on another laptop

Extract `QuantumScope.zip` completely, then open a terminal inside its `QuantumScope` folder (the folder containing this README and `package.json`). Install **Node.js 22 LTS** and **Python 3.12** first. Check `node --version` and `npm --version`. The ZIP contains source, tests, pinned Python requirements, and `package-lock.json`; installed packages, local environment files, and compiled builds are intentionally excluded. The first setup needs internet.

**macOS / Linux:**

```bash
npm ci
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install --upgrade pip
backend/.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env.local
cp backend/.env.example backend/.env
```

In terminal 1, from the extracted project folder:

```bash
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In terminal 2, from the same folder:

```bash
npm run dev
```

**Windows PowerShell:**

```powershell
node --version
py -3.12 --version
npm.cmd ci
py -3.12 -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env.local
Copy-Item backend/.env.example backend/.env
```

In terminal 1, from the extracted project folder:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In terminal 2, from the same folder:

```powershell
npm.cmd run dev
```

These commands use the virtual environment directly; activation and PowerShell execution-policy changes are unnecessary. If `py -3.12` is unavailable, install Python 3.12 with the Python launcher enabled. On Windows, `npm.cmd` avoids PowerShell blocking `npm.ps1`.

Keep both terminals open. Visit **http://localhost:3000** and confirm the backend status is Connected. Check **http://localhost:8000/health** if needed. Run Entanglement → Noise → Illumination → Comparison; use Results to inspect or export successful runs. Stop each service with Ctrl+C.

For a presentation build, stop the development frontend, run `npm run build -- --webpack`, then `npm run start` (use `npm.cmd` on Windows). The supported Webpack option also avoids a local Turbopack CSS-worker issue encountered during packaging. Keep the backend running.

Browser experiment history is not bundled or transferred to the new laptop. It starts empty and remains browser-local; export CSV separately if you need your existing results. No backend database exists. The scientific dependency pins were validated on macOS ARM64; installation on another OS depends on compatible Python 3.12 wheels and has not been tested here.

### Existing checkout

From the repository root:

```bash
npm ci
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cp -n .env.example .env.local
cp -n backend/.env.example backend/.env
```

If using nvm, run `nvm install && nvm use` first. Install Python 3.12 with your OS package manager or python.org if `python3.12` is unavailable. All Python commands below use the project virtual environment, not global packages.

## Running locally

Terminal 1, from the repository root:

```bash
./scripts/start-backend.sh
```

Terminal 2, from the repository root:

```bash
./scripts/start-frontend.sh
```

Open [QuantumScope](http://localhost:3000), [backend health](http://localhost:8000/health), or [interactive API docs](http://localhost:8000/docs). The backend helper loads `backend/.env`. Without that file, local origins are allowed by default. The frontend helper copies the example if no local configuration or exported API URL exists.

For a local production presentation build:

```bash
npm run build
./scripts/start-frontend.sh --production
```

Stop the development frontend first so port 3000 is free. Keep the backend terminal running. `BACKEND_PORT`, `BACKEND_HOST`, and `FRONTEND_PORT` override helper defaults; changing ports also requires matching API URL and CORS configuration.

## Environment variables

| Location                           | Variable              | Value / meaning                                                                            |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `.env.local`                       | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` locally; backend HTTPS URL in production                           |
| `backend/.env` or host environment | `ALLOWED_ORIGINS`     | Comma-separated exact frontend origins, e.g. `http://localhost:3000,http://127.0.0.1:3000` |

There are no active demo or per-feature live flags. Old `NEXT_PUBLIC_DEMO_MODE` and `NEXT_PUBLIC_LIVE_*` variables are ignored and should be removed. Public frontend variables are bundled at build time: restart dev or rebuild/redeploy after changing the API URL. They must never contain secrets.

CORS accepts explicit HTTP(S) origins only, with no paths or wildcard. Credentials are disabled. Add the exact deployed frontend domain (and any intentionally supported preview domain); CORS is not authentication.

## Scientific model

Bell preparation uses H(q0), CX(q0,q1), then X(q1) for Ψ states and Z(q0) for minus states. Exact metrics use an unmeasured statevector; Aer samples a measured copy. Displayed bits are q0q1.

Physical noise applies the same local channel independently to both qubits. Depolarizing uses D_p(ρ)=(1−p)ρ+pI/2; amplitude damping relaxes |1⟩ toward |0⟩; phase damping preserves populations. Readout errors flip recorded classical bits and leave the pre-measurement state, concurrence, and quantum ZZ unchanged. Mixed-state subsystem entropy is not a standalone entanglement measure.

Illumination prepares Φ+, with q0 signal and q1 ideal stored idler. H1 applies amplitude damping with decay 1−η, then background and propagation depolarizing channels on signal only. H0 independently replaces the signal with |0⟩ before the same environmental channels, retaining the reduced reference. At η=0 the hypotheses coincide. The inverse Bell receiver measures the 00 fraction, a Bell-match score.

The control sends |+⟩ with an independent I/2 reference and uses a signal X-basis receiver. Both strategies have identical shots, trials, channels, and signal excited-state population 1/2. This is a specified separable benchmark, not an optimal classical detector.

Each receiver uses its own exact-model midpoint threshold; score strictly above threshold declares H1. Qiskit supplies exact receiver probabilities; independent seeded NumPy binomial draws generate repeated fixed-circuit trial counts. Illumination additionally samples one actual Aer observation. Pd and Pfa are empirical declaration rates; with equal priors Pe=½(Pfa+1−Pd). ROC sweeps observed scores, groups ties, and includes both endpoints; AUC uses trapezoidal integration.

See [backend model details](backend/README.md) and in-app Methodology for the implemented conventions.

## Limitations

- Discrete-variable qubits, not a full optical/bosonic/Gaussian QI protocol, SPDC source, thermal optical bath, radar model, or physical performance claim.
- Ideal idler storage; simplified signal-only loss/background/propagation. Background and channel use the same family, with combined visibility (1−b)(1−c), so this receiver cannot separately identify them.
- Receivers and midpoint thresholds are not globally optimal. Matched shot/trial budgets and excitation populations do not match every preparation resource or full density matrix.
- Finite-trial estimates have sampling uncertainty. Zero observed errors is not proof of zero true error; no confidence intervals or significance test is supplied, and no universal quantum advantage is established.
- Pure-state entropy interpretation does not extend to mixed states; computational-basis correlation alone does not certify entanglement.
- Browser-only records, no cross-device synchronization or server database. Full ROC and sweep arrays are not retained in history.
- The API has no authentication or rate limiting; this is a demonstration/research service, not a hardened public multi-tenant service. Browser timeout does not cancel an already-running server calculation.

## History and offline backup

History uses `quantumscope.experiments`, schema version 1, capped at 100 runs. Records include UUID, ISO UTC timestamp, configuration, scalar metrics, model, seed, engine, and LIVE SIMULATION provenance. Comparison strategy metrics remain separate. Display uses browser-local time; CSV uses ISO UTC, unrounded values, quoted fields, and blanks for missing values.

Clearing browser storage removes history. Export CSV before changing origin/profile or clearing it. Clear Results confirms removal of this history key only. Malformed/unsupported data and quota errors produce warnings; failed persistence keeps runs in memory for the visit. Cross-tab updates are best effort, not transactional.

If the backend stops, controls, existing history, and Methodology stay available while the frontend is running. The sidebar updates on failed/successful requests, browser connectivity events, or **Check connection**; there is no polling. Restore the local backend to calculate again. This is not a service-worker/PWA offline frontend or an emergency mock mode.

## Testing

```bash
(cd backend && .venv/bin/python -m pytest -q)
backend/.venv/bin/python -m pip check
npm run test:history
npm run test:polish
npm run build
npm run lint
npm run typecheck
npm run format:check
git diff --check
```

With the backend running:

```bash
backend/.venv/bin/python scripts/smoke-test.py
```

The HTTP matrix covers four Bell states, four noise models, four illumination cases, and three comparison settings. It verifies echoed configuration, core probability/error/ROC invariants, health and docs, and writes actual measurements to [reports/final-smoke.json](reports/final-smoke.json). `test:polish` compares the frontend Bell-gate map with actual backend instructions. `test:history` uses isolated storage and validates live-only behavior, legacy-flag rejection, errors, CSV values, refresh, clearing, schema recovery, and retention.

Final backend validation: **169 passed, 0 failed**. Local HTTP timings on this development machine (15 requests, not a universal benchmark):

| Request      | Samples | Median  | Range        |
| ------------ | ------- | ------- | ------------ |
| Entanglement | 4       | 20.5 ms | 20.2–91.1 ms |
| Noise        | 4       | 16.1 ms | 8.4–18.2 ms  |
| Illumination | 4       | 11.5 ms | 11.1–11.9 ms |
| Comparison   | 3       | 32.3 ms | 31.7–32.4 ms |

Frontend timeouts: Entanglement 20s, Noise/Illumination 45s, Comparison 60s; health 5s. Remote cold starts and slower hardware can take longer. No optimization of the scientific algorithms was needed.

## Demo flow

Use [DEMO_GUIDE.md](DEMO_GUIDE.md) for the 5–8 minute script and exact tested presets. Open the in-app Demo Guide, confirm Connected, run Bell → Noise → Readout → Illumination → Comparison → Results, export CSV, and state the limitations. Equal receiver errors are a valid presentation result.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel frontend and Render/Python-host backend setup. The backend has a pinned Python runtime, requirements, Procfile/start command, configurable origins, and health endpoint. No remote deployment or hosting purchase is performed by these scripts.

## Troubleshooting

| Symptom                       | Action                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend not connected         | Start the backend helper; open `/health`; click Check connection. Check both terminals.                                                                                                                   |
| Wrong Python version          | Recreate the virtual environment with `python3.12 -m venv backend/.venv`; reinstall requirements using that interpreter. Preserve any files you added inside an existing environment before replacing it. |
| Port 8000 busy                | Inspect `lsof -nP -iTCP:8000 -sTCP:LISTEN`; stop the known old server with Ctrl+C, or use `BACKEND_PORT=8001` and update the API URL. Do not blindly kill an unknown process.                             |
| Port 3000 busy                | Stop the known frontend, or set `FRONTEND_PORT=3001` and include that origin in backend CORS.                                                                                                             |
| Frontend cannot connect       | Verify NEXT_PUBLIC_API_URL is reachable from the browser, not just the server. Restart/rebuild after changing it. HTTPS frontend needs an HTTPS API.                                                      |
| CORS error                    | Set ALLOWED_ORIGINS to the exact frontend origin, without a path; restart the backend. localhost and 127.0.0.1 are different origins.                                                                     |
| Dependency installation fails | Confirm Python 3.12, Node version, supported platform wheels, and network access. Use npm ci and the project venv; do not mix global Python packages.                                                     |
| Simulation timeout            | Check backend logs and health; warm the host before presenting, avoid concurrent runs, and retry. Use the tested local backend if a remote host is cold or slow.                                          |
| Lost history                  | Storage is browser/origin/profile-specific. Use a previously exported CSV; there is no backend copy.                                                                                                      |

ESLint 9 is retained for compatibility with the pinned Next.js lint stack despite its upstream deprecation. `pip check` validates the installed Python dependency set.

## Future work — not implemented

IBM Quantum hardware execution; T1/T2-calibrated device noise; tomography; idler-storage noise; bosonic/Gaussian QI; SPDC modeling; more sophisticated receivers; larger parameter sweeps; backend experiment persistence.
