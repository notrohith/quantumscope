#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -d node_modules ]]; then echo 'Missing node_modules. Run npm ci first.' >&2; exit 1; fi
if [[ ! -f .env.local && -z "${NEXT_PUBLIC_API_URL:-}" ]]; then cp .env.example .env.local; fi
if [[ "${1:-}" == "--production" ]]; then
  exec npm run start -- --port "${FRONTEND_PORT:-3000}"
fi
exec npm run dev -- --port "${FRONTEND_PORT:-3000}"
