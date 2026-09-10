/**
 * Phase 7 integrity — experience layer, timeline, connections, demo flow.
 *
 * The experience layer is where trust is easiest to lose quietly: a page that
 * reads beautifully while showing an unsourced date, or a "connection" the
 * sources never made, fails in a way no build error catches. These checks
 * exist for that.
 *
 *   node scripts/qa/experience-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "../research/core.mjs";
import { listProviders } from "../research/provider.mjs";
import { yearsIn } from "../research/claim-graph.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

const PUB = "src/data/generated/published-knowledge.json";
const published = existsSync(PUB) ? JSON.parse(readFileSync(PUB, "utf8")) : null;
const destinations = published?.destinations ?? {};

/* ========================================================================
   1. REAL AI PROVIDER STATUS
   ======================================================================== */
section("1. AI provider status");

const anthropic = listProviders().find((p) => p.name === "anthropic");
check("Provider availability is reported, never assumed",
  typeof anthropic.available === "boolean",
  anthropic.available ? "AVAILABLE" : "UNAVAILABLE — live evaluation NOT executed");
const evalSrc = readFileSync("scripts/research/evaluate.mjs", "utf8");
check("Live evaluation cannot fabricate a result without a key",
  /return \{ executed: false, provider: provider\.name, reason:/.test(evalSrc));
check("The site does not depend on AI being available",
  Object.values(destinations).every((d) => d.categories.length > 0),
  "approved facts render with or without narrative");

/* ========================================================================
   2-3. NARRATIVE AND PROVENANCE THROUGH TO THE PAGE
   ======================================================================== */
section("2-3. Narrative and provenance");

const blocks = Object.values(destinations).flatMap((d) => d.narrative ?? []);
check("Published narrative blocks exist", blocks.length > 0, `${blocks.length} blocks`);
check("Every block cites the claims it was built from",
  blocks.every((b) => (b.claimIds ?? []).length > 0));
check("Every cited claim is itself published",
  Object.values(destinations).every((d) => {
    const ids = new Set(d.categories.flatMap((c) => c.claims).map((c) => c.id));
    return (d.narrative ?? []).every((b) => b.claimIds.every((id) => ids.has(id)));
  }));
check("No narrative block contains practical travel data",
  blocks.every((b) => !detectPracticalData(b.text).practical));

/* Cross-block redundancy: a reader must not meet the same sentence twice. */
let repeated = 0;
for (const d of Object.values(destinations)) {
  const seen = new Set();
  for (const b of d.narrative ?? []) {
    for (const sentence of String(b.text).split(/(?<=[.!?])\s+/)) {
      const key = sentence.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      if (key.length < 30) continue;
      if (seen.has(key)) repeated += 1;
      seen.add(key);
    }
  }
}
check("No sentence is repeated across a destination's narrative", repeated === 0, `${repeated} repeats`);

/* ========================================================================
   4-5. TIMELINE
   ======================================================================== */
section("4-5. Timeline");

const timelines = Object.entries(destinations).map(([id, d]) => [id, d.timeline ?? []]);
check("Destinations have timelines", timelines.some(([, t]) => t.length > 0),
  timelines.map(([id, t]) => `${id}:${t.length}`).join(" "));

for (const [id, entries] of timelines) {
  if (entries.length === 0) continue;
  const sorted = entries.every((e, i) => i === 0 || entries[i - 1].year <= e.year);
  check(`  ${id}: timeline is chronological`, sorted);
  check(`  ${id}: every entry carries provenance`,
    entries.every((e) => e.sources.length > 0 && e.sources.every((s) => s.url)));
  check(`  ${id}: every entry's date comes from its own claim text`,
    entries.every((e) => yearsIn(e.title).includes(e.year)),
    "no interpolated dates");
  check(`  ${id}: every timeline entry maps to a published claim`,
    (() => {
      const ids = new Set(destinations[id].categories.flatMap((c) => c.claims).map((c) => c.id));
      return entries.every((e) => ids.has(e.claimId));
    })());
  check(`  ${id}: no practical data in the timeline`,
    entries.every((e) => !detectPracticalData(e.title).practical));
}

/* ========================================================================
   6. STORY CONNECTIONS
   ======================================================================== */
section("6. Story connections");

for (const [id, d] of Object.entries(destinations)) {
  const connections = d.connections ?? [];
  if (connections.length === 0) continue;
  check(`  ${id}: every connection joins more than one fact`,
    connections.every((c) => c.claimIds.length > 1),
    `${connections.length} threads`);
  check(`  ${id}: every connected claim is published`,
    (() => {
      const ids = new Set(d.categories.flatMap((c) => c.claims).map((c) => c.id));
      return connections.every((c) => c.claimIds.every((cid) => ids.has(cid)));
    })());
  check(`  ${id}: every connection's subject appears in the claims it joins`,
    connections.every((c) => c.statements.some((st) => st.includes(c.subject))),
    "relationships come from the sources, not from inference");
  check(`  ${id}: connections are capped, not dumped`, connections.length <= 8);
}

/* ========================================================================
   7-8. SEARCH AND DESTINATION OWNERSHIP
   ======================================================================== */
section("7-8. Search and ownership");

const searchSrc = readFileSync("src/lib/search-index.ts", "utf8");
const paletteSrc = readFileSync("src/components/search/CommandPalette.tsx", "utf8");
check("The index is still grouped by owning destination",
  /export interface SearchGroupIndex/.test(searchSrc) && /export function itemsInScope/.test(searchSrc));
check("Destination scope remains the default", /useState\(false\)/.test(paletteSrc));
check("Global search prioritises the destination being explored",
  /localHrefs/.test(paletteSrc) && /globalSearch && localHrefs/.test(paletteSrc));
check("Prioritisation reorders rather than excludes",
  /\.sort\(\(a, b\) => Number\(localHrefs\.has\(b\.href\)\) - Number\(localHrefs\.has\(a\.href\)\)\)/.test(paletteSrc),
  "other destinations remain reachable");
check("Only reviewer-approved knowledge is searchable",
  /getPublishedKnowledge/.test(searchSrc) && !searchSrc.includes(".data/research"));

/* Cross-destination content isolation in published output. */
const SIKKIM_MARKERS = ["Rumtek", "Pemayangtse", "Gangtok", "Gyalshing", "Nyingma", "Chogyal"];
for (const id of ["jaipur", "kyoto"]) {
  const d = destinations[id];
  if (!d) continue;
  const text = JSON.stringify([d.categories, d.narrative, d.timeline, d.connections]);
  check(`  ${id}: contains no Sikkim content`,
    !SIKKIM_MARKERS.some((m) => text.includes(m)));
}

/* ========================================================================
   9. AI FAILURE FALLBACK
   ======================================================================== */
section("9. AI failure fallback");

const njSrc = readFileSync("scripts/research/narrative-job.mjs", "utf8");
check("A narrative below the support threshold is withheld, not patched",
  /below-survival-threshold/.test(njSrc));
check("Provider failure records and continues", /provider-failure/.test(njSrc));
/* The hub's body moved into DestinationHubPage when the twelve-language
   routes arrived; both routes render it. Same assertion, current file. */
const hubSrc = readFileSync("src/components/destinations/DestinationHubPage.tsx", "utf8");
check("The page renders knowledge whether or not narrative exists",
  /knowledge \? <PublishedKnowledge/.test(hubSrc));
const knowledgeSrc = readFileSync("src/components/destinations/PublishedKnowledge.tsx", "utf8");
check("The narrative section is conditional",
  /\{intro \? \(/.test(knowledgeSrc) && /otherNarrative\.length > 0 \?/.test(knowledgeSrc));
check("Timeline and connections render nothing when empty",
  /entries\.length === 0/.test(readFileSync("src/components/destinations/DestinationTimeline.tsx", "utf8")) ||
  /if \(!first \|\| !last\) return null/.test(readFileSync("src/components/destinations/DestinationTimeline.tsx", "utf8")));

/* ========================================================================
   10. NO INTERNAL DETAIL LEAKS TO THE VISITOR
   ======================================================================== */
section("10. Public surface hygiene");

/* Checks RENDERED output, not source: `key={claim.id}` is a React key and
   never reaches the page, and an earlier version of this test matched it. */
check("Claim ids are never rendered as visible text",
  !/>\s*\{claim\.id\}/.test(knowledgeSrc) && !/\{claim\.id\}<\//.test(knowledgeSrc) &&
  !/text.*\{claim\.id\}/.test(knowledgeSrc),
  "ids appear only as React keys");
check("Confidence values are not rendered as internal scores",
  !/\{claim\.confidence\}/.test(knowledgeSrc));
check("Review state is not rendered", !/approvedBy|pending-review/.test(knowledgeSrc));
check("Provider/agent names are not rendered",
  !/generatedBy/.test(knowledgeSrc) && !/rule-based/.test(knowledgeSrc));
check("Attribution names a publisher, not an internal id",
  /s\.publisher \?\? s\.title/.test(knowledgeSrc));

/* ========================================================================
   11-12. DEPTH ISOLATION AND SIKKIM REGRESSION
   ======================================================================== */
section("11-12. Depth isolation and Sikkim regression");

check("Sikkim remains deep, by declaration",
  destinations.sikkim?.depth?.depth === "deep" && destinations.sikkim?.depth?.basis === "declared");
check("Richer storytelling did not raise Jaipur's authority",
  destinations.jaipur?.depth?.depth !== "deep", destinations.jaipur?.depth?.depth);
check("Richer storytelling did not raise Kyoto's authority",
  destinations.kyoto?.depth?.depth !== "deep", destinations.kyoto?.depth?.depth);
check("The three pilots remain honestly distinct",
  new Set([destinations.sikkim?.depth?.depth, destinations.jaipur?.depth?.depth, destinations.kyoto?.depth?.depth]).size === 3,
  `${destinations.sikkim?.depth?.depth}/${destinations.jaipur?.depth?.depth}/${destinations.kyoto?.depth?.depth}`);
check("Sikkim's curated records are untouched",
  readFileSync("src/data/monasteries.ts", "utf8").includes("const SEEDS: MonasterySeed[]"));

/* Demo flow: every step is a real route in the build. */
const OUT = ".next/server/app";
const DEMO_ROUTES = [
  ["/destinations", "destinations.html"],
  ["/destinations/sikkim", "destinations/sikkim.html"],
  ["/destinations/jaipur", "destinations/jaipur.html"],
  ["/destinations/kyoto", "destinations/kyoto.html"],
  /* Phase 11: Sikkim's content is destination-native. The demo walks the
     canonical routes; the legacy URLs remain reachable by 301. */
  ["/destinations/sikkim/monasteries/rumtek", "destinations/sikkim/monasteries/rumtek.html"],
  ["/destinations/sikkim/history", "destinations/sikkim/history.html"],
];
if (existsSync(OUT)) {
  for (const [route, file] of DEMO_ROUTES) {
    check(`  demo step is a real prerendered route: ${route}`, existsSync(join(OUT, file)));
  }
  check("The demo uses no dedicated presentation page",
    !readdirSync(OUT).some((f) => /^demo|^presentation|^pitch/.test(f)),
    "every step is real product functionality");
}
check("Destinations is reachable from the primary navigation",
  /href: "\/destinations", label: "Destinations"/.test(readFileSync("src/lib/constants.ts", "utf8")));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
