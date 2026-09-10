/**
 * Phase 17 integrity — the destination content framework.
 *
 * WHY THIS SUITE IMPORTS TYPESCRIPT
 * ---------------------------------
 * Every other suite in this repo asserts against source text or rendered
 * HTML, because that is all they could reach. The capsule validator is
 * different: it is a decision function, and the only honest way to test a
 * decision function is to give it inputs and check its answers. Node strips
 * types on import, and `src/lib/destinations/capsule.ts` deliberately has no
 * runtime imports, so this suite runs the REAL validator against real
 * fixtures — including deliberately broken ones.
 *
 *   node scripts/qa/content-framework.mjs [--base http://localhost:3000]
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const mustRead = (path) => {
  if (!existsSync(path)) {
    check(`Required file exists: ${path}`, false, "checks depending on it cannot run");
    return "";
  }
  return readFileSync(path, "utf8");
};

async function get(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const body = response.status === 200 ? await response.text() : "";
    return { status: response.status, body, bytes: Buffer.byteLength(body) };
  } catch {
    return { status: 0, body: "", bytes: 0 };
  }
}
const mainOf = (html) => html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
const text = (html) => mainOf(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const { validateCapsule, capsulePlaces, capsuleHistory, capsuleStories, capsuleThemes } =
  await import("../../src/lib/destinations/capsule.ts");

/** A minimal capsule that must validate. Nothing here describes a real place. */
const valid = () => ({
  destinationId: "fixture",
  scope: "A framework fixture, not a destination",
  sources: [
    {
      id: "fixture-source",
      title: "Fixture source",
      publisher: "TerraStory QA",
      url: "https://example.org/fixture",
      retrievedAt: "2026-01-01",
      confidence: "high",
      retrievalMethod: "human-curated",
    },
  ],
  places: [
    {
      id: "fixture-place",
      name: "Fixture Place",
      category: "Fixture",
      summary: "A structural fixture used to exercise the validator.",
      coordinates: { lat: 10, lng: 20 },
      sourceIds: ["fixture-source"],
    },
  ],
  experiences: [
    {
      id: "fixture-experience",
      title: "Fixture experience",
      explanation: "Exercises the experience shape.",
      themes: ["heritage", "history"],
      placeIds: ["fixture-place"],
      sourceIds: ["fixture-source"],
    },
  ],
  history: [
    {
      id: "fixture-event",
      year: 1592,
      period: "1592",
      title: "Fixture event",
      summary: "Exercises the history shape.",
      placeIds: ["fixture-place"],
      sourceIds: ["fixture-source"],
    },
  ],
  stories: [
    {
      id: "fixture-story",
      title: "Fixture story",
      summary: "Exercises the story shape.",
      claimType: "oral tradition",
      placeIds: ["fixture-place"],
      sourceIds: ["fixture-source"],
    },
  ],
  reviewedAt: "2026-01-01",
  reviewedBy: "qa",
});

/* ========================================================================
   1. THE DEPTH MODEL
   ======================================================================== */
section("1. Destination depth model");

const types = mustRead("src/types/destination.ts");
for (const level of ["deep", "curated", "researched", "capsule", "planned"]) {
  check(`Depth level "${level}" exists`, new RegExp(`\\| "${level}"`).test(types));
}
check("Depth levels are ordered, and the order is explicit",
  /DATA_DEPTH_ORDER/.test(types) && /capsule: 1/.test(types));
check("Every level has a label and a summary of what it promises",
  /DATA_DEPTH_LABEL/.test(types) && /DATA_DEPTH_SUMMARY/.test(types) &&
  /capsule: "Tourism capsule"/.test(types));
check("The badge renders every level",
  /capsule:/.test(mustRead("src/components/ui/DepthBadge.tsx")));
check("Depth is never used to rank destinations for a visitor",
  /says nothing about the place itself/.test(types),
  "the ordering is documented as coverage, not quality");

/* ========================================================================
   2. THE CAPSULE CONTRACT
   ======================================================================== */
section("2. The capsule contract");

const capsuleTypes = mustRead("src/types/capsule.ts");
for (const shape of [
  "DestinationCapsule",
  "CapsulePlace",
  "CapsuleExperience",
  "CapsuleHistoryEntry",
  "CapsuleStory",
  "CapsuleSource",
]) {
  check(`The contract declares ${shape}`, new RegExp(`interface ${shape}`).test(capsuleTypes));
}

/* The schema must be incapable of expressing the things this project refuses
   to invent. Not "should not" — cannot. */
const FORBIDDEN_FIELDS = ["price", "ticket", "openingHours", "hours", "availability", "booking", "rating", "rank"];
const declared = FORBIDDEN_FIELDS.filter((field) =>
  new RegExp(`^\\s*${field}[?]?:`, "m").test(codeOf(capsuleTypes)),
);
check("The schema cannot express prices, hours, availability, booking or ratings",
  declared.length === 0, declared.join(", ") || `${FORBIDDEN_FIELDS.length} fields absent by construction`);

check("A capsule reuses the interest vocabulary rather than declaring a second one",
  /JourneyInterest/.test(capsuleTypes) && !/type CapsuleTheme/.test(capsuleTypes));
check("Story claim type is required, not optional",
  /claimType: "documented history" \| "oral tradition" \| "legend";/.test(capsuleTypes));

/* ========================================================================
   3. THE VALIDATOR — run, not read
   ======================================================================== */
section("3. Validator behaviour");

check("A well-formed capsule validates", validateCapsule(valid()).ok);

const rejects = (name, mutate, expected) => {
  const capsule = valid();
  mutate(capsule);
  const result = validateCapsule(capsule);
  const matched = result.errors.some((error) => error.toLowerCase().includes(expected.toLowerCase()));
  check(`Rejected: ${name}`, !result.ok && matched, result.errors[0] ?? "accepted it");
};

rejects("a place with no source", (c) => { c.places[0].sourceIds = []; }, "no source");
rejects("a claim citing an unknown source", (c) => { c.places[0].sourceIds = ["ghost"]; }, "unknown source");
rejects("an experience referencing an unknown place", (c) => { c.experiences[0].placeIds = ["ghost"]; }, "unknown place");
rejects("a source with no resolvable link", (c) => { c.sources[0].url = "see the book"; }, "resolvable link");
rejects("a source with no publisher", (c) => { c.sources[0].publisher = ""; }, "publisher");
rejects("an unreviewed capsule", (c) => { c.reviewedBy = ""; }, "reviewedBy");
rejects("a capsule with no scope", (c) => { c.scope = ""; }, "scope");
rejects("an image without alt text", (c) => { c.places[0].image = "/images/x.jpg"; }, "alt text");
rejects("a hotlinked image", (c) => { c.places[0].image = "https://elsewhere/x.jpg"; c.places[0].imageAlt = "x"; }, "vendored local path");
rejects("coordinates out of range", (c) => { c.places[0].coordinates = { lat: 991, lng: 0 }; }, "out of range");
rejects("a story with no claim type", (c) => { delete c.stories[0].claimType; }, "claimType");
rejects("duplicate source ids", (c) => { c.sources.push({ ...c.sources[0] }); }, "duplicate source");
rejects("a source with no retrieval method", (c) => { delete c.sources[0].retrievalMethod; }, "retrievalMethod");
rejects("a model-proposed source", (c) => { c.sources[0].retrievalMethod = "model-proposed"; }, "model-proposed");
rejects("a smuggled price field", (c) => { c.places[0].price = "₹500"; }, "forbidden field");
rejects("smuggled opening hours", (c) => { c.places[0].openingHours = "09:00–17:00"; }, "forbidden field");
rejects("a smuggled rating", (c) => { c.places[0].rating = 4.5; }, "forbidden field");
rejects("a ranking claim in prose", (c) => { c.places[0].summary = "The most beautiful fort in the region."; }, "ranking claim");
rejects("a must-see claim in an experience", (c) => { c.experiences[0].explanation = "A must-see for any visitor."; }, "ranking claim");

check("The validator reports every problem, not just the first", (() => {
  const capsule = valid();
  capsule.places[0].sourceIds = [];
  capsule.reviewedBy = "";
  capsule.scope = "";
  return validateCapsule(capsule).errors.length >= 3;
})());

/* ========================================================================
   4. ADAPTATION — a capsule flows through the existing shapes
   ======================================================================== */
section("4. Adaptation, not duplication");

const fixture = valid();
const places = capsulePlaces(fixture);
check("A capsule place adapts to the shape the app already consumes",
  places.length === 1 && places[0].slug === "fixture-place" && places[0].description.length > 0 &&
  places[0].coordinates?.lat === 10,
  "slug, category, description, coordinates");
check("A place with no published coordinate adapts without gaining one", (() => {
  const c = valid();
  delete c.places[0].coordinates;
  return capsulePlaces(c)[0].coordinates === undefined;
})());
check("Capsule history adapts to the history shape",
  capsuleHistory(fixture)[0].yearLabel === "1592" &&
  capsuleHistory(fixture)[0].relatedPlaces[0] === "fixture-place");
check("Capsule stories keep their claim type",
  capsuleStories(fixture)[0].claimType === "oral tradition");
check("Interests come from stated themes, never from prose",
  JSON.stringify(capsuleThemes(fixture)) === JSON.stringify(["heritage", "history"]));

const contentSrc = mustRead("src/lib/destinations/content.ts");
check("One content layer knows about both formats, and only it does",
  /capsuleFor/.test(contentSrc) && /isSikkim/.test(contentSrc));
const consumers = ["src/lib/planner/candidates.ts", "src/lib/discovery/experiences.ts", "src/lib/global/coverage.ts"];
const leaked = consumers.filter((file) => /capsule/i.test(codeOf(mustRead(file))));
check("No consumer above the content layer knows a capsule exists",
  leaked.length === 0, leaked.join(", ") || `${consumers.length} consumers unchanged`);

/* ========================================================================
   5. LAZY LOADING AND STORAGE
   ======================================================================== */
section("5. Lazy loading and storage");

const registry = mustRead("src/data/destinations/capsules/index.ts");
check("Capsules are registered as lazy importers, not a barrel",
  /\(\) => import\(/.test(registry) || /CapsuleImporter/.test(registry));
/* Comments stripped: the registry's own doc comment explains why a barrel
   would be wrong, and matching prose is how a suite flags itself. */
check("The registry re-exports nothing eagerly",
  !/export \* from/.test(codeOf(registry)) && !/^import \{ capsule \}/m.test(codeOf(registry)));
check("Loading validates before returning, and fails closed",
  /validateCapsule\(capsule\)/.test(registry) && /return null;/.test(registry));
check("A capsule declaring the wrong destination is refused",
  /capsule\.destinationId !== destinationId/.test(registry));
check("The content layer imports the registry lazily",
  /await import\("@\/data\/destinations\/capsules"\)/.test(contentSrc));
check("Membership is answered without importing the registry",
  /hasCapsuleId\(destinationId\)/.test(contentSrc) &&
  !/^import \{[^}]*loadCapsule/m.test(contentSrc),
  "capsules/ids.ts has no imports, so a destination with no capsule loads nothing");

const ids = mustRead("src/data/destinations/capsules/ids.ts");
check("The id list imports nothing at all",
  !/^import /m.test(codeOf(ids)), "it is reachable from the capability path on every build");
check("The two registries cannot drift apart unnoticed",
  /capsuleRegistryDrift/.test(registry), "drift is reported, not discovered later");
const declaredIds = [...(ids.match(/CAPSULE_IDS: string\[\] = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([a-z-]+)"/g)]
  .map((m) => m[1])
  .sort();
/* Quoted OR bare: a hyphenated id such as "new-york-city" cannot be a bare
   key, and reading only bare keys made a correctly registered destination
   look absent. */
const importerIds = [...(registry.match(/CapsuleImporter> = \{([\s\S]*?)\n\};/)?.[1] ?? "").matchAll(/^\s*"?([a-z-]+)"?:/gm)]
  .map((m) => m[1])
  .sort();
check("Both registries name the same destinations",
  declaredIds.join(",") === importerIds.join(","),
  `ids:[${declaredIds.join(",")}] importers:[${importerIds.join(",")}]`);

/* Storage: the framework itself must be small. */
const frameworkFiles = [
  "src/types/capsule.ts",
  "src/lib/destinations/capsule.ts",
  "src/data/destinations/capsules/index.ts",
  "src/data/destinations/capsules/_template.ts",
];
const frameworkBytes = frameworkFiles.reduce(
  (total, file) => total + (existsSync(file) ? statSync(file).size : 0),
  0,
);
const sikkimBytes = ["src/data/monasteries.ts", "src/data/places.ts", "src/data/history.ts"].reduce(
  (total, file) => total + (existsSync(file) ? statSync(file).size : 0),
  0,
);
check("The whole framework is smaller than three of Sikkim's data modules",
  frameworkBytes < sikkimBytes,
  `framework ${Math.round(frameworkBytes / 1024)} KB vs ${Math.round(sikkimBytes / 1024)} KB`);

/* ========================================================================
   6. NO CONTENT WAS INVENTED
   ======================================================================== */
section("6. No fabricated content");

const capsuleDir = "src/data/destinations/capsules";
/* `index.ts` is the registry and `ids.ts` is the membership list; neither is
   content. Anything else in this directory is a destination's capsule. */
const FRAMEWORK_FILES = new Set(["index.ts", "ids.ts"]);
const capsuleFiles = existsSync(capsuleDir)
  ? readdirSync(capsuleDir).filter((file) => file.endsWith(".ts") && !FRAMEWORK_FILES.has(file))
  : [];
/*
 * PHASE 18 filled the registry. What must hold now is not "nothing is
 * registered" but that the two registries and the files on disk describe the
 * same set: a listed destination has a file, and a file is listed.
 */
const registeredIdList = [...ids.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
const capsuleIdsFromFiles = capsuleFiles
  .filter((file) => !file.startsWith("_"))
  .map((file) => file.replace(/\.ts$/, ""));
check("Every registered capsule has a file", 
  registeredIdList.every((id) => capsuleIdsFromFiles.includes(id)),
  registeredIdList.filter((id) => !capsuleIdsFromFiles.includes(id)).join(", ") ||
    `${registeredIdList.length} registered`);
check("Every capsule file is registered",
  capsuleIdsFromFiles.every((id) => registeredIdList.includes(id)),
  capsuleIdsFromFiles.filter((id) => !registeredIdList.includes(id)).join(", ") ||
    `${capsuleIdsFromFiles.length} files`);
check("The template is still a template",
  /places: \[\s*\/\//.test(mustRead(`${capsuleDir}/_template.ts`)),
  "every example row is commented out");
/*
 * A key with a hyphen must be quoted — `"new-york-city": () => import(...)`.
 * This check looked only for the bare form and reported the destination as
 * unregistered when it was registered correctly, which is the wrong way round
 * for a check whose job is to catch a MISSING importer. Both forms count.
 */
const hasImporter = (id) =>
  registry.includes(`${id}: () => import("./${id}")`) ||
  registry.includes(`"${id}": () => import("./${id}")`);
check("Every registered id has a lazy importer",
  registeredIdList.every(hasImporter),
  registeredIdList.filter((id) => !hasImporter(id)).join(", ") ||
    `${registeredIdList.length} importers`);

/* ========================================================================
   7. THE RUNNING SITE IS UNCHANGED
   ======================================================================== */
section("7. Regression: the live site");

const home = await get(BASE);
check("The site serves", home.status === 200, `HTTP ${home.status}`);

const BASELINE = { monasteries: 15, stories: 70, history: 26, places: 38, archive: 78 };
for (const [name, expected] of Object.entries(BASELINE)) {
  const dir = join(".next/server/app/destinations/sikkim", name);
  const actual = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).length : -1;
  check(`Sikkim's ${name} content count is unchanged`, actual === expected,
    `${actual} pages (baseline ${expected})`);
}

const sikkimHub = await get(`${BASE}/destinations/sikkim`);
const jaipurHub = await get(`${BASE}/destinations/jaipur`);
check("A deep destination states what deep means",
  /Deep archive/.test(text(sikkimHub.body)) && /Complete heritage intelligence/.test(text(sikkimHub.body)));
check("A curated destination states what curated means",
  /Curated/.test(text(jaipurHub.body)) && /Reviewer-approved knowledge/.test(text(jaipurHub.body)));
/*
 * PHASE 19 TOOK THIS SUITE'S EMPTY DESTINATION AWAY.
 *
 * This check used Paris, which is now a capsule. After Phase 19 there is no
 * registered destination with nothing in it: Sikkim is deep, Jaipur curated,
 * Kyoto researched, and the other twelve are capsules. The honest-absence
 * path is still in the code and still load-bearing — it is what a
 * sixteenth destination would get on the day it is registered — but nothing
 * live exercises it any more, and a check that quietly stops meaning
 * anything is worse than one that fails.
 *
 * So it is asserted at the two levels that remain true:
 *   1. the copy itself still exists and still says nothing is shown, and
 *   2. a destination that has knowledge but no experiences still refuses to
 *      present a tourism offer — the same guarantee, one notch less empty.
 *
 * Restoring the stronger check needs a registered destination with no
 * content. That is a product decision, and it is written up in
 * docs/phase-19-global-capsules.md rather than decided here.
 */
check("The planned-depth copy still says nothing has been researched",
  /Nothing has been researched for it yet, and nothing is shown/.test(
    mustRead("src/types/destination.ts")),
  "DATA_DEPTH_SUMMARY.planned");
/*
 * PHASE B spent this fixture too: Jaipur has nine catalogued places now, so
 * "knowledge but no experiences" describes no registered destination. The copy
 * that renders that state still exists and is asserted above, at source. What
 * is checked live is the surviving guarantee — a destination's discovery page
 * serves that destination's own records and nobody else's.
 */
const jaipurDiscover = await get(`${BASE}/destinations/jaipur/discover`);
check("A destination's discovery page serves its own records",
  jaipurDiscover.status === 200 &&
    !/Rumtek|Pemayangtse|Eiffel|Colosseum/.test(text(jaipurDiscover.body)),
  `HTTP ${jaipurDiscover.status}`);
/*
 * Paris used to be the fixture here too. With no empty destination left, the
 * surviving guarantee about routing is the one `dynamicParams = false` makes:
 * a destination that is not registered gets no route at all, rather than a
 * page assembled on demand for whatever id appears in the URL.
 */
check("An unregistered destination has no discovery or planner route",
  (await get(`${BASE}/destinations/atlantis/discover`)).status === 404 &&
  (await get(`${BASE}/destinations/atlantis/plan`)).status === 404);

check("No page ships a capsule payload",
  !/fixture-place|CapsulePlace/.test(sikkimHub.body) && !/capsuleThemes/.test(sikkimHub.body));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
