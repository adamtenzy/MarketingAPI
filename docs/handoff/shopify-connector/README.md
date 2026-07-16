# Shopify Connector

Serverless endpoint that keeps your Shopify Admin API token on the server and
returns aggregated store metrics (revenue, orders, AOV, refund rate,
new-vs-returning customers, top products, daily trend) as JSON.

The dashboard cannot call Shopify directly from the browser — Shopify blocks
cross-origin Admin API requests, and exposing the token client-side would let
anyone steal it. This function is the required middle step.

## 1. Deploy to Vercel

Easiest path — no local setup required:

1. Go to https://vercel.com and sign in (GitHub login works).
2. **Add New Project** → import `adamtenzy/Marketing-Dashboard`.
3. When asked for the **Root Directory**, set it to `shopify-connector`.
4. Under **Environment Variables**, add:
   - `SHOPIFY_STORE` = `5e1108-1a.myshopify.com`
   - `SHOPIFY_TOKEN` = your `shpat_...` access token
   - `API_KEY` = any random string you make up (this protects the endpoint
     from being called by strangers who find the URL)
5. Click **Deploy**.

You'll get a URL like `https://marketing-dashboard-xyz.vercel.app`.

Alternative (CLI): from inside this folder, run `npx vercel` and follow the
prompts, then `npx vercel env add SHOPIFY_STORE`, `... SHOPIFY_TOKEN`,
`... API_KEY`, then `npx vercel --prod`.

## 2. Test it

```
https://<your-deployment>.vercel.app/api/analytics?range=30d&key=<your API_KEY>
```

`range` accepts `7d`, `30d`, or `90d` (defaults to `30d`). You should get back
JSON with `totalRevenue`, `orderCount`, `topProducts`, etc.

## 3. Connect the dashboard

Paste the full URL, including `?key=...`, into the Shopify card's URL field
on the Connections page.

## Notes

- The Shopify token used here was granted read-only scopes (orders, products,
  customers, analytics, etc.) — this connector never writes to your store.
- If `newCustomers`/`returningCustomers` come back as `0` even with real
  orders, your store may need "protected customer data access" approved in
  the Partner Dashboard before order responses include customer IDs.
- Rotate `SHOPIFY_TOKEN` and `API_KEY` if either is ever exposed publicly.
