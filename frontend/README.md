# Review Pulse AI — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind + shadcn-style primitives.
The SaaS dashboard for **Review Pulse AI** — AI-powered product review
intelligence delivered to each user's own Google Doc + inbox.

## Layout

```
app/
├── layout.tsx              # Root: fonts + providers
├── page.tsx                # Landing
├── login/page.tsx          # Google OAuth entry point
└── (dashboard)/
    ├── layout.tsx          # Sidebar + Topbar + AuthGate
    ├── dashboard/          # KPIs, trends, recent activity
    ├── products/           # CRUD + product detail
    ├── schedules/          # daily / weekly / custom + manual trigger
    ├── reports/            # list + premium report reader
    └── settings/           # profile, reconnect Google, logout

components/
├── ui/                     # shadcn-style primitives (Radix-backed)
├── layout/                 # sidebar, topbar, user-menu, auth-gate
├── landing/                # hero, features, workflow, CTA, nav
├── dashboard/              # stat-card, trends-chart, recent-activity, onboarding
├── products/               # product-card, product-form-dialog
├── reports/                # status-badge, filters, report-reader
├── schedules/              # schedule-form-dialog
├── shared/                 # page-header, empty/error/loading states, confirm dialog
├── providers.tsx
└── theme-toggle.tsx

lib/                        # utils (cn), config (BRAND/ROUTES/DEFAULTS), format, mock-data
services/                   # auth, products, schedules, reports — typed fetch wrappers
hooks/                      # useCurrentUser, useProducts, useSchedules, useReports
store/                      # Zustand UI store (sidebar collapsed state, persisted)
types/                      # auth, product, schedule, report
```

## Quick start

```bash
cd Review-Pulse-AI/frontend
pnpm install            # or npm install / yarn install
cp .env.example .env.local
# point NEXT_PUBLIC_API_URL at the FastAPI server (default http://localhost:8000)
pnpm dev                # http://localhost:5173
```

We default the dev server to port **5173** to match
`POST_LOGIN_REDIRECT=http://localhost:5173/dashboard` on the server. If
you change either side, change both.

```bash
PORT=5173 pnpm dev
```

## Configuration

There is exactly **one** runtime variable:

| Key                   | Value                                  |
| --------------------- | -------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Public base URL of the FastAPI server. |

Everything else (brand name, default lookback weeks, route paths,
schedule defaults) lives in [`lib/config.ts`](lib/config.ts) as typed
constants — diffable, identical across environments.

## Auth model

Session cookies, not JWT. The server's OAuth callback sets a cookie on
its own origin; the frontend authenticates by sending
`credentials: "include"` on every API call. We never read or write the
cookie from JavaScript.

- The login button on the landing/login page redirects the *browser*
  to `${NEXT_PUBLIC_API_URL}/auth/google/login`.
- The server completes OAuth and bounces the browser back to
  `POST_LOGIN_REDIRECT` (configured on the server, should point at
  `/dashboard`).
- `<AuthGate>` in `(dashboard)/layout.tsx` polls `GET /auth/me`. A 401
  redirects the user to `/login`.

Because session cookies are set on the FastAPI origin, the frontend
origin must be in the server's CORS allow-list. The server derives that
list from its `POST_LOGIN_REDIRECT` / `POST_LOGOUT_REDIRECT` envs, so
just make sure those point at this frontend's URL.

## Data fetching

[TanStack Query](https://tanstack.com/query) wraps the typed
service layer. Every page is a client component that calls a hook
(`useProducts`, `useReports`, …) and renders skeletons / empty / error
states until data arrives.

When the backend returns 404 or is unreachable, `withMockFallback`
substitutes [`lib/mock-data.ts`](lib/mock-data.ts) so the UI keeps
working in early-stage dev environments. Production builds against a
healthy backend never hit those fallbacks.

## Theming

`next-themes` + Tailwind `dark:` variants. CSS custom properties are
declared on `:root` (light) and `.dark` in `app/globals.css`. The
toggle in the top-right of the dashboard cycles light/dark with the
system preference as the initial value.

## Production build

```bash
pnpm build
pnpm start
```

Deploy as a standalone Next.js app on Vercel, Render, or anywhere that
serves Next 15. The only env to set is `NEXT_PUBLIC_API_URL`.

## Conventions

- **Server vs client components**: layouts + the root `page.tsx` are
  server components; everything that uses hooks (which is most of the
  app) is `"use client"`.
- **No JWT**, no local-storage tokens — auth state is derived from the
  current session via `useCurrentUser`.
- **No hard-coded strings**: brand, routes, defaults live in
  `lib/config.ts`.
- **Tables stay paginated** — even with mock data, the reports table
  uses a real page-size constant so swapping in a `limit`/`skip` API
  is a one-line change in `services/reports.ts`.
