# MCP Makefile — same approach as server/Makefile.
#
# Every command binds explicitly to ./venv/bin/python so the venv's
# interpreter resolves imports from the venv's site-packages and *not*
# from a globally installed pydantic / fastapi / uvicorn (e.g. miniconda).
#
# Override PYTHON_BIN if `python3.11` on your PATH points at miniconda:
#     PYTHON_BIN=/opt/homebrew/opt/python@3.11/bin/python3.11 make setup
#     PYTHON_BIN="$$(pyenv which python3.11)" make setup

PYTHON_BIN ?= python3.11
VENV       := venv
PY         := $(VENV)/bin/python
PIP        := $(PY) -m pip
HOST       ?= 0.0.0.0
PORT       ?= 9000
APP        := app.main:app

.PHONY: help setup venv install dev run start clean reset doctor health freeze

help:
	@echo "Targets:"
	@echo "  setup    Wipe venv, recreate with $(PYTHON_BIN), install deps"
	@echo "  venv     Create $(VENV)/ using $(PYTHON_BIN)"
	@echo "  install  pip install -r requirements.txt into $(VENV)"
	@echo "  dev      Run uvicorn with --reload (from $(VENV))"
	@echo "  run      Run uvicorn without reload (from $(VENV))"
	@echo "  doctor   Print interpreter + fastapi/pydantic/uvicorn versions"
	@echo "  health   curl http://localhost:$(PORT)/health"
	@echo "  clean    Remove $(VENV)/ and __pycache__/"
	@echo "  reset    Alias for clean + setup"
	@echo "  freeze   Write current resolved versions to requirements.lock"

setup: clean venv install

venv:
	@command -v $(PYTHON_BIN) >/dev/null 2>&1 || { \
		echo "ERROR: $(PYTHON_BIN) not found on PATH."; \
		echo "Install Python 3.11 (brew install python@3.11 or pyenv install 3.11)"; \
		echo "or pass an explicit path: PYTHON_BIN=/full/path/to/python3.11 make setup"; \
		exit 1; \
	}
	$(PYTHON_BIN) -m venv $(VENV)
	$(PY) -m pip install --upgrade pip

install:
	$(PIP) install -r requirements.txt

dev:
	$(PY) -m uvicorn $(APP) --reload --host $(HOST) --port $(PORT)

run start:
	$(PY) -m uvicorn $(APP) --host $(HOST) --port $(PORT)

doctor:
	@echo "--- interpreter ---"
	@$(PY) -c "import sys; print('executable:', sys.executable); print('version:', sys.version.split()[0])"
	@echo "--- key package versions (from venv only) ---"
	@$(PY) -m pip list --format=columns 2>/dev/null | grep -iE '^(fastapi|pydantic|pydantic-settings|uvicorn|motor|pymongo|httpx|google-auth|google-api-python-client) ' || true
	@echo "--- importability smoke test ---"
	@$(PY) -c "import fastapi, pydantic, pydantic_settings, uvicorn, motor; \
print('fastapi', fastapi.__version__); \
print('pydantic', pydantic.VERSION); \
print('uvicorn', uvicorn.__version__)"

health:
	@curl -fsS http://localhost:$(PORT)/health || { echo; echo "Service not reachable on :$(PORT)"; exit 1; }
	@echo

clean:
	rm -rf $(VENV)
	find . -type d -name __pycache__ -prune -exec rm -rf {} +

reset: clean setup

freeze:
	$(PIP) freeze > requirements.lock
