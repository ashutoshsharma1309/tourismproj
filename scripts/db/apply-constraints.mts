/**
 * Apply the hand-written SQL that Drizzle's schema DSL cannot express —
 * triggers, partial indexes, cross-table invariants — in order.
 *
 * `drizzle-kit push` rewrites what it manages and drops what it does not, so
 * run this after every push. Each file is idempotent.
 *
 *   pnpm db:constraints
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL must be set (pnpm loads .env.local).");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1, prepare: false, onnotice: () => undefined });
const dir = "drizzle/sql";
try {
  for (const file of readdirSync(dir).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await sql.file(join(dir, file));
    console.log(`applied ${file}`);
  }
} finally {
  await sql.end();
}
