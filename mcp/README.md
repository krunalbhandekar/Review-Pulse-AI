# MCP — Multi-Tenant Google Docs + Gmail

A small FastAPI service that fronts Google Docs + Gmail for many users
at once. Every request carries the `user_id` of the calling user; this
service looks up that user's OAuth tokens in MongoDB, refreshes them
if needed, and proxies the API call.

The server is the only client; the frontend never talks to MCP
directly.

## Layout

```
app/
├── api/routes.py       # HTTP endpoints + shared-secret check
├── auth/
│   ├── token_store.py  # Mongo reads/writes for google_connections
│   └── credentials.py  # Build google.oauth2.Credentials, auto-refresh
├── services/
│   ├── docs_service.py # append_to_doc, create_doc
│   └── gmail_service.py# send_email (with draft mode)
├── utils/logging.py
├── config.py           # Static dataclasses + minimal Secrets
└── main.py             # FastAPI factory + lifespan (Mongo connect)
```

## Configuration model

There are **two surfaces**:

1. **Static configs** — code, not env. Live in `app/config.py` as
   frozen dataclasses (`AppConfig`, `GoogleConfig`) and the
   `Collections` class.

2. **Secrets / deployment-specific values** — env, via `.env` or the
   platform's secret manager. The full list is in
   [`.env.example`](.env.example):

   ```
   ENVIRONMENT
   MONGODB_URI
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   MCP_SHARED_SECRET
   ```

   That's it. The MongoDB DB name is parsed from the URI; the
   production flag is *derived* from a single `ENVIRONMENT` variable:

   * `ENVIRONMENT=PRODUCTION` → `IS_PRODUCTION=true`
   * any other value (or unset) → `IS_PRODUCTION=false` (defaults to
     `DEVELOPMENT`)

   No separate `IS_PRODUCTION` env var, no PaaS-specific fallback —
   set `ENVIRONMENT=PRODUCTION` explicitly on the deployment platform.

## Running locally

We pin **Python 3.11** (see [`.python-version`](.python-version)). Every
Make target invokes `./venv/bin/python -m uvicorn` directly so the
venv's interpreter is always used — no PATH lookup of a bare `uvicorn`
binary, no chance of importing miniconda's site-packages.

### One-shot bootstrap

```bash
cd multi-tenant/mcp
cp .env.example .env       # fill in MONGODB_URI, OAuth client, shared secret
make setup                 # wipes ./venv, recreates with python3.11, pip installs
make dev                   # uvicorn --reload on :9000
```

### Manual equivalent

```bash
cd multi-tenant/mcp
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 9000
```

Always `python -m uvicorn …` — never bare `uvicorn`. The module form
guarantees the venv's Python runs the server, which guarantees the
venv's `site-packages/` resolves the imports.

### Common targets

| Command       | What it does                                                |
| ------------- | ----------------------------------------------------------- |
| `make setup`  | Wipe + recreate venv with `$(PYTHON_BIN)`, install deps.    |
| `make dev`    | Run uvicorn with `--reload` on port 9000.                   |
| `make run`    | Run uvicorn without reload.                                 |
| `make doctor` | Print interpreter path, version, FastAPI/Pydantic pins.     |
| `make health` | `curl http://localhost:9000/health`.                        |
| `make clean`  | Remove `venv/` and all `__pycache__/`.                      |
| `make reset`  | `clean` + `setup`.                                          |

OpenAPI docs at <http://localhost:9000/docs>. Health endpoint at
<http://localhost:9000/health>.

### Avoiding miniconda / global Python contamination

The error `ImportError: cannot import name 'Undefined' from
'pydantic.fields'` means a globally installed pydantic v1 (typically
miniconda's) was imported instead of the venv's pydantic v2.

To make sure that can't happen:

1. **Never run a bare `uvicorn`** — the binary on PATH might be a
   conda-installed shim. Use `python -m uvicorn …`, `make dev`, or
   `./run.sh`.
2. **If `which python3.11` shows a miniconda path**, point the
   Makefile at a clean 3.11:

   ```bash
   PYTHON_BIN=/opt/homebrew/opt/python@3.11/bin/python3.11 make setup
   # or, with pyenv:
   PYTHON_BIN="$(pyenv which python3.11)" make setup
   ```

3. **Verify your venv with `make doctor`** — the printed
   `executable:` must live under `multi-tenant/mcp/venv/bin/python`.

## Endpoints

| Method | Path             | Body |
| ------ | ---------------- | ---- |
| `GET`  | `/health`        | — |
| `GET`  | `/tools`         | — |
| `POST` | `/append_to_doc` | `{user_id, doc_id, content}` |
| `POST` | `/create_doc`    | `{user_id, title, content}` |
| `POST` | `/send_email`    | `{user_id, to, subject, body, draft_only}` |

All non-health endpoints require the `X-MCP-Secret` header (matching
`MCP_SHARED_SECRET` in env) when that env var is set.

## How token refresh works

1. Server's OAuth callback writes `(access_token, refresh_token,
   expiry)` into `google_connections` for the user.
2. MCP's `build_credentials(user_id)` reads that doc and builds a
   `google.oauth2.Credentials` with `client_id`/`client_secret` set.
3. If the access token is expired, `creds.refresh(Request())` is
   called inside `asyncio.to_thread` (Google's client is sync).
4. The refreshed access token + expiry are written back to MongoDB so
   the next call doesn't have to refresh again.

If a user has no refresh token, MCP returns 401 and the server's
report pipeline records the run as `partial`/`failed`. The user must
re-authenticate via `/auth/google/login`.

## Render deployment

1. Create a **Web Service** pointing at this folder
   (`multi-tenant/mcp`). Keep it on a private network or behind an
   IP allow-list if possible.
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

   | Key                  | Value                                       |
   | -------------------- | ------------------------------------------- |
   | `ENVIRONMENT`        | `PRODUCTION` (flips `IS_PRODUCTION=true`)   |
   | `MONGODB_URI`        | `mongodb+srv://…/mt_review_intelligence`    |
   | `GOOGLE_CLIENT_ID`   | same OAuth client as the server             |
   | `GOOGLE_CLIENT_SECRET`| same OAuth client as the server            |
   | `MCP_SHARED_SECRET`  | must match the value on the server          |

   You do **not** set `PORT`, `APP_NAME`, `LOG_LEVEL`, `IS_PRODUCTION`,
   or `MONGODB_DB` — they're code constants / derived. Setting
   `ENVIRONMENT=PRODUCTION` is what flips JSON log output on.

5. After deploy, point the server's `MCP_SERVER_URL` at this service's
   public URL (or its private network address).

## Security notes

- No hardcoded credentials. No `token.json` files.
- No in-process cache of user tokens (so revoking a user takes effect
  on the very next request).
- The shared secret is a network-layer guard; deploy MCP on a private
  network if possible.
