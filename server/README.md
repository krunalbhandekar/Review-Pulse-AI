# Review Pulse AI — Server

FastAPI app for **Review Pulse AI**: hosts the user-facing API + the
report scheduler that drives weekly digests.

## Layout

```
app/
├── api/                # FastAPI routers + DI
│   ├── deps.py         # session_user_id, current_user, repo factories
│   └── routes/
│       ├── auth.py
│       ├── health.py
│       ├── products.py
│       ├── schedules.py
│       └── reports.py
├── config/             # Settings split: dataclasses + minimal Secrets
├── db/                 # Motor connection + index management
├── integrations/       # External service clients (MCP, Groq)
├── models/             # Pydantic models (Mongo-aware)
├── repositories/       # One repo per collection; all userId-scoped
├── scheduler/          # APScheduler dispatcher + nextRun maths
├── services/           # Domain logic (oauth, ingestion, summarisation, report)
├── utils/              # Logging, errors, id helpers
└── main.py             # FastAPI factory + lifespan
```

## Configuration model

There are **two surfaces**:

1. **Static configs** — code, not env. Live in `app/config/settings.py`
   as frozen dataclasses (`AppConfig`, `SessionConfig`, `MCPConfig`,
   `GroqConfig`, `SchedulerConfig`, `PipelineConfig`) and the
   `Collections` constant class. Operators change these by editing code
   + opening a PR.

2. **Secrets / deployment-specific values** — env, via `.env` or the
   platform's secret manager. Loaded by the `_Secrets` BaseSettings
   class. The full list is in [`.env.example`](.env.example):

   ```
   ENVIRONMENT
   MONGODB_URI
   SESSION_SECRET
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   GOOGLE_REDIRECT_URI
   POST_LOGIN_REDIRECT
   POST_LOGOUT_REDIRECT
   MCP_SERVER_URL
   MCP_SHARED_SECRET
   GROQ_API_KEY
   ```

   That's it. CORS origins are *derived* from the redirects; the
   MongoDB DB name is *parsed* from the URI; the production flag is
   *derived* from a single `ENVIRONMENT` variable:

   * `ENVIRONMENT=PRODUCTION` → `IS_PRODUCTION=true`
   * any other value (or unset) → `IS_PRODUCTION=false` (defaults to
     `DEVELOPMENT`)

   There is **no** separate `IS_PRODUCTION` env var, and no PaaS-specific
   fallback (`RENDER`, etc.) — set `ENVIRONMENT=PRODUCTION` explicitly on
   the platform.

## Running locally

We pin **Python 3.11** (see [`.python-version`](.python-version)). Every
Make target invokes `./venv/bin/python -m uvicorn` directly so the
venv's interpreter is always used — there is no PATH lookup of a bare
`uvicorn` binary, and no chance of miniconda's site-packages being
imported by accident.

### One-shot bootstrap

```bash
cd Review-Pulse-AI/server
cp .env.example .env       # fill in MONGODB_URI, SESSION_SECRET, OAuth, …
make setup                 # wipes ./venv, recreates with python3.11, pip installs
make dev                   # uvicorn --reload on :8000
```

### Manual equivalent

If you prefer raw commands (no `make`):

```bash
cd Review-Pulse-AI/server
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Note: `python -m uvicorn …` (not `uvicorn …`). Using the module form
makes the venv's interpreter own the import graph, which is the only
reliable way to avoid picking up another Python install's packages.

### Common targets

| Command       | What it does                                                |
| ------------- | ----------------------------------------------------------- |
| `make setup`  | Wipe + recreate venv with `$(PYTHON_BIN)`, install deps.    |
| `make dev`    | Run uvicorn with `--reload` on port 8000.                   |
| `make run`    | Run uvicorn without reload (production-ish).                |
| `make doctor` | Print interpreter path, version, and FastAPI/Pydantic pins. |
| `make health` | `curl http://localhost:8000/health`.                        |
| `make clean`  | Remove `venv/` and all `__pycache__/`.                      |
| `make reset`  | `clean` + `setup`.                                          |

OpenAPI docs at <http://localhost:8000/docs>. Health endpoint at
<http://localhost:8000/health>.

### Avoiding miniconda / global Python contamination

The error `ImportError: cannot import name 'Undefined' from
'pydantic.fields'` means a globally installed pydantic v1 (typically
miniconda's) was imported instead of the venv's pydantic v2. To make
sure that can't happen:

1. **Never run a bare `uvicorn`** — even with the venv activated,
   `uvicorn` is just a script with a shebang; on some systems that
   shebang points at conda's Python. Always use `python -m uvicorn …`,
   or just `make dev` / `./run.sh`.
2. **If `which python3.11` shows a miniconda path** (e.g.
   `/Users/you/miniconda3/bin/python3.11`), point the Makefile at a
   clean 3.11:

   ```bash
   # Homebrew
   PYTHON_BIN=/opt/homebrew/opt/python@3.11/bin/python3.11 make setup
   # pyenv
   PYTHON_BIN="$(pyenv which python3.11)" make setup
   ```

3. **Verify your venv after install**:

   ```bash
   make doctor
   # executable: /…/Review-Pulse-AI/server/venv/bin/python
   # version: 3.11.x
   # fastapi  0.115.0
   # pydantic 2.9.2
   # uvicorn  0.30.6
   ```

   If `executable:` is *not* under `Review-Pulse-AI/server/venv/bin`, the
   wrong Python is being used — re-run `make reset` with an explicit
   `PYTHON_BIN`.

4. **Don't activate conda environments in the same shell** before
   running these commands. `conda deactivate` first if needed.

The MongoDB URI **must** include the default DB name as its path,
e.g. `mongodb+srv://u:p@cluster.mongodb.net/mt_review_intelligence`.
Connection startup refuses to boot without it — that prevents
accidentally writing to the wrong database on a shared cluster.

## Auth

Session cookie only — no JWT. The flow:

1. `GET /auth/google/login` redirects to Google with `access_type=offline`.
2. `GET /auth/google/callback?code=...` exchanges the code, upserts the
   user, persists the token pair on `google_connections`, and stores
   `request.session["user_id"]`.
3. Protected routes depend on `session_user_id` →
   `NotAuthenticatedError` (401) when the cookie is missing/expired.

The session cookie is `https_only` automatically whenever
`settings.is_production` is true (i.e. when `ENVIRONMENT=PRODUCTION`).

## Render deployment

1. Create a **Web Service** pointing at this folder
   (`Review-Pulse-AI/server`).
2. Build command:
   ```
   pip install -r requirements.txt
   ```
3. Start command (Render injects `$PORT`). Use the module form so the
   venv's interpreter owns the import graph:
   ```
   python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Set environment variables — *only* the secrets in `.env.example`:

   | Key                   | Value                                                        |
   | --------------------- | ------------------------------------------------------------ |
   | `ENVIRONMENT`         | `PRODUCTION` (flips `IS_PRODUCTION=true`)                    |
   | `MONGODB_URI`         | `mongodb+srv://…/mt_review_intelligence`                     |
   | `SESSION_SECRET`      | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `GOOGLE_CLIENT_ID`    | from Google Cloud console                                    |
   | `GOOGLE_CLIENT_SECRET`| from Google Cloud console                                    |
   | `GOOGLE_REDIRECT_URI` | `https://<service>.onrender.com/auth/google/callback`        |
   | `POST_LOGIN_REDIRECT` | `https://<frontend host>/dashboard`                          |
   | `POST_LOGOUT_REDIRECT`| `https://<frontend host>/`                                   |
   | `MCP_SERVER_URL`      | `https://<mcp service>.onrender.com`                         |
   | `MCP_SHARED_SECRET`   | must match the value on the MCP service                      |
   | `GROQ_API_KEY`        | from console.groq.com                                        |

   You do **not** set `PORT`, `APP_NAME`, `LOG_LEVEL`, `IS_PRODUCTION`,
   `MONGODB_DB`, `FRONTEND_ORIGINS`, `SESSION_COOKIE_NAME`,
   `SESSION_MAX_AGE_SECONDS`, `MCP_TIMEOUT_SECONDS`, `MCP_MAX_RETRIES`,
   `GROQ_MODEL`, or `SCHEDULER_POLL_INTERVAL` — they're code constants
   or, in the case of `IS_PRODUCTION`, *derived* from `ENVIRONMENT`.
   Setting `ENVIRONMENT=PRODUCTION` is what flips the app into
   production mode (HTTPS-only cookies, JSON logs, real email sends).

5. Make sure `GOOGLE_REDIRECT_URI` is also added as an Authorised
   redirect URI on the OAuth client in Google Cloud.

## Adding a new collection

1. Add a model under `app/models/`.
2. Add a repository under `app/repositories/`.
3. Declare its indexes in `app/db/indexes.py`.
4. Add the collection name constant on `Collections` in
   `app/config/settings.py`.
5. Add a router under `app/api/routes/` and wire it up in
   `app/main.py`.

Repository constructors take an optional `db` so tests can pass an
in-memory mongomock instance.

## Adding a new tunable knob

If it's something you'd want to A/B test or change quickly in prod ⇒
add it to `Secrets` + `.env.example`. Otherwise (the common case)
⇒ add it as a field on one of the dataclasses in `settings.py` and
reference it via `settings.<group>.<NAME>`.
