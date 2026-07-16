import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazily-constructed Drizzle client. We do NOT connect at import time so the
 * app builds and boots without a database configured — pages that need data
 * call getDb() at request time and surface an "awaiting sync" state if it
 * throws. Works with any Postgres (Vercel Postgres / Supabase / Neon).
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — configure a Postgres connection string.");
  }
  const client = postgres(url, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
