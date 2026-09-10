/**
 * TerraStory research engine — CLI.
 *
 *   node scripts/research/run.mjs <destination> [options]
 *   node scripts/research/run.mjs --list
 *
 * Options:
 *   --categories a,b,c   knowledge areas (default: history,heritage,culture,festivals)
 *   --provider name      auto | anthropic | rule-based   (default: auto)
 *   --force              ignore cached job and cached sources
 *   --json               print the full result as JSON
 *
 * Research is a terminal job, never a page request. Output is written to
 * .data/research/jobs/ with status "pending-review" — the only success state
 * this engine can produce. Publication is a human action taken elsewhere.
 */

import { listProviders } from "./provider.mjs";
import { listDestinations } from "./destinations.mjs";
import { DEFAULT_CATEGORIES, listJobs, runResearchJob } from "./pipeline.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

if (flag("list")) {
  console.log("\nDestinations:");
  for (const d of listDestinations()) {
    console.log(`  ${d.id.padEnd(16)} ${d.name} (${d.country.name}) — ${d.depth}`);
  }
  console.log("\nProviders:");
  for (const p of listProviders()) {
    console.log(`  ${p.name.padEnd(12)} ${p.available ? "available" : "UNAVAILABLE"}`);
    if (p.reason) console.log(`  ${" ".repeat(12)} ${p.reason}`);
  }
  const jobs = listJobs();
  if (jobs.length) {
    console.log("\nStored jobs:");
    for (const j of jobs) console.log(`  ${j.id}  ${j.destinationId.padEnd(14)} ${j.status}`);
  }
  process.exit(0);
}

const destinationId = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--categories" && args[args.indexOf(a) - 1] !== "--provider");

if (!destinationId) {
  console.error("Usage: node scripts/research/run.mjs <destination> [--categories a,b] [--provider auto|anthropic|rule-based] [--force] [--json]");
  console.error("       node scripts/research/run.mjs --list");
  process.exit(2);
}

const categories = value("categories", DEFAULT_CATEGORIES.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const providerName = value("provider", "auto");

const result = await runResearchJob({
  destinationId,
  categories,
  providerName,
  force: flag("force"),
  onProgress: ({ stage, message }) => {
    if (!flag("json")) console.log(`  [${stage}] ${message}`);
  },
});

if (flag("json")) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.job.status === "failed" ? 1 : 0);
}

const { job, plan, documents, failures, knowledge, narrative, allClaims } = result;
const s = job.stats ?? {};

console.log(`\n${"=".repeat(64)}`);
console.log(`Job      ${job.id}${result.reused ? "  (reused from cache)" : ""}`);
console.log(`Dest     ${job.destinationId}`);
console.log(`Provider ${job.provider}`);
console.log(`Status   ${job.status.toUpperCase()}`);
if (job.error) console.log(`Error    ${job.error}`);
console.log("=".repeat(64));

console.log(`\nSources    ${s.sourcesRetrieved ?? 0} retrieved, ${s.sourcesFailed ?? 0} failed`);
for (const d of documents) console.log(`  ok    ${d.tier.padEnd(20)} ${d.title}`);
for (const f of failures) console.log(`  FAIL  ${f.reason.padEnd(20)} ${f.url.slice(0, 60)}`);

console.log(`\nClaims     ${s.claimsProposed ?? 0} proposed`);
console.log(`  validated              ${s.claimsValidated ?? 0}`);
console.log(`  rejected: no evidence  ${s.claimsRejectedNoEvidence ?? 0}`);
console.log(`  rejected: practical    ${s.claimsRejectedPractical ?? 0}`);
const otherRejects = allClaims.filter((c) => c.status === "rejected" &&
  !["evidence-not-in-source", "no-evidence", "practical-data"].includes(c.rejectionReason));
if (otherRejects.length) {
  const byReason = otherRejects.reduce((a, c) => { a[c.rejectionReason] = (a[c.rejectionReason] ?? 0) + 1; return a; }, {});
  for (const [reason, n] of Object.entries(byReason)) console.log(`  rejected: ${reason.padEnd(13)} ${n}`);
}
console.log(`  conflicts detected     ${s.conflictsDetected ?? 0}`);

if (plan.anticipatedGaps?.length) {
  console.log("\nAnticipated gaps");
  for (const g of plan.anticipatedGaps) console.log(`  - ${g}`);
}

console.log("\nKnowledge");
for (const record of knowledge) {
  console.log(`  ${record.category} — ${record.claims.length} claim(s), ${record.conflicts.length} conflict(s)`);
  for (const c of record.claims.slice(0, 2)) {
    console.log(`    [${c.status}/${c.confidence}] ${c.statement.slice(0, 96)}...`);
    const ev = c.evidence[0];
    if (ev) console.log(`      evidence @${ev.locator.charStart}-${ev.locator.charEnd} of ${ev.sourceId}`);
  }
}

if (narrative.length) {
  console.log(`\nNarrative  ${narrative.length} block(s), every one citing validated claims`);
  for (const b of narrative.slice(0, 2)) {
    console.log(`  [${b.claimType}] cites ${b.claimIds.length} claim(s): ${b.text.slice(0, 90)}...`);
  }
}

console.log(`\nWritten to .data/research/jobs/${job.id}.json`);
console.log("Status is pending-review. Nothing here is published.\n");
process.exit(job.status === "failed" ? 1 : 0);
