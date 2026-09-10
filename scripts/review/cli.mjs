/**
 * Reviewer CLI — utilitarian by design.
 *
 *   node scripts/review/cli.mjs queue <destination>
 *   node scripts/review/cli.mjs show <destination> <claimId>
 *   node scripts/review/cli.mjs approve <destination> <claimId> --reviewer "name" [--reason "..."]
 *   node scripts/review/cli.mjs reject|defer|request <destination> <claimId> --reviewer "name" [--reason "..."]
 *   node scripts/review/cli.mjs approve-all <destination> --reviewer "name"
 *   node scripts/review/cli.mjs audit <destination>
 *   node scripts/review/cli.mjs narrative <destination>
 *
 * The approval gate lives in the model (scripts/research/review.mjs), not
 * here, so this interface cannot shortcut it and neither can any other.
 */

import { auditTrail, rebuildApproved, recordDecision, reviewQueue, queueSummary } from "../research/review.mjs";
import { runNarrativeJob } from "../research/narrative-job.mjs";

const [command, destinationId, maybeClaim] = process.argv.slice(2);
const args = process.argv.slice(2);
const opt = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DECISION_FOR = { approve: "approved", reject: "rejected", defer: "deferred", request: "changes-requested" };

function printItem(item, verbose = false) {
  const c = item.claim;
  const flag = item.blockers.length ? "!" : " ";
  console.log(`${flag} [${item.decision.padEnd(17)}] ${c.id}  (${c.status}/${c.confidence})`);
  console.log(`    ${c.statement.slice(0, 110)}`);
  if (verbose) {
    console.log(`    category   ${c.category}   claimType  ${c.claimType}`);
    if (item.source) {
      console.log(`    source     ${item.source.title}`);
      console.log(`    tier       ${item.source.tier}  (${item.source.type}, ${item.source.retrievalMethod})`);
      console.log(`    publisher  ${item.source.publisher ?? "—"}`);
      console.log(`    url        ${item.source.url}`);
    }
    for (const ev of c.evidence ?? []) {
      console.log(`    EVIDENCE   "${ev.quote.slice(0, 160)}"`);
      console.log(`               chars ${ev.locator.charStart}-${ev.locator.charEnd} of ${ev.sourceId}`);
    }
    for (const cf of item.conflicts) console.log(`    CONFLICT   ${cf.subject} (${cf.resolution})`);
    if (item.blockers.length) console.log(`    BLOCKED    ${item.blockers.join("; ")}`);
    if (item.decisionMeta) {
      console.log(`    decided    ${item.decisionMeta.decision} by ${item.decisionMeta.reviewer} at ${item.decisionMeta.at}`);
      if (item.decisionMeta.reason) console.log(`    reason     ${item.decisionMeta.reason}`);
    }
  }
}

if (command === "queue") {
  const items = reviewQueue(destinationId);
  const s = queueSummary(destinationId);
  console.log(`\n${destinationId}: ${s.total} claim(s) — ${Object.entries(s.counts).map(([k, v]) => `${k}=${v}`).join(" ") || "none"}\n`);
  for (const item of items) printItem(item);
  console.log(`\n"!" marks a claim that cannot be approved. Use \`show\` for detail.\n`);
} else if (command === "show") {
  const item = reviewQueue(destinationId).find((i) => i.claim.id === maybeClaim);
  if (!item) { console.error(`No claim ${maybeClaim} for ${destinationId}`); process.exit(1); }
  console.log("");
  printItem(item, true);
  console.log("");
} else if (DECISION_FOR[command]) {
  const reviewer = opt("reviewer");
  if (!reviewer) { console.error("--reviewer is required: a decision without an owner is not an audit trail."); process.exit(2); }
  const item = reviewQueue(destinationId).find((i) => i.claim.id === maybeClaim);
  if (!item) { console.error(`No claim ${maybeClaim} for ${destinationId}`); process.exit(1); }
  try {
    const d = recordDecision({
      destinationId, claimId: maybeClaim, decision: DECISION_FOR[command],
      reviewer, reason: opt("reason"),
      claim: item.claim, documents: item.documents, conflicts: item.conflicts,
    });
    console.log(`${maybeClaim} -> ${d.decision} by ${d.reviewer}`);
    const approved = rebuildApproved(destinationId);
    console.log(`approved knowledge rebuilt: ${approved.claims.length} claim(s)`);
  } catch (err) {
    console.error(`REFUSED: ${err.message}`);
    process.exit(1);
  }
} else if (command === "approve-all") {
  const reviewer = opt("reviewer");
  if (!reviewer) { console.error("--reviewer is required."); process.exit(2); }
  let ok = 0, refused = 0;
  for (const item of reviewQueue(destinationId)) {
    if (item.blockers.length) { refused += 1; continue; }
    try {
      recordDecision({
        destinationId, claimId: item.claim.id, decision: "approved", reviewer,
        reason: opt("reason", "bulk approval"),
        claim: item.claim, documents: item.documents, conflicts: item.conflicts,
      });
      ok += 1;
    } catch { refused += 1; }
  }
  const approved = rebuildApproved(destinationId);
  console.log(`approved ${ok}, refused ${refused}; approved knowledge now holds ${approved.claims.length} claim(s)`);
} else if (command === "audit") {
  const trail = auditTrail(destinationId);
  console.log(`\n${destinationId}: ${trail.length} audit entr${trail.length === 1 ? "y" : "ies"}\n`);
  for (const e of trail) {
    console.log(`  ${e.at}  ${e.reviewer.padEnd(16)} ${e.claimId}  ${e.previousStatus} -> ${e.newStatus}${e.reason ? `  (${e.reason})` : ""}`);
  }
  console.log("");
} else if (command === "narrative") {
  const result = await runNarrativeJob({
    destinationId,
    providerName: opt("provider", "auto"),
    /* Provider behaviour can change without PROMPT_VERSION moving; --force
       is the escape hatch for that during development. In normal operation
       a behaviour change should bump the version instead. */
    force: args.includes("--force"),
    onProgress: ({ stage, message }) => console.log(`  [${stage}] ${message}`),
  });
  const s = result.stats ?? {};
  console.log(`\n${destinationId} — provider ${result.provider}`);
  if (result.note) console.log(`  ${result.note}`);
  console.log(`  approved claims        ${s.approvedClaims ?? 0}`);
  console.log(`  excluded for conflict  ${s.excludedForConflict ?? 0}`);
  console.log(`  sentences accepted     ${s.sentencesAccepted ?? 0}`);
  console.log(`  sentences rejected     ${s.sentencesRejected ?? 0}`);
  console.log(`  blocks published       ${s.blocksPublished ?? 0}`);
  for (const b of result.blocks) {
    console.log(`\n  [${b.category}/${b.claimType}] cites ${b.claimIds.length} claim(s)`);
    console.log(`    ${b.text.slice(0, 200)}`);
  }
  for (const r of result.rejected.slice(0, 5)) {
    console.log(`\n  REJECTED (${r.reason}): ${(r.sentence ?? "").slice(0, 90)}`);
    if (r.detail) console.log(`    ${r.detail}`);
  }
  console.log("");
} else {
  console.error("Usage: queue | show | approve | reject | defer | request | approve-all | audit | narrative");
  process.exit(2);
}
