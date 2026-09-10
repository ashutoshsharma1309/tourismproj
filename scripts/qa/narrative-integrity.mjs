/**
 * Phase 4 integrity — review workflow, source quality, narrative verification.
 *
 * The adversarial half is the point. Anyone can test that a supported
 * sentence is accepted; what matters is that a sentence which resembles the
 * claims closely while adding one new fact is refused. TEST A-J below are
 * exactly those cases, and each is written to try to get something published
 * that should not be.
 *
 *   node scripts/qa/narrative-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "../research/core.mjs";
import { sourceInScope, validateClaims } from "../research/claims.mjs";
import { getDestination } from "../research/destinations.mjs";
import { coverageProfile, discoverSources, isAllowedUrl } from "../research/sources.mjs";
import { TIER_RANK, hasHigherTierCoverage, officialSourcesFor } from "../research/source-registry.mjs";
import {
  assembleBlock, excludeConflicted, extractFactualAtoms,
  splitSentences, verifyNarrative, verifySentence,
} from "../research/narrative.mjs";
import {
  REVIEW_DECISIONS, approvalBlockers, auditTrail, loadApproved, reviewQueue,
} from "../research/review.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

/* Shared claim set for narrative tests. */
const CLAIMS = [
  { id: "c1", destinationId: "sikkim", category: "history", claimType: "documented history", status: "validated", confidence: "high",
    statement: "Rumtek Monastery was founded in 1966 by the sixteenth Karmapa.",
    evidence: [{ sourceId: "wikipedia", quote: "Rumtek Monastery was founded in 1966 by the sixteenth Karmapa.", locator: { charStart: 0, charEnd: 62, url: "u" }, contentHash: "h", evidenceType: "direct-statement", retrievedAt: "" }] },
  { id: "c2", destinationId: "sikkim", category: "history", claimType: "documented history", status: "validated", confidence: "high",
    statement: "Rumtek Monastery is the seat of the Karma Kagyu lineage in exile.",
    evidence: [{ sourceId: "wikipedia", quote: "Rumtek Monastery is the seat of the Karma Kagyu lineage in exile.", locator: { charStart: 0, charEnd: 65, url: "u" }, contentHash: "h", evidenceType: "direct-statement", retrievedAt: "" }] },
];
const accepted = (text) => {
  const r = verifyNarrative(text, CLAIMS);
  return { ok: r.accepted.length > 0 && r.rejected.length === 0, r };
};

/* ========================================================================
   1-3. SOURCE TIER, QUALITY METADATA, DIVERSITY
   ======================================================================== */
section("1-3. Source tier, quality metadata, diversity");

check("Tier ranking places official above encyclopedia",
  TIER_RANK["official-government"] < TIER_RANK.encyclopedia &&
  TIER_RANK["official-tourism"] < TIER_RANK.encyclopedia);
check("Academic ranks above encyclopedia", TIER_RANK.academic < TIER_RANK.encyclopedia);

for (const id of ["sikkim", "jaipur", "kyoto"]) {
  const dest = getDestination(id);
  const candidates = discoverSources(dest);
  const ranks = candidates.map((c) => TIER_RANK[c.tier] ?? 9);
  check(`  ${id}: discovery is tier-ordered, best first`,
    ranks.every((r, i) => i === 0 || ranks[i - 1] <= r), ranks.join(","));
  check(`  ${id}: encyclopedia sources come last, not first`,
    candidates[candidates.length - 1].tier === "other-public" ||
    TIER_RANK[candidates[candidates.length - 1].tier] >= 4);
  check(`  ${id}: every candidate is allowlisted`, candidates.every((c) => isAllowedUrl(c.url)));
}

check("Jaipur and Kyoto have readable higher-tier coverage",
  hasHigherTierCoverage("jaipur") && hasHigherTierCoverage("kyoto"));
check("Sikkim's own portal is recorded as unreadable rather than omitted",
  officialSourcesFor("sikkim").some((s) => s.rendersServerSide === false),
  "SPA — the gap is stated, not hidden");
check("Coverage profile reports blocked higher-tier sources",
  coverageProfile(getDestination("sikkim")).blocked.length === 1);

/* Every official registry entry must carry the metadata that answers
   "why was this source trusted?" */
const missingMeta = [];
for (const [dest, entries] of Object.entries({ sikkim: officialSourcesFor("sikkim"), jaipur: officialSourcesFor("jaipur"), kyoto: officialSourcesFor("kyoto") })) {
  for (const e of entries) {
    if (!e.tier || !e.publisher || !e.sourceRegistryId || !e.verified || !e.rationale) missingMeta.push(`${dest}:${e.url}`);
  }
}
check("Every official source records tier, publisher, registry id, rationale and verification date",
  missingMeta.length === 0, missingMeta.join(", ") || "complete");

const sourcesSrc = readFileSync("src/data/sources.ts", "utf8");
check("New official sources are registered with scope + retrievalMethod",
  ["rajasthan-tourism-jaipur", "incredible-india-jaipur", "kyoto-city-tourism", "kyoto-prefecture"]
    .every((id) => new RegExp(`"${id}":[\\s\\S]{0,900}?scope:[\\s\\S]{0,200}?retrievalMethod:`).test(sourcesSrc)));

/* Corroboration: same statement from two sources raises confidence. */
const dest = getDestination("sikkim");
const docs = [
  { sourceId: "wikipedia", tier: "encyclopedia", text: "X".repeat(10), contentHash: "h1" },
  { sourceId: "wikivoyage", tier: "other-public", text: "X".repeat(10), contentHash: "h2" },
];
const twin = (sourceId, hash) => ({
  id: `t_${sourceId}`, destinationId: "sikkim", category: "history", claimType: "documented history",
  status: "proposed", confidence: "unverified", statement: "The monastery was founded in 1705.",
  evidence: [{ sourceId, quote: "q", locator: { charStart: 0, charEnd: 10, url: "u" }, contentHash: hash, evidenceType: "direct-statement", retrievedAt: "" }],
});
const corroborated = validateClaims({
  claims: [
    { ...twin("wikipedia", "h1"), evidence: [{ ...twin("wikipedia", "h1").evidence[0], quote: "XXXXXXXXXX", locator: { charStart: 0, charEnd: 10, url: "u" } }] },
    { ...twin("wikivoyage", "h2"), evidence: [{ ...twin("wikivoyage", "h2").evidence[0], quote: "XXXXXXXXXX", locator: { charStart: 0, charEnd: 10, url: "u" } }] },
  ],
  destination: dest, documents: docs,
});
const merged = corroborated.find((c) => c.status === "validated");
check("Two independent sources for one statement raise confidence",
  merged?.confidence === "high" && (merged.corroboratingSources ?? []).length === 2,
  merged ? `${merged.confidence}, ${(merged.corroboratingSources ?? []).length} sources` : "no validated claim");
check("The second source is merged as corroboration, not dropped as a duplicate",
  corroborated.some((c) => c.rejectionDetail?.includes("corroboration")));

/* ========================================================================
   4-7. REVIEW QUEUE, APPROVAL, REJECTION, PENDING REVIEW
   ======================================================================== */
section("4-7. Review queue, approval gate, decisions");

check("Decision vocabulary is closed and small",
  REVIEW_DECISIONS.length === 4 &&
  ["approved", "rejected", "deferred", "changes-requested"].every((d) => REVIEW_DECISIONS.includes(d)),
  REVIEW_DECISIONS.join("/"));

const queue = reviewQueue("jaipur");
check("Review queue is populated", queue.length > 0, `${queue.length} items`);
const withEverything = queue.filter((i) => i.claim && i.source && Array.isArray(i.blockers));
check("Every queue item carries claim + source + blockers together",
  withEverything.length > 0, "a reviewer opens one view, not five files");
check("Queue items carry the documents the gate needs",
  queue.every((i) => Array.isArray(i.documents)));

const validated = queue.find((i) => i.claim.status === "validated");
check("A validated claim has no approval blockers",
  validated && approvalBlockers(validated.claim, { documents: validated.documents, conflicts: validated.conflicts }).length === 0);

const rejectedClaim = queue.find((i) => i.claim.status === "rejected");
check("A rejected claim is blocked from approval",
  rejectedClaim && approvalBlockers(rejectedClaim.claim, { documents: rejectedClaim.documents, conflicts: rejectedClaim.conflicts }).length > 0);

/* TEST D at the approval layer: practical data cannot be approved. */
const practicalClaim = {
  id: "p1", destinationId: "sikkim", status: "validated", claimType: "documented history",
  statement: "Entry to the monastery costs 20 rupees per person.",
  evidence: [{ sourceId: "wikipedia", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" }, contentHash: "h", evidenceType: "direct-statement", retrievedAt: "" }],
};
check("TEST D(gate)  A practical-data claim cannot be approved",
  approvalBlockers(practicalClaim, { documents: [{ sourceId: "wikipedia", text: "q", contentHash: "h" }] })
    .some((b) => b.includes("practical")));

/* TEST H: cross-destination source. */
const crossDest = {
  id: "x1", destinationId: "kyoto", status: "validated", claimType: "documented history",
  statement: "A claim about Kyoto backed by a Sikkim-scoped source.",
  evidence: [{ sourceId: "sikkim-tourism-portal", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" }, contentHash: "h", evidenceType: "direct-statement", retrievedAt: "" }],
};
check("TEST H  Sikkim-scoped source cannot back a Kyoto claim",
  approvalBlockers(crossDest, { documents: [{ sourceId: "sikkim-tourism-portal", text: "q", contentHash: "h" }] })
    .some((b) => b.includes("not citable")),
  "cross-destination contamination blocked at approval");
check("TEST H(scope) sourceInScope agrees",
  !sourceInScope("sikkim-tourism-portal", getDestination("kyoto")));

/* ========================================================================
   8-9. PUBLISHED KNOWLEDGE ISOLATION + AUDIT TRAIL
   ======================================================================== */
section("8-9. Approved-knowledge isolation and audit trail");

const ROOT = join(process.cwd(), ".data", "research");
check("Raw research, reviews and approved knowledge are separate stores",
  existsSync(join(ROOT, "jobs")) && existsSync(join(ROOT, "reviews")) && existsSync(join(ROOT, "approved")));

const approved = loadApproved("jaipur");
check("Approved knowledge contains only approved claims", approved.claims.length > 0, `${approved.claims.length}`);
check("Every approved claim records who approved it and when",
  approved.claims.every((c) => c.approvedBy && c.approvedAt));
check("Approved knowledge is derived, so a reversal actually removes a claim",
  /rebuiltAt/.test(JSON.stringify(approved)));

const trail = auditTrail("jaipur");
check("TEST I  Approval writes an audit entry", trail.length > 0, `${trail.length} entries`);
check("TEST I  Audit records reviewer, timestamp, previous and new status",
  trail.every((e) => e.reviewer && e.at && e.previousStatus && e.newStatus));

/* TEST J: raw research must not be readable by public pages. */
const appFiles = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) appFiles.push(p);
  }
};
walk("src");
/* Route groups are directories in the source tree but not in the URL, so the
   review route is now "app/(v1)/review". Matching on the literal "app/review"
   silently stopped recognising it — and a check that stops recognising the
   ONE route allowed to read raw research fails open in the dangerous
   direction the day it is moved again. Matched past any group instead. */
const IS_REVIEW_ROUTE = /app\/(?:\([^)]*\)\/)?review\//;
const importers = appFiles.filter((f) => readFileSync(f, "utf8").includes("research/review-store"));
check("TEST J  Only the review route reads raw research",
  importers.every((f) => IS_REVIEW_ROUTE.test(f)), importers.join(", ") || "none");
const publicPages = appFiles.filter((f) => f.includes("src/app/") && !IS_REVIEW_ROUTE.test(f));
check("TEST J  No public page reads .data/research",
  publicPages.every((f) => !readFileSync(f, "utf8").includes(".data")), "raw research is unreachable publicly");
const reviewStore = readFileSync("src/lib/research/review-store.ts", "utf8");
check("The review UI is gated off in production by default",
  /NODE_ENV !== "production" \|\| process\.env\.TERRASTORY_REVIEW_UI === "1"/.test(reviewStore));
check("The review UI is marked noindex",
  readFileSync("src/app/(v1)/review/page.tsx", "utf8").includes("index: false"));

/* ========================================================================
   10-15. SENTENCE VERIFICATION — TEST A-G
   ======================================================================== */
section("10-15. Sentence verification (TEST A-G)");

check("Sentences split on terminators", splitSentences("One fact. Two facts! Three?").length === 3);
check("Abbreviations do not split a sentence",
  splitSentences("It was built by Mr. Singh in 1592.").length === 1);

const atoms = extractFactualAtoms("Rumtek was founded in 1966 and is the largest of 3 sites in Sikkim.");
check("Factual atoms are extracted",
  atoms.years.includes("1966") && atoms.numbers.includes("3") &&
  atoms.entities.includes("Rumtek") && atoms.superlatives.includes("largest"));
check("Connective assertions are detected",
  extractFactualAtoms("Because of this it became a centre of learning.").connectives.length > 0);

check("TEST A  Fully supported sentence is accepted",
  accepted("Rumtek Monastery was founded in 1966 by the sixteenth Karmapa.").ok);
check("TEST B  Unsupported factual claim is rejected",
  !accepted("Rumtek Monastery was founded in 1966 and houses 300 monks.").ok,
  "number:300 unsupported");
check("TEST C  Unsupported date is rejected",
  !accepted("Rumtek Monastery was founded in 1966 and expanded in 1984.").ok,
  "year:1984 unsupported");
check("TEST D  Opening time is rejected by the practical-data firewall",
  verifySentence("Rumtek Monastery opens daily at 6am.", CLAIMS).reason === "practical-data");
check("TEST F  A supported paraphrase is accepted",
  accepted("Founded in 1966, Rumtek Monastery is the seat of the Karma Kagyu lineage in exile.").ok,
  "restructured wording, same facts");
check("TEST F  A paraphrase adding a new fact is rejected",
  !accepted("Founded in 1966, Rumtek Monastery is the largest monastery in the Himalayas.").ok,
  "similarity alone is never sufficient");
check("TEST G  An unsupported connective assertion is rejected",
  !verifySentence("Because of this it became a centre of learning.", CLAIMS).ok);
check("TEST G  A smuggled superlative is rejected",
  !accepted("Rumtek Monastery is one of the most important Buddhist sites in Sikkim.").ok);
check("A sentence with no checkable content is rejected",
  verifySentence("It has a long and storied past.", CLAIMS).reason === "no-factual-content");
check("A verbatim restatement of a claim is accepted",
  verifySentence(CLAIMS[0].statement, CLAIMS).ok, "the sentence IS the claim");
check("A sentence containing a claim PLUS extra facts is not treated as restatement",
  !verifySentence(`${CLAIMS[0].statement.replace(/\.$/, "")} and cost 2000 rupees.`, CLAIMS).ok,
  "containment is one-directional");
check("Rejections name the unsupported atoms",
  (verifySentence("Rumtek was founded in 1966 and expanded in 1984.", CLAIMS).detail ?? "").includes("1984"));

/* TEST E: conflicts. */
section("TEST E — conflicts");
const conflictClaims = [
  { ...CLAIMS[0], id: "k1", statement: "The monastery was founded in 1700.", status: "conflicted" },
  { ...CLAIMS[0], id: "k2", statement: "The monastery was founded in 1720.", status: "conflicted" },
  { ...CLAIMS[1], id: "k3" },
];
const conflicts = [{ id: "cf1", claimIds: ["k1", "k2"], subject: "founding year", resolution: "unresolved" }];
const { usable, excluded } = excludeConflicted(conflictClaims, conflicts);
check("TEST E  Conflicted claims are excluded before generation",
  excluded.length === 2 && usable.length === 1,
  "the model never sees the disputed date");
check("TEST E  An averaged compromise cannot be verified",
  !accepted("The monastery was founded around 1710.").ok, "1710 appears in no claim");
check("TEST E  Neither conflicting date can be silently chosen",
  !verifySentence("The monastery was founded in 1700.", usable).ok &&
  !verifySentence("The monastery was founded in 1720.", usable).ok);

/* ========================================================================
   16-20. FIREWALL, ISOLATION, PROVENANCE, MALFORMED, FAILURE
   ======================================================================== */
section("16-20. Firewall, isolation, provenance, failure handling");

check("Practical-data firewall runs BEFORE atom checking in the narrative path",
  verifySentence("Rumtek Monastery was founded in 1966 and opens daily at 6am.", CLAIMS).reason === "practical-data",
  "a sourced opening time is still refused");
for (const s of ["Tickets cost 500 rupees.", "Open from 9am to 5pm.", "Rooms are available for booking.", "A permit is required and must be obtained."]) {
  check(`  firewall: "${s.slice(0, 34)}"`, detectPracticalData(s).practical);
}
check("Heritage prose is not caught by the firewall",
  !detectPracticalData("A book of prayers was compiled by the fifth Chogyal.").practical);

const block = assembleBlock({
  accepted: [{ sentence: CLAIMS[0].statement, claimIds: ["c1"] }],
  category: "history", claimType: "documented history", destinationId: "sikkim", generatedBy: "test",
});
check("Published blocks carry the claim ids they were built from",
  block && block.claimIds.includes("c1") && block.sentenceCount === 1);
check("An empty verified set produces no block",
  assembleBlock({ accepted: [], category: "history", claimType: "documented history", destinationId: "sikkim", generatedBy: "test" }) === null);

check("Malformed narrative input yields no accepted sentences",
  verifyNarrative("", CLAIMS).accepted.length === 0 &&
  verifyNarrative("...", CLAIMS).accepted.length === 0);

const njSrc = readFileSync("scripts/research/narrative-job.mjs", "utf8");
check("Narrative generation reads approved knowledge only",
  /loadApproved/.test(njSrc) && !/allClaims/.test(njSrc),
  "raw research is not an input to narrative");
check("A provider failure is recorded, not fabricated around",
  /provider-failure/.test(njSrc));
check("Narrative runs as a job, not during a render",
  !existsSync("src/lib/research/narrative-job.ts"));
check("Generation with no approved claims produces nothing",
  /Narrative generation requires reviewer approval first/.test(njSrc));

/* Stored narrative output. */
const NARR = join(ROOT, "narrative");
if (existsSync(NARR)) {
  let blocks = 0, uncited = 0, practical = 0;
  for (const f of readdirSync(NARR).filter((x) => x.endsWith(".json"))) {
    const n = JSON.parse(readFileSync(join(NARR, f), "utf8"));
    for (const b of n.blocks ?? []) {
      blocks += 1;
      if (!b.claimIds || b.claimIds.length === 0) uncited += 1;
      if (detectPracticalData(b.text).practical) practical += 1;
    }
  }
  check("Every published narrative block cites claims", uncited === 0, `${blocks} blocks, ${uncited} uncited`);
  check("No published narrative block contains practical data", practical === 0);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
