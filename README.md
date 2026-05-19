<div align="center">

# 🚀 Review Pulse AI

### **AI-Powered Action Plans from App Store & Play Store Reviews**

_Stop reading 10,000 reviews. Start reading the one report that summarises all of them._

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-State-orange)](https://zustand-demo.pmnd.rs/)
[![Groq](https://img.shields.io/badge/Groq-LLM-FF6B35)](https://groq.com/)
[![Google OAuth](https://img.shields.io/badge/Auth-Google_OAuth_2.0-4285F4?logo=google)](https://developers.google.com/identity/protocols/oauth2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

</div>

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Architecture](#-architecture)
5. [End-to-End Data Flow](#-end-to-end-data-flow)
6. [Repository Structure](#-repository-structure)
7. [Database Schema](#-database-schema)
8. [Prerequisites](#-prerequisites)
9. [Google Cloud Console Setup](#-google-cloud-console-setup)
10. [MongoDB Setup](#-mongodb-setup)
11. [Environment Variables](#-environment-variables)
12. [Local Setup](#-local-setup)
13. [Running the Stack](#-running-the-stack)
14. [Scheduling & Cron Internals](#-scheduling--cron-internals)
15. [AI Workflow](#-ai-workflow)
16. [MCP ↔ Google Docs / Gmail](#-mcp--google-docs--gmail)
17. [Dashboard Overview](#-dashboard-overview)
18. [API Surface](#-api-surface)
19. [Error Handling & Logging](#-error-handling--logging)
20. [Security Considerations](#-security-considerations)
21. [Scalability](#-scalability)
22. [Rate Limits & Quotas](#-rate-limits--quotas)
23. [Production Deployment](#-production-deployment)
24. [Troubleshooting](#-troubleshooting)
25. [Future Enhancements](#-future-enhancements)
26. [Contributing](#-contributing)
27. [License](#-license)

---

## 🧭 Overview

**Review Pulse AI** is a multi-tenant SaaS platform that turns the firehose of App Store + Google Play Store reviews into a **structured, actionable executive report** — automatically, on a schedule the user controls.

A product manager doesn't have time to read 10,000 reviews. They have time to read **one** report that tells them:

- 🔥 What's on fire
- 🧊 What's slowly degrading
- 💎 What's quietly delighting users
- 🛠️ What to actually do about it this week

The platform fetches reviews, summarises them with **Groq**, writes the digest into the user's **own Google Doc**, emails it to stakeholders, and stores the full history in **MongoDB** — all using the signed-in user's **own Google identity** (never a service account).

> 💡 **Design philosophy:** the user owns their data. Their Google Doc, their Gmail, their reviews. We just orchestrate.

For a deeper dive on the multi-tenant model and request lifecycle, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **Google OAuth Only** | No passwords. Sign in with Google, grant Docs + Gmail scopes once, done. |
| 📦 **Multiple Products** | Track as many apps as you like under a single account. |
| ⏰ **Multiple Schedules / Product** | Weekly digest at 9am Monday? Monthly summary on the 1st? Both. |
| 🤖 **AI-Generated Action Plans** | Groq LLM converts raw reviews into structured, prioritised next steps. |
| 📝 **Google Docs Integration** | Each report is appended (or created) into a Doc you own. |
| 📧 **Email Delivery** | Send the report to recipients — or generate a draft for review first. |
| 📊 **Dashboard Analytics** | Browse, search, and re-open every report your account has ever generated. |
| 🗄️ **Full Audit History** | Every run is stored in MongoDB with status, duration, errors, and output. |
| 🧰 **MCP Server** | A dedicated service fronts Google APIs with per-user token refresh. |
| 🛡️ **Multi-Tenant by Default** | Every collection is `userId`-scoped. No cross-tenant data leaks. |

---

## 🧱 Tech Stack

<table>
<tr>
<td valign="top" width="33%">

### 🎨 Frontend
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Zustand** (state)
- **TypeScript**
- Hosted on **Vercel**

</td>
<td valign="top" width="33%">

### ⚙️ Backend
- **Python 3.11**
- **FastAPI** (server + MCP)
- **APScheduler** (cron)
- **Motor** (async MongoDB)
- **httpx** (HTTP client)
- **Groq SDK** (LLM)

</td>
<td valign="top" width="33%">

### 🗄️ Data & Infra
- **MongoDB Atlas**
- **Google OAuth 2.0**
- **Google Docs API**
- **Gmail API**
- **Groq Cloud**
- **Render / Fly / Docker**

</td>
</tr>
</table>

---

## 🏗 Architecture

Three independent services, one shared database, one shared OAuth client.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              END USER (Browser)                            │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │ HTTPS + session cookie
                                   ▼
                       ┌───────────────────────────┐
                       │      🎨 FRONTEND          │
                       │   Next.js + Tailwind      │
                       │   Zustand store           │
                       │   (Vercel)                │
                       └─────────────┬─────────────┘
                                     │ REST (JSON, cookie auth)
                                     ▼
        ┌───────────────────────────────────────────────────────────┐
        │                  ⚙️  SERVER (FastAPI)                     │
        │                                                           │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
        │  │  Auth    │  │ Products │  │Schedules │  │ Reports  │   │
        │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
        │  ┌─────────────────────────────────────────────────────┐  │
        │  │  APScheduler dispatcher (polls every N seconds)     │  │
        │  └─────────────────────────────────────────────────────┘  │
        │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
        │  │ Store Scraper│→ │  Groq LLM    │→ │  MCP Client  │     │
        │  └──────────────┘  └──────────────┘  └──────┬───────┘     │
        └────────────────┬───────────────────────────┼──────────────┘
                         │                           │ HTTPS + X-MCP-Secret
                         ▼                           ▼
                ┌────────────────┐         ┌──────────────────────┐
                │  🗄️  MongoDB   │◄────────│   🧰  MCP SERVER     │
                │     Atlas      │         │   FastAPI            │
                │                │         │                      │
                │  users         │         │  - Token refresh     │
                │  products      │         │  - Docs API          │
                │  schedules     │         │  - Gmail API         │
                │  reports       │         └──────────┬───────────┘
                │  google_conn   │                    │
                └────────────────┘                    │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │   Google APIs (per-user)    │
                                       │   📝 Docs   📧 Gmail        │
                                       └─────────────────────────────┘
```

### Why three services?

| Service | Responsibility | Why isolated? |
|---|---|---|
| **frontend** | UI, auth bounce, dashboard | Deployed on Vercel; stateless. |
| **server** | API + scheduler + ingestion + LLM | Long-running cron; can't run on serverless. |
| **mcp** | Google APIs (Docs + Gmail) | Sandboxes OAuth token handling. If Google's API changes, only one service redeploys. |

---

## 🔄 End-to-End Data Flow

### Sequence: Scheduled Report Generation

```
┌────────┐  ┌──────────┐  ┌────────────┐  ┌──────┐  ┌─────┐  ┌──────────┐  ┌─────────┐
│ Cron   │  │ Server   │  │ Stores     │  │ Groq │  │ MCP │  │  Google  │  │ MongoDB │
│ Tick   │  │          │  │ (App/Play) │  │ LLM  │  │     │  │ Docs/Gml │  │         │
└───┬────┘  └────┬─────┘  └─────┬──────┘  └──┬───┘  └──┬──┘  └────┬─────┘  └────┬────┘
    │ tick       │              │            │         │          │             │
    ├───────────►│              │            │         │          │             │
    │            │  find due schedules                                          │
    │            ├──────────────┼────────────┼─────────┼──────────┼────────────►│
    │            │◄─────────────┼────────────┼─────────┼──────────┼─────────────┤
    │            │              │            │         │          │             │
    │            │ fetch reviews│            │         │          │             │
    │            ├─────────────►│            │         │          │             │
    │            │◄─────────────┤            │         │          │             │
    │            │              │            │         │          │             │
    │            │ summarise    │            │         │          │             │
    │            ├──────────────┼───────────►│         │          │             │
    │            │◄─────────────┼────────────┤         │          │             │
    │            │              │            │         │          │             │
    │            │  append doc + send email                                     │
    │            ├──────────────┼────────────┼────────►│          │             │
    │            │              │            │         │ resolve tokens         │
    │            │              │            │         ├─────────►│             │
    │            │              │            │         │◄─────────┤             │
    │            │              │            │         │ call Google APIs       │
    │            │              │            │         ├─────────►│             │
    │            │              │            │         │◄─────────┤             │
    │            │◄─────────────┼────────────┼─────────┤  doc URL + msg id      │
    │            │              │            │         │          │             │
    │            │ persist report + update nextRun                              │
    │            ├──────────────┼────────────┼─────────┼──────────┼────────────►│
```

### Plain-English version

1. **Tick.** APScheduler wakes up every `SCHEDULER_POLL_SECONDS` and asks: "any schedule with `nextRunAt <= now` and `enabled = true`?"
2. **Dispatch.** For each due schedule, kick off the report pipeline.
3. **Ingest.** Scrape reviews from App Store + Play Store within the configured lookback window.
4. **Summarise.** Send raw reviews + a structured prompt to Groq. Get back a JSON-shaped action plan (themes, severity, recommended actions).
5. **Deliver.** Call MCP with `user_id + report payload`. MCP:
   - looks up that user's refresh token in `google_connections`,
   - mints a fresh access token if needed,
   - appends the report into their Google Doc (or creates one if missing),
   - sends the email (or stages a Gmail draft, per the schedule's `send_mode`).
6. **Persist.** Write a `Report` doc to MongoDB with status, duration, doc URL, email message ID, and the rendered output.
7. **Reschedule.** Recompute `nextRunAt` based on the cron expression.

---

## 📁 Repository Structure

```
Review-Pulse-AI/
├── frontend/                       # 🎨 Next.js dashboard
│   ├── app/
│   │   ├── (dashboard)/            # Authenticated app shell
│   │   ├── login/                  # Google OAuth bounce
│   │   ├── privacy-policy/
│   │   └── terms-of-service/
│   ├── components/                 # Reusable UI primitives
│   ├── services/                   # Typed API client
│   ├── store/                      # Zustand stores
│   ├── lib/                        # Config constants, helpers
│   ├── styles/                     # Tailwind base
│   └── .env.example
│
├── server/                         # ⚙️ FastAPI app (API + scheduler)
│   ├── app/
│   │   ├── api/routes/             # auth · products · schedules · reports · health
│   │   ├── config/                 # Typed dataclasses + minimal Secrets
│   │   ├── db/                     # Motor connection + indexes
│   │   ├── integrations/           # MCP client, Groq client
│   │   ├── models/                 # Pydantic models
│   │   ├── repositories/           # One repo per collection (userId-scoped)
│   │   ├── scheduler/              # APScheduler dispatcher + nextRun maths
│   │   ├── services/               # oauth · ingestion · summarisation · report
│   │   ├── utils/                  # Logging, errors, id helpers
│   │   └── main.py                 # FastAPI factory + lifespan
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
│
├── mcp/                            # 🧰 MCP service (Google Docs + Gmail)
│   ├── app/
│   │   ├── api/routes.py           # HTTP endpoints + shared-secret check
│   │   ├── auth/
│   │   │   ├── token_store.py      # Mongo reads/writes for google_connections
│   │   │   └── credentials.py      # google.oauth2.Credentials, auto-refresh
│   │   ├── services/
│   │   │   ├── docs_service.py     # append_to_doc, create_doc
│   │   │   └── gmail_service.py    # send_email (with draft mode)
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
│
├── ARCHITECTURE.md                 # Deep-dive on multi-tenant model
└── README.md                       # ← you are here
```

---

## 🗄 Database Schema

All collections are **`userId`-scoped**. The server never reads or writes a document without first checking ownership.

### `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongo identity |
| `email` | string | Google account email (unique) |
| `name` | string | Display name from Google profile |
| `picture` | string | Avatar URL |
| `createdAt` | datetime | First login |
| `lastLoginAt` | datetime | Updated on every sign-in |

### `google_connections`

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | FK → users (unique) |
| `refreshToken` | string | Encrypted at rest |
| `accessToken` | string | Short-lived; refreshed by MCP |
| `expiresAt` | datetime | Used by `credentials.py` to decide refresh |
| `scopes` | [string] | Granted scopes; checked on every call |

### `products`

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Owner |
| `appName` | string | Display name |
| `appleAppStoreId` | string \| null | iTunes numeric ID |
| `googlePlayStoreId` | string \| null | Reverse-DNS package name |
| `createdAt` / `updatedAt` | datetime | |

### `schedules`

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Owner |
| `productId` | ObjectId | FK → products |
| `cronExpression` | string | e.g. `0 9 * * 1` (every Mon 09:00) |
| `timezone` | string | IANA TZ name |
| `lookbackWeeks` | int | How far back to fetch reviews |
| `googleDocId` | string \| null | Existing doc — or null to create one |
| `emailRecipient` | string | Comma-separated allowed |
| `sendMode` | `"send"` \| `"draft"` | Gmail behaviour |
| `enabled` | bool | Pause without deleting |
| `nextRunAt` | datetime | Computed; the dispatcher's index key |
| `lastRunAt` | datetime \| null | |

### `reports`

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Owner |
| `productId` | ObjectId | FK |
| `scheduleId` | ObjectId | FK |
| `status` | `"success"` \| `"failed"` \| `"running"` | |
| `startedAt` / `finishedAt` | datetime | |
| `reviewCount` | int | How many reviews fed to the LLM |
| `summary` | string | Rendered markdown the user sees |
| `actionPlan` | object | Structured JSON (themes, severity, actions) |
| `googleDocUrl` | string \| null | Link to the appended doc |
| `gmailMessageId` | string \| null | Sent message ID |
| `errorMessage` | string \| null | On failure |

> 🔍 **Indexes** are created on startup in `app/db/__init__.py`: `(userId)` for all collections, plus `(userId, nextRunAt)` on schedules and `(userId, startedAt DESC)` on reports.

---

## 📋 Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | ≥ 18 | Frontend build |
| **Python** | **3.11** (pinned) | Server + MCP |
| **MongoDB Atlas** | M0+ | Free tier works for dev |
| **Google Cloud project** | — | OAuth + Docs + Gmail APIs |
| **Groq account** | — | LLM API key |
| **make** (optional) | — | Convenience targets |

---

## 🔑 Google Cloud Console Setup

This is the **most important** part of setup. Walk through it carefully.

### Step 1 — Create / select a project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Click the project dropdown → **New Project**.
3. Name it (e.g. `review-pulse-ai-dev`).

### Step 2 — Enable the required APIs

Navigate to **APIs & Services → Library** and enable:

| API | Why |
|---|---|
| ✅ **Google Docs API** | Append / create the report document |
| ✅ **Gmail API** | Send the email or create a draft |
| ✅ **People API** _(optional)_ | Richer profile info on login |

### Step 3 — Configure the OAuth Consent Screen

**APIs & Services → OAuth consent screen.**

| Field | Value |
|---|---|
| User Type | **External** (unless you're on Google Workspace) |
| App name | `Review Pulse AI` |
| User support email | Your email |
| App logo | Optional, helps trust |
| Developer contact info | Your email |
| Authorised domains | The domain(s) hosting your frontend + server |

#### Scopes

Add these scopes (use the "Add or Remove Scopes" button):

```
openid
email
profile
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.compose
```

> ⚠️ **Sensitive scopes** (`gmail.send`, `gmail.compose`, `documents`) will require Google's verification process before you can go to production. While in `Testing` mode you're limited to **100 test users**.

#### Test users

Still in the consent screen, scroll to **Test users → Add users** and add every email that needs to sign in while the app is unverified.

#### Publishing

Once you're ready for real users:

1. Click **Publish App** on the consent screen.
2. Submit the verification form (justify each sensitive scope).
3. Google reviews it (can take **4–6 weeks**).
4. Once approved, anyone can sign in.

### Step 4 — Create an OAuth Client ID

**APIs & Services → Credentials → Create Credentials → OAuth client ID.**

| Field | Value |
|---|---|
| Application type | **Web application** |
| Name | `review-pulse-ai-web` |
| Authorised JavaScript origins | `http://localhost:5173`, `https://your-frontend.example.com` |
| Authorised redirect URIs | `http://localhost:8000/auth/google/callback`, `https://api.your.app/auth/google/callback` |

Click **Create**. You'll see:

- `Client ID` → copy into both `server/.env` and `mcp/.env` as `GOOGLE_CLIENT_ID`.
- `Client secret` → copy into both as `GOOGLE_CLIENT_SECRET`.

> 🔐 **The same client is used by the server and the MCP.** The MCP needs it to refresh the user's offline access token.

---

## 🗄 MongoDB Setup

1. Sign in at [cloud.mongodb.com](https://cloud.mongodb.com/) and create a free **M0** cluster.
2. **Database Access → Add new user** — give it `readWrite` on the project DB.
3. **Network Access → Add IP** — `0.0.0.0/0` is fine for dev; restrict in prod.
4. **Connect → Drivers** — copy the connection string. It will look like:
   ```
   mongodb+srv://USER:PASSWORD@cluster.mongodb.net/
   ```
5. **Append the database name as the URI path** — the app parses the DB name from the URI; there is no separate `MONGODB_DB` var:
   ```
   mongodb+srv://USER:PASSWORD@cluster.mongodb.net/mt_review_intelligence
   ```

Indexes are created automatically on first server boot.

---

## 🔧 Environment Variables

### `server/.env`

```dotenv
# Deployment environment. PRODUCTION enables secure cookies, prod CORS, etc.
ENVIRONMENT=DEVELOPMENT

# MongoDB Atlas URI — MUST include the DB name as the path.
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/mt_review_intelligence

# Signs the session cookie. Rotate = log everyone out.
# Generate: python -c "import secrets; print(secrets.token_urlsafe(48))"
SESSION_SECRET=

# Google OAuth client (Web application) — same client used by MCP.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Frontend bounce targets. CORS origins are derived from these.
POST_LOGIN_REDIRECT=http://localhost:5173/dashboard
POST_LOGOUT_REDIRECT=http://localhost:5173/

# Downstream MCP service.
MCP_SERVER_URL=http://localhost:9000
MCP_SHARED_SECRET=

# Groq LLM.
GROQ_API_KEY=
```

### `mcp/.env`

```dotenv
ENVIRONMENT=DEVELOPMENT

# Same Mongo URI the server uses — full URI including DB name.
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/mt_review_intelligence

# Same OAuth client the server uses (needed for refresh_token grant).
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Must match server/.env MCP_SHARED_SECRET.
MCP_SHARED_SECRET=
```

### `frontend/.env.local`

```dotenv
# Public base URL of the FastAPI server (used by the API client + OAuth bounce).
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> 🧠 **Why so few vars?** Anything that doesn't change per environment (model name, scheduler poll interval, MCP retry tuning, Gmail scopes, …) lives in code as typed dataclasses. It's diffable, reviewable, and impossible to drift between services.

---

## 💻 Local Setup

### 1. Clone

```bash
git clone https://github.com/your-org/Review-Pulse-AI.git
cd Review-Pulse-AI
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
```

### 3. Server

```bash
cd ../server
cp .env.example .env       # fill in MONGODB_URI, OAuth client, Groq key, shared secret
make setup                 # wipes ./venv, recreates with python3.11, pip installs
```

Manual equivalent (if you don't have `make`):

```bash
python3.11 -m venv venv
source venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
```

### 4. MCP

```bash
cd ../mcp
cp .env.example .env       # fill in MONGODB_URI, OAuth client, shared secret
make setup
```

---

## ▶️ Running the Stack

You need **three terminals** (or a `tmuxinator` / `overmind` config).

| Terminal | Command | URL |
|---|---|---|
| **MCP** | `cd mcp && make dev` | http://localhost:9000 |
| **Server** | `cd server && make dev` | http://localhost:8000 |
| **Frontend** | `cd frontend && npm run dev` | http://localhost:5173 |

> ⚠️ Start MCP **before** the server. The server pings MCP's `/health` on boot.

Once running:

1. Visit `http://localhost:5173`.
2. Click **Sign in with Google**.
3. Approve the Docs + Gmail scopes.
4. Create a product → configure a schedule → save.
5. Either wait for the cron tick, or hit the **Run now** button.

---

## ⏱ Scheduling & Cron Internals

There is **no external cron service** (no Celery, no SQS, no Redis). Schedules live in MongoDB; an in-process **APScheduler** loop dispatches them.

### How it works

```
            ┌───────────────────────────────────────────────┐
            │  APScheduler IntervalTrigger                  │
            │  (every SCHEDULER_POLL_SECONDS, e.g. 30s)     │
            └────────────────────┬──────────────────────────┘
                                 ▼
            ┌───────────────────────────────────────────────┐
            │  Query: schedules where                       │
            │    enabled = true AND nextRunAt <= now()      │
            │  (indexed on (userId, nextRunAt))             │
            └────────────────────┬──────────────────────────┘
                                 ▼
            ┌───────────────────────────────────────────────┐
            │  For each due schedule:                       │
            │    1. mark report = running                   │
            │    2. fetch reviews                           │
            │    3. summarise with Groq                     │
            │    4. push to MCP (Docs + Gmail)              │
            │    5. persist report                          │
            │    6. compute nextRunAt from cronExpression   │
            └───────────────────────────────────────────────┘
```

### Tradeoffs

| Choice | Why |
|---|---|
| **In-process scheduler** | Zero infra. One service, one DB. Great up to ~thousands of schedules. |
| **DB as queue** | Survives restarts — if the server dies mid-run, the next tick picks it up. |
| **Single dispatcher** | At-most-once guarantee per tick. (When you scale horizontally, switch to a `nextRunAt` claim via `findOneAndUpdate` to avoid double-firing.) |

### Scaling beyond one box

When the in-process loop is no longer enough:

- Add a **Redis lock** on `scheduleId` per tick.
- Or replace APScheduler with **Celery + Redis** or **Cloud Tasks**.
- Or split the dispatcher into its own service (the API stays stateless).

---

## 🤖 AI Workflow

```
   Raw reviews (App Store + Play Store)
                │
                ▼
   ┌────────────────────────────┐
   │  Normalise + dedupe        │  (server/services/ingestion.py)
   │  Filter by lookback window │
   └────────────┬───────────────┘
                ▼
   ┌────────────────────────────┐
   │  Prompt template           │  (services/summarisation.py)
   │  - product context         │
   │  - structured JSON schema  │
   │  - severity rubric         │
   └────────────┬───────────────┘
                ▼
   ┌────────────────────────────┐
   │  Groq LLM call             │  Model is a code constant, not env.
   │  - JSON mode               │  Retries on transient errors.
   │  - temperature 0.2         │
   └────────────┬───────────────┘
                ▼
   ┌────────────────────────────┐
   │  Validate against Pydantic │  Fail closed — never persist a malformed
   │  ActionPlan model          │  report.
   └────────────┬───────────────┘
                ▼
        ActionPlan → render
        as Markdown for Docs/Email
```

The action plan is a structured object — not free-form prose — so the dashboard can render it as a typed component instead of an opaque blob:

```json
{
  "themes": [
    {
      "title": "Crashes after the 4.2 update",
      "severity": "high",
      "mentions": 142,
      "exemplar_reviews": ["...", "..."],
      "recommended_actions": [
        "Triage crash reports filed after 2026-05-12",
        "Roll back the 4.2 push notification permission flow"
      ]
    }
  ],
  "headline_metric": "Avg rating fell 0.4 stars week-over-week",
  "top_quote": "...",
  "executive_summary": "..."
}
```

---

## 🧰 MCP ↔ Google Docs / Gmail

The MCP service is a **stateless multi-tenant proxy** for Google APIs.

```
   Server                              MCP                         Google
     │                                  │                            │
     │  POST /docs/append               │                            │
     │  X-MCP-Secret: <shared>          │                            │
     │  { user_id, doc_id, content }    │                            │
     ├─────────────────────────────────►│                            │
     │                                  │  read google_connections   │
     │                                  │  for user_id (Mongo)       │
     │                                  │                            │
     │                                  │  Credentials() w/ refresh  │
     │                                  │  → mint access token       │
     │                                  ├───────────────────────────►│
     │                                  │◄───────────────────────────┤
     │                                  │                            │
     │                                  │  docs.documents.batchUpdate│
     │                                  ├───────────────────────────►│
     │                                  │◄───────────────────────────┤
     │◄─────────────────────────────────┤                            │
     │      { ok: true, doc_url }       │                            │
```

### Key properties

- **No service account.** Every Google call uses the **end-user's** OAuth credentials.
- **Refresh tokens are stored in Mongo**, encrypted with a key derived from `SESSION_SECRET`.
- **Shared-secret header** (`X-MCP-Secret`) is the only authentication between the server and MCP — the MCP is never exposed to the internet directly.
- **Idempotent endpoints** — if the server retries on a 5xx, MCP can safely re-attempt with the same `user_id + doc_id`.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/docs/append` | Append markdown content to a Google Doc |
| `POST` | `/docs/create` | Create a new Google Doc if none configured |
| `POST` | `/gmail/send` | Send email — or stage a draft if `send_mode=draft` |

---

## 📊 Dashboard Overview

| Section | What it shows |
|---|---|
| **Products** | Card grid of every product; click to drill in. |
| **Product detail** | Schedules list with `nextRunAt`, status badge, "Run now". |
| **Schedule form** | App name · App Store ID · Play Store ID · Cron · Lookback weeks · Doc ID · Email · Send/Draft. |
| **Reports** | Reverse-chronological history. Open to view the rendered action plan, the linked Doc, and the Gmail thread. |
| **Account** | Connected Google account, granted scopes, disconnect button. |

State management is **Zustand**, one slice per resource (`useProductsStore`, `useSchedulesStore`, `useReportsStore`). Stores never call `fetch` directly — they go through the typed API client in `services/`.

---

## 🌐 API Surface

All routes are **session-cookie authenticated** (set after the Google OAuth callback). The MCP is **not** exposed; the frontend never talks to it.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/google/login` | Begin OAuth flow |
| `GET` | `/auth/google/callback` | Exchange code → mint session cookie |
| `POST` | `/auth/logout` | Clear session |
| `GET` | `/auth/me` | Current user profile |
| `GET` | `/products` | List products (this user) |
| `POST` | `/products` | Create product |
| `PATCH` | `/products/{id}` | Update |
| `DELETE` | `/products/{id}` | Delete (cascades to schedules + reports) |
| `GET` | `/schedules` | List schedules |
| `POST` | `/schedules` | Create |
| `PATCH` | `/schedules/{id}` | Update / enable / disable |
| `POST` | `/schedules/{id}/run` | Trigger an out-of-band run |
| `GET` | `/reports` | List (paginated, filterable by product) |
| `GET` | `/reports/{id}` | Full report |
| `GET` | `/health` | Liveness probe |

---

## 🛟 Error Handling & Logging

### Error strategy

| Layer | Strategy |
|---|---|
| **HTTP boundary** | A single `app/utils/errors.py` exception → response mapper. Domain errors map to typed 4xx codes; everything else → 500 with a stable error id. |
| **External calls (Groq, MCP, Google)** | `httpx` with exponential backoff, jitter, and a per-call max attempt count (code-constant). 429s trigger longer backoff. |
| **Scheduler** | Exceptions inside a tick are caught + logged + persisted as `report.status = "failed"` with the error message. The next tick is unaffected. |
| **Validation** | Pydantic at every boundary — both inbound HTTP and outbound LLM responses. We never persist an unvalidated payload. |

### Logging

- **Structured JSON logs** (`app/utils/logging.py`) — one line per event, machine-grep-able.
- Every request has a generated `request_id` (returned as a response header + threaded into the logger).
- Every scheduled run has a `report_id` threaded through the entire pipeline.
- Log levels: `INFO` for lifecycle, `WARNING` for retried/recovered errors, `ERROR` only when a user-visible failure occurred.

---

## 🔐 Security Considerations

| Concern | Mitigation |
|---|---|
| **Auth** | Google OAuth only. No passwords stored. |
| **Session** | Signed HTTP-only, Secure, SameSite=Lax cookie. Rotating `SESSION_SECRET` revokes all sessions. |
| **Multi-tenancy** | Every repository method takes a `userId` and includes it in the query filter. There is no "admin" bypass. |
| **OAuth tokens** | Refresh tokens encrypted at rest. Stored only in `google_connections`, never logged. |
| **MCP boundary** | Shared-secret header. MCP should run on a private network (or behind a VPC). |
| **CORS** | Allowlist derived from `POST_LOGIN_REDIRECT` / `POST_LOGOUT_REDIRECT`. No wildcards. |
| **CSRF** | OAuth flow uses a signed `state` parameter; cookie is SameSite=Lax. |
| **Secrets** | Never committed. `.env` is `.gitignore`d. Use your platform's secret manager in prod. |
| **PII** | Reviews are public data, but the user's email + Google profile are not — never logged. |
| **LLM injection** | The prompt template sandboxes user reviews inside fenced delimiters. The LLM response is parsed as JSON and validated. |

---

## 📈 Scalability

| Bottleneck | First fix | Long-term fix |
|---|---|---|
| **API throughput** | Scale the server horizontally (it's stateless). | Add a CDN in front of static FE assets (Vercel does this already). |
| **Scheduler** | Increase poll interval, batch dispatches. | Move to Celery + Redis or Cloud Tasks; claim due rows via `findOneAndUpdate`. |
| **Groq latency** | Cache by `(productId, lookbackWindow)` hash for repeat runs. | Stream + chunked summarisation; pre-summarise per-week then merge. |
| **MCP throughput** | Scale MCP horizontally; it's stateless. | Add a Redis token cache to avoid Mongo reads on every call. |
| **MongoDB** | Indexes on `(userId, nextRunAt)`, `(userId, startedAt)`. | Move reports to a time-series collection / archive cold reports to object storage. |
| **Email volume** | Gmail's per-user quota is generous. | If sending on user's behalf hits limits, fall back to SES with a verified sender. |

---

## 📏 Rate Limits & Quotas

| Service | Limit | Mitigation |
|---|---|---|
| **Google Docs API** | 60 write requests / minute / user | Batched `batchUpdate` calls; exponential backoff on 429. |
| **Gmail API** | ~250 quota units / user / second | One message ≈ 100 units. Plenty of headroom for digests. |
| **Groq** | Tier-dependent | Retry with backoff; per-org concurrency limit in code. |
| **App Store / Play Store scraping** | Unofficial — be polite | Throttle, jitter, cache. Respect `Retry-After`. |
| **MongoDB Atlas (M0)** | 100 concurrent connections | Use Motor's pool size; production tier (M10+) for real load. |

---

## 🚀 Production Deployment

### Recommended topology

| Service | Platform | Notes |
|---|---|---|
| **frontend** | **Vercel** | Zero-config for Next.js. Set `NEXT_PUBLIC_API_URL` to your API domain. |
| **server** | **Render** / Fly / Railway | Always-on (the scheduler must run). 1× instance is fine to start. |
| **mcp** | **Render** / Fly / Railway | Stateless; can run as a private service. |
| **database** | **MongoDB Atlas** | M10+ for production; enable backups. |

### Vercel (frontend)

```bash
cd frontend
vercel link
vercel env add NEXT_PUBLIC_API_URL production
vercel --prod
```

### Render (server + MCP)

Each Python service ships with a `render.yaml` blueprint. From the Render dashboard:

1. **New → Blueprint** and point it at the repo.
2. Select `server/render.yaml` (and again for `mcp/render.yaml`).
3. Fill in environment variables from the **Environment Variables** section above.
4. Set `ENVIRONMENT=PRODUCTION` on both services.

### Docker

Each Python service can be containerised with a minimal Dockerfile:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
ENV PORT=8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

A reference `docker-compose.yml`:

```yaml
version: "3.9"
services:
  mcp:
    build: ./mcp
    env_file: ./mcp/.env
    ports: ["9000:9000"]
  server:
    build: ./server
    env_file: ./server/.env
    depends_on: [mcp]
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    env_file: ./frontend/.env.local
    depends_on: [server]
    ports: ["5173:5173"]
```

### Production checklist

- [ ] `ENVIRONMENT=PRODUCTION` on both Python services
- [ ] `SESSION_SECRET` rotated and stored in the platform's secret manager
- [ ] OAuth consent screen published + verified
- [ ] OAuth redirect URIs include the production domain
- [ ] CORS origins (derived from `POST_LOGIN_REDIRECT`) point at the production frontend
- [ ] MongoDB IP allowlist restricted to platform CIDR ranges
- [ ] MCP is on a private network or behind a strict firewall
- [ ] Backups enabled on MongoDB Atlas
- [ ] Sentry / Datadog / OpenTelemetry wired up
- [ ] Uptime monitoring on `/health` for both services

---

## 🛠 Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| **`redirect_uri_mismatch` on login** | Google client's authorised redirect URIs don't match what the server sends. | Add `http://localhost:8000/auth/google/callback` exactly to the OAuth client. |
| **`invalid_grant` when MCP refreshes** | The refresh token was revoked (user removed app, or testing-mode 7-day expiry). | Have the user sign in again to re-issue a refresh token. |
| **Schedule never fires** | `enabled=false`, bad cron expression, or `nextRunAt` in the future. | Check the schedule doc in Mongo; inspect server logs for the dispatcher tick. |
| **Server boots but can't reach MCP** | `MCP_SERVER_URL` wrong, or MCP isn't running. | `curl $MCP_SERVER_URL/health` from the server box. |
| **`401 Unauthorised` from MCP** | `MCP_SHARED_SECRET` differs between `server/.env` and `mcp/.env`. | Set them to the same value. |
| **Reviews are empty** | Wrong App Store / Play Store ID. | App Store IDs are numeric (e.g. `1234567890`); Play Store IDs are reverse-DNS (e.g. `com.example.app`). |
| **Groq returns invalid JSON** | Prompt drift, or a context-overflow on a huge review batch. | Pipeline retries with a smaller window; check logs for the validation error. |
| **MongoDB connection drops** | Free-tier idle disconnect, or stale connection in the pool. | Motor reconnects automatically; if persistent, upgrade tier or shorten `maxIdleTimeMS`. |
| **CORS error in browser** | Frontend domain isn't in the derived allowlist. | Update `POST_LOGIN_REDIRECT` to include the frontend origin. |

---

## 🌱 Future Enhancements

- [ ] **Slack / Teams delivery** alongside email
- [ ] **Sentiment-over-time charts** in the dashboard
- [ ] **Multi-language reviews** (auto-translate before summarising)
- [ ] **Competitor tracking** — diff your reviews against competitor apps
- [ ] **Webhook integrations** (Linear, Jira, GitHub Issues — file tickets from action items)
- [ ] **Per-team workspaces** (multiple users on one product)
- [ ] **Custom prompts** — let power users tune the action plan template
- [ ] **In-app review responses** — draft replies for App Store / Play Store
- [ ] **Embedded analytics** — share a public read-only report URL
- [ ] **Mobile push** — high-severity themes notify on detection
- [ ] **Replace in-process scheduler with Celery + Redis** for horizontal scaling
- [ ] **Time-series collection** for reports beyond 90 days

---

## 🤝 Contributing

PRs welcome! To contribute:

1. **Fork** the repo and create a branch: `git checkout -b feat/your-feature`.
2. **Set up locally** (see [Local Setup](#-local-setup)).
3. **Follow conventions:**
   - Python: `ruff` + `black`, type hints, Pydantic models at boundaries.
   - TypeScript: strict mode, no `any`, Zustand store per resource.
   - Conventional commits (`feat:`, `fix:`, `chore:` …).
4. **Add tests** where the logic warrants it.
5. **Open a PR** against `main` with a clear description, screenshots for UI changes, and a note on any new env vars.

For larger changes, please open an issue first to discuss approach.

---

## 📄 License

Released under the **MIT License**. See [`LICENSE`](./LICENSE) for the full text.

```
MIT License — Copyright (c) 2026 Review Pulse AI
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software …
```

---

<div align="center">

**Built with ☕ by people who got tired of reading app reviews.**

If Review Pulse AI saves you time, give it a ⭐ on GitHub.

</div>
