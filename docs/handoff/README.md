# Handoff: Urban District — Unified Marketing Operations Platform

## Overview
A single-tenant marketing analytics + experimentation platform for **Urban District** (a tile e-commerce retailer on Shopify). It unifies data from **GA4, Google Ads, Meta Ads, and Shopify**, and adds four experimentation/build surfaces on top: an **AI page builder**, **Landing-page A/B tests** (Claude-generated variant → published to Shopify), **Ad A/B tests**, and a drag-and-drop **Dashboard builder**. Audience: an internal marketing & growth team.

The design intentionally shows **empty / "awaiting sync"** states everywhere data would appear, because the point of this handoff is to wire those states to **real** data.

---

## About the Design Files
The files in this bundle are **design references created in HTML** (a streaming "Design Component" prototype using an in-browser runtime called `support.js`). They demonstrate the intended **look, layout, copy, and interaction model** — they are **not production code to ship directly**.

Your task: **recreate these designs in a real, deployable web app** and wire them to live data via a backend. There is no existing production frontend, so **choose the framework** (recommendation below) and implement the screens faithfully using its patterns.

The current prototype stores everything in `localStorage` and fakes AI generation + Shopify publishing. Production must replace those with real API routes.

---

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, and interactions are all specified below and in the HTML. Recreate the UI pixel-perfectly, then connect it to real services.

---

## Recommended Architecture

### Framework
**Next.js (App Router) + React + TypeScript**, deployed on **Vercel**. Rationale:
- The repo already contains a Vercel serverless function (`shopify-connector/api/analytics.js`) — Next API routes / Vercel functions are the natural continuation.
- Server-side API routes are **required** (see "Why a backend is mandatory").
- Single deploy target for both frontend and backend.

### Data / caching
- **Postgres** (Vercel Postgres, Supabase, or Neon) as the analytics warehouse — you ingest from each source on a schedule and read pre-aggregated rows for fast dashboards. Do **not** call Google/Meta/Shopify live on every page load.
- A **scheduled job** (Vercel Cron) runs the ingestion every N hours and writes normalized rows.
- Optionally use **Supermetrics** as a managed connector (the prototype's "Connect Supermetrics" modal targets a backend sync endpoint) instead of hand-rolling each API.

### Auth
- Team login (e.g. **Auth.js/NextAuth** with Google Workspace SSO restricted to the company domain). All dashboard routes gated.

### Why a backend is mandatory (do not skip)
Browsers **cannot** call GA4, Google Ads, Meta Marketing API, or the Shopify Admin API directly:
- CORS blocks them.
- They require **OAuth tokens / secret API keys** that must never ship to the client.
So every data source is fetched **server-side**; the React app only ever talks to **your own** API routes returning normalized JSON.

---

## Data Sources — how to connect each

### 1. Shopify (already partially built)
- Existing serverless function: `shopify-connector/api/analytics.js` (in the repo). It pulls orders via the Admin API (`2024-10`), paginates, and computes: `totalRevenue, orderCount, averageOrderValue, refundRate, newCustomers, returningCustomers, topProducts, dailyTrend`.
- Env vars: `SHOPIFY_STORE` (e.g. `5e1108-1a.myshopify.com`), `SHOPIFY_TOKEN` (`shpat_...`, read-only scopes), `API_KEY` (endpoint guard).
- **Extend it** to also return per-product COGS (needs a COGS upload/table — see Product Profitability), customer records for cohorts/segments, and checkout/funnel events.
- For **publishing landing-page variants**: use the Shopify Admin **Themes / Assets API** to push a variant as a **draft theme** (or use the **Online Store 2.0** JSON templates). Never overwrite the live theme without an explicit launch step.

### 2. GA4
- Use the **Google Analytics Data API (v1beta)** with a **service account** (share the GA4 property with the service-account email). Server-side only.
- Pull: sessions, engaged sessions, page/product views, `add_to_cart`, `begin_checkout`, `purchase`, device, landing-page, channel grouping — powers the **Website funnel** and **Conversion rate**.

### 3. Google Ads
- **Google Ads API** (OAuth2 refresh token + developer token + `login-customer-id`). Server-side.
- Pull: spend, impressions, clicks, conversions, conversion value, by campaign / ad group / ad — powers **Marketing performance** drill-down.

### 4. Meta Ads
- **Meta Marketing API** (system-user long-lived token). Server-side.
- Pull: spend, impressions, clicks, purchases, purchase value, by campaign / ad set / ad / creative.

### 5. Supermetrics (optional shortcut)
- The prototype's Connect modal posts a **backend endpoint URL + API key** and expects the key to be forwarded server-side (never stored in the browser). If you use Supermetrics, implement `/api/integrations/supermetrics` (sync) and `/api/integrations/status`.

### Attribution rule (important to the product's philosophy)
**Shopify is the accounting source of truth.** Platform-reported conversions (Google/Meta) are always shown **separately and labeled** — never silently merged with Shopify revenue. Gross-profit ROAS (needs COGS) is the primary decision metric, not revenue ROAS. Preserve this in the data model and UI.

---

## AI Features — wiring to Claude

### AI Page Builder
- Prototype behavior: user types a request ("create a page with blended ROAS, GP-ROAS, and CAC by channel"), and it parses metrics/dimension/range and scaffolds a page.
- Production: send the prompt to **Claude (Anthropic API)** with a **tool/JSON schema** constrained to the **governed metric dictionary** (list below). Claude returns a validated page spec `{title, metrics[], dimension, range, layout}`; you render it from real warehouse data. Reject any metric not in the dictionary (no arbitrary SQL).

### Landing-page A/B (Claude-generated variant)
- Prototype behavior: pick a live Shopify page as **Control A**, describe a change, "generate" **Variant B**, choose test type (single-variable / multivariant / incremental), traffic split, then "publish to Shopify".
- Production flow:
  1. Fetch the chosen page's current theme template/section HTML via Shopify Assets API.
  2. Send it + the change prompt to Claude → returns modified Liquid/section markup.
  3. Render a real preview (sandboxed iframe).
  4. On **Publish**: push Variant B to a **Shopify draft theme**; set up the split (Shopify does not natively split-test — use an app like **Intelligems/Shoppable** or a redirect/edge-split at the CDN, and record assignment).
  5. Read exposure + conversion back from GA4/Shopify keyed by variant; compute significance server-side.

### Ad A/B tests
- Prototype builds a variant test (platform, objective, variable, A/B creative+copy, budget, split). Production: create the experiment via **Google Ads experiments** / **Meta A/B test** endpoints, then read GP-ROAS back once data flows.

Store the Anthropic key server-side; the browser calls **your** `/api/ai/*` routes.

---

## Screens / Views

> All screens share the **app shell**: top command bar (52–54px) + meta strip (31px) + left sidebar (230px) + scrollable main (`padding:30px 38px 76px`). Below, each view's specifics. Exact styling is in `Unified Marketing Operations Platform.dc.html` — read it alongside this doc.

### App shell — Command bar
- Height 54px, `background:#fff`, `border-bottom:1px solid #e5e5ea`, `padding:0 18px`, flex row, `gap:16px`.
- Left: 26px navy rounded square logo (`#0d2149`, white "U", radius 6px) + wordmark "URBAN DISTRICT" (800/13.5px) over "Marketing operations" (500/8.5px→now 10px, `#8a97ad`).
- Right cluster: date-range segmented control (Today/7d/30d/MTD/QTD/YTD/Custom — active pill = accent `#1f5fd0` bg, white text), Compare toggle, CAD/USD segmented control, and a connection status pill (green when connected / red when not, pulsing dot).
- Segmented-control container: `background:#eef2f8→#f0f0f3`, `border:1px solid #e5e5ea`, radius 7px, 2px padding.

### App shell — Meta strip
- Height 31px, white, `border-bottom:1px solid #f0f0f3`, sentence-case labels (`#8a97ad`) with bold values (`#41506b`): Period, Compare, Currency, Timezone, Last sync, and a right-aligned "Data confidence" badge (amber "Partial" when connected, red "Unreliable" when not).

### App shell — Sidebar (230px)
- White, `border-right:1px solid #e5e5ea`, vertical nav grouped under sentence-case headers: **Growth** (Executive), **Acquisition** (Marketing performance, Website funnel), **Customers** (Cohort analysis, Customer types, Sample program), **Catalog** (Product profitability), **Experiment** (Experiments, Landing page A/B, Ad A/B tests, Recommendations), **Build** (Dashboard builder, AI page builder), **System** (Data-quality center, Settings).
- Active item: `background:{accent}14` tint, `color:#0d2149`, 2px left border in accent, weight 600. Inactive: `#5b6b85`, weight 500. Each item has a 6px square status dot.
- Bottom: "Setup · N / 6 sources" progress card (light blue `#f5f8fd`).

### 1. Executive command center
- Title (600/22px, `-0.021em` tracking, `#0d2149`) + description; "Export PDF" (ghost) + "Connect Supermetrics" (primary) buttons.
- KPI grid: `repeat(auto-fill,minmax(198px,1fr))`, 11px gap. 18 KPI cards, each: label, info "i", big value (currently `—`, `#c2cbd9`), shimmer bar, "Target …" + amber "No data"/"Syncing" badge. **All 18 metrics listed in Design Tokens → Metric dictionary.**
- Below: 1.6fr/1fr split — "Gross profit vs. ad spend · daily" chart placeholder (grid-lined frame, "No data yet") + "Attribution reconciliation" list (Shopify orders, GA4 purchases, Google Ads conversions, Meta purchases, Internal attributed).

### 2. Marketing performance
- Breadcrumb drill: Channel › Account › Campaign › Ad set/group › Ad › Creative (clickable; active = accent).
- Table: `1.8fr repeat(9,1fr)` — columns [drill level], Spend, Revenue, Gross profit, ROAS, GP-ROAS, CAC, New cust., Conv %, AOV. Shimmer skeleton rows with a centered "No {level} ingested" overlay + "Open data-source manager".

### 3. Website funnel
- 8 stages (Ad click → Landing-page session → Product view → Sample request → Add to cart → Checkout started → Purchase → Repeat purchase), each a horizontal bar (width preset, shimmer fill) + Users + Drop-off columns. "Break down by" pills: Channel/Campaign/Device/Segment/Landing page.

### 4. Cohort analysis
- "Cohort by" pills. Table `1.4fr repeat(9,1fr)`: Cohort, Customers, CAC, 30d, 60d, 90d, 180d, 365d, GP-CLTV, Payback. Skeleton + "No cohorts available" overlay.

### 5. Customer types
- Title + "New customer type" (primary, opens modal). "Assigned by" rule chips (Survey answer, Trade account tag, Order-value band, Email domain).
- Card grid `repeat(auto-fill,minmax(238px,1fr))`. 10 base types (Interior designer, Architect, Restoration contractor, Custom home builder, Tile contractor, Flooring contractor, Commercial builder, Property manager, Homeowner, Unknown) + any user-created ones. Each card: colored dot (oklch hue), name, Trade/Consumer tag, and metric rows (Customers, CAC, AOV, Gross margin, CLTV = `—`).
- **Modal**: Type name, Classification (Trade/Consumer), Assignment rule.

### 6. Sample program
- 8 KPI cards (Sample requests, Cost/qualified request, Sample-to-order conv., Days to order, Revenue after sample, GP after sample, Sample-to-customer CAC, Total program cost). Then a 4-step journey row (Sample request → Sample shipped → First order → Repeat order).

### 7. Product profitability
- "Group by" pills (Product/Vendor/Collection/Material/Segment/Geography). Table `1.8fr repeat(9,1fr)`: [group], Units, Revenue, COGS, Gross profit, Margin %, Refund %, Samples, Repeat %, Contribution. Skeleton + "No products ingested / upload COGS" overlay. **Rows without COGS must be flagged and excluded from trusted margin reporting.**

### 8. Experiments
- "New experiment" (primary, opens modal). Status filter pills (All + Draft, Awaiting approval, Scheduled, Running, Paused, Completed, Inconclusive, Implemented) with counts.
- Experiment cards: status dot, name, status/type tags, hypothesis, meta row (Primary, Guardrail, MDE %, Traffic %, Result), and action buttons that **advance the approval workflow** (Draft → Awaiting approval → Scheduled → Running → Completed → Implemented; Running can Pause). Empty state when none.
- **Modal**: name, hypothesis, test type, primary metric (from dictionary), guardrail metric, MDE %, traffic allocation (10/25/50/100%).

### 9. Landing page A/B
- Controls: Control page select (Shopify page paths), Test type pills (Single variable / Multivariant / Incremental).
- Two columns: **Control · A** (browser-chrome frame showing the live page path) and **Variant · B** (before generation: a "Describe the change to test" textarea + idea chips + "Generate variant B with Claude"; after: browser frame with the change summary + "Generated · Claude" tag).
- Test config card: traffic split (50/50, 70/30, 90/10), primary metric, guardrail, min runtime; "Regenerate variant".
- Publish card: status pill (No variant → Variant ready → Published to Shopify draft theme) + "Publish variant to Shopify" (disabled until a variant exists) + "Launch test".
- Results table: Control·A / Variant·B rows × Sessions, Conv %, Revenue, Gross profit, Uplift (all `—`).

### 10. Ad A/B tests
- Builder card: Platform pills (Google Ads/Meta Ads/Both), Objective + Test variable selects, Variant A & B mini-cards (headline, primary text, creative slot placeholder), Daily budget + Budget split pills, "Queue ad test".
- List card: queued/live test cards (name, platform tag, variable/budget/split, "awaiting Meta/Google connection", Queued status, Delete). Empty state.

### 11. Recommendations
- Opportunity-score formula card `(Impact × Confidence × Relevance) ÷ Effort` + priority cards (Critical/High/Medium/Low). Empty "No insights yet".

### 12. Dashboard builder
- 3-column: widget palette (16 widget types, draggable) | 12-col canvas (drag to add/reorder, click to select) | config panel (title, metric [dictionary], dimension, date range, attribution model, number format, compare toggle, width in columns, duplicate/delete). Layout autosaves. Every widget binds to a governed metric — **no arbitrary SQL**.

### 13. AI page builder
- 2-column: composer (textarea + idea chips + "Generate page with Claude" + saved "Page library" list) | live preview (empty state, or generated page = prompt echo + KPI cards for each parsed metric + chart + breakdown-by-dimension table + "bound to N governed metrics" footer). Save/Discard.

### 14. Data-quality center
- "Sync now" (primary). Source health table (Google Ads, Meta Ads, GA4, Shopify, Supermetrics, Surveys/CSAT): Status (Connected/Not connected), Last sync, Rows, Schema. Validation-checks list (11 checks, Queued/Idle). Financial reconciliation list (Shopify gross sales − Discounts − Returns + Shipping + Taxes = Total). Confidence footer (COGS completeness / Attribution coverage / Overall confidence).

### 15. Settings
- Reporting defaults (currency CAD/USD, timezone, default date range, compare-by-default) + Executive targets (Blended ROAS, GP-ROAS, Paid CAC, Gross margin %, CSAT %, Must-have %) + a "Local prototype data" reset card. In production these become `/api/settings` (persisted server-side, per the note in the UI).

### Connect Supermetrics modal
- Server-side warning banner, Backend sync endpoint (required), Supermetrics API key (password; forwarded to backend, never stored in browser), source toggles (Google Ads/Meta/GA4/Shopify), Test connection / Sync now / Save / Disconnect. The prototype does a real `fetch(endpoint)` — keep that contract.

---

## Interactions & Behavior
- **Navigation**: sidebar sets active view (single-page; in Next use routes `/executive`, `/marketing`, etc.).
- **Date range / currency / compare / timezone**: global controls that should refetch/re-scope all data.
- **Drill-down** (Marketing): breadcrumb sets the grouping level and refetches.
- **Experiment workflow**: buttons advance status through the approval state machine; no live change ships without an approval/launch step.
- **A/B generation**: prompt → Claude → variant preview → publish (draft) → launch (split live). Significance computed server-side; no winner declared without sufficient evidence.
- **Builder**: HTML5 drag-and-drop (dragstart/dragover/drop), autosave.
- **Toasts**: bottom-right confirmation (navy `#0d2149`, white text, `toastin` .18s ease-out), auto-dismiss ~2.6s.
- **Shimmer**: `@keyframes shim` 1.8s linear infinite on skeleton bars; **status dot** `@keyframes pulse` 1.8s.
- **Empty/awaiting states are first-class** — never hide missing data; surface "awaiting sync".

## State Management
Prototype state (migrate to server + React Query/SWR):
- Global: `view, range, currency, compare, timezone, defaultRange, customFrom/To, targets{roas,gproas,cac,csat,musthave,margin}`.
- Connection: `endpoint, apiKey (never persisted), srcOn{google-ads,meta-ads,ga4,shopify}, connected, lastSync, lastRows, status, syncing`.
- Experiments: `experiments[], expFilter, + modal fields`.
- Builder: `widgets[], selId, drag`.
- AI pages: `aiPrompt, aiPages[], activeAiPage`.
- Landing: `landingSource, landingType, landingPrompt, landingVariant, landingSplit, landingMetric, landingGuardrail, landingRuntime, landingPublished`.
- Ad tests: `adPlatform, adObjective, adVariable, adA/B{headline,body}, adBudget, adSplit, adTests[]`.
- Customer types: `customTypes[]`.
- Prototype persists to `localStorage` keys `ud2_conn / ud2_settings / ud2_experiments / ud2_widgets / ud2_aipages / ud2_adtests / ud2_types`. **In production these become authenticated API resources in Postgres.**

---

## Design Tokens

### Colors
- Accent (brand blue / primary): `#1f5fd0`
- Navy (ink/logo/toast): `#0d2149`
- Text primary: `#0f1b34`; secondary: `#41506b`; muted: `#5b6b85`; faint: `#8a97ad`; faintest: `#aab4c6`; caption grey: `#86868b`
- Placeholder value grey: `#c2cbd9`
- Page background: `#f5f5f7`; card/surface: `#ffffff`; soft panel fill: `#f5f5f7`; secondary-button fill: `#f0f0f3`
- Borders: card/divider `#e5e5ea`; subtle `#f0f0f3`; row divider `#f2f2f5`; input `#dcdce1`
- Success (connected): `#1f9d6b` (bg `#ecfaf2`, border `#bde8ce`)
- Warning (partial/awaiting): `#c1841a` (bg `#fdf4e3`, border `#f2e0b8`)
- Danger (not connected/delete): `#cf5b52` / text `#d1453b` (bg `#fdecea`, border `#f4cfca`)
- Tints from accent: `{accent}14` (light bg), `{accent}55` (border)
- Customer-type dots: `oklch(0.62 0.13 <hue>)` — hues 210/150/25/280/45/330/190/95/0/220…

### Typography
- UI font: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif` (i.e. system SF; use **SF Pro / Inter** as web fallback if not on Apple).
- **No monospace, no all-caps, no wide letter-spacing** (that was intentionally removed — keep it that way).
- Scale: page titles 600/22px (`-0.021em`); card titles 600/12–13.5px; body/desc 400/12–12.5px; labels 500/11px (`#86868b`); big values 600/23–25px; small tags 500/10px.
- Buttons: 600/12.5px. Primary = accent bg, white, **pill radius 980px**, `padding:8px 17px`. Secondary/ghost = `#f0f0f3` fill, accent text, no border, pill. Danger = `#f0f0f3` fill, `#d1453b` text, pill.

### Radius / spacing / motion
- Cards & modals: **18px** (modals 20px); segmented controls 7px; pills 980px; small chips 16–20px; badges 4–5px.
- Card padding ~14–18px; main content padding `30px 38px 76px`; grid gaps 10–14px.
- Shadows: modal `0 24px 70px rgba(13,33,73,.22)`; toast `0 12px 40px rgba(13,33,73,.28)`. Cards use borders, not shadows.
- Keyframes: `shim` (skeleton, 1.8s linear infinite), `pulse` (status dot, 1.8s), `toastin` (.18s ease-out).

### Metric dictionary (governed — the only metrics AI/builder may bind to)
Total revenue, Gross profit, Gross profit %, Contribution profit, Operating profit, Total ad spend, Blended ROAS, Gross-profit ROAS, Paid CAC, Blended CAC, New customers, AOV, Conversion rate, Gross-profit CLTV, LTV : CAC, CSAT, NPS, Must-have score, Refund rate, Sample-to-order conv.

Each metric has a definition and a target (see `execKpis` in the HTML logic). Enforce this list server-side.

---

## Assets
- **No external image assets.** Logo is a CSS square with a "U" glyph — replace with the real Urban District logo file if available. Chart/product/creative areas are striped CSS placeholders; wire real charts (e.g. **Recharts / visx**) and real Shopify page/creative previews.
- Fonts are system SF (no font files needed); add an **Inter** or **SF Pro** web fallback for non-Apple browsers.

## Files (in this bundle)
- `Unified Marketing Operations Platform.dc.html` — the hifi prototype (all 15 views + modals + logic). **Primary reference.**
- `Urban District Growth Platform.dc.html` — earlier dark-theme version (for reference only; the light version supersedes it).
- `shopify-connector/analytics.js` — the working Shopify Admin API connector from the repo (the pattern to follow for other sources).
- `shopify-connector/README.md` — deployment notes for the Shopify connector (env vars, Vercel setup).

## Suggested build order
1. Scaffold Next.js + auth + Postgres + the app shell (command bar, meta strip, sidebar, routing).
2. Port the **Shopify connector** into an API route + ingestion job; light up Executive + Product + Data-quality with real Shopify numbers.
3. Add GA4 (funnel, conversion rate), then Google Ads + Meta (Marketing performance drill-down).
4. Cohorts, Customer types, Sample program (needs customer + COGS data).
5. Experiments workflow (persisted) → Ad A/B (platform experiment APIs) → Landing A/B (Shopify themes + Claude).
6. AI page builder + Dashboard builder (both bound to the governed metric dictionary).
7. Settings persistence (`/api/settings`).
