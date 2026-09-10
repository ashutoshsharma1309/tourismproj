/**
 * node scripts/research/publish-cli.mjs [--json]
 *
 * Deterministic. Re-running with unchanged approved input rewrites an
 * identical file.
 */
import { publishAll } from "./publish.mjs";

const payload = publishAll();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log("\nPublished knowledge\n");
  for (const [id, d] of Object.entries(payload.destinations)) {
    const s = d.stats;
    console.log(`  ${id.padEnd(14)} depth=${d.depth.depth.padEnd(10)} (${d.depth.basis})`);
    console.log(`  ${" ".repeat(14)} claims ${s.published}/${s.approved} published, ${s.withheld} withheld`);
    console.log(`  ${" ".repeat(14)} categories ${d.categories.map((c) => c.category).join(", ")}`);
    console.log(`  ${" ".repeat(14)} narrative ${s.narrativeBlocks} block(s), ${s.narrativeWithheld} withheld`);
    console.log(`  ${" ".repeat(14)} sources ${d.sourcesUsed.length}`);
    for (const r of d.depth.reasons) console.log(`  ${" ".repeat(14)} depth: ${r}`);
    console.log("");
  }
}
