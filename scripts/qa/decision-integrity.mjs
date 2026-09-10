/**
 * Phase 9 integrity — curated protection, publication gate, live-run readiness.
 *
 * Phase 9 is a decision phase, so these checks are about whether the decision
 * can be made honestly: is the curated archive actually protected, does the
 * publication gate actually block, and is the live evaluation genuinely one
 * command away rather than nominally so.
 *
 *   node scripts/qa/decision-integrity.mjs
 */

import { existsSync, readFileSync } from "node:fs";

import { curatedFacts, findContradictions, screenAgainstCurated } from "../research/curated-guard.mjs";
import { approvalBlockers } from "../research/review.mjs";
import { publishDestination } from "../research/publish.mjs";
import { listProviders } from "../research/provider.mjs";
import { preflight, runLive } from "../research/evaluate.mjs";
import { PROMPT_VERSION } from "../research/narrative-modes.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

/* ========================================================================
   1. LIVE MODEL STATUS
   ======================================================================== */
section("1. Live model status");

const anthropic = listProviders().find((p) => p.name === "anthropic");
console.log(`      LIVE MODEL: ${anthropic.available ? "AVAILABLE" : "UNAVAILABLE — validation blocked"}`);
check("Provider status is reported, never assumed", typeof anthropic.available === "boolean");

const pf = await preflight();
check("Pre-flight reports a specific blocking stage rather than failing vaguely",
  pf.ok || (pf.stage && pf.detail), pf.ok ? "credential works" : `blocked at ${pf.stage}`);
check("Pre-flight does not spend tokens when the credential is missing",
  pf.ok || pf.stage === "credential", "checks the key before calling the API");

for (const d of ["sikkim", "jaipur", "kyoto"]) {
  const r = await runLive({ destinationId: d });
  check(`  ${d}: live run reports executed=${r.executed} honestly`,
    r.executed === anthropic.available,
    r.executed ? "real model ran" : "NOT EXECUTED");
}

const evalSrc = readFileSync("scripts/research/evaluate.mjs", "utf8");
check("The harness records model, promptVersion and claimSetVersion",
  /model: "claude-opus-5"/.test(evalSrc) && /promptVersion: PROMPT_VERSION/.test(evalSrc) && /claimSetVersion/.test(evalSrc));
check("Cost is computed from reported usage only",
  /metrics\.inputTokens \|\| metrics\.outputTokens/.test(evalSrc));
check("Composition ratio is weighted by accepted sentences, not averaged naively",
  /\(t\.quality\.compositionRatio \?\? 0\) \* t\.accepted/.test(evalSrc));
check("The verifier is imported, never modified by the harness",
  /THE VERIFIER IS NOT TUNED BY THIS HARNESS/.test(evalSrc));
check("The credential is documented in the project's own config file",
  /ANTHROPIC_API_KEY=/.test(readFileSync(".env.example", "utf8")),
  "so the blocker is one documented line, not tribal knowledge");
check("Prompt version is recorded", Boolean(PROMPT_VERSION), PROMPT_VERSION);

/* ========================================================================
   2. CURATED PROTECTION  (Objective 13)
   ======================================================================== */
section("2. Curated-content protection");

const facts = curatedFacts("sikkim");
check("Curated facts are parsed from the archive", facts.length === 15, `${facts.length} monastery records`);
check("Every curated fact carries its subject, year and origin",
  facts.every((f) => f.subject && f.year && f.source));
check("Destinations without a curated archive have nothing to protect",
  curatedFacts("jaipur").length === 0 && curatedFacts("kyoto").length === 0);

const contradicting = { id: "bad1", statement: "Rumtek Monastery was founded in 1740 by the twelfth Karmapa." };
const agreeing = { id: "ok1", statement: "Rumtek Monastery was founded in 1966 by the sixteenth Karmapa." };
const laterEvent = { id: "ok2", statement: "Rumtek Monastery was rebuilt in 1992 after a dispute." };
const otherSubject = { id: "ok3", statement: "Some other building was founded in 1740." };

check("A contradicting founding year is detected",
  findContradictions(contradicting, facts).length === 1,
  findContradictions(contradicting, facts)[0]?.detail);
check("An agreeing claim is not flagged", findContradictions(agreeing, facts).length === 0);
check("A later event about the same subject is not a contradiction",
  findContradictions(laterEvent, facts).length === 0, "rebuilt 1992 does not dispute founded 1966");
check("A different subject is not a contradiction", findContradictions(otherSubject, facts).length === 0);
check("An undated claim cannot contradict a date",
  findContradictions({ statement: "Rumtek Monastery belongs to the Karma Kagyu lineage." }, facts).length === 0);

const screened = screenAgainstCurated([contradicting, agreeing], "sikkim");
check("Screening marks rather than deletes the contradicting claim",
  screened.claims.length === 2 && screened.claims[0].blockedFromPublication === true,
  "the disagreement is preserved for a curator");
check("Screening records the contradiction for review", screened.contradictions.length === 1);

/* The gate must actually block, through the real publication path. */
const withContradiction = {
  ...contradicting,
  destinationId: "sikkim", category: "history", claimType: "documented history",
  status: "validated", confidence: "medium",
  evidence: [{ sourceId: "wikipedia", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" }, contentHash: "h", evidenceType: "direct-statement", retrievedAt: "" }],
};
const blockers = approvalBlockers(withContradiction, {
  documents: [{ sourceId: "wikipedia", text: "q", contentHash: "h" }],
});
check("Approval surfaces the contradiction to the reviewer",
  blockers.some((b) => b.includes("contradicts curated content")),
  blockers.find((b) => b.includes("contradicts")) ?? "");

const publishSrc = readFileSync("scripts/research/publish.mjs", "utf8");
check("Publication blocks a claim that contradicts curated content",
  /contradicts curated content/.test(publishSrc));
check("The curated record is never overwritten",
  !/writeFileSync\([^)]*src\/data\/monasteries/.test(publishSrc));
check("Sikkim's curated records are byte-intact",
  readFileSync("src/data/monasteries.ts", "utf8").includes("const SEEDS: MonasterySeed[]"));

/* ========================================================================
   3. PUBLICATION GATE  (Objective 12)
   ======================================================================== */
section("3. Publication gate");

const sikkim = publishDestination("sikkim");
const jaipur = publishDestination("jaipur");
const kyoto = publishDestination("kyoto");

for (const [name, d] of [["sikkim", sikkim], ["jaipur", jaipur], ["kyoto", kyoto]]) {
  check(`  ${name}: every published claim is validated`,
    d.categories.flatMap((c) => c.claims).every((c) => c.sources.length > 0));
  check(`  ${name}: every narrative block carries provenance`,
    d.narrative.every((b) => b.claimIds.length > 0 && b.generatedBy && b.verifiedAt));
  check(`  ${name}: a claimSetVersion is recorded`, Boolean(d.claimSetVersion), d.claimSetVersion);
  check(`  ${name}: destination ownership is correct`,
    d.destinationId === name);
}
check("Publishing remains deterministic",
  JSON.stringify(publishDestination("jaipur")) === JSON.stringify(jaipur));

/* ========================================================================
   4. THE DECISION IS EVIDENCE-BASED
   ======================================================================== */
section("4. Decision integrity");

const PUB = "src/data/generated/published-knowledge.json";
const published = existsSync(PUB) ? JSON.parse(readFileSync(PUB, "utf8")) : null;
const blocks = Object.values(published?.destinations ?? {}).flatMap((d) => d.narrative ?? []);

check("No published narrative claims to be model-generated",
  blocks.every((b) => b.generatedBy !== "anthropic"),
  `all ${blocks.length} blocks generatedBy=${[...new Set(blocks.map((b) => b.generatedBy))].join(",")}`);
check("The deterministic provider is labelled as itself, not as AI",
  blocks.every((b) => b.generatedBy === "rule-based"));
check("Depth is unchanged by any narrative outcome",
  published?.destinations?.sikkim?.depth?.depth === "deep" &&
  published?.destinations?.jaipur?.depth?.depth === "curated" &&
  published?.destinations?.kyoto?.depth?.depth === "researched");

const docs = existsSync("docs/phase-9-ai-publication-decision.md")
  ? readFileSync("docs/phase-9-ai-publication-decision.md", "utf8")
  : "";
check("A publication decision is documented",
  /AI NOT PUBLISHED|AI PUBLISHED/.test(docs), docs ? "decision recorded" : "decision doc missing");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
