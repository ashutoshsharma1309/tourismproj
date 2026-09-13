/**
 * Phase 5 integrity — publishing, depth, authority, provenance.
 *
 * The adversarial half again: the interesting tests are the ones that try to
 * get something unpublishable onto a page, or try to make a researched
 * destination look like a curated one.
 *
 *   node scripts/qa/publishing-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "../research/core.mjs";
import { getDestination } from "../research/destinations.mjs";
import { PIPELINE_MAX_DEPTH, assessDepth, reconcileDepth } from "../research/depth.mjs";
import { publishDestination } from "../research/publish.mjs";
import { runFixtures } from "../research/evaluate.mjs";
import { listProviders } from "../research/provider.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

const PUBLISHED_FILE = "src/data/generated/published-knowledge.json";
const published = existsSync(PUBLISHED_FILE) ? JSON.parse(readFileSync(PUBLISHED_FILE, "utf8")) : null;

/* ========================================================================
   PUBLISHER — determinism and approved-only input
   ======================================================================== */
section("Publisher");

check("Published knowledge file exists", Boolean(published), PUBLISHED_FILE);
check("Publishing is deterministic — no timestamp in the payload",
  published && !JSON.stringify(published).includes("publishedAt"),
  "same input, byte-identical output");

const a = JSON.stringify(publishDestination("jaipur"));
const b = JSON.stringify(publishDestination("jaipur"));
check("Publishing the same input twice yields identical output", a === b);

const publishSrc = readFileSync("scripts/research/publish.mjs", "utf8");
check("The publisher reads approved knowledge only",
  /loadApproved/.test(publishSrc) && !/allClaims/.test(publishSrc),
  "raw research is not an input");
check("No model is consulted during publication",
  !/getProvider|proposeClaims|generateNarrative/.test(publishSrc));
check("Every claim is re-verified at the publication boundary",
  /contentHash !== ev\.contentHash/.test(publishSrc) &&
  /doc\.text\.slice\(ev\.locator\.charStart, ev\.locator\.charEnd\) !== ev\.quote/.test(publishSrc),
  "approval is point-in-time; sources change");

/* ========================================================================
   TEST A-D — what may and may not be published
   ======================================================================== */
section("TEST A-D — publication eligibility");

const jaipur = published?.destinations?.jaipur;
const allClaims = jaipur ? jaipur.categories.flatMap((c) => c.claims) : [];
check("TEST A  An approved claim appears in destination knowledge",
  allClaims.length > 0, `${allClaims.length} published`);
check("TEST A  Each published claim carries its source attribution",
  allClaims.every((c) => c.sources.length > 0 && c.sources.every((s) => s.sourceId && s.url)));
check("TEST A  Each published claim records who approved it and when",
  allClaims.every((c) => c.approvedBy && c.approvedAt));

/* Raw research holds far more claims than were published; the difference is
   the pending, rejected and conflicted ones. */
const JOBS = join(process.cwd(), ".data", "research", "jobs");
let rawTotal = 0, rawNonValidated = 0, conflicted = 0;
if (existsSync(JOBS)) {
  for (const f of readdirSync(JOBS).filter((x) => x.endsWith(".json"))) {
    const r = JSON.parse(readFileSync(join(JOBS, f), "utf8"));
    if (r.job.destinationId !== "jaipur") continue;
    for (const c of r.allClaims ?? []) {
      rawTotal += 1;
      if (c.status !== "validated") rawNonValidated += 1;
      if (c.status === "conflicted") conflicted += 1;
    }
  }
}
check("TEST B/C  Pending and rejected claims are not published",
  rawNonValidated > 0 && allClaims.length < rawTotal,
  `${rawTotal} raw, ${rawNonValidated} not validated, ${allClaims.length} published`);

let leaked = 0;
if (existsSync(JOBS)) {
  for (const f of readdirSync(JOBS).filter((x) => x.endsWith(".json"))) {
    const r = JSON.parse(readFileSync(join(JOBS, f), "utf8"));
    const dest = published?.destinations?.[r.job.destinationId];
    if (!dest) continue;
    const ids = new Set(dest.categories.flatMap((c) => c.claims).map((c) => c.id));
    for (const c of r.allClaims ?? []) {
      if (c.status !== "validated" && ids.has(c.id)) leaked += 1;
    }
  }
}
check("TEST B/C  No non-validated claim reached publication", leaked === 0, `${leaked} leaks`);
check("TEST D  Conflicted claims cannot be published",
  !allClaims.some((c) => c.status === "conflicted"),
  conflicted > 0 ? `${conflicted} conflicted claims in raw research` : "none present in this run");

check("TEST D  A conflicted claim is blocked by the publication gate",
  /status !== "validated"/.test(publishSrc), "status must be validated");

/* ========================================================================
   TEST E-F — narrative publication
   ======================================================================== */
section("TEST E-F — narrative publication");

const narrativeBlocks = Object.values(published?.destinations ?? {}).flatMap((d) => d.narrative);
check("TEST F  Published narrative blocks carry claim provenance",
  narrativeBlocks.length > 0 && narrativeBlocks.every((b) => b.claimIds.length > 0),
  `${narrativeBlocks.length} blocks`);
check("TEST F  Every cited claim id is itself published",
  Object.values(published?.destinations ?? {}).every((d) => {
    const ids = new Set(d.categories.flatMap((c) => c.claims).map((c) => c.id));
    return d.narrative.every((b) => b.claimIds.every((id) => ids.has(id)));
  }),
  "no block cites an unpublished claim");
check("TEST E  A block citing unpublished claims is withheld",
  /cites unpublished claims/.test(publishSrc));
check("TEST E  A block citing nothing is withheld",
  /cites nothing/.test(publishSrc));
check("TEST F  Blocks record how they were generated and when verified",
  narrativeBlocks.every((b) => b.generatedBy && b.verifiedAt));

const fixtures = runFixtures();
check("TEST E  The verifier rejects every unsupported fixture",
  fixtures.rows.filter((r) => r.expect === "reject").every((r) => r.outcome === "reject"));
check("TEST F  The verifier accepts every supported fixture",
  fixtures.rows.filter((r) => r.expect === "accept").every((r) => r.outcome === "accept"));
check("Verifier accuracy across the ten required cases",
  fixtures.accuracy === 1, `${fixtures.correct}/${fixtures.total}`);

/* ========================================================================
   TEST G-H — authority cannot be inherited
   ======================================================================== */
section("TEST G-H — authority isolation");

check("The pipeline cannot award `deep`", PIPELINE_MAX_DEPTH === "curated",
  "deep comes only from a declared curated archive");

/* Even an implausibly strong research run tops out at curated. */
const hugeRun = assessDepth({
  approvedClaims: Array.from({ length: 500 }, (_, i) => ({
    status: "validated", category: ["history", "culture", "heritage", "festivals"][i % 4],
    evidence: [{ sourceId: `s${i % 9}` }],
  })),
  sourceTiers: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`s${i}`, "official-government"])),
});
check("TEST G  500 official-tier claims still cannot produce `deep`",
  hugeRun.depth === "curated", hugeRun.depth);

check("TEST G  Jaipur is not deep",
  published?.destinations?.jaipur?.depth?.depth !== "deep",
  published?.destinations?.jaipur?.depth?.depth ?? "n/a");
check("TEST H  No published destination other than Sikkim is deep",
  Object.entries(published?.destinations ?? {}).every(([id, d]) => id === "sikkim" || d?.depth?.depth !== "deep"),
  Object.entries(published?.destinations ?? {}).map(([id, d]) => `${id}=${d?.depth?.depth}`).join("/"));
check("Sikkim's depth is declared, not earned from research",
  published?.destinations?.sikkim?.depth?.basis === "declared" &&
  published?.destinations?.sikkim?.depth?.earned !== "deep",
  `earned would be "${published?.destinations?.sikkim?.depth?.earned}"`);
check("Depth differs between the declared archive and the earned tier, honestly",
  published?.destinations?.sikkim?.depth?.depth === "deep" &&
    published?.destinations?.jaipur?.depth?.depth === "curated",
  `${published?.destinations?.sikkim?.depth?.depth}/${published?.destinations?.jaipur?.depth?.depth}`);

/* Depth is not inherited through any shared attribute. */
check("Sharing a country does not confer depth",
  getDestination("jaipur").country.code === getDestination("sikkim").country.code &&
  published?.destinations?.jaipur?.depth?.depth !== "deep",
  "both India; only Sikkim is deep");
check("A destination with no approved claims stays planned",
  assessDepth({ approvedClaims: [], sourceTiers: {} }).depth === "planned");
check("Declaring a non-deep depth cannot beat the earned value",
  reconcileDepth({ declaredDepth: "curated", earned: { depth: "researched", metrics: {}, reasons: [] } }).depth === "researched",
  "only `deep` is protected, and only downward");
check("One approved claim does not make a destination curated",
  assessDepth({
    approvedClaims: [{ status: "validated", category: "history", evidence: [{ sourceId: "g" }] }],
    sourceTiers: { g: "official-government" },
  }).depth === "researched");

/* TEST H: content isolation. */
const otherClaims = Object.entries(published?.destinations ?? {})
  .filter(([id]) => id !== "sikkim")
  .flatMap(([, d]) => (d?.categories ?? []).flatMap((c) => c.claims));
const SIKKIM_MARKERS = ["Rumtek", "Pemayangtse", "Gangtok", "Gyalshing", "Nyingma", "Chogyal"];
check("TEST H  No Sikkim content appears in another destination's published knowledge",
  !otherClaims.some((c) => SIKKIM_MARKERS.some((m) => c.statement.includes(m))), `${otherClaims.length} claims`);
check("TEST H  No other destination's claim cites a Sikkim-scoped source",
  otherClaims.every((c) => c.sources.every((s) => !s.sourceId.startsWith("sikkim-"))));
const jaipurClaims = allClaims;
check("TEST G  No Sikkim content appears in Jaipur's published knowledge",
  !jaipurClaims.some((c) => SIKKIM_MARKERS.some((m) => c.statement.includes(m))));

/* ========================================================================
   TEST I-J — Sikkim protection and practical firewall
   ======================================================================== */
section("TEST I-J — Sikkim protection and practical firewall");

check("TEST I  Sikkim's curated monastery records are untouched",
  readFileSync("src/data/monasteries.ts", "utf8").includes("const SEEDS: MonasterySeed[]"));
check("TEST I  The publisher never writes into curated data modules",
  !/writeFileSync\([^)]*src\/data\/(monasteries|places|history|stories)/.test(publishSrc));
check("TEST I  The publisher writes only its own generated file",
  /published-knowledge\.json/.test(publishSrc));

const allPublishedClaims = Object.values(published?.destinations ?? {}).flatMap((d) =>
  d.categories.flatMap((c) => c.claims),
);
check("TEST J  No published claim contains practical travel data",
  allPublishedClaims.every((c) => !detectPracticalData(c.statement).practical),
  `${allPublishedClaims.length} claims checked`);
check("TEST J  No published narrative block contains practical travel data",
  narrativeBlocks.every((b) => !detectPracticalData(b.text).practical));
check("TEST J  The publisher screens for practical data independently",
  /detectPracticalData/.test(publishSrc), "third independent check");

/* ========================================================================
   PROVENANCE + SEARCH SAFETY
   ======================================================================== */
section("Provenance and search safety");

check("Every published claim keeps its verbatim source span",
  allPublishedClaims.every((c) => c.sources.every((s) => typeof s.quote === "string" && s.quote.length > 0)));
check("Every published claim keeps a resolvable source URL",
  allPublishedClaims.every((c) => c.sources.every((s) => s.url && s.url.startsWith("https://"))));
check("Every destination lists the sources actually used",
  Object.values(published?.destinations ?? {}).every((d) => d.sourcesUsed.length > 0));

const searchSrc = readFileSync("src/lib/search-index.ts", "utf8");
/*
 * Phase 5 kept published knowledge OUT of the search index, because the index
 * was destination-blind and letting it in would have leaked one destination's
 * facts into another's results.
 *
 * Phase 6 made the index destination-aware, so the correct assertion is no
 * longer "it stays out" but "it is in, and it is scoped". These checks were
 * updated rather than deleted: the property being guaranteed is stronger than
 * before, not weaker. Behavioural isolation (TEST A-D) is in
 * scripts/qa/composition-integrity.mjs.
 */
check("Published knowledge is searchable, and ownership is explicit",
  searchSrc.includes("published-knowledge") && /destinationId: string \| null/.test(searchSrc));
check("Search entries are grouped by the destination that owns them",
  /export interface SearchGroupIndex/.test(searchSrc) && /export function itemsInScope/.test(searchSrc),
  "destination scope admits only that destination plus global navigation");
check("Only reviewer-approved knowledge is searchable — never raw research",
  /getPublishedKnowledge/.test(searchSrc) && !searchSrc.includes(".data/research"));

/* Public pages must not read raw research. */
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
const publicPages = appFiles.filter((f) => f.includes("src/app/") && !IS_REVIEW_ROUTE.test(f));
check("No public page reads .data/research",
  publicPages.every((f) => !readFileSync(f, "utf8").includes(".data")));
const knowledgeImporters = appFiles.filter((f) => readFileSync(f, "utf8").includes("@/data/published-knowledge"));
/* The allowlist is the destination-facing layer: the destination pages and
   lib, the discovery layer built on top of them (Phase 14), and the search
   index. Everything here reaches knowledge through `@/data/published-
   knowledge` — the typed reader — which is what this check is really
   asserting; the path pattern only bounds WHERE that is allowed to happen. */
check("Published knowledge is consumed only through the typed reader",
  knowledgeImporters.length > 0 &&
  knowledgeImporters.every((f) => f.includes("published-knowledge") || /destinations|discovery|global|search-index/.test(f)),
  knowledgeImporters.map((f) => f.replace("src/", "")).join(", "));

/* ========================================================================
   REAL-MODEL STATUS — recorded, never assumed
   ======================================================================== */
section("Real-model evaluation status");

const anthropic = listProviders().find((p) => p.name === "anthropic");
check("Provider availability is reported honestly",
  typeof anthropic.available === "boolean",
  anthropic.available ? "AVAILABLE — live evaluation possible" : "UNAVAILABLE — live evaluation NOT executed");
const evalSrc = readFileSync("scripts/research/evaluate.mjs", "utf8");
/* Matches behaviour, not comment formatting — an earlier version of this
   check matched a line-wrapped sentence in evaluate.mjs's header and broke
   when the wrapping changed. */
check("The harness refuses to fabricate a live result",
  /executed: false/.test(evalSrc) && /return \{ executed: false, provider: provider\.name, reason:/.test(evalSrc));
check("Cost is computed from reported usage, never estimated",
  /metrics\.inputTokens \|\| metrics\.outputTokens/.test(evalSrc) &&
  /estimatedCostUsd\s*=/.test(evalSrc));
check("The verifier is independent of the generator",
  /THE VERIFIER IS NOT TUNED BY THIS HARNESS/.test(evalSrc) &&
  !/verifySentence\s*=/.test(evalSrc) && !/narrative\.mjs['"]\s*,\s*['"]w/.test(evalSrc),
  "the harness imports the verifier and never modifies it");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
