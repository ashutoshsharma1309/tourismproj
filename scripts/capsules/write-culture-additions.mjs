/**
 * Turn accepted culture proposals into candidate titles.
 *
 * `candidates.mjs` is the list a person wrote. This writes a SEPARATE file,
 * `candidates-discovered.mjs`, holding the subjects `discover-culture.mjs`
 * found in the destination's own Wikipedia categories — its state's cuisine,
 * its festivals, its crafts — so the two stay distinguishable.
 *
 * Neither file asserts anything: `check-titles.mjs` resolves what they name,
 * `retrieve-culture.mjs` reads the resolved articles, and the stories built
 * from them quote those articles with their sources named.
 *
 *   node scripts/capsules/write-culture-additions.mjs [--max 22]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { CANDIDATES } from "./candidates.mjs";

const proposals = JSON.parse(readFileSync(".data/culture-proposals.json", "utf8"));
const maxIndex = process.argv.indexOf("--max");
const max = maxIndex > -1 ? Number(process.argv[maxIndex + 1]) : 22;

const lines = [
  "/**",
  " * Culture subjects found by `discover-culture.mjs`, not chosen by hand.",
  " *",
  " * Each is a member of a category the English Wikipedia maintains for this",
  " * destination's city or state — its cuisine, its festivals, its crafts —",
  " * whose article is long enough to carry a story and which is not itself a",
  " * place. Stories are built from these subjects, which is why a destination",
  " * with eleven culture records could not hold twenty-five stories.",
  " *",
  " * This file names pages to read, and asserts nothing about the world.",
  " *",
  " * Regenerate with:",
  " *   node scripts/capsules/discover-culture.mjs",
  " *   node scripts/capsules/write-culture-additions.mjs",
  " */",
  "export const DISCOVERED_CULTURE = {",
];

let total = 0;
for (const [destinationId, kinds] of Object.entries(proposals)) {
  const existing = new Set(Object.values(CANDIDATES[destinationId] ?? {}).flat());
  const rows = Object.entries(kinds)
    .map(([kind, titles]) => [kind, titles.filter((title) => !existing.has(title)).slice(0, max)])
    .filter(([, titles]) => titles.length > 0);
  if (rows.length === 0) continue;
  lines.push(`  ${destinationId}: {`);
  for (const [kind, titles] of rows) {
    total += titles.length;
    lines.push(`    ${kind}: [${titles.map((title) => JSON.stringify(title)).join(", ")}],`);
  }
  lines.push("  },");
}
lines.push("};", "");

writeFileSync("scripts/capsules/candidates-discovered.mjs", lines.join("\n"));
console.log(`Wrote scripts/capsules/candidates-discovered.mjs (${total} subjects)`);
