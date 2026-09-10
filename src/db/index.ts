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

/**
 * Whether a Postgres connection is configured at all.
 *
 * WHY THIS IS A FLAG AND NOT A THROW.
 * This module used to throw at import time when DATABASE_URL was unset. That
 * made a missing environment variable a BUILD failure rather than a missing
 * feature, and it broke the contract .env.example states in its first line:
 * every value there is optional, and the app builds and deploys with the file
 * empty. It does, because the archive ships as typed data in src/data — only
 * the (explore) surface reads Postgres.
 *
 * So an unconfigured database now behaves the way an unconfigured Supabase
 * does in lib/supabase.ts: the feature that needs it reports that it has
 * nothing, and every other page renders exactly as before. Callers in
 * db/queries check this flag; absence is a first-class state here as
 * everywhere else in this project.
 */
export const hasDatabase = Boolean(connectionString);

const globalForDb = globalThis as unknown as { __darshanSql?: ReturnType<typeof postgres> };

const client =
  globalForDb.__darshanSql ??
  /* Unconfigured, this never connects: postgres-js is lazy, and no query
     reaches it because every caller is gated on `hasDatabase` first. */
  postgres(connectionString ?? "postgres://unset@127.0.0.1:5432/unset", {
    max: process.env.VERCEL ? 1 : 5,
    /* Dates come back as strings so a `date` column is never silently shifted
       into the server's timezone. Calendar days are not instants. */
    types: { date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v } },
  });

if (process.env.NODE_ENV !== "production") globalForDb.__darshanSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
