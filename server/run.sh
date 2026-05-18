#!/usr/bin/env bash
# Run the server from its venv — no PATH lookups, no global uvicorn.
#
# This script intentionally invokes ./venv/bin/python directly. It does
# NOT `source venv/bin/activate`, because that just modifies PATH and
# still leaves room for `uvicorn` to resolve to a different binary.
#
# Usage:
#   ./run.sh           # uvicorn with --reload on :8000
#   PORT=8080 ./run.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="$HERE/venv"
PY="$VENV/bin/python"

if [[ ! -x "$PY" ]]; then
  echo "venv not found. Run: make setup" >&2
  exit 1
fi

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
exec "$PY" -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
