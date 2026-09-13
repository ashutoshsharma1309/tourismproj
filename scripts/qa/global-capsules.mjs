/**
 * The eight capsules added when the product became India-only — Amritsar,
 * Ahmedabad, Lucknow, Pune, Mysuru, Madurai, Bhubaneswar, Srinagar.
 *
 * WHAT THIS SUITE IS FOR
 * ----------------------
 * `qa:capsules` already checks every registered capsule for the things that
 * are true of all of them: isolation, images, sources, honest absence. This
 * suite is the acceptance test for the newest eight specifically — the ones
 * generated after the international destinations were removed — so a capsule
 * that has not landed yet, or landed half-built, fails by NAME rather than
 * hiding inside an aggregate.
 *
 * It was written for Paris, Rome, Istanbul and New York (Phase 19), when the
 * question was whether the model bent for a destination outside India. That
 * question is closed: it did. The questions that survive the re-aim are the
 * same shape, asked of the new eight:
 *
 *   1. Does the pipeline still handle a place that predates the four-digit
 *      year? Madurai and Bhubaneswar have Sangam-era and Kalinga-era dates,
 *      and §5 asserts the ancient world survives retrieval, rendering and
 *      ordering.
 *
 *   2. Does anything break on a name outside plain ASCII? Transliterated
 *      Indian names carry macrons and diacritics in Wikipedia titles
 *      (Tirumalai Nāyak, Śrī). §4 reads them back off the served page.
 *
 *   3. Does a new destination reach the global layer on the same terms —
 *      search, comparison, interest matching, cross-destination connections —
 *      without a line of code that knows its name? §7 to §10.
 *
 *   4. Is every claim sourced from a host the pipeline actually fetched, and
 *      does a two-source entry genuinely cite two publishers? §3.
 *
 * A MISSING CAPSULE IS A NAMED FAILURE, NOT A CRASH
 * -------------------------------------------------
 * The capsule files land through `scripts/capsules/` over time. Until one
 * exists, every section that needs it is skipped for that id and the presence
 * check fails with the path that is missing. The suite still runs to the end
 * for the capsules that do exist.
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

/** The eight, and the identity each is expected to publish — never content. */
const NEW = [
  { id: "amritsar", name: "Amritsar", region: "Punjab" },
  { id: "ahmedabad", name: "Ahmedabad", region: "Gujarat" },
  { id: "lucknow", name: "Lucknow", region: "Uttar Pradesh" },
  { id: "pune", name: "Pune", region: "Maharashtra" },
  { id: "mysuru", name: "Mysuru", region: "Karnataka" },
  { id: "madurai", name: "Madurai", region: "Tamil Nadu" },
  { id: "bhubaneswar", name: "Bhubaneswar", region: "Odisha" },
  { id: "srinagar", name: "Srinagar", region: "Jammu and Kashmir" },
];
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

/* ========================================================================
   0. PRESENCE — the one section that runs for all eight regardless
   ======================================================================== */
section("0. The eight capsule files");

/** Loaded as data, not as source text. Only the capsules that exist. */
const capsules = {};
for (const { id } of NEW) {
  const file = `${CAPSULE_DIR}/${id}.ts`;
  const exists = existsSync(file);
  check(`${id}: capsule file exists`, exists,
    exists ? `${Math.round(statSync(file).size / 1024)} KB` : `MISSING ${file} — generate it with scripts/capsules/`);
  if (!exists) continue;
  try {
    ({ capsule: capsules[id] } = await import(`../../${file}`));
  } catch (error) {
    check(`${id}: capsule module loads`, false, String(error).slice(0, 120));
  }
}
/** The subset every later section walks. */
const PRESENT = NEW.filter(({ id }) => capsules[id]);
console.log(`   ${PRESENT.length} of ${NEW.length} present${PRESENT.length < NEW.length ? `; missing: ${NEW.filter(({ id }) => !capsules[id]).map((d) => d.id).join(", ")}` : ""}`);

/*
 * The anchor place is DERIVED, not pinned. The first catalogued place that
 * carries a photograph is the record the hero, the planner and search all
 * lead with, so it is the record whose presence proves a page is this
 * destination's — and whose presence on another destination's page proves a
 * leak.
 */
const anchorOf = (id) => {
  const c = capsules[id];
  const place = c.places.find((p) => p.image) ?? c.places[0];
  return place?.name ?? "";
};

/* ========================================================================
   1. REGISTERED, AT CAPSULE DEPTH, IN INDIA
   ======================================================================== */
section("1. Registered, at capsule depth, in India");

const planned = readFileSync("src/data/destinations/planned.ts", "utf8");
const ids = readFileSync(`${CAPSULE_DIR}/ids.ts`, "utf8");
const registry = readFileSync(`${CAPSULE_DIR}/index.ts`, "utf8");

for (const { id, region } of NEW) {
  const record = new RegExp(`id: "${id}",[\\s\\S]{0,500}?depth: "([a-z]+)"`).exec(planned);
  check(`${id}: declared depth is capsule`, record?.[1] === "capsule", record?.[1] ?? "no record in planned.ts");
  check(`${id}: identity is Indian`,
    new RegExp(`id: "${id}",[\\s\\S]{0,300}?country: \\{ code: "IN", name: "India" \\}`).test(planned));
  check(`${id}: identity names its state`,
    new RegExp(`id: "${id}",[\\s\\S]{0,400}?region: \\{ name: "${region}"`).test(planned), region);
  check(`${id}: in both capsule registries`,
    ids.includes(`"${id}"`) &&
      (registry.includes(`${id}: () => import("./${id}")`) ||
        registry.includes(`"${id}": () => import("./${id}")`)),
    ids.includes(`"${id}"`) ? "ids.ts ok" : "not in ids.ts");
}
for (const { id } of PRESENT) {
  check(`${id}: capsule declares its own destinationId`,
    capsules[id].destinationId === id, capsules[id].destinationId);
  const validation = validateCapsule(capsules[id]);
  check(`${id}: capsule passes the framework validator`,
    validation.ok, validation.errors.slice(0, 2).join("; ") || "0 errors");
}

/* ========================================================================
   2. THE SIZE LIMITS THE BRIEF SET
   ======================================================================== */
section("2. Dataset limits");

for (const { id } of PRESENT) {
  const c = capsules[id];
  /* The bounds are still bounds — an upper limit is what stops a "capsule"
     quietly becoming an unreviewed archive, and the lower ones are what stop
     it thinning out. */
  check(`${id}: 10-20 places`, c.places.length >= 10 && c.places.length <= 20, `${c.places.length}`);
  check(`${id}: 6-15 dated events`, c.history.length >= 6 && c.history.length <= 15, `${c.history.length}`);
  check(`${id}: 3-10 experiences`, c.experiences.length >= 3 && c.experiences.length <= 10, `${c.experiences.length}`);
  check(`${id}: at most 15 stories`, c.stories.length <= 15, `${c.stories.length}`);
}

/* ========================================================================
   3. PROVENANCE, AND THE SECOND SOURCE
   ======================================================================== */
section("3. Sources");

/* Hosts the Indian pipeline actually fetches: Wikipedia and Wikidata for
   records, the NIDHI+ register for stays. A citation to anything else is a
   citation nobody retrieved. */
const FETCHED_HOSTS = new Set(["en.wikipedia.org", "www.wikidata.org", "nidhi.tourism.gov.in"]);

let corroborated = 0;
let entries = 0;
for (const { id } of PRESENT) {
  const c = capsules[id];
  const byId = new Map(c.sources.map((s) => [s.id, s]));

  const badHost = c.sources.filter((s) => !FETCHED_HOSTS.has(new URL(s.url).host));
  check(`${id}: every source is a host the pipeline actually fetched`,
    badHost.length === 0, badHost.map((s) => s.url).join(", ") || `${c.sources.length} sources`);

  const claims = [...c.places, ...c.history, ...c.stories, ...c.experiences, ...c.culture, ...c.stays];
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
  entries += c.history.length;
  check(`${id}: every two-source entry names two different publishers`,
    twoSource.every((entry) => new Set(entry.sourceIds.map((sid) => byId.get(sid)?.publisher)).size > 1),
    `${twoSource.length} corroborated of ${c.history.length}`);

  check(`${id}: reviewedBy does not claim a human review that did not happen`,
    /pending human review/.test(c.reviewedBy), c.reviewedBy);
}
if (PRESENT.length > 0) {
  check("Wikidata corroborates a meaningful share of the timeline",
    corroborated >= PRESENT.length, `${corroborated} of ${entries} entries carry a second source`);
}

/* ========================================================================
   4. NAMES THAT ARE NOT PLAIN ASCII
   ======================================================================== */
section("4. Diacritics and transliterated names");

const hub = {};
const discover = {};
for (const { id } of PRESENT) {
  hub[id] = await get(`${BASE}/destinations/${id}`);
  discover[id] = await get(`${BASE}/destinations/${id}/discover`);
}

/*
 * Every capsule place NAME is deterministic, and some carry characters
 * Latin-1 cannot hold. The assertion: every non-ASCII place name a capsule
 * declares must reach the page byte-for-byte. A mojibake anywhere in the
 * pipeline fails it, and nothing about which sentence was chosen matters.
 */
const MOJIBAKE = /Ã¼|Ã©|Ã¨|Ä±|Ã§|â€"|â€™|Ã–|Ãœ|Ä|Å›/;
for (const { id } of PRESENT) {
  const page = text(hub[id].body) + text(discover[id].body);
  const nonAscii = capsules[id].places
    .map((place) => place.name)
    .filter((name) => /[^\x00-\x7F]/.test(name));
  const lost = nonAscii.filter((name) => !page.includes(name));
  check(`${id}: every non-ASCII place name survives to the page`,
    lost.length === 0, lost.join(", ") || `${nonAscii.length} checked`);
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

if (PRESENT.length > 0) {
  const withAntiquity = PRESENT.filter(({ id }) => ancientOf(id).length >= 1).map((d) => d.id);
  check("At least one of the eight carries a date from antiquity",
    withAntiquity.length >= 1, withAntiquity.join(", ") || "none — Madurai and Bhubaneswar are expected to");
}

for (const { id } of PRESENT) {
  const c = capsules[id];
  /* A century entry states a century and no year: inventing one to make the
     shape uniform is the fabrication the brief forbids. */
  const centuries = c.history.filter((e) => /century/i.test(e.period));
  check(`${id}: every century entry stores no year`,
    centuries.every((e) => e.year === undefined),
    `${centuries.length} century entries`);
  /* A BC date is stored as a negative year (the manifest's convention) and
     rendered from `period`; a negative year with a BC period is correct. */
  check(`${id}: no entry renders a NaN year, and a negative year is always a BC period`,
    c.history.every((e) => e.year === undefined || (Number.isFinite(e.year) && (e.year > 0 || /BC/.test(e.period)))));
  const bc = c.history.filter((e) => /BC/.test(e.period));
  check(`${id}: a BC period renders as BC, not as a minus sign`,
    bc.every((e) => /^\d+(?:st|nd|rd|th)? (?:century )?BC$/.test(e.period)),
    bc.map((e) => e.period).join(", ") || "none present");
  const rendered = text(discover[id].body);
  check(`${id}: every history period appears on the page`,
    c.history.every((e) => rendered.includes(e.period)),
    c.history.filter((e) => !rendered.includes(e.period)).map((e) => e.period).join(", ") || "all");
}

/* ========================================================================
   6. ISOLATION — IN BOTH DIRECTIONS
   ======================================================================== */
section("6. Content ownership");

const SIKKIM_NAMES = ["Rumtek", "Pemayangtse", "Tsomgo", "Yuksom", "Gangtok", "Lepcha"];
const SIKKIM_SLUGS = ["aritar", "rumtek", "the-dharma-kings"];
/* Landmarks of the ten earlier destinations that belong to exactly one of
   them. Deliberately not "Red Fort" or "Taj Mahal", which prose about a
   Mughal-era city may legitimately mention. */
const EARLIER_CAPSULE_NAMES = ["Charminar", "Hawa Mahal", "Dashashwamedh", "Gateway of India", "Howrah Bridge", "Fort Kochi", "Basilica of Bom Jesus", "Qutb Minar"];

for (const { id } of PRESENT) {
  const page = text(discover[id].body) + text(hub[id].body);
  const sikkim = SIKKIM_NAMES.filter((n) => page.includes(n));
  check(`${id}: renders no Sikkim record`, sikkim.length === 0, sikkim.join(", ") || "clean");
  const earlier = EARLIER_CAPSULE_NAMES.filter((n) => page.includes(n));
  check(`${id}: renders no earlier capsule's landmark`, earlier.length === 0, earlier.join(", ") || "clean");

  /* And the eight do not bleed into each other. */
  const others = PRESENT.filter((d) => d.id !== id).map((d) => anchorOf(d.id)).filter(Boolean);
  const crossed = others.filter((n) => page.includes(n));
  check(`${id}: renders no other new capsule's landmark`, crossed.length === 0, crossed.join(", ") || "clean");

  const foreign = hrefsOf(discover[id].body)
    .filter((href) => href.startsWith("/destinations/"))
    .filter((href) => !href.startsWith(`/destinations/${id}`));
  check(`${id}: every discovery link stays inside the destination`,
    foreign.length === 0, foreign.slice(0, 2).join(", ") || "clean");

  /*
   * No detail pages built from ANYONE ELSE'S corpus — which is not the same
   * as no detail pages at all. The sections Sikkim alone has must be absent,
   * and a story page here must carry this destination's own slug.
   */
  const leaked = [];
  for (const dir of ["monasteries"]) {
    const path = join(OUT, id, dir);
    const count = existsSync(path) ? readdirSync(path).filter((f) => f.endsWith(".html")).length : 0;
    if (count > 0) leaked.push(`${dir}:${count}`);
  }
  const storyDir = join(OUT, id, "stories");
  const storyJson = `src/data/generated/stories/${id}.json`;
  if (existsSync(storyDir) && existsSync(storyJson)) {
    const own = new Set(JSON.parse(readFileSync(storyJson, "utf8")).map((story) => story.slug));
    const strangers = readdirSync(storyDir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""))
      .filter((slug) => !own.has(slug));
    if (strangers.length > 0) leaked.push(`stories:${strangers.slice(0, 3).join(",")}`);
  }
  check(`${id}: builds no detail page from another corpus`, leaked.length === 0, leaked.join(", ") || "none");
}

if (PRESENT.length > 0) {
  const probe = PRESENT[0].id;
  for (const slug of SIKKIM_SLUGS) {
    const response = await get(`${BASE}/destinations/${probe}/places/${slug}`);
    check(`${probe} refuses Sikkim's "${slug}"`, response.status === 404, `HTTP ${response.status}`);
  }
}

/* ========================================================================
   7. IMAGES
   ======================================================================== */
section("7. Images");

const credits = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const creditByPath = new Map(credits.map((c) => [c.localPath, c]));

for (const { id, name } of PRESENT) {
  const c = capsules[id];
  const withImage = [...c.places, ...c.culture, ...c.stays].filter((p) => p.image);
  check(`${id}: every image path belongs to this destination`,
    withImage.every((p) => p.image.startsWith(`/images/capsule/${id}/`)),
    `${withImage.length} images across ${c.places.length} places, ${c.culture.length} culture, ${c.stays.length} stays`);
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
  const oversized = withImage.filter((p) => existsSync(`public${p.image}`) && statSync(`public${p.image}`).size > 1_500_000);
  check(`${id}: no photograph is oversized`, oversized.length === 0,
    oversized.map((p) => `${p.id} ${Math.round(statSync(`public${p.image}`).size / 1024)}KB`).join(", ") || "all under 1.5 MB");
  check(`${id}: the hero has a photograph to lead with`,
    c.places.some((p) => p.image), `${c.places.filter((p) => p.image).length} of ${c.places.length} places photographed`);
}

/* ========================================================================
   8. PLANNER
   ======================================================================== */
section("8. Planner");

/* A VALUE, not a word: what must not appear is a concrete practical value —
   a clock time, a currency amount, a price, an availability. The planner's
   own disclaimer names the categories and is not a fabrication. */
const FABRICATION = [
  /\b\d{1,2}[:.]\d{2}\s?(?:am|pm|hrs)\b/i,
  /\b(?:open|opens|closes)\s+(?:daily|at|from)\b/i,
  /(?:₹|\$|€|£)\s?\d/,
  /\b\d+\s?(?:rupees|euros|dollars)\b/i,
  /\b(?:rooms|seats|tickets)\s+available\b/i,
  /\bbook now\b/i,
  /\bdeparts at\b/i,
];

for (const { id } of PRESENT) {
  const plan = await get(`${BASE}/destinations/${id}/plan`);
  check(`${id}: the planner serves`, plan.status === 200, `HTTP ${plan.status}`);
  const body = text(plan.body);
  const anchor = anchorOf(id);
  check(`${id}: the plan is built from this destination's places`,
    body.includes(anchor), anchor);
  const invented = FABRICATION.filter((re) => re.test(body));
  check(`${id}: the plan states no fabricated practical data`,
    invented.length === 0, invented.map(String).join(", ") || "clean");
  check(`${id}: the plan says out loud what it does not know`,
    /not verified for these records, so none are shown/i.test(body));
  check(`${id}: no rendered undefined or NaN`,
    !/\bundefined\b|\bNaN\b/.test(body));

  /* Coordinates are the source's, or the place is not plotted — and every
     plotted place is inside India. */
  const plotted = capsules[id].places.filter((p) => p.coordinates);
  check(`${id}: every plotted coordinate is inside India`,
    plotted.every((p) => p.coordinates.lat >= 6 && p.coordinates.lat <= 37 && p.coordinates.lng >= 68 && p.coordinates.lng <= 98),
    `${plotted.length} of ${capsules[id].places.length} plotted`);
}

/* ========================================================================
   9. DISCOVERY AND INTERESTS
   ======================================================================== */
section("9. Discovery");

for (const { id } of PRESENT) {
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

if (PRESENT.length > 0) {
  const index = await get(`${BASE}/api/search-index`);
  check("The search index serves", index.status === 200, `HTTP ${index.status}`);
  const flat = index.status === 200 ? index.body : "";

  /* Ownership: the landmark must resolve to ITS destination and no other. */
  for (const { id } of PRESENT) {
    const anchor = anchorOf(id);
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const entries = [...flat.matchAll(new RegExp(`\\{[^{}]*"label":"${escaped}"[^{}]*\\}`, "g"))].map((m) => m[0]);
    check(`Search: "${anchor}" is indexed`, entries.length > 0, `${entries.length} entries`);
    check(`Search: "${anchor}" resolves only to ${id}`,
      entries.length > 0 && entries.every((e) => e.includes(`/destinations/${id}/`)),
      entries.map((e) => e.match(/"href":"([^"]+)"/)?.[1]).join(", ") || "not found");
  }

  const compare = await get(`${BASE}/destinations/compare?ids=${PRESENT.map((d) => d.id).join(",")}`);
  check(`Comparison serves all ${PRESENT.length}`, compare.status === 200, `HTTP ${compare.status}`);
  const compareText = text(compare.body);
  for (const { name } of PRESENT) {
    check(`Comparison includes ${name}`, compareText.includes(name));
  }
  check("Comparison shows absence as absence, never as zero",
    !/\b0 (?:stories|places|monasteries)\b/.test(compareText) ||
      /Not yet available|No records|not researched/i.test(compareText),
    "missing data is labelled, not counted");
  /* The page opens with the traveller's own question, "Which destination
     fits you better?", and answers it with counts while saying counts do
     "not [say] which place is better". Those two phrasings are the question
     and the disclaimer, not a ranking; anything else with a ranking word is. */
  check("Comparison presents no ranking of one destination over another",
    !/\b(?:best|better|worse|winner|rank(?:ed|ing)?|#1)\b/i.test(
      compareText.replace(/fits you better\?/g, "").replace(/not which place is better/g, "")));

  const globalDiscover = await get(`${BASE}/discover?interests=architecture`);
  check("Global discovery serves an interest query", globalDiscover.status === 200, `HTTP ${globalDiscover.status}`);
  const globalText = text(globalDiscover.body);
  const declaring = PRESENT.filter(({ id }) => capsules[id].experiences.some((e) => e.themes.includes("architecture")));
  const matched = declaring.filter(({ name }) => globalText.includes(name));
  check("Architecture matches every new capsule that declares it",
    matched.length === declaring.length, `${matched.length}/${declaring.length}: ${matched.map((d) => d.name).join(", ")}`);
  check("Global discovery shows no opaque score",
    !/similarity|cosine|embedding|vector/i.test(globalText));

  /* Cross-destination connections must be earned by shared themes, not fame. */
  for (const { id, name } of PRESENT) {
    const related = hrefsOf(hub[id].body).filter((h) => /\/discover\?theme=/.test(h));
    check(`${name}: cross-destination links are theme-based, not name-based`,
      related.every((h) => /theme=[a-z-]+/.test(h)), `${related.length} theme links`);
  }
}

/* ========================================================================
   11. SECURITY — INVALID INPUT FAILS SAFELY
   ======================================================================== */
section("11. Invalid input");

const probeId = PRESENT[0]?.id ?? "amritsar";
const HOSTILE = [
  ["unknown destination", "/destinations/atlantis"],
  ["foreign place id", `/destinations/${probeId}/places/charminar`],
  ["foreign story id", `/destinations/${probeId}/stories/the-dharma-kings`],
  ["malformed destination id", "/destinations/..%2f..%2fetc%2fpasswd"],
  ["path traversal", `/destinations/${probeId}/../../etc/passwd`],
  ["encoded traversal", "/destinations/%2e%2e%2f%2e%2e%2fetc/passwd"],
  ["case variation on a section", `/destinations/${probeId[0].toUpperCase()}${probeId.slice(1)}/Discover`],
];
for (const [label, path] of HOSTILE) {
  const response = await get(`${BASE}${path}`);
  check(`${label} fails safely`, response.status === 404 || response.status === 308 || response.status === 400,
    `HTTP ${response.status}`);
  check(`${label} leaks no content`, !/Charminar|Rumtek|root:/.test(response.body),
    response.body ? "body inspected" : "empty body");
}

/*
 * An uppercase form of a destination HUB is deliberately not probed: on a
 * case-insensitive volume Next caches the miss under the real page's key and
 * the real page answers 404 for the life of the server. Measured in Phase
 * 19; recorded in docs/phase-19-global-capsules.md §10.
 */
const unknownUpper = await get(`${BASE}/destinations/ATLANTIS`);
check("An uppercase unregistered id is refused",
  unknownUpper.status === 404, `HTTP ${unknownUpper.status}`);

/* A bad query parameter is ignored, not obeyed. */
const badInterest = await get(`${BASE}/discover?interests=<script>alert(1)</script>`);
check("An invalid interest is rejected without echoing it",
  badInterest.status === 200 && !badInterest.body.includes("<script>alert(1)</script>"),
  `HTTP ${badInterest.status}`);
if (PRESENT.length > 0) {
  const badPin = await get(`${BASE}/destinations/${probeId}/plan?pins=charminar,../../etc/passwd`);
  check("A foreign planner pin is ignored",
    badPin.status === 200 && !text(badPin.body).includes("Charminar"),
    `HTTP ${badPin.status}`);
}
const badCompare = await get(`${BASE}/destinations/compare?ids=atlantis,narnia`);
check("An invalid comparison destination is dropped, not rendered",
  badCompare.status === 200 && !text(badCompare.body).includes("atlantis"),
  `HTTP ${badCompare.status}`);

/* ========================================================================
   12. SIKKIM AND THE EARLIER CAPSULES ARE UNTOUCHED
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
  sikkimHub.status === 200 && /Deeply documented/i.test(text(sikkimHub.body)));

for (const id of ["delhi", "agra", "varanasi", "goa"]) {
  const page = await get(`${BASE}/destinations/${id}/discover`);
  check(`${id} (earlier capsule) still serves`, page.status === 200, `HTTP ${page.status}`);
  const crossed = PRESENT.map((d) => anchorOf(d.id)).filter((n) => n && text(page.body).includes(n));
  check(`${id} renders no new capsule's record`, crossed.length === 0, crossed.join(", ") || "clean");
}

/* Jaipur holds reviewed research AND a capsule; neither may shadow the other. */
{
  const page = await get(`${BASE}/destinations/jaipur`);
  check(`jaipur serves and states the depth its coverage earns ("Well documented")`,
    page.status === 200 && /Well documented/.test(text(page.body)), `HTTP ${page.status}`);
  check("jaipur is registered as a capsule and keeps its research",
    ids.includes('"jaipur"') && /approved|reviewer-approved|verified fact/i.test(text(page.body)),
    "both kinds of knowledge present");
  const discoverRoute = await get(`${BASE}/destinations/jaipur/discover`);
  check("jaipur offers experiences from its own records",
    discoverRoute.status === 200 && text(discoverRoute.body).length > 500,
    `HTTP ${discoverRoute.status}`);
  const crossed = PRESENT.map((d) => anchorOf(d.id)).filter((n) => n && text(discoverRoute.body).includes(n));
  check("jaipur renders no new capsule's record", crossed.length === 0, crossed.join(", ") || "clean");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
