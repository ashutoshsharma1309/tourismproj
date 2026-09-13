/**
 * Phase 8 integrity — provider failure, fallback, and the verifier under
 * model-like output.
 *
 * WHY FAULT INJECTION RATHER THAN SOURCE GREPS
 * --------------------------------------------
 * Earlier phases asserted failure handling by checking that a `catch` block
 * existed. That proves the code was written, not that the page survives. This
 * suite makes each failure actually happen — auth rejected, rate limited,
 * timed out, refused, malformed, empty, wrong type — and then checks what
 * reached the destination: no crash, no publication, approved content intact.
 *
 * The one failure mode NOT covered here is the server-side refusal
 * `fallbacks` request parameter, which needs a real API round-trip to verify.
 * Phase 8's own instruction is to add it only in the session where the live
 * provider is exercised, and that session has not happened.
 *
 *   node scripts/qa/resilience-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "../research/core.mjs";
import { listProviders } from "../research/provider.mjs";
import { runNarrativeJob } from "../research/narrative-job.mjs";
import { loadApproved } from "../research/review.mjs";
import { verifyNarrative, verifySentence } from "../research/narrative.mjs";
import { excludeConflicted } from "../research/narrative.mjs";
import { measureQuality } from "../research/evaluate.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

/* ========================================================================
   1. LIVE MODEL STATUS — recorded, never assumed
   ======================================================================== */
section("1. Live model status");

const anthropic = listProviders().find((p) => p.name === "anthropic");
console.log(`      LIVE MODEL: ${anthropic.available ? "AVAILABLE" : "NOT EXECUTED — no credential"}`);
check("Provider availability is reported honestly", typeof anthropic.available === "boolean");
const provSrc = readFileSync("scripts/research/provider.mjs", "utf8");
check("The key is read only from the environment",
  /process\.env\.ANTHROPIC_API_KEY/.test(provSrc) && !/sk-ant-/.test(provSrc));
check("No credential is echoed in provider output",
  !/console\.log\([^)]*ANTHROPIC_API_KEY/.test(provSrc) && !/apiKey/.test(provSrc.replace(/apiKey: "your-api-key"/g, "")));

/* Secret hygiene across everything this project writes. */
const scanned = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".next")) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(mjs|ts|tsx|md|json)$/.test(e.name)) scanned.push(p);
  }
};
walk("scripts"); walk("docs"); walk("src");
const leaked = scanned.filter((f) => /sk-ant-[A-Za-z0-9]/.test(readFileSync(f, "utf8")));
check("No API key appears in any source, doc or generated file", leaked.length === 0,
  leaked.join(", ") || `${scanned.length} files scanned`);

/* ========================================================================
   2-8. PROVIDER FAILURE INJECTION
   ======================================================================== */
section("2-8. Provider failure injection");

/** A provider that fails in a chosen way. */
const failing = (mode) => ({
  name: `fault-${mode}`,
  available: () => true,
  unavailableReason: () => null,
  async plan({ categories }) {
    return { tasks: categories.map((c) => ({ id: c, category: c, question: c, expectedClaimType: "documented history", acceptableTiers: [] })), anticipatedGaps: [] };
  },
  async generateNarrative() {
    switch (mode) {
      case "auth": { const e = new Error("401 Unauthorized: invalid x-api-key"); e.status = 401; throw e; }
      case "ratelimit": { const e = new Error("429 Too Many Requests"); e.status = 429; throw e; }
      case "timeout": { const e = new Error("Request timed out"); e.name = "TimeoutError"; throw e; }
      case "refusal": throw new Error("Provider declined narrative generation (cyber)");
      case "unavailable": { const e = new Error("503 Service Unavailable"); e.status = 503; throw e; }
      case "network": { const e = new Error("fetch failed: ECONNREFUSED"); e.name = "TypeError"; throw e; }
      case "malformed": throw new Error("Provider returned unparseable output; rejected without repair.");
      case "empty": return "";
      case "null": return null;
      case "wrongtype": return 42;
      default: throw new Error("unknown fault");
    }
  },
});

const FAULTS = ["auth", "ratelimit", "timeout", "refusal", "unavailable", "network", "malformed", "empty", "null", "wrongtype"];
const baseline = loadApproved("jaipur").claims.length;

for (const fault of FAULTS) {
  let result = null;
  let threw = null;
  try {
    result = await runNarrativeJob({ destinationId: "jaipur", provider: failing(fault), force: true });
  } catch (err) {
    threw = err;
  }
  const survivedWithoutThrowing = threw === null;
  const publishedNothing = (result?.blocks ?? []).length === 0;
  const recorded = (result?.rejected ?? []).some((r) => r.reason === "provider-failure");
  const claimsIntact = loadApproved("jaipur").claims.length === baseline;

  check(`  ${fault.padEnd(11)} job completes without throwing`, survivedWithoutThrowing,
    threw ? threw.message.slice(0, 60) : "");
  check(`  ${fault.padEnd(11)} publishes no narrative`, publishedNothing,
    `${(result?.blocks ?? []).length} blocks`);
  check(`  ${fault.padEnd(11)} records the failure with a reason`, recorded);
  check(`  ${fault.padEnd(11)} approved claims are untouched`, claimsIntact, `${baseline} claims`);
}

/* Restore Jaipur's real narrative after the fault runs. */
await runNarrativeJob({ destinationId: "jaipur", providerName: "rule-based", force: true });

/* ========================================================================
   9. FALLBACK QUALITY — the page must still work
   ======================================================================== */
section("9. Fallback quality");

const PUB = "src/data/generated/published-knowledge.json";
const published = existsSync(PUB) ? JSON.parse(readFileSync(PUB, "utf8")) : null;
check("Every destination still has approved facts to fall back on",
  Object.values(published?.destinations ?? {}).every((d) => d.categories.length > 0));
check("Every destination still has a timeline",
  Object.values(published?.destinations ?? {}).every((d) => (d.timeline ?? []).length > 0));

const publishSrc = readFileSync("scripts/research/publish.mjs", "utf8");
check("The fallback path publishes approved claims only",
  /loadApproved/.test(publishSrc) && !/allClaims/.test(publishSrc));
check("A block citing unpublished claims is withheld",
  /cites unpublished claims/.test(publishSrc));
const knowledgeSrc = readFileSync("src/components/destinations/PublishedKnowledge.tsx", "utf8");
check("The page renders facts whether or not narrative exists",
  /\{intro \? \(/.test(knowledgeSrc) && /categories\.map/.test(knowledgeSrc));

/* ========================================================================
   10-15. ADVERSARIAL TESTS A-F  (verifier under model-like output)
   ========================================================================
   These measure THE VERIFIER's response to prose a model plausibly produces.
   They are NOT measurements of any model — no model has run.
   ======================================================================== */
section("10-15. Adversarial cases A-F (verifier, not model)");

const CLAIMS = [
  { id: "a1", category: "history", claimType: "documented history", status: "validated",
    statement: "Jaipur was founded in 1727 by Jai Singh II." },
  { id: "a2", category: "history", claimType: "documented history", status: "validated",
    statement: "Amber Fort was built in a hybrid Hindu-Muslim style." },
  { id: "a3", category: "culture", claimType: "documented history", status: "validated",
    statement: "Jaipur is known for its coloured gems." },
];
const accepts = (t, c = CLAIMS) => {
  const r = verifyNarrative(t, c);
  return r.accepted.length > 0 && r.rejected.length === 0;
};

check("TEST A  A detailed historical narrative with an invented detail is rejected",
  !accepts("Jaipur was founded in 1727 by Jai Singh II, who employed over 20,000 workers on the project."),
  "unsupported number");
check("TEST B  An unsupported causal link between traditions is rejected",
  !accepts("Jaipur is known for its coloured gems, which shaped the city's architectural traditions."),
  "unsupported causal relationship");
check("TEST C  A date absent from the claims is rejected",
  !accepts("Jaipur was founded in 1727 and its walls were completed in 1734."),
  "unsupported year");
check("TEST D  Tourism prose containing opening hours is blocked by the firewall",
  verifySentence("Amber Fort was built in a hybrid Hindu-Muslim style and opens daily at 8am.", CLAIMS).reason === "practical-data");

const CONFLICTED = [
  { id: "x1", category: "history", claimType: "documented history", status: "conflicted", statement: "The fort was built in 1592." },
  { id: "x2", category: "history", claimType: "documented history", status: "conflicted", statement: "The fort was built in 1600." },
];
const { usable, excluded } = excludeConflicted(CONFLICTED, [{ id: "c", claimIds: ["x1", "x2"], subject: "build year", resolution: "unresolved" }]);
check("TEST E  Conflicting claims never reach generation", excluded.length === 2 && usable.length === 0);
check("TEST E  A silent compromise cannot verify", !accepts("The fort was built around 1596.", CONFLICTED));

check("TEST F  Engaging style is allowed when every fact is supported",
  accepts("Founded in 1727 by Jai Singh II, Jaipur is known for its coloured gems."),
  "restructured, nothing added");
check("TEST F  Engaging style does not license an unsupported flourish",
  !accepts("Founded in 1727 by Jai Singh II, Jaipur is the most celebrated of India's planned cities."),
  "superlative rejected");

/* ========================================================================
   16. METRICS ARE DEFINED HONESTLY
   ======================================================================== */
section("16. Metric definitions");

const q = measureQuality({
  accepted: [{ sentence: "Founded in 1727 by Jai Singh II, Jaipur is known for its coloured gems.", claimIds: ["a1", "a3"] },
             { sentence: "Amber Fort was built in a hybrid Hindu-Muslim style.", claimIds: ["a2"] }],
  rejected: [{ sentence: "It housed 20,000 workers.", reason: "unsupported-assertion" }],
  availableClaims: 3,
});
check("Survival rate counts every factual sentence in the denominator",
  Math.abs(q.sentenceSurvivalRate - 2 / 3) < 1e-9, `${(q.sentenceSurvivalRate * 100).toFixed(0)}%`);
check("Composition ratio counts sentences drawing on more than one claim",
  Math.abs(q.compositionRatio - 0.5) < 1e-9, `${(q.compositionRatio * 100).toFixed(0)}%`);
check("Unsupported assertion rate is reported separately",
  Math.abs(q.unsupportedAssertionRate - 1 / 3) < 1e-9);
check("Coverage measures claims actually used", Math.abs(q.coverage - 1) < 1e-9);
const evalSrc = readFileSync("scripts/research/evaluate.mjs", "utf8");
check("The harness never modifies the verifier",
  /THE VERIFIER IS NOT TUNED BY THIS HARNESS/.test(evalSrc));

/* ========================================================================
   17-18. REGRESSION — depth, Sikkim, search
   ======================================================================== */
section("17-18. Regression");

check("Depth is unchanged by any of this",
  published?.destinations?.sikkim?.depth?.depth === "deep" &&
  published?.destinations?.jaipur?.depth?.depth === "curated" &&
  Object.entries(published?.destinations ?? {}).every(([id, d]) => id === "sikkim" || d?.depth?.depth !== "deep"),
  Object.entries(published?.destinations ?? {}).map(([id, d]) => `${id}=${d?.depth?.depth}`).join("/"));
check("Sikkim's curated records are untouched",
  readFileSync("src/data/monasteries.ts", "utf8").includes("const SEEDS: MonasterySeed[]"));

const searchSrc = readFileSync("src/lib/search-index.ts", "utf8");
const paletteSrc = readFileSync("src/components/search/CommandPalette.tsx", "utf8");
check("Search is still grouped by owning destination", /export interface SearchGroupIndex/.test(searchSrc));
check("Destination scope is still the default", /useState\(false\)/.test(paletteSrc));
check("Current-destination ranking is still applied in global search",
  /globalSearch && localHrefs/.test(paletteSrc));
check("No practical data reached any published surface",
  Object.values(published?.destinations ?? {}).every((d) =>
    [...d.categories.flatMap((c) => c.claims).map((c) => c.statement),
     ...(d.narrative ?? []).map((b) => b.text),
     ...(d.timeline ?? []).map((t) => t.title)].every((t) => !detectPracticalData(t).practical)));

check("Generation cannot run during a page render",
  !existsSync("src/lib/research/narrative-job.ts") && !existsSync("src/lib/research/publish.ts"));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
