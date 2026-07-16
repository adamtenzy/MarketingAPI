/**
 * Governed metric dictionary — the ONLY metrics the dashboard builder and AI
 * features may bind to. Enforce this list server-side; reject anything else
 * (no arbitrary SQL). See docs/IMPLEMENTATION_PLAN.md §5.
 */
export type Attribution = "shopify" | "platform" | "blended";
export type MetricUnit = "currency" | "percent" | "ratio" | "count";

export type Metric = {
  id: string;
  label: string;
  unit: MetricUnit;
  attribution: Attribution;
  requiresCogs?: boolean;
  definition: string;
};

export const METRICS: Metric[] = [
  { id: "total_revenue", label: "Total revenue", unit: "currency", attribution: "shopify", definition: "Shopify gross sales (source of truth)." },
  { id: "gross_profit", label: "Gross profit", unit: "currency", attribution: "shopify", requiresCogs: true, definition: "Revenue minus COGS." },
  { id: "gross_profit_pct", label: "Gross profit %", unit: "percent", attribution: "shopify", requiresCogs: true, definition: "Gross profit / revenue." },
  { id: "contribution_profit", label: "Contribution profit", unit: "currency", attribution: "blended", requiresCogs: true, definition: "Gross profit minus variable costs (incl. ad spend)." },
  { id: "operating_profit", label: "Operating profit", unit: "currency", attribution: "blended", requiresCogs: true, definition: "Contribution profit minus fixed operating costs." },
  { id: "total_ad_spend", label: "Total ad spend", unit: "currency", attribution: "platform", definition: "Blended Google + Meta spend." },
  { id: "blended_roas", label: "Blended ROAS", unit: "ratio", attribution: "blended", definition: "Shopify revenue / total ad spend." },
  { id: "gp_roas", label: "Gross-profit ROAS", unit: "ratio", attribution: "blended", requiresCogs: true, definition: "Gross profit / total ad spend. Primary decision metric." },
  { id: "paid_cac", label: "Paid CAC", unit: "currency", attribution: "blended", definition: "Ad spend / new customers acquired via paid." },
  { id: "blended_cac", label: "Blended CAC", unit: "currency", attribution: "blended", definition: "Ad spend / all new customers." },
  { id: "new_customers", label: "New customers", unit: "count", attribution: "shopify", definition: "First-time purchasers in range." },
  { id: "aov", label: "AOV", unit: "currency", attribution: "shopify", definition: "Average order value." },
  { id: "conversion_rate", label: "Conversion rate", unit: "percent", attribution: "blended", definition: "Purchases / sessions." },
  { id: "gp_cltv", label: "Gross-profit CLTV", unit: "currency", attribution: "shopify", requiresCogs: true, definition: "Lifetime gross profit per customer." },
  { id: "ltv_cac", label: "LTV : CAC", unit: "ratio", attribution: "blended", requiresCogs: true, definition: "GP-CLTV / CAC." },
  { id: "csat", label: "CSAT", unit: "percent", attribution: "shopify", definition: "Customer satisfaction score." },
  { id: "nps", label: "NPS", unit: "ratio", attribution: "shopify", definition: "Net promoter score." },
  { id: "must_have_score", label: "Must-have score", unit: "percent", attribution: "shopify", definition: "Share who'd be very disappointed without the product." },
  { id: "refund_rate", label: "Refund rate", unit: "percent", attribution: "shopify", definition: "Refunded orders / total orders." },
  { id: "sample_to_order", label: "Sample-to-order conv.", unit: "percent", attribution: "shopify", definition: "Sample requests that convert to an order." },
];

const BY_ID = new Map(METRICS.map((m) => [m.id, m]));

export function getMetric(id: string): Metric | undefined {
  return BY_ID.get(id);
}

/** Server-side guard: reject any metric not in the governed dictionary. */
export function isGovernedMetric(id: string): boolean {
  return BY_ID.has(id);
}
