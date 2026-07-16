export type NavItem = { href: string; label: string; source: string };

/**
 * Top-nav sections. Mirrors the prototype in design/dist/ (five sources),
 * which is the starting point before the full 15-view platform in
 * docs/IMPLEMENTATION_PLAN.md.
 */
export const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", source: "all" },
  { href: "/shopify", label: "Shopify", source: "shopify" },
  { href: "/google-ads", label: "Google Ads", source: "google-ads" },
  { href: "/meta-ads", label: "Meta Ads", source: "meta-ads" },
  { href: "/analytics", label: "Analytics", source: "ga4" },
];
