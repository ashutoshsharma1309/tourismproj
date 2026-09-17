/**
 * Turn accepted place proposals into planned pages.
 *
 * `plan.mjs` is the file a human curated. This writes a SEPARATE file,
 * `plan-discovered.mjs`, holding the places that `discover-places.mjs`
 * found — each one an article with a published coordinate near the
 * destination — so the two never blur together and either can be read on
 * its own. `plan.mjs` concatenates them.
 *
 * Like the curated plan, nothing here asserts a fact: it names pages, and
 * `retrieve.mjs` reads them.
 *
 *   node scripts/capsules/write-plan-additions.mjs [--max 12]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { PLAN } from "./plan.mjs";

const proposals = JSON.parse(readFileSync(".data/place-proposals.json", "utf8"));
const maxIndex = process.argv.indexOf("--max");
const max = maxIndex > -1 ? Number(process.argv[maxIndex + 1]) : 14;

const lines = [
  "/**",
  " * Places found by `discover-places.mjs`, not chosen by hand.",
  " *",
  " * Each one is an English Wikipedia article that publishes a coordinate",
  " * within 45 km of the destination's own registry centre, whose Wikidata",
  " * type is a kind of place this archive catalogues, and whose article is",
  " * long enough to quote. The distance check is the important one: an",
  " * earlier phase catalogued a Madurai museum whose article turned out to be",
  " * Delhi's, because the title matched and nobody measured.",
  " *",
  " * This file names pages to read. It asserts nothing about the world;",
  " * `retrieve.mjs` reads them and records what came back, and `generate.mjs`",
  " * emits the capsules from that record.",
  " *",
  " * Regenerate with:",
  " *   node scripts/capsules/discover-places.mjs",
  " *   node scripts/capsules/write-plan-additions.mjs",
  " */",
  "export const DISCOVERED = {",
];

let total = 0;
for (const entry of PLAN) {
  const found = (proposals[entry.id] ?? []).slice(0, max);
  if (found.length === 0) continue;
  const planned = new Set(entry.places.map((place) => place.id));
  const rows = found.filter((place) => !planned.has(place.id));
  if (rows.length === 0) continue;
  total += rows.length;
  lines.push(`  ${entry.id}: [`);
  for (const place of rows) {
    const themes = place.themes.map((theme) => `"${theme}"`).join(", ");
    lines.push(
      `    { id: "${place.id}", title: ${JSON.stringify(place.title)}, category: "${place.category}", themes: [${themes}] },`,
    );
  }
  lines.push("  ],");
}
lines.push("};", "");

writeFileSync("scripts/capsules/plan-discovered.mjs", lines.join("\n"));
console.log(`Wrote scripts/capsules/plan-discovered.mjs (${total} places across ${Object.keys(proposals).length} destinations)`);
