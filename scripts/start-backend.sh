#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
if [[ ! -x .venv/bin/python ]]; then
  echo 'Missing backend/.venv. Run: python3.12 -m venv backend/.venv && backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt' >&2
  exit 1
fi
.venv/bin/python -c 'import sys; assert sys.version_info[:2] == (3,12), "Use Python 3.12 for the tested dependencies"'
if [[ -f .env ]]; then set -a; source .env; set +a; fi
exec .venv/bin/python -m uvicorn app.main:app --host "${BACKEND_HOST:-127.0.0.1}" --port "${BACKEND_PORT:-8000}"
