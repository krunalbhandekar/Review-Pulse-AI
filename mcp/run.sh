#!/usr/bin/env bash
# Run the MCP service from its venv — no PATH lookups, no global uvicorn.
#
# Invokes ./venv/bin/python directly so the venv's site-packages are
# what get imported, no matter what's on PATH (miniconda, system Python,
# etc.).
#
# Usage:
#   ./run.sh           # uvicorn with --reload on :9000
#   PORT=9090 ./run.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="$HERE/venv"
PY="$VENV/bin/python"

if [[ ! -x "$PY" ]]; then
  echo "venv not found. Run: make setup" >&2
  exit 1
fi

PORT="${PORT:-9000}"
HOST="${HOST:-0.0.0.0}"
exec "$PY" -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
