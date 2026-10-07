# Deployment preparation

No hosted resources have been created. Choose a host/plan explicitly in your own account. Keep the tested local installation available as the presentation backup.

## Frontend: Vercel or equivalent Next.js host

1. Import this repository; project root is the repository root; framework is Next.js.
2. Use Node 22 (the `.nvmrc` selection), install `npm ci`, and build `npm run build`. Keep the framework's output defaults.
3. Set `NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-HOST` for the intended deployment environment **before building**.
4. Deploy, then put the resulting exact frontend origin in backend `ALLOWED_ORIGINS`. Rebuild the frontend whenever the public API URL changes.
5. Verify all four labs, history, and export from the deployed browser origin. History from localhost does not migrate automatically.

Public environment variables are embedded at build time; never place secrets there. See [Vercel environment configuration](https://vercel.com/docs/environment-variables) and [Next.js environment-variable behavior](https://nextjs.org/docs/app/guides/environment-variables).

## Backend: Render or equivalent native Python host

Create a Python web service with:

| Setting        | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Root directory | `backend`                                                      |
| Python         | `3.12.13` via `.python-version` or `PYTHON_VERSION=3.12.13`    |
| Build command  | `python -m pip install -r requirements.txt`                    |
| Start command  | `python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"` |
| Health path    | `/health`                                                      |
| Environment    | `ALLOWED_ORIGINS=https://YOUR-FRONTEND-DOMAIN`                 |

`backend/Procfile` provides the equivalent start command for hosts that recognize it. Native Qiskit/Aer wheels and adequate memory/CPU are required; confirm the build on your chosen host before presenting. The repository was validated on macOS arm64, not on a deployed Linux host. See [Render Python runtime selection](https://render.com/docs/python-version) and [native runtimes](https://render.com/docs/native-runtimes).

Use comma-separated exact origins for multiple frontend domains. Wildcards and origin paths are rejected; credentials are disabled. Do not add arbitrary preview origins unless intended. CORS is a browser restriction, not API authentication.

## Release smoke checklist

- `/health` returns status `ok`; `/docs` and `/openapi.json` load.
- Frontend/API both use HTTPS; the API URL is browser-reachable.
- Allowed-origin POST preflight succeeds; unrelated origins are not allowed.
- Run `backend/.venv/bin/python scripts/smoke-test.py --url https://YOUR-BACKEND --output reports/hosted-smoke.json` from your local repository after deployment.
- Verify all four labs in the deployed frontend and export a real run.
- Stop/restart the host in a controlled rehearsal; check visible errors and recovery.
- Warm the host and inspect its limits before presentation. Idle/cold-start behavior is host/plan-specific; do not assume local request timings apply remotely.

The API has no authentication, rate limiting, or job queue. Add appropriate access controls before exposing it to an untrusted workload. Browser request timeout does not cancel CPU work already running on the server. This release prepares deployment; it does not claim hosted load testing or production security hardening.
