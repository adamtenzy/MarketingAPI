# Urban District — Marketing app (Next.js)

Production web app that turns the static prototype in [`../design/`](../design/)
into a real, deployable dashboard. Next.js (App Router) + TypeScript, Google
login (Auth.js), and a Postgres warehouse via Drizzle.

This is **Phase 1 of the scaffold**: the app shell, auth gating, the data layer,
the governed metric dictionary, and the five prototype views (Overview renders
with sample data + the ported SVG charts; the other four show honest
"awaiting sync" states). Live-data wiring comes next — see
[`../docs/IMPLEMENTATION_PLAN.md`](../docs/IMPLEMENTATION_PLAN.md).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Auth | Auth.js (NextAuth v5) — Google provider, optional domain allow-list |
| Database | Postgres (Vercel Postgres / Supabase / Neon) via Drizzle ORM |
| Charts | Ported from `design/charts.js` (dependency-free SVG) |
| Styling | Design tokens ported from `design/tokens.css` → `app/globals.css` |

## Local development

```sh
cp .env.example .env.local     # fill in the values (see below)
npm install
npm run dev                    # http://localhost:3000
```

Without `AUTH_GOOGLE_ID/SECRET` the login button can't complete OAuth, and
without `DATABASE_URL` the data-backed views stay in their "awaiting sync"
state — both are expected until you provide credentials.

## What you need to provide

1. **Google OAuth client** (Google Cloud Console → Credentials → OAuth client ID,
   type *Web application*). Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
   Put the id/secret in `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
2. **`AUTH_SECRET`** — `openssl rand -base64 32`.
3. **A Postgres database** — set `DATABASE_URL`, then `npm run db:push` to create
   the tables from `lib/db/schema.ts`.
4. Later, per data source: Shopify token, GA4 service account, Google Ads
   OAuth/dev token, Meta system-user token, Anthropic key (all server-side).

## Deploy (Vercel)

- Import the repo, set **Root Directory** to `web`.
- Add the env vars from `.env.example` in Project Settings.
- Provision a Postgres database and run `npm run db:push` (or wire a migration
  step) once.

## Layout

```
app/
  (dashboard)/           gated views: overview, shopify, google-ads, meta-ads, analytics
  api/auth/[...nextauth] NextAuth route handlers
  login/                 sign-in page
auth.ts                  NextAuth config (Google + domain allow-list)
proxy.ts                 route gate (Next 16 "proxy", formerly middleware)
components/              shell, charts, auth
lib/
  db/                    Drizzle schema + lazy client
  metrics/dictionary.ts  governed metric dictionary (no arbitrary SQL)
  ud-charts.ts           ported SVG chart library
  nav.ts                 top-nav definition
```
