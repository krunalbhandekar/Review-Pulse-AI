# Review Pulse AI — Architecture

## Project summary

**Review Pulse AI** is a multi-tenant SaaS platform that generates
AI-powered product review digests on a schedule and delivers them
through each user's own Google account.

- Users sign in with **Google OAuth**. No JWT — the session lives in a
  signed cookie (`Starlette SessionMiddleware`).
- Each user configures their own products, their own Google Doc to
  append to, and their own email recipient.
- A scheduler runs reports automatically. Reports are also runnable
  on-demand via API.
- Reports are stored in MongoDB so the frontend can show history later.

## Multi-tenant model

There is exactly **one** tenant boundary in the system: `userId`
(MongoDB ObjectId of the signed-in Google user). Every domain
collection — `products`, `schedules`, `reports`, `google_connections` —
carries this field and **every repository method filters by it**. There
are no "shared" rows.

The compound unique index on `products(userId, productName)` enforces
the rule "product names must be unique per user, but two different
users can have the same product name".

Tokens are stored once per user in `google_connections` and are the
authoritative source for both the server and the MCP service. There is
no global service-account credential anywhere in the system.

## Components

```
┌────────────┐  HTTPS / cookies   ┌─────────────┐  HTTPS + secret  ┌──────────────┐
│  Frontend  │ ─────────────────▶ │   server/   │ ───────────────▶ │    mcp/      │
│ (Vite/etc) │                    │  FastAPI    │                  │   FastAPI    │
└────────────┘                    │             │                  │              │
                                   │  Scheduler  │                  │ Google Docs  │
                                   │ (APScheduler│                  │   Gmail API  │
                                   │  in-proc)   │                  └──────┬───────┘
                                   └──────┬──────┘                         │
                                          │                                │
                                          ▼                                ▼
                                    ┌───────────────────────────────────────────┐
                                    │            MongoDB Atlas                  │
                                    │  users, google_connections, products,     │
                                    │  schedules, reports, job_runs             │
                                    └───────────────────────────────────────────┘
                                          ▲
                                          │  reads tokens directly
                                          │  (MCP_MONGODB_URI env)
```

## Request lifecycle — "run my weekly report"

1. **Schedule fires** — APScheduler dispatcher runs every
   `SCHEDULER_POLL_INTERVAL` seconds (default 30s) and queries
   `schedules` for rows where `enabled=true` and `nextRunAt <= now()`.
2. **Resolve product** — for each due schedule, the corresponding
   product is loaded (scoped to `userId`).
3. **Ingest** — `services/ingestion.py` pulls reviews from the Play
   Store and App Store (via `google-play-scraper` and
   `app-store-scraper`), inside `lookbackWeeks`.
4. **Summarise** — `services/summarization.py` builds a single Groq
   chat-completion prompt with the reviews and returns a markdown
   digest.
5. **Deliver** — `services/report_service.py` calls the MCP service:
   - if the product has a `googleDocId`, append to that doc;
   - otherwise create a new doc and store its id back on the report;
   - if `emailTo` is set, send (or draft in dev) an email with the
     summary + the doc link.
6. **Persist** — a `Report` row is written with status (`success`,
   `partial`, or `failed`), the doc URL, the review count, and a
   `deliveryMeta` blob holding the MCP responses.
7. **Advance** — the dispatcher recomputes `nextRunAt` from the
   schedule's frequency/time/timezone and updates the row.

Ad-hoc runs (`POST /reports/products/{id}/run`) skip steps 1–2 and
enter the pipeline at step 3.

## Tokens and the MCP boundary

The server runs the OAuth dance and writes the user's tokens into
`google_connections`. **Both** the server and the MCP service read from
this collection — they share the same MongoDB connection string via
env. The server is the only writer of refresh tokens, but the MCP
service writes back refreshed *access* tokens it obtains during the
normal Google Python client refresh flow.

The MCP service requires only four env vars:
- `MONGODB_URI` — same cluster *and* the same DB as the server. The DB
  name is parsed from the path component of the URI (e.g.
  `…/mt_review_intelligence`); there is no separate `MONGODB_DB`.
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — same OAuth client the
  server uses; required for the offline refresh.
- `MCP_SHARED_SECRET` — symmetric secret the server attaches as
  `X-MCP-Secret` on every request. If you front MCP with a private
  network you can leave it empty.

There are no hardcoded credentials and no per-user state cached in the
MCP process.

## Configuration philosophy

Static knobs (app name, port, log level, session cookie name and TTL,
MCP retry budget, Groq model name, scheduler poll interval, collection
names, …) live in code as frozen dataclasses on `app/config/settings.py`
(server) and `app/config.py` (MCP). They're diffable, code-reviewed,
and identical across all environments.

`.env` carries only secrets and deployment-specific URLs. See
`server/.env.example` and `mcp/.env.example` for the canonical lists —
ten variables for the server, four for MCP, no overlap with code
constants.

## Deployment topology

Three independent services, two of them stateless:

| Service        | Stateful? | Scale model                                  |
| -------------- | --------- | -------------------------------------------- |
| `server/`      | No        | Horizontal; scheduler should be leader-locked|
| `mcp/`         | No        | Horizontal; any replica can serve any user   |
| MongoDB Atlas  | Yes       | Managed                                      |

The dispatcher is the only piece that doesn't trivially scale
horizontally — running N copies will result in N concurrent runs of the
same schedule. For >1 server replica, gate the dispatcher behind a
leader-lock (Redis `SETNX` with TTL, or a MongoDB lease document) so
exactly one replica ticks at a time. The per-run code path is already
safe to fan out: each report run is independent and uses idempotency
keys on its MCP calls.

Suggested host mapping:
- `server.example.com`     → `server/` (port 8000)
- `mcp.internal.example.com` → `mcp/` (port 9000, ideally non-public)

## Future frontend integration

The frontend (Vite/React/Next — TBD) will be a SPA that:

1. Hits `GET /auth/me`. If 401, redirect to `/auth/google/login`.
2. Sends `credentials: 'include'` on every fetch so the session cookie
   flows. Make sure the frontend origin is in `FRONTEND_ORIGINS` so
   CORS allows the cookie.
3. Renders a dashboard reading `GET /products`, `GET /schedules`,
   `GET /reports`.
4. Uses `POST /reports/products/{id}/run?wait=true` for the "Run now"
   button.

No JWTs, no `Authorization` header — auth is purely the session cookie.

## Operational concerns / things to do later

- Replace the in-process Groq summarisation with the rich chunked
  pipeline from the original PRI project once a few real tenants are
  on the system.
- Add a leader-lock for the dispatcher (Redis or MongoDB lease).
- Add `job_runs` write-through (currently the collection is indexed
  but not populated; rotating execution logs in there will give a nicer
  audit trail than reading delivery metadata off `reports`).
- Webhook out to the user on report completion so the dashboard can
  push-update without polling.
