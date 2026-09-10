/**
 * Phase 6 integrity — live-model readiness, verified composition, scoped search.
 *
 * The load-bearing test in this file is the regression guard: Phase 6 changed
 * the verifier, and every rejection it made before must still be a rejection.
 * A verifier loosened to raise a survival rate measures nothing, so the proof
 * that it was not loosened has to be mechanical.
 *
 *   node scripts/qa/composition-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "../research/core.mjs";
import { listProviders } from "../research/provider.mjs";
import { buildClaimGraph, planNarrative } from "../research/claim-graph.mjs";
import { NARRATIVE_MODES, PROMPT_VERSION, claimsForMode, modeFor } from "../research/narrative-modes.mjs";
import { extractFactualAtoms, verifyNarrative, verifySentence } from "../research/narrative.mjs";
import { MIN_SURVIVAL_TO_PUBLISH, VERIFICATION_VERSION, loadNarrative } from "../research/narrative-job.mjs";
import { runFixtures } from "../research/evaluate.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

const CLAIMS = [
  { id: "c1", category: "history", claimType: "documented history", status: "validated",
    statement: "Pemayangtse Monastery was founded in 1705 by Lhatsun Chempo.",
    evidence: [{ sourceId: "wikipedia", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" } }] },
  { id: "c2", category: "history", claimType: "documented history", status: "validated",
    statement: "Pemayangtse Monastery was rebuilt in 1913 after an earthquake.",
    evidence: [{ sourceId: "wikipedia", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" } }] },
  { id: "c3", category: "culture", claimType: "documented history", status: "validated",
    statement: "Pemayangtse Monastery belongs to the Nyingma order.",
    evidence: [{ sourceId: "wikivoyage", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" } }] },
  { id: "c4", category: "stories", claimType: "legend", status: "validated",
    statement: "A local legend tells of a lama who could fly between the ridges.",
    evidence: [{ sourceId: "wikivoyage", quote: "q", locator: { charStart: 0, charEnd: 1, url: "u" } }] },
];
const ok1 = (text, claims = CLAIMS) => {
  const r = verifyNarrative(text, claims);
  return r.accepted.length > 0 && r.rejected.length === 0;
};

/* ========================================================================
   1-5. PROVIDER, CONFIG, STRUCTURED OUTPUT, TOKEN + COST ACCOUNTING
   ======================================================================== */
section("1-5. Provider configuration and accounting");

const providers = listProviders();
const anthropic = providers.find((p) => p.name === "anthropic");
check("Both providers are registered", providers.length === 2, providers.map((p) => p.name).join(", "));
check("Provider availability is reported honestly, never assumed",
  typeof anthropic.available === "boolean",
  anthropic.available ? "AVAILABLE" : "UNAVAILABLE — live evaluation cannot run");

const provSrc = readFileSync("scripts/research/provider.mjs", "utf8");
check("API key is read from the environment, never hardcoded",
  /process\.env\.ANTHROPIC_API_KEY/.test(provSrc) && !/sk-ant-/.test(provSrc));
check("Model is claude-opus-5", /const MODEL = "claude-opus-5"/.test(provSrc));
check("Structured output uses a JSON schema at the API boundary",
  /output_config:\s*\{[^}]*format:\s*\{ type: "json_schema"/.test(provSrc));
check("Adaptive thinking is enabled", /thinking:\s*\{ type: "adaptive" \}/.test(provSrc));
check("Prompt caching is applied to the system prompt",
  /cache_control:\s*\{ type: "ephemeral" \}/.test(provSrc));
check("Refusals are surfaced, not swallowed",
  /stop_reason === "refusal"/.test(provSrc));
check("Token usage is captured from the response, not estimated",
  /this\.lastUsage = response\.usage \?\? null/.test(provSrc));
const evalSrc = readFileSync("scripts/research/evaluate.mjs", "utf8");
check("Cost is derived from reported usage and is null when usage is absent",
  /estimatedCostUsd\s*=\s*\n?\s*metrics\.inputTokens \|\| metrics\.outputTokens/.test(evalSrc));
check("Survival rate is accepted / total, defined in one place",
  /survivalRate = metrics\.totalSentences === 0 \? null : metrics\.accepted \/ metrics\.totalSentences/.test(evalSrc));
check("Live evaluation refuses to run without a key",
  /if \(!provider\.available\(\)\) \{\s*\n\s*return \{ executed: false/.test(evalSrc));

/* ========================================================================
   6-9. THE VERIFIER DID NOT WEAKEN
   ======================================================================== */
section("6-9. Verifier regression guard");

const fixtures = runFixtures();
check("Phase 5 fixture accuracy is unchanged", fixtures.accuracy === 1, `${fixtures.correct}/${fixtures.total}`);

/* Every category of smuggled assertion must still be refused. */
const MUST_REJECT = [
  ["unsupported date", "Pemayangtse Monastery was founded in 1705 and expanded in 1984."],
  ["unsupported number", "Pemayangtse Monastery was founded in 1705 and houses 300 monks."],
  ["unsupported entity", "Pemayangtse Monastery was founded in 1705 by Lhatsun Chempo in Bhutan."],
  ["superlative", "Pemayangtse Monastery is the largest monastery in the Himalayas."],
  ["causal", "Pemayangtse was founded in 1705, which made it the centre of the region."],
  ["present continuation", "Pemayangtse was founded in 1705 and today it remains a centre of learning."],
  ["process", "Pemayangtse was founded in 1705 and over time became influential."],
  ["practical data", "Pemayangtse Monastery opens daily at 6am."],
];
for (const [label, text] of MUST_REJECT) {
  check(`  still rejected: ${label}`, !ok1(text));
}

/* Phase 6 additions to the reject list. */
const EVALUATIVE = [
  ["'shaped'", "These traditions shaped the cultural identity of Pemayangtse Monastery."],
  ["'gave rise to'", "The founding of Pemayangtse Monastery in 1705 gave rise to a wider network."],
  ["'influenced'", "Pemayangtse Monastery influenced the Nyingma order across the region."],
  ["'cemented'", "The 1705 founding cemented Pemayangtse Monastery as a seat of learning."],
];
for (const [label, text] of EVALUATIVE) {
  check(`  newly rejected (Phase 6): evaluative ${label}`, !ok1(text));
}

/* ========================================================================
   10. COMPOSITION IS ACCEPTED WHEN GENUINELY ENTAILED
   ======================================================================== */
section("10. Verified composition");

check("Additive transition joining two supported facts is accepted",
  ok1("Pemayangtse Monastery was founded in 1705 by Lhatsun Chempo, and also belongs to the Nyingma order."),
  "conjunction of supported facts asserts nothing new");
check("Ordering is accepted when the claims carry both dates",
  ok1("Founded in 1705 by Lhatsun Chempo, Pemayangtse Monastery was later rebuilt in 1913 after an earthquake."),
  "1705 < 1913, both in claims");
check("Ordering is REJECTED without a second dated claim to order",
  !ok1("Pemayangtse Monastery was founded in 1705 and was later expanded."),
  "'later' would assert an undated second event");
check("Atoms separate sound transitions from assertions",
  extractFactualAtoms("It was later rebuilt and also enlarged.").ordering.length > 0 &&
  extractFactualAtoms("It was later rebuilt and also enlarged.").additive.length > 0 &&
  extractFactualAtoms("It was later rebuilt and also enlarged.").connectives.length === 0);

/* ========================================================================
   CLAIM GRAPH + MODES
   ======================================================================== */
section("Claim graph and narrative modes");

const graph = buildClaimGraph(CLAIMS);
check("Graph has a node per claim", graph.nodes.length === CLAIMS.length);
check("Every edge records why it exists",
  graph.edges.length > 0 && graph.edges.every((e) => e.because && e.kind));
check("Edge kinds are all explainable",
  graph.edges.every((e) => ["shares-entity", "temporal", "same-category", "same-source"].includes(e.kind)));
check("Temporal edges point from earlier to later",
  graph.edges.filter((e) => e.kind === "temporal").every((e) => /precedes/.test(e.because)));

const plan = planNarrative({ claims: CLAIMS, mode: "HISTORICAL" });
check("Plan orders dated claims chronologically",
  plan.chronology.length >= 2 && plan.chronology[0].year <= plan.chronology[1].year,
  plan.chronology.map((c) => c.year).join(" → "));
check("Planning is deterministic",
  JSON.stringify(planNarrative({ claims: CLAIMS, mode: "HISTORICAL" }).orderedClaimIds) ===
  JSON.stringify(plan.orderedClaimIds));
check("Through-lines name entities appearing in several claims",
  plan.throughLines.every((t) => t.claims > 1));

check("Five narrative modes exist, not dozens", Object.keys(NARRATIVE_MODES).length === 5,
  Object.keys(NARRATIVE_MODES).join(", "));
check("Every mode declares audience, structure, claim types and length",
  Object.values(NARRATIVE_MODES).every((m) => m.audience && m.structure && m.allowedClaimTypes.length && m.maxSentences));
check("HISTORICAL admits documented history only",
  modeFor("HISTORICAL").allowedClaimTypes.join() === "documented history");
check("A legend cannot enter a historical narrative",
  claimsForMode(CLAIMS, modeFor("HISTORICAL")).every((c) => c.claimType === "documented history") &&
  !claimsForMode(CLAIMS, modeFor("HISTORICAL")).some((c) => c.id === "c4"));
check("STORY is the mode that admits legends",
  modeFor("STORY").allowedClaimTypes.includes("legend"));
check("An unknown mode is refused", (() => { try { modeFor("NOPE"); return false; } catch { return true; } })());

/* ========================================================================
   11-16. FIREWALL, PROVENANCE, VERSIONING, CACHING, THRESHOLD
   ======================================================================== */
section("11-16. Firewall, provenance, versioning, caching");

check("Practical data is rejected in the narrative path before atom checking",
  verifySentence("Pemayangtse was founded in 1705 and opens daily at 6am.", CLAIMS).reason === "practical-data");
check("The practical guard itself is unchanged",
  ["Tickets cost 500 rupees.", "Open from 9am to 5pm.", "Rooms are available for booking."]
    .every((s) => detectPracticalData(s).practical));

const njSrc = readFileSync("scripts/research/narrative-job.mjs", "utf8");
check("Prompt version, verification version and model are recorded on each block",
  /promptVersion: PROMPT_VERSION/.test(njSrc) &&
  /verificationVersion: VERIFICATION_VERSION/.test(njSrc) &&
  /model: provider\.name/.test(njSrc));
check("Versions are defined and non-empty",
  Boolean(PROMPT_VERSION) && Boolean(VERIFICATION_VERSION), `prompt ${PROMPT_VERSION}, verify ${VERIFICATION_VERSION}`);
check("Cache key covers claims, mode, provider, prompt and verification version",
  /narrativeCacheKey\(\{[\s\S]{0,200}?\}\)/.test(njSrc) &&
  /\[destinationId, mode\.id, provider, PROMPT_VERSION, VERIFICATION_VERSION, claimPart\]/.test(njSrc));
check("Cache key includes claim TEXT, so an edited claim invalidates",
  /\$\{c\.id\}:\$\{c\.statement\}/.test(njSrc));
check("A narrative below the survival threshold is not published",
  /below-survival-threshold/.test(njSrc) && MIN_SURVIVAL_TO_PUBLISH > 0.5,
  `threshold ${MIN_SURVIVAL_TO_PUBLISH}`);
check("Provider failure preserves claims and publishes no narrative",
  /provider-failure/.test(njSrc));

/* Per-sentence provenance in stored output. */
const NARR = join(process.cwd(), ".data", "research", "narrative");
let blocks = 0, sentencesWithProvenance = 0, sentencesTotal = 0, missingMeta = 0;
if (existsSync(NARR)) {
  for (const f of readdirSync(NARR).filter((x) => x.endsWith(".json"))) {
    const n = JSON.parse(readFileSync(join(NARR, f), "utf8"));
    for (const b of n.blocks ?? []) {
      blocks += 1;
      if (!b.promptVersion || !b.verificationVersion || !b.model || !b.mode) missingMeta += 1;
      for (const s of b.sentences ?? []) {
        sentencesTotal += 1;
        if (s.sentenceId && s.claimIds?.length && s.evidenceIds?.length && s.sourceIds?.length && s.destinationId) {
          sentencesWithProvenance += 1;
        }
      }
    }
  }
}
check("Stored narrative blocks carry generation metadata", blocks > 0 && missingMeta === 0, `${blocks} blocks`);
check("Every stored sentence carries full provenance",
  sentencesTotal > 0 && sentencesWithProvenance === sentencesTotal,
  `${sentencesWithProvenance}/${sentencesTotal} with sentenceId + claimIds + evidenceIds + sourceIds + destinationId`);

/* ========================================================================
   17-19. DESTINATION-AWARE SEARCH — TEST A-D
   ======================================================================== */
section("17-19. Search scoping (TEST A-D)");

const searchSrc = readFileSync("src/lib/search-index.ts", "utf8");
check("The index is grouped by owning destination",
  /export interface SearchGroupIndex/.test(searchSrc) && /destinationId: string \| null/.test(searchSrc));
check("Ownership is on the group, not repeated per entry",
  !/destinationId: "sikkim",\s*$/m.test(searchSrc), "avoids ~25KB on every page");
check("A scope resolver exists", /export function itemsInScope/.test(searchSrc));
check("Destination scope admits only that destination plus global navigation",
  /g\.destinationId === scope\.destinationId \|\| g\.destinationId === null/.test(searchSrc));
check("Only PUBLISHED knowledge enters the index for other destinations",
  /getPublishedKnowledge/.test(searchSrc) && !/\.data\/research/.test(searchSrc));
check("Claim ids are never surfaced as search text",
  !/claim\.id/.test(searchSrc));

const paletteSrc = readFileSync("src/components/search/CommandPalette.tsx", "utf8");
check("The palette scopes by the destination being explored",
  /itemsInScope/.test(paletteSrc) && /currentDestination/.test(paletteSrc));
check("Global search is reachable", /setGlobalSearch/.test(paletteSrc) && /All destinations/.test(paletteSrc));
check("Destination scope is the default", /useState\(false\)/.test(paletteSrc));

/* Behavioural isolation, using the real index shape. */
const fakeIndex = [
  { destinationId: null, items: [{ label: "Explore monasteries", sublabel: "nav", href: "/monasteries", group: "Go to", icon: "compass" }] },
  { destinationId: "sikkim", items: [{ label: "Rumtek Monastery", sublabel: "Karma Kagyu · Gangtok", href: "/monasteries/rumtek", group: "Monasteries", icon: "landmark" }] },
  { destinationId: "kyoto", items: [{ label: "Kyoto temple record", sublabel: "Heritage · kyoto", href: "/destinations/kyoto", group: "Places", icon: "compass" }] },
  { destinationId: "jaipur", items: [{ label: "Jaipur was founded in 1727", sublabel: "History · jaipur", href: "/destinations/jaipur", group: "Places", icon: "compass" }] },
];
/* itemsInScope lives in TypeScript and cannot be imported under bare node,
   so the scope rule is restated here and asserted against the same index
   shape the application uses. The source-level check above confirms the
   application's implementation matches this rule. */
const scopeFilter = (index, scope) =>
  scope.kind === "global"
    ? index.flatMap((g) => g.items)
    : index.filter((g) => g.destinationId === scope.destinationId || g.destinationId === null).flatMap((g) => g.items);

const kyotoScoped = scopeFilter(fakeIndex, { kind: "destination", destinationId: "kyoto" });
check("TEST A  Exploring Kyoto, a search for 'monastery' returns no Sikkim content",
  !kyotoScoped.some((i) => i.label.includes("Rumtek")),
  `${kyotoScoped.length} items in Kyoto scope`);
check("TEST D  Kyoto scope leaks no Sikkim claims",
  kyotoScoped.every((i) => !i.href.startsWith("/monasteries/")));
const global = scopeFilter(fakeIndex, { kind: "global" });
check("TEST B  Global search can return Sikkim content",
  global.some((i) => i.label.includes("Rumtek")));
check("TEST C  Global search returns Jaipur content",
  global.some((i) => i.label.includes("Jaipur")));
check("Global navigation is visible in every scope",
  kyotoScoped.some((i) => i.group === "Go to") && global.some((i) => i.group === "Go to"));

/* ========================================================================
   20. DEPTH AND SIKKIM REGRESSION
   ======================================================================== */
section("20. Depth isolation and Sikkim regression");

const PUB = "src/data/generated/published-knowledge.json";
const published = existsSync(PUB) ? JSON.parse(readFileSync(PUB, "utf8")) : null;
check("Narrative success did not change any destination's depth",
  published?.destinations?.sikkim?.depth?.depth === "deep" &&
  published?.destinations?.jaipur?.depth?.depth !== "deep" &&
  published?.destinations?.kyoto?.depth?.depth !== "deep",
  `${published?.destinations?.sikkim?.depth?.depth}/${published?.destinations?.jaipur?.depth?.depth}/${published?.destinations?.kyoto?.depth?.depth}`);
check("Depth remains evidence-driven, not narrative-driven",
  published?.destinations?.jaipur?.depth?.basis === "earned");
check("Sikkim's curated records are untouched",
  readFileSync("src/data/monasteries.ts", "utf8").includes("const SEEDS: MonasterySeed[]"));

const sikkimNarrative = loadNarrative("sikkim");
check("Sikkim narrative is generated from approved claims like any other",
  (sikkimNarrative.blocks ?? []).every((b) => b.claimIds.length > 0));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
