# Implementation Plan — Urban District Unified Marketing Operations Platform

Status: **Planning** (no application code written yet). This document is the
bridge between the design handoff in [`docs/handoff/`](./handoff/) and a real,
deployable web app. It is deliberately concrete: architecture, data model, API
surface, view-by-view mapping, phased build order with acceptance criteria, and
the open decisions that need a human answer before coding starts.

Primary references:
- `docs/handoff/README.md` — the authoritative product + design spec.
- `docs/handoff/Unified Marketing Operations Platform.dc.html` — the hifi
  prototype (15 views + modals + logic). Read alongside this plan.
- `docs/handoff/shopify-connector/analytics.js` — the one working connector; the
  pattern every other source follows.

---

## 1. Decision summary

| Concern | Decision | Rationale |
|---|---|---|
| Framework | **Next.js (App Router) + React + TypeScript** | Handoff recommendation; single deploy target for UI + API; continues the existing Vercel function. |
| Hosting | **Vercel** | Serverless API routes + Vercel Cron for ingestion. |
| Warehouse | **Postgres** (Vercel Postgres / Supabase / Neon) | Pre-aggregate on a schedule; never call ad platforms live on page load. |
| ORM / access | **Drizzle** (or Prisma) | Typed schema + migrations. |
| Auth | **Auth.js (NextAuth)** with Google Workspace SSO, domain-restricted | Internal team tool; every route gated. |
| Data fetching | **React Query (TanStack)** | Caching, refetch on global control changes (range/currency/compare). |
| Charts | **Recharts** (or visx) | Replaces the striped CSS placeholders. |
| Ingestion | **Vercel Cron** → per-source connectors → normalized rows | Optionally via Supermetrics as a managed shortcut. |
| AI | **Anthropic Claude API**, server-side only, constrained to the governed metric dictionary via tool/JSON schema | Page builder + landing-page variant generation. |

**Attribution invariant (non-negotiable, carried into schema + UI):** Shopify is
the accounting source of truth. Platform-reported conversions (Google/Meta) are
shown separately and labeled, never silently merged into Shopify revenue.
Gross-profit ROAS (needs COGS) is the primary decision metric, not revenue ROAS.

---

## 2. What happens to the current repo

The repo today is a lightweight static design system: `design/tokens.css`,
`design/charts.js`, `design/pages/*`, `scripts/build.js`. It is **not thrown
away** — it is the color/type/spacing source of truth and should be ported, not
re-invented:

- Lift the values in `design/tokens.css` into the Next.js app as CSS variables /
  a Tailwind theme (they already match the handoff Design Tokens section:
  accent `#1f5fd0`, navy `#0d2149`, surfaces, borders, status colors, radii 18px,
  pill 980px, etc.). Keep light + dark parity.
- The static `dist/` pages become obsolete once the corresponding React views
  exist; retire them per-view as they are replaced, not in a big-bang delete.
- Proposed target layout (app lives at repo root under `app/`, existing design
  system stays under `design/` as reference until fully ported):

```
app/                       Next.js App Router
  (dashboard)/             gated group — all 15 views
    executive/  marketing/  funnel/  cohorts/  customer-types/
    sample-program/  product-profitability/  experiments/
    landing-ab/  ad-ab/  recommendations/  dashboard-builder/
    ai-page-builder/  data-quality/  settings/
  api/
    metrics/[metric]/      governed metric reads
    integrations/          supermetrics sync + status, source health
    ingest/                cron-triggered per-source ingestion
    ai/                    page-builder + landing-variant (Claude)
    experiments/  widgets/  ai-pages/  ad-tests/  customer-types/  settings/
  layout.tsx               app shell (command bar + meta strip + sidebar)
components/  shell/  charts/  tables/  kpi/  modals/
lib/  db/ (drizzle schema + migrations)  connectors/  metrics/ (dictionary+engine)  ai/  auth/
design/                    existing tokens/charts — ported into theme, kept as reference
```

---

## 3. Data model (Postgres)

Normalized "warehouse" rows written by ingestion, read pre-aggregated by the
app. Sketch (columns abbreviated):

- **`sources`** — `id, kind (google_ads|meta_ads|ga4|shopify|supermetrics|surveys), status, last_sync_at, last_rows, schema_hash`.
- **`orders`** — from Shopify Admin API: `id, created_at, total_price, subtotal, discounts, returns, shipping, taxes, financial_status, customer_id, currency`. (Accounting source of truth.)
- **`order_line_items`** — `order_id, product_id, title, qty, unit_price`. Join to COGS for gross profit.
- **`products`** — `id, title, vendor, collection, material, sku`.
- **`product_cogs`** — `product_id, cogs, effective_from`. **Uploaded/edited by the team.** Rows missing COGS are flagged and excluded from trusted margin reporting.
- **`customers`** — `id, first_order_at, segment/type, email_domain, trade_flag` (powers cohorts, customer types, CLTV).
- **`ad_spend`** — daily, one row per `(source, account_id, campaign_id, ad_group_id, ad_id, date)`: `spend, impressions, clicks, platform_conversions, platform_conv_value, currency`. Platform conversions kept separate from Shopify.
- **`ga4_events`** — daily funnel: `date, dimension (channel/campaign/device/landing_page), sessions, engaged_sessions, product_views, add_to_cart, begin_checkout, purchase`.
- **`experiments`**, **`widgets`**, **`ai_pages`**, **`ad_tests`**, **`customer_types`**, **`settings`** — the prototype's `localStorage` blobs become authenticated, per-tenant rows (keys today: `ud2_conn / ud2_settings / ud2_experiments / ud2_widgets / ud2_aipages / ud2_adtests / ud2_types`).
- **`metric_snapshots`** (optional) — pre-aggregated metric values by day/dimension/currency for fast dashboard reads and compare-period math.

Currency: store native + a normalized column; CAD/USD toggle re-scopes reads.

---

## 4. Ingestion layer

One connector per source behind a common interface (`sync(range) -> normalized rows`),
invoked by **Vercel Cron** every N hours and on-demand via `/api/integrations/supermetrics` sync.

| Source | API | Auth (server-side only) | Feeds |
|---|---|---|---|
| Shopify | Admin API `2024-10` (extend `analytics.js`) | `SHOPIFY_STORE`, `SHOPIFY_TOKEN`, `API_KEY` | orders, line items, customers, COGS join, funnel tail |
| GA4 | Analytics Data API v1beta | Service account shared on the property | funnel, conversion rate, sessions, channels, landing pages |
| Google Ads | Google Ads API | OAuth2 refresh token + developer token + `login-customer-id` | spend/impr/clicks/conv by campaign→ad group→ad |
| Meta Ads | Meta Marketing API | System-user long-lived token | spend/impr/clicks/purchases by campaign→ad set→ad→creative |
| Supermetrics (shortcut) | Managed connector | Backend endpoint URL + API key forwarded **server-side, never stored in browser** | any/all of the above |
| Surveys / CSAT | CSV / survey source | — | CSAT, NPS, must-have score, customer-type survey answers |

Extend the Shopify connector to also return **per-product COGS**, **customer
records** (cohorts/segments), and **checkout/funnel events**. Never overwrite the
live Shopify theme on landing-page publish — push to a **draft theme** and gate
go-live behind an explicit launch step.

---

## 5. Governed metric dictionary + engine

The dictionary is the security boundary for both AI features and the dashboard
builder — **no arbitrary SQL, reject any metric not on the list.** Enforce
server-side. The 20 governed metrics:

> Total revenue · Gross profit · Gross profit % · Contribution profit ·
> Operating profit · Total ad spend · Blended ROAS · Gross-profit ROAS ·
> Paid CAC · Blended CAC · New customers · AOV · Conversion rate ·
> Gross-profit CLTV · LTV : CAC · CSAT · NPS · Must-have score · Refund rate ·
> Sample-to-order conv.

Implement as `lib/metrics/dictionary.ts`: each entry `{ id, label, definition,
target, unit, sql/aggregation, requiresCOGS?, attribution: 'shopify'|'platform' }`.
A metric engine resolves `(metricId, dimension, range, currency, comparePeriod)`
→ value + trust flag (e.g. margin metrics untrusted when COGS incomplete). Every
KPI card, builder widget, and AI page binds through this engine only.

---

## 6. View-by-view mapping (15 screens → routes)

All share the app shell: command bar (54px, date-range/compare/currency/status
pill) + meta strip (31px) + sidebar (230px) + scrollable main (`padding 30px 38px 76px`).

| # | View | Route | Key server data | Notes |
|---|---|---|---|---|
| 1 | Executive command center | `/executive` | 18 KPI cards via metric engine; GP-vs-ad-spend daily; attribution reconciliation list | Empty/"awaiting sync" states are first-class |
| 2 | Marketing performance | `/marketing` | Drill Channel→Account→Campaign→Ad set/group→Ad→Creative; ad_spend + orders | Breadcrumb refetches at each level |
| 3 | Website funnel | `/funnel` | 8-stage funnel from GA4 + Shopify; break down by channel/campaign/device/segment/landing page | |
| 4 | Cohort analysis | `/cohorts` | cohort × retention (30/60/90/180/365d), GP-CLTV, payback | needs customers + COGS |
| 5 | Customer types | `/customer-types` | 10 base types + user-created; assignment rules | CRUD → `customer_types` table + modal |
| 6 | Sample program | `/sample-program` | 8 KPIs + 4-step journey | |
| 7 | Product profitability | `/product-profitability` | group by product/vendor/collection/material/segment/geo; **flag rows without COGS** | excluded from trusted margin |
| 8 | Experiments | `/experiments` | approval state machine (Draft→Awaiting→Scheduled→Running→Completed→Implemented; Running→Pause) | persisted; modal creates |
| 9 | Landing page A/B | `/landing-ab` | pick Shopify page → Claude variant → preview → publish draft → launch split | significance computed server-side |
| 10 | Ad A/B tests | `/ad-ab` | queue via Google Ads experiments / Meta A/B | read GP-ROAS back once data flows |
| 11 | Recommendations | `/recommendations` | opportunity score `(Impact×Confidence×Relevance)÷Effort` | empty until insights |
| 12 | Dashboard builder | `/dashboard-builder` | 16 widget types, 12-col drag canvas, config panel; autosave | every widget binds governed metric |
| 13 | AI page builder | `/ai-page-builder` | prompt → Claude (constrained) → page spec → render from warehouse | page library persisted |
| 14 | Data-quality center | `/data-quality` | source health, 11 validation checks, financial reconciliation, confidence footer | "Sync now" triggers ingestion |
| 15 | Settings | `/settings` | reporting defaults + executive targets + reset | `/api/settings`, persisted |

---

## 7. AI features (Claude, server-side)

- **AI page builder:** send the user prompt to Claude with a **tool/JSON schema**
  whose enums are exactly the governed metric dictionary + allowed
  dimensions/ranges. Claude returns a validated `{title, metrics[], dimension,
  range, layout}`; the app renders it from real warehouse data. Reject any
  out-of-dictionary metric. (The prototype's `parsePrompt`/`titleFromPrompt`
  keyword matcher becomes the fallback, not the primary path.)
- **Landing-page A/B variant:** fetch the chosen page's Liquid/section HTML via
  Shopify Assets API → send with the change prompt to Claude → returns modified
  markup → render sandboxed-iframe preview → publish to a **draft theme** → set
  up the split (Shopify has no native split test: use Intelligems/Shoppable or a
  CDN/edge redirect and record assignment) → read exposure + conversion back from
  GA4/Shopify keyed by variant → compute significance server-side. No winner
  declared without sufficient evidence.
- **Ad A/B:** create via platform experiment endpoints; read GP-ROAS back.

Anthropic key stored server-side; the browser only ever calls `/api/ai/*`. Use
the latest Claude model (e.g. `claude-opus-4-8` / current Sonnet) — confirm
model id against the `claude-api` reference at build time.

---

## 8. Security & secrets

- All source credentials (Shopify token, GA4 service account, Google Ads
  OAuth/dev token, Meta system-user token, Anthropic key, Supermetrics key) live
  **server-side only** — env vars / secret store, never shipped to the client.
- Every dashboard route gated by Auth.js, domain-restricted to the company.
- Endpoint guard (`API_KEY` pattern from `analytics.js`) on any externally
  reachable ingestion endpoint.
- Supermetrics API key is forwarded server-side and **never persisted in the
  browser** (matches the prototype contract).

---

## 9. Build order (phased, with acceptance criteria)

1. **Scaffold** — Next.js + TS + Auth (Google SSO) + Postgres + Drizzle + the app
   shell (command bar, meta strip, sidebar, routing) + tokens ported from
   `design/tokens.css`. _Done when:_ a gated empty shell renders all 15 routes
   with correct chrome in light + dark.
2. **Shopify live** — port + extend `analytics.js` into an API route + ingestion
   job; light up Executive + Product profitability + Data-quality with real
   Shopify numbers (incl. COGS-missing flagging). _Done when:_ Executive KPIs
   sourced from Shopify show real values and reconciliation math ties out.
3. **GA4 + paid** — GA4 (funnel, conversion rate), then Google Ads + Meta
   (Marketing performance drill-down, ad_spend). _Done when:_ funnel + drill-down
   populate and platform conversions render **separately labeled** from Shopify.
4. **Customer analytics** — Cohorts, Customer types, Sample program (customers +
   COGS). _Done when:_ cohort retention + GP-CLTV compute and type CRUD persists.
5. **Experimentation** — Experiments workflow (persisted state machine) → Ad A/B
   (platform experiment APIs) → Landing A/B (Shopify draft themes + Claude). _Done
   when:_ an experiment advances through the full approval state machine and a
   Claude-generated variant previews + publishes to a draft theme.
6. **Builders** — AI page builder + Dashboard builder, both bound to the governed
   metric dictionary. _Done when:_ a prompt yields a validated page from real
   data and a drag-built dashboard autosaves + reloads.
7. **Settings** — `/api/settings` persistence + executive targets feeding KPI
   target badges. _Done when:_ changing a target updates the Executive view.

---

## 10. Gaps / risks / decisions needed

Blocking or shaping decisions where a human answer changes the build:

- **COGS source of record** — no COGS table exists yet. Upload flow (CSV) vs.
  Shopify metafields vs. a separate admin screen? Gross-profit metrics (the
  primary decision metrics) are blocked until this exists.
- **Supermetrics vs. hand-rolled connectors** — use the managed Supermetrics
  connector (faster, less code) or build each platform API directly (more
  control)? Affects most of phases 2–3.
- **Landing-page split mechanism** — Shopify has no native A/B; pick
  Intelligems/Shoppable app vs. CDN/edge split. Affects phase 5 scope.
- **Auth/SSO details** — Google Workspace domain to restrict to, and who
  administers access.
- **Warehouse choice** — Vercel Postgres vs. Supabase vs. Neon (all fine; needs a
  pick for migrations/CI).
- **Multi-account handling** — README lists multiple Google Ads + Meta accounts
  (UD Canada/US, two Meta act ids); confirm they roll up or stay separate.
- **Model selection for Claude** — confirm current model id + budget for AI
  generation calls.
- **Statistical method** — significance test for A/B (frequentist vs. Bayesian);
  MDE/guardrail semantics already implied by the experiments modal.

Not blocking but worth noting: the second prototype
(`Urban District Growth Platform.dc.html`) is an earlier **dark-theme** version —
reference only; the light version supersedes it.

---

## 11. Rough effort

This is a multi-month build for a small team. Phases 1–2 (shell + Shopify live)
are the fastest path to something real and demoable; phases 5–6 (experimentation
+ AI builders) carry the most product risk and third-party integration surface.
Recommend shipping phase-by-phase behind the gated shell rather than a big-bang
launch, keeping empty/"awaiting sync" states first-class throughout.
