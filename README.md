# Review Pulse AI

**AI-Powered Product Review Intelligence.** A multi-tenant SaaS rebuild
of the original [Product-Review-Intelligence](../Product-Review-Intelligence)
+ [Google-Docs-Gmail-MCP-Server](../Google-Docs-Gmail-MCP-Server) projects.

Users sign in with **Google OAuth**, register their products (Play Store
+ App Store IDs), configure delivery (a Google Doc + email recipient),
and set up recurring schedules. The platform fetches reviews,
summarises them with Groq, writes the digest into the user's own Google
Doc, and emails the report — all using **the signed-in user's own Google
identity**, never a service account.

The two existing repos are intentionally untouched. Everything new
lives here.

## Layout

```
Review-Pulse-AI/
├── server/          # FastAPI app: auth, products, schedules, reports
├── mcp/             # Google Docs + Gmail HTTP service (multi-tenant token refresh)
└── frontend/        # Next.js dashboard
```

## What's built right now

* `server/` — full FastAPI app, MongoDB Atlas integration, Google OAuth
  login (session cookies, no JWT), product + schedule + report CRUD,
  Groq summarisation, basic Play/App Store ingestion, MCP HTTP client
  with retries + shared-secret header, and an APScheduler dispatcher.
* `mcp/` — separate FastAPI service that fronts Google Docs + Gmail
  and resolves per-user credentials from MongoDB on every call.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full request
lifecycle, deployment topology, and multi-tenant model.

## Configuration philosophy

We keep `.env` *deliberately small*. Anything that doesn't change per
environment lives in code, as a typed dataclass — diffable, reviewable,
and impossible to drift between services. `.env` carries only:

* secrets (`SESSION_SECRET`, `MCP_SHARED_SECRET`, `GROQ_API_KEY`,
  Google OAuth client credentials),
* and deployment-specific URLs (Mongo URI, redirect URIs, MCP URL).

The MongoDB **database name is parsed from `MONGODB_URI`** — the URI
must include it as the path (`…/mt_review_intelligence`). There is no
separate `MONGODB_DB` variable.

Full env reference: [`server/.env.example`](server/.env.example) and
[`mcp/.env.example`](mcp/.env.example).

## Quick start (local)

Both services pin **Python 3.11** (see each service's `.python-version`).
The provided `Makefile`s invoke `./venv/bin/python -m uvicorn` directly,
so the venv's interpreter is always used — no risk of picking up a
globally installed `uvicorn` / pydantic from miniconda.

```bash
# 1. MCP service
cd Review-Pulse-AI/mcp
cp .env.example .env       # MONGODB_URI, Google OAuth client, shared secret
make setup                 # python3.11 -m venv venv && pip install
make dev                   # python -m uvicorn ... --port 9000

# 2. Server (new terminal)
cd Review-Pulse-AI/server
cp .env.example .env       # secrets + deployment URLs
make setup
make dev                   # python -m uvicorn ... --port 8000
```

Visit `http://localhost:8000/auth/google/login` to test the OAuth round-trip.
Health checks: `make health` in each folder, or curl `:8000/health` and
`:9000/health` directly.

If `which python3.11` resolves to a miniconda binary, point the
Makefile at a clean Python instead:

```bash
PYTHON_BIN=/opt/homebrew/opt/python@3.11/bin/python3.11 make setup
# or:
PYTHON_BIN="$(pyenv which python3.11)" make setup
```

See per-service READMEs for the full "avoiding miniconda contamination"
playbook.

## Key API surface

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`  | `/auth/google/login`    | Start Google OAuth |
| `GET`  | `/auth/google/callback` | Google redirects here; sets session |
| `POST` | `/auth/logout`          | Clear session |
| `GET`  | `/auth/me`              | Current user JSON |
| `POST` | `/products`             | Create product (unique per user) |
| `GET`  | `/products`             | List own products |
| `PATCH`| `/products/{id}`        | Update product |
| `DELETE`| `/products/{id}`       | Delete product + its schedules |
| `POST` | `/schedules`            | Create schedule |
| `GET`  | `/schedules`            | List own schedules |
| `POST` | `/reports/products/{id}/run` | Run report now |
| `GET`  | `/reports`              | List own report history |

## Deployment

Both `server/` and `mcp/` are stateless FastAPI apps — deploy them as
separate services on Render / Fly / Cloud Run / EKS. MongoDB Atlas
holds the durable state. See per-service `README.md` for Render-specific
step-by-step instructions, and `ARCHITECTURE.md` → *Deployment topology*.
