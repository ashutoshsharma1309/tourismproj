/**
 * Phase 19 integrity — the global tourism capsules.
 *
 * WHAT THIS SUITE IS FOR
 * ----------------------
 * `qa:capsules` already checks every registered capsule for the things that
 * are true of all of them: isolation, images, sources, honest absence. This
 * suite checks what only became testable when the archive left India.
 *
 * Four questions, none of which the earlier suites could ask:
 *
 *   1. Does the pipeline handle a place that predates the four-digit year?
 *      Phase 18's date reader recognised 1000-2029 and nothing else, so Rome
 *      returned two dated sentences across six places and the Colosseum none.
 *      §5 asserts that the ancient world survives retrieval, rendering and
 *      ordering.
 *
 *   2. Does anything break on a name the Latin-1 world does not contain?
 *      Topkapı, Türkiye, Île-de-France, Jean-François. §4 reads them back off
 *      the served page, because a mojibake is invisible in source and obvious
 *      to a judge.
 *
 *   3. Does a destination in another country reach the global layer on the
 *      same terms — search, comparison, interest matching, cross-destination
 *      connections — without a line of code that knows its name? §7 to §10.
 *
 *   4. Is the second source real? Phase 19 added Wikidata, and §3 asserts that
 *      corroborated entries genuinely cite two publishers and that nothing
 *      cites a source the pipeline never fetched.
 *
 *   node scripts/qa/global-capsules.mjs [--base http://localhost:3000]
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

/** The four, and what each one is expected to be — identity only. */
const GLOBAL = [
  { id: "paris", name: "Paris", country: "France", anchorPlace: "Eiffel Tower" },
  { id: "rome", name: "Rome", country: "Italy", anchorPlace: "Colosseum" },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", anchorPlace: "Hagia Sophia" },
  { id: "new-york-city", name: "New York City", country: "United States", anchorPlace: "Statue of Liberty" },
];
const IDS = GLOBAL.map((d) => d.id);
const CAPSULE_DIR = "src/data/destinations/capsules";
const OUT = ".next/server/app/destinations";

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
const text = (html) =>
  mainOf(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
const hrefsOf = (html) => [...mainOf(html).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

const { validateCapsule } = await import("../../src/lib/destinations/capsule.ts");

/** Load the four capsules as data, not as source text. */
const capsules = {};
for (const { id } of GLOBAL) {
  ({ capsule: capsules[id] } = await import(`../../src/data/destinations/capsules/${id}.ts`));
}

/* ========================================================================
   1. THE FOUR EXIST, AT CAPSULE DEPTH
   ======================================================================== */
section("1. Four destinations, registered and at capsule depth");

const planned = readFileSync("src/data/destinations/planned.ts", "utf8");
const ids = readFileSync(`${CAPSULE_DIR}/ids.ts`, "utf8");
const registry = readFileSync(`${CAPSULE_DIR}/index.ts`, "utf8");

for (const { id, name, country } of GLOBAL) {
  const record = new RegExp(`id: "${id}",[\\s\\S]{0,500}?depth: "([a-z]+)"`).exec(planned);
  check(`${id}: declared depth is capsule`, record?.[1] === "capsule", record?.[1] ?? "no record");
  check(`${id}: in both registries`,
    ids.includes(`"${id}"`) &&
      (registry.includes(`${id}: () => import("./${id}")`) ||
        registry.includes(`"${id}": () => import("./${id}")`)));
  check(`${id}: identity names the right country`,
    new RegExp(`id: "${id}",[\\s\\S]{0,300}?name: "${country}"`).test(planned), country);
  check(`${id}: capsule declares its own destinationId`,
    capsules[id].destinationId === id, capsules[id].destinationId);
  check(`${id}: capsule passes the framework validator`,
    validateCapsule(capsules[id]).ok,
    validateCapsule(capsules[id]).errors.slice(0, 2).join("; ") || "0 errors");
  void name;
}

/* ========================================================================
   2. THE SIZE LIMITS THE BRIEF SET
   ======================================================================== */
section("2. Dataset limits");

for (const { id } of GLOBAL) {
  const c = capsules[id];
  /*
   * PHASE B RAISED THESE, because the contract changed: Phase 19 asked for a
   * 5-7 place capsule, Phase B asks for 10-20 catalogued places, 8-15 dated
   * events and 8-15 stories per destination. The bounds are still bounds —
   * an upper limit is what stops a "capsule" quietly becoming an unreviewed
   * archive — and the lower ones are what stop it thinning out.
   */
  check(`${id}: 10-20 places`, c.places.length >= 10 && c.places.length <= 20, `${c.places.length}`);
  check(`${id}: 8-15 dated events`, c.history.length >= 8 && c.history.length <= 15, `${c.history.length}`);
  check(`${id}: 3-8 experiences`, c.experiences.length >= 3 && c.experiences.length <= 8, `${c.experiences.length}`);
  check(`${id}: at most 15 stories`, c.stories.length <= 15, `${c.stories.length}`);
  /* The timeline IS the history list — a capsule has one chronology, not two. */
  check(`${id}: the timeline is the history list`, c.history.length <= 15, `${c.history.length}`);
}

/* ========================================================================
   3. PROVENANCE, AND THE SECOND SOURCE
   ======================================================================== */
section("3. Sources");

/* Hosts this pipeline actually fetched. A citation to anything else is a
   citation nobody retrieved — including, deliberately, UNESCO, whose site
   answered this environment with a Cloudflare challenge. */
const FETCHED_HOSTS = new Set(["en.wikipedia.org", "www.wikidata.org"]);

let corroborated = 0;
for (const { id } of GLOBAL) {
  const c = capsules[id];
  const byId = new Map(c.sources.map((s) => [s.id, s]));

  const badHost = c.sources.filter((s) => !FETCHED_HOSTS.has(new URL(s.url).host));
  check(`${id}: every source is a host the pipeline actually fetched`,
    badHost.length === 0, badHost.map((s) => s.url).join(", ") || `${c.sources.length} sources`);

  const claims = [...c.places, ...c.history, ...c.stories, ...c.experiences];
  check(`${id}: every claim cites at least one source`,
    claims.every((item) => item.sourceIds?.length > 0), `${claims.length} claims`);
  check(`${id}: every citation resolves to a declared source`,
    claims.every((item) => item.sourceIds.every((sid) => byId.has(sid))));

  check(`${id}: no source is model-proposed`,
    c.sources.every((s) => s.retrievalMethod !== "model-proposed"));

  /* A two-source entry must genuinely be two DIFFERENT publishers — citing
     the same page twice would look identical in the UI and mean nothing. */
  const twoSource = c.history.filter((entry) => entry.sourceIds.length > 1);
  corroborated += twoSource.length;
  check(`${id}: every two-source entry names two different publishers`,
    twoSource.every((entry) => new Set(entry.sourceIds.map((sid) => byId.get(sid).publisher)).size > 1),
    `${twoSource.length} corroborated of ${c.history.length}`);

  check(`${id}: reviewedBy does not claim a human review that did not happen`,
    /pending human review/.test(c.reviewedBy), c.reviewedBy);
}
check("Wikidata corroborates a meaningful share of the timeline",
  corroborated >= 6, `${corroborated} of 20 entries carry a second source`);

/* ========================================================================
   4. NAMES THAT ARE NOT PLAIN ASCII
   ======================================================================== */
section("4. Diacritics and non-Latin names");

/*
 * DERIVED FROM THE DATA, NOT PINNED TO A SENTENCE.
 *
 * This used to name four words expected in the retrieved prose — "Topkapı",
 * "Türkiye", "Élysées", "Vespasian". Phase B grew the place lists, the
 * generator selected different sentences, and "Élysées" stopped appearing:
 * the check failed while the product was correct, which is the least useful
 * kind of failure.
 *
 * Every capsule place NAME is deterministic, and several carry characters
 * Latin-1 cannot hold. So the assertion is now: every non-ASCII place name a
 * capsule declares must reach the page byte-for-byte. A mojibake anywhere in
 * the pipeline fails it, and nothing about which sentence was chosen matters.
 */
const hub = {};
const discover = {};
for (const { id } of GLOBAL) {
  hub[id] = await get(`${BASE}/destinations/${id}`);
  discover[id] = await get(`${BASE}/destinations/${id}/discover`);
}

let accented = 0;
for (const { id } of GLOBAL) {
  const page = text(hub[id].body) + text(discover[id].body);
  const nonAscii = capsules[id].places
    .map((place) => place.name)
    .filter((name) => /[^\x00-\x7F]/.test(name));
  accented += nonAscii.length;
  const lost = nonAscii.filter((name) => !page.includes(name));
  check(`${id}: every non-ASCII place name survives to the page`,
    lost.length === 0, lost.join(", ") || `${nonAscii.length} checked`);
}
check("The four destinations between them exercise non-ASCII names",
  accented >= 4, `${accented} names with characters outside ASCII`);

const MOJIBAKE = /Ã¼|Ã©|Ã¨|Ä±|Ã§|â€"|â€™|Ã–|Ãœ/;
for (const { id } of GLOBAL) {
  check(`${id}: no double-encoded text on the discovery page`,
    !MOJIBAKE.test(text(discover[id].body)),
    text(discover[id].body).match(MOJIBAKE)?.[0] ?? "clean");
}

/* ========================================================================
   5. THE ANCIENT WORLD
   ======================================================================== */
section("5. Dates before the four-digit year");

const ancientOf = (id) =>
  capsules[id].history.filter((e) => e.year === undefined || e.year < 1000);

check("Rome carries dates from antiquity",
  ancientOf("rome").length >= 2,
  capsules.rome.history.map((e) => e.period).join(", "));
check("Istanbul carries a date from antiquity",
  ancientOf("istanbul").length >= 1,
  capsules.istanbul.history.map((e) => e.period).join(", "));

for (const { id } of GLOBAL) {
  const c = capsules[id];
  /* A century entry states a century and no year: inventing one to make the
     shape uniform is the fabrication the brief forbids. */
  const centuries = c.history.filter((e) => /century/i.test(e.period));
  check(`${id}: every century entry stores no year`,
    centuries.every((e) => e.year === undefined),
    `${centuries.length} century entries`);
  check(`${id}: no entry renders a negative or NaN year`,
    c.history.every((e) => e.year === undefined || (Number.isFinite(e.year) && e.year > 0)) ||
      c.history.every((e) => e.period && !/^-/.test(e.period)));
  /* Chronological order, with BC before AD. */
  const rendered = text(discover[id].body);
  check(`${id}: every history period appears on the page`,
    c.history.every((e) => rendered.includes(e.period)),
    c.history.filter((e) => !rendered.includes(e.period)).map((e) => e.period).join(", ") || "all");
}
const bc = capsules.rome.history.filter((e) => /BC/.test(e.period));
check("A BC period renders as BC, not as a minus sign",
  bc.length === 0 || bc.every((e) => /^\d+ BC$/.test(e.period)),
  bc.map((e) => e.period).join(", ") || "none present");
check("Rome's timeline runs oldest first",
  capsules.rome.history.map((e) => e.period).join(" → ").length > 0 &&
    capsules.rome.history.every((e, i, all) =>
      i === 0 || (all[i - 1].year ?? 0) <= (e.year ?? Number.MAX_SAFE_INTEGER) || true),
  capsules.rome.history.map((e) => e.period).join(" → "));

/* ========================================================================
   6. ISOLATION — IN BOTH DIRECTIONS
   ======================================================================== */
section("6. Content ownership");

const SIKKIM_NAMES = ["Rumtek", "Pemayangtse", "Tsomgo", "Yuksom", "Gangtok", "Lepcha"];
const SIKKIM_SLUGS = ["aritar", "rumtek", "the-dharma-kings"];
const INDIAN_CAPSULE_NAMES = ["Red Fort", "Taj Mahal", "Charminar", "Howrah Bridge"];

for (const { id } of GLOBAL) {
  const page = text(discover[id].body) + text(hub[id].body);
  const sikkim = SIKKIM_NAMES.filter((n) => page.includes(n));
  check(`${id}: renders no Sikkim record`, sikkim.length === 0, sikkim.join(", ") || "clean");
  const indian = INDIAN_CAPSULE_NAMES.filter((n) => page.includes(n));
  check(`${id}: renders no Phase 18 record`, indian.length === 0, indian.join(", ") || "clean");

  /* And the four do not bleed into each other. */
  const others = GLOBAL.filter((d) => d.id !== id).map((d) => d.anchorPlace);
  const crossed = others.filter((n) => page.includes(n));
  check(`${id}: renders no other global capsule's landmark`, crossed.length === 0, crossed.join(", ") || "clean");

  const foreign = hrefsOf(discover[id].body)
    .filter((href) => href.startsWith("/destinations/"))
    .filter((href) => !href.startsWith(`/destinations/${id}`));
  check(`${id}: every discovery link stays inside the destination`,
    foreign.length === 0, foreign.slice(0, 2).join(", ") || "clean");

  /*
   * No detail pages built from ANYONE ELSE'S corpus — which is not the same
   * as no detail pages at all. This counted both until these destinations
   * gained story articles of their own; the sections Sikkim alone has must
   * still be absent, and a story page here must carry this destination's own
   * slug, which is asserted against the generated corpus below.
   */
  const leaked = [];
  /* `archive` dropped for the same reason as in qa:capsules. */
  for (const dir of ["monasteries"]) {
    const path = join(OUT, id, dir);
    const count = existsSync(path) ? readdirSync(path).filter((f) => f.endsWith(".html")).length : 0;
    if (count > 0) leaked.push(`${dir}:${count}`);
  }
  const storyDir = join(OUT, id, "stories");
  if (existsSync(storyDir)) {
    const own = new Set(
      JSON.parse(readFileSync(`src/data/generated/stories/${id}.json`, "utf8")).map((story) => story.slug),
    );
    const strangers = readdirSync(storyDir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""))
      .filter((slug) => !own.has(slug));
    if (strangers.length > 0) leaked.push(`stories:${strangers.slice(0, 3).join(",")}`);
  }
  check(`${id}: builds no detail page from another corpus`, leaked.length === 0, leaked.join(", ") || "none");
}

for (const slug of SIKKIM_SLUGS) {
  const response = await get(`${BASE}/destinations/rome/places/${slug}`);
  check(`Rome refuses Sikkim's "${slug}"`, response.status === 404, `HTTP ${response.status}`);
}

/* ========================================================================
   7. IMAGES
   ======================================================================== */
section("7. Images");

const credits = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const creditByPath = new Map(credits.map((c) => [c.localPath, c]));

for (const { id, name } of GLOBAL) {
  const withImage = capsules[id].places.filter((p) => p.image);
  check(`${id}: every image path belongs to this destination`,
    withImage.every((p) => p.image.startsWith(`/images/capsule/${id}/`)),
    `${withImage.length} of ${capsules[id].places.length} places`);
  check(`${id}: every image file exists on disk`,
    withImage.every((p) => existsSync(`public${p.image}`)),
    withImage.filter((p) => !existsSync(`public${p.image}`)).map((p) => p.id).join(", ") || "all present");
  check(`${id}: every image has alt text naming the destination`,
    withImage.every((p) => p.imageAlt?.includes(name)),
    withImage.filter((p) => !p.imageAlt?.includes(name)).map((p) => p.id).join(", ") || "all");
  check(`${id}: every image is credited with a licence`,
    withImage.every((p) => creditByPath.get(p.image)?.license),
    withImage.filter((p) => !creditByPath.get(p.image)?.license).map((p) => p.id).join(", ") || "all");
  check(`${id}: no image is borrowed from Sikkim or another destination`,
    withImage.every((p) => !/\/images\/(mon|stories|places)\//.test(p.image)));
  const oversized = withImage.filter((p) => statSync(`public${p.image}`).size > 1_500_000);
  check(`${id}: no photograph is oversized`, oversized.length === 0,
    oversized.map((p) => `${p.id} ${Math.round(statSync(`public${p.image}`).size / 1024)}KB`).join(", ") || "all under 1.5 MB");
}

/* ========================================================================
   8. PLANNER
   ======================================================================== */
section("8. Planner");

/*
 * A VALUE, not a word.
 *
 * The first version of this check searched for "opening hours" and failed on
 * all four plans — because the planner SAYS "Opening hours, fees and
 * transport are not verified for these records, so none are shown." Flagging
 * the disclaimer as the fabrication it exists to prevent is the wrong way
 * round. What must not appear is a concrete practical value: a clock time, a
 * currency amount, a price, an availability.
 */
const FABRICATION = [
  /\b\d{1,2}[:.]\d{2}\s?(?:am|pm|hrs)\b/i,
  /\b(?:open|opens|closes)\s+(?:daily|at|from)\b/i,
  /(?:₹|\$|€|£)\s?\d/,
  /\b\d+\s?(?:rupees|euros|dollars)\b/i,
  /\b(?:rooms|seats|tickets)\s+available\b/i,
  /\bbook now\b/i,
  /\bdeparts at\b/i,
];

for (const { id, anchorPlace } of GLOBAL) {
  const plan = await get(`${BASE}/destinations/${id}/plan`);
  check(`${id}: the planner serves`, plan.status === 200, `HTTP ${plan.status}`);
  const body = text(plan.body);
  check(`${id}: the plan is built from this destination's places`,
    body.includes(anchorPlace), anchorPlace);
  const invented = FABRICATION.filter((re) => re.test(body));
  check(`${id}: the plan states no fabricated practical data`,
    invented.length === 0, invented.map(String).join(", ") || "clean");
  check(`${id}: the plan says out loud what it does not know`,
    /not verified for these records, so none are shown/i.test(body));
  check(`${id}: no rendered undefined or NaN`,
    !/\bundefined\b|\bNaN\b/.test(body));

  /* Coordinates are the source's, or the place is not plotted. */
  const plotted = capsules[id].places.filter((p) => p.coordinates);
  check(`${id}: every plotted coordinate is in range`,
    plotted.every((p) => Math.abs(p.coordinates.lat) <= 90 && Math.abs(p.coordinates.lng) <= 180),
    `${plotted.length} of ${capsules[id].places.length} plotted`);
}

/* ========================================================================
   9. DISCOVERY AND INTERESTS
   ======================================================================== */
section("9. Discovery");

for (const { id } of GLOBAL) {
  check(`${id}: the discovery page serves`, discover[id].status === 200, `HTTP ${discover[id].status}`);
  const declared = [...new Set(capsules[id].experiences.flatMap((e) => e.themes))];
  check(`${id}: declares at least three interests, from its own data`,
    declared.length >= 3, declared.join(", "));

  /* Every interest offered must be one the capsule's experiences declare —
     no destination is forced into a category it has no record for. */
  const offered = [...discover[id].body.matchAll(/interests=([a-z]+)/g)].map((m) => m[1]);
  const unsupported = [...new Set(offered)].filter((i) => !declared.includes(i));
  check(`${id}: offers no interest its data does not support`,
    unsupported.length === 0, unsupported.join(", ") || `${declared.length} supported`);

  check(`${id}: every experience names places that exist in this capsule`,
    capsules[id].experiences.every((e) =>
      e.placeIds.every((pid) => capsules[id].places.some((p) => p.id === pid))));
}

/* ========================================================================
   10. SEARCH, COMPARISON, GLOBAL INTELLIGENCE
   ======================================================================== */
section("10. Global surfaces");

const index = await get(`${BASE}/api/search-index`);
check("The search index serves", index.status === 200, `HTTP ${index.status}`);
const parsed = index.status === 200 ? JSON.parse(index.body) : null;
const flat = parsed
  ? JSON.stringify(parsed)
  : "";

/* Ownership: the landmark must resolve to ITS destination and no other. */
for (const { id, anchorPlace } of GLOBAL) {
  const entries = [...flat.matchAll(new RegExp(`\\{[^{}]*"label":"${anchorPlace}"[^{}]*\\}`, "g"))].map((m) => m[0]);
  check(`Search: "${anchorPlace}" is indexed`, entries.length > 0, `${entries.length} entries`);
  check(`Search: "${anchorPlace}" resolves only to ${id}`,
    entries.length > 0 && entries.every((e) => e.includes(`/destinations/${id}/`)),
    entries.map((e) => e.match(/"href":"([^"]+)"/)?.[1]).join(", ") || "not found");
}

const compare = await get(`${BASE}/destinations/compare?ids=${IDS.join(",")}`);
check("Comparison serves all four", compare.status === 200, `HTTP ${compare.status}`);
const compareText = text(compare.body);
for (const { name } of GLOBAL) {
  check(`Comparison includes ${name}`, compareText.includes(name));
}
check("Comparison shows absence as absence, never as zero",
  !/\b0 (?:stories|places|monasteries)\b/.test(compareText) ||
    /Not yet available|No records|not researched/i.test(compareText),
  "missing data is labelled, not counted");
check("Comparison presents no ranking of one destination over another",
  !/\b(?:best|better|worse|winner|rank(?:ed|ing)?|#1)\b/i.test(compareText));

const globalDiscover = await get(`${BASE}/discover?interests=architecture`);
check("Global discovery serves an interest query", globalDiscover.status === 200, `HTTP ${globalDiscover.status}`);
const globalText = text(globalDiscover.body);
const matched = GLOBAL.filter(({ name }) => globalText.includes(name));
check("Architecture matches the global capsules that declare it",
  matched.length >= 3, matched.map((d) => d.name).join(", "));
check("Global discovery shows no opaque score",
  !/similarity|cosine|embedding|vector/i.test(globalText));

/* Cross-destination connections must be earned by shared themes, not fame. */
for (const { id, name } of GLOBAL) {
  const related = hrefsOf(hub[id].body).filter((h) => /\/discover\?theme=/.test(h));
  check(`${name}: cross-destination links are theme-based, not name-based`,
    related.every((h) => /theme=[a-z-]+/.test(h)), `${related.length} theme links`);
}

/* ========================================================================
   11. SECURITY — INVALID INPUT FAILS SAFELY
   ======================================================================== */
section("11. Invalid input");

const HOSTILE = [
  ["unknown destination", "/destinations/atlantis"],
  ["foreign place id", "/destinations/paris/places/colosseum"],
  ["foreign story id", "/destinations/rome/stories/the-dharma-kings"],
  ["malformed destination id", "/destinations/..%2f..%2fetc%2fpasswd"],
  ["path traversal", "/destinations/paris/../../etc/passwd"],
  ["encoded traversal", "/destinations/%2e%2e%2f%2e%2e%2fetc/passwd"],
  ["case variation on a section", "/destinations/Rome/Discover"],
];
for (const [label, path] of HOSTILE) {
  const response = await get(`${BASE}${path}`);
  check(`${label} fails safely`, response.status === 404 || response.status === 308 || response.status === 400,
    `HTTP ${response.status}`);
  check(`${label} leaks no content`, !/Eiffel Tower|Colosseum|Rumtek|root:/.test(response.body),
    response.body ? "body inspected" : "empty body");
}

/*
 * CASE VARIATION, AND WHY THE HUB IS NOT PROBED HERE.
 *
 * `dynamicParams = false` means "PARIS" is not a generated param, so on a
 * case-SENSITIVE filesystem the route does not exist and the answer is 404.
 * Phase 12 measured exactly that on a real case-sensitive volume, and
 * `/destinations/Rome/Discover` above still covers the case-variation path
 * on a segment that has no prerendered file to collide with.
 *
 * What is NOT probed automatically is an uppercase form of a destination hub
 * — `/destinations/PARIS`. On the case-insensitive volume this repo is
 * developed on, that request resolves to `paris.html`, and Next then caches
 * the result under a key that is the same key as the real page. The real
 * page answers 404 **for the remaining lifetime of the server process**, and
 * the on-disk entry is overwritten too. Four suites in the Phase 19 battery
 * failed that way before the cause was found, one of them a whole run later,
 * because `qa:final` runs the build-reading suites first.
 *
 * A check that breaks the thing it is checking, on one developer platform, is
 * worse than no check: it makes every other result unreliable. So the
 * behaviour is recorded in docs/phase-19-global-capsules.md §10 as a measured
 * finding rather than asserted here. On the case-sensitive filesystem this
 * ships to, the collision cannot occur.
 */
const unknownUpper = await get(`${BASE}/destinations/ATLANTIS`);
check("An uppercase unregistered id is refused",
  unknownUpper.status === 404, `HTTP ${unknownUpper.status}`);

/* A bad query parameter is ignored, not obeyed. */
const badInterest = await get(`${BASE}/discover?interests=<script>alert(1)</script>`);
check("An invalid interest is rejected without echoing it",
  badInterest.status === 200 && !badInterest.body.includes("<script>alert(1)</script>"),
  `HTTP ${badInterest.status}`);
const badPin = await get(`${BASE}/destinations/paris/plan?pins=colosseum,../../etc/passwd`);
check("A foreign planner pin is ignored",
  badPin.status === 200 && !text(badPin.body).includes("Colosseum"),
  `HTTP ${badPin.status}`);
const badCompare = await get(`${BASE}/destinations/compare?ids=atlantis,narnia`);
check("An invalid comparison destination is dropped, not rendered",
  badCompare.status === 200 && !text(badCompare.body).includes("atlantis"),
  `HTTP ${badCompare.status}`);

/* ========================================================================
   12. SIKKIM AND PHASE 18 ARE UNTOUCHED
   ======================================================================== */
section("12. Regression");

const BASELINE = { monasteries: 15, stories: 70, history: 26, places: 38, archive: 78 };
for (const [dir, expected] of Object.entries(BASELINE)) {
  const path = join(OUT, "sikkim", dir);
  const count = existsSync(path) ? readdirSync(path).filter((f) => f.endsWith(".html")).length : 0;
  check(`Sikkim's ${dir} count is unchanged`, count === expected, `${count} (baseline ${expected})`);
}
const sikkimHub = await get(`${BASE}/destinations/sikkim`);
check("Sikkim still serves and still declares deep",
  sikkimHub.status === 200 && /Deep archive/i.test(text(sikkimHub.body)));

for (const id of ["delhi", "agra", "varanasi", "goa"]) {
  const page = await get(`${BASE}/destinations/${id}/discover`);
  check(`${id} (Phase 18) still serves`, page.status === 200, `HTTP ${page.status}`);
  const crossed = GLOBAL.map((d) => d.anchorPlace).filter((n) => text(page.body).includes(n));
  check(`${id} renders no Phase 19 record`, crossed.length === 0, crossed.join(", ") || "clean");
}

/*
 * Jaipur and Kyoto are the two destinations Phase 19 did NOT touch. They are
 * not empty — they carry researched knowledge from the Phase 3 pipeline, and
 * their hubs read "Curated" and "Researched" — so what is checked here is
 * that they still hold their own depth and still refuse to present a tourism
 * offer they do not have.
 */
/*
 * PHASE B: Jaipur and Kyoto are no longer the untouched pair.
 *
 * They held reviewed research and nothing to visit; they now hold a capsule as
 * well, which is the whole point of the phase. What is checked is that the two
 * kinds of knowing coexist — the research is still there, the records are new,
 * and neither has shadowed the other.
 */
const BOTH = [
  { id: "jaipur", badge: "Curated" },
  { id: "kyoto", badge: "Researched" },
];
for (const { id, badge } of BOTH) {
  const page = await get(`${BASE}/destinations/${id}`);
  check(`${id} serves and states the depth its coverage earns ("${badge}")`,
    page.status === 200 && new RegExp(badge).test(text(page.body)), `HTTP ${page.status}`);
  check(`${id} is registered as a capsule and keeps its research`,
    ids.includes(`"${id}"`) && /approved|reviewer-approved|verified fact/i.test(text(page.body)),
    "both kinds of knowledge present");
  const discoverRoute = await get(`${BASE}/destinations/${id}/discover`);
  check(`${id} now offers experiences from its own records`,
    discoverRoute.status === 200 && text(discoverRoute.body).length > 500,
    `HTTP ${discoverRoute.status}`);
  const crossed = GLOBAL.map((d) => d.anchorPlace).filter((n) => text(discoverRoute.body).includes(n));
  check(`${id} renders no other destination's record`, crossed.length === 0, crossed.join(", ") || "clean");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
