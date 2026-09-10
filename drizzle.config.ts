import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    /* Migrations run through the SESSION pooler. Transaction mode (6543)
       multiplexes connections and cannot hold the prepared statements or the
       advisory locks drizzle-kit uses, so DDL against it fails in ways that
       look like flaky network errors. */
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
