import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

/**
 * The database handle.
 *
 * ONE CONNECTION, REUSED ACROSS HOT RELOADS.
 * Next.js re-evaluates modules on every change in dev, and a new pool per
 * evaluation exhausts Postgres's connection limit within a few minutes of
 * editing. The client is stashed on `globalThis` in development for that
 * reason and that reason only.
 *
 * `max: 1` in serverless: each invocation is its own process, so a pool has
 * nothing to pool. Locally a small pool is useful because the dev server is
 * one long-lived process.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

const globalForDb = globalThis as unknown as { __darshanSql?: ReturnType<typeof postgres> };

const client =
  globalForDb.__darshanSql ??
  postgres(connectionString, {
    max: process.env.VERCEL ? 1 : 5,
    /* Dates come back as strings so a `date` column is never silently shifted
       into the server's timezone. Calendar days are not instants. */
    types: { date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v } },
  });

if (process.env.NODE_ENV !== "production") globalForDb.__darshanSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
