#!/usr/bin/env node
/**
 * Exports the human-curated monastery records to JSON for the offline agents.
 *
 * The audio agent must narrate the records the site actually publishes — the
 * reviewed ones — not the raw discovery output, whose year/tradition inference
 * is best-effort. Reading the curated file keeps slugs and facts in step.
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("src/data/monasteries.ts", "utf8");
const seedBlock = src.slice(src.indexOf("const SEEDS:"), src.indexOf("/* ---"));

const records = [...seedBlock.matchAll(/\{\s*\n\s*slug: "([^"]+)",\s*\n\s*name: "([^"]+)",\s*\n\s*district: "([^"]+)",\s*\n\s*tradition: "([^"]+)",\s*\n\s*establishedYear: (\d+),/g)].map(
  (m) => ({
    slug: m[1],
    name: m[2],
    district: m[3],
    tradition: m[4],
    establishedYear: Number(m[5]),
    status: "VERIFIED",
  }),
);

if (records.length === 0) {
  console.error("No curated records parsed — refusing to write an empty file.");
  process.exit(1);
}

writeFileSync(
  "src/data/generated/monasteries.curated.json",
  JSON.stringify(records, null, 2) + "\n",
);
console.log(`Exported ${records.length} curated records`);
for (const r of records) console.log(`  ${r.slug} — ${r.establishedYear} — ${r.tradition}`);
