import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  date,
  jsonb,
  boolean,
  serial,
  index,
} from "drizzle-orm/pg-core";

/**
 * Initial warehouse schema. Ingestion jobs write normalized rows here; the app
 * reads pre-aggregated data — it never calls Google/Meta/Shopify live on a page
 * load. See docs/IMPLEMENTATION_PLAN.md §3 for the full model.
 *
 * Attribution invariant: Shopify is the accounting source of truth. Platform
 * conversions (Google/Meta) are stored separately and never merged into
 * Shopify revenue.
 */

// Health/status of each connected data source.
export const sources = pgTable("sources", {
  id: text("id").primaryKey(), // 'shopify' | 'google-ads' | 'meta-ads' | 'ga4' | 'supermetrics'
  status: text("status").notNull().default("not_connected"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastRows: integer("last_rows"),
  schemaHash: text("schema_hash"),
});

// Shopify orders — accounting source of truth.
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(), // Shopify order id
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    currency: text("currency").notNull().default("USD"),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
    discounts: numeric("discounts", { precision: 12, scale: 2 }),
    taxes: numeric("taxes", { precision: 12, scale: 2 }),
    shipping: numeric("shipping", { precision: 12, scale: 2 }),
    financialStatus: text("financial_status"),
    customerId: text("customer_id"),
  },
  (t) => [index("orders_created_at_idx").on(t.createdAt)],
);

export const orderLineItems = pgTable("order_line_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id"),
  title: text("title").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
});

// Team-supplied cost of goods — gross-profit metrics depend on this.
// Rows missing here are flagged and excluded from trusted margin reporting.
export const productCogs = pgTable("product_cogs", {
  productId: text("product_id").primaryKey(),
  cogs: numeric("cogs", { precision: 12, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from"),
});

// Daily paid-media spend, one row per ad per day. Platform-reported
// conversions are kept separate from Shopify revenue.
export const adSpend = pgTable(
  "ad_spend",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(), // 'google-ads' | 'meta-ads'
    accountId: text("account_id").notNull(),
    campaignId: text("campaign_id"),
    adGroupId: text("ad_group_id"),
    adId: text("ad_id"),
    date: date("date").notNull(),
    currency: text("currency").notNull().default("USD"),
    spend: numeric("spend", { precision: 12, scale: 2 }).notNull().default("0"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    platformConversions: numeric("platform_conversions", { precision: 12, scale: 2 }).default("0"),
    platformConvValue: numeric("platform_conv_value", { precision: 12, scale: 2 }).default("0"),
  },
  (t) => [index("ad_spend_date_idx").on(t.date, t.source)],
);

// Daily GA4 funnel counts by dimension.
export const ga4Events = pgTable("ga4_events", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  dimension: text("dimension"), // channel | campaign | device | landing_page
  dimensionValue: text("dimension_value"),
  sessions: integer("sessions").default(0),
  engagedSessions: integer("engaged_sessions").default(0),
  productViews: integer("product_views").default(0),
  addToCart: integer("add_to_cart").default(0),
  beginCheckout: integer("begin_checkout").default(0),
  purchase: integer("purchase").default(0),
});

// Persisted user settings (reporting defaults + executive targets).
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  data: jsonb("data").notNull().default("{}"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Prototype localStorage blobs become authenticated resources.
export const experiments = pgTable("experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hypothesis: text("hypothesis"),
  type: text("type"),
  status: text("status").notNull().default("draft"),
  data: jsonb("data").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  archived: boolean("archived").notNull().default(false),
});
