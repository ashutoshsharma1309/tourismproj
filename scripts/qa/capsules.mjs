/**
 * Capsule integrity — every registered tourism capsule.
 *
 * Written for Phase 18's eight Indian destinations; the destination list is
 * now read from the registry, so Phase 19's four global ones are held to the
 * same checks without a line changing here.
 *
 * The check this suite exists for is number 3. Phase 18's first build
 * produced 1,399 pages instead of 295, because three detail routes crossed
 * every capability-holding destination with SIKKIM's static slug list:
 * `/destinations/agra/places/aritar` existed and rendered Sikkim's record
 * under Agra's URL. It was invisible for fifteen phases because Sikkim was
 * the only destination with content. Everything below §3 is there so it
 * cannot come back quietly.
 *
 *   node scripts/qa/capsules.mjs [--base http://localhost:3000]
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

const CAPSULE_DIR = "src/data/destinations/capsules";
/*
 * Read from the registry rather than listed here.
 *
 * Phase 19 added four global destinations, and a hard-coded list of eight
 * would have gone on passing while covering none of them — an isolation
 * matrix that silently stops covering new destinations is worse than no
 * matrix. Every capsule this project registers is checked from now on.
 */
const CAPSULES = [
  ...readFileSync(`${CAPSULE_DIR}/ids.ts`, "utf8")
    .match(/CAPSULE_IDS: string\[\] = \[([^\]]*)\]/)[1]
    .matchAll(/"([a-z-]+)"/g),
].map((m) => m[1]);
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
const imagesOf = (html) => [...mainOf(html).matchAll(/<img[^>]*>/g)].map((m) => m[0]);
const htmlCount = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".html")).length : 0;

const { validateCapsule } = await import("../../src/lib/destinations/capsule.ts");

/* ========================================================================
   1-2. THE EIGHT DESTINATIONS, AT CAPSULE DEPTH
   ======================================================================== */
section("1-2. Destinations and depth");

const planned = readFileSync("src/data/destinations/planned.ts", "utf8");
const ids = readFileSync(`${CAPSULE_DIR}/ids.ts`, "utf8");
const registry = readFileSync(`${CAPSULE_DIR}/index.ts`, "utf8");

for (const id of CAPSULES) {
  const file = `${CAPSULE_DIR}/${id}.ts`;
  check(`${id}: capsule file exists`, existsSync(file), existsSync(file) ? `${Math.round(statSync(file).size / 1024)} KB` : "missing");
  check(`${id}: registered in both registries`,
    ids.includes(`"${id}"`) &&
      (registry.includes(`${id}: () => import("./${id}")`) ||
        registry.includes(`"${id}": () => import("./${id}")`)));
  /* PHASE B: a capsule destination may declare a HIGHER depth when it also
     holds reviewed research — Jaipur declares "curated".
     What it may never declare is "planned" while holding records. */
  const record = new RegExp(`id: "${id}",[\\s\\S]{0,600}?depth: "([a-z]+)"`).exec(planned);
  check(`${id}: declares a depth its records support`,
    ["capsule", "researched", "curated", "deep"].includes(record?.[1] ?? ""),
    record?.[1] ?? "no record");
}

const hub = {};
for (const id of CAPSULES) {
  hub[id] = await get(`${BASE}/destinations/${id}`);
}
check(`All ${CAPSULES.length} hubs serve`, CAPSULES.every((id) => hub[id].status === 200),
  CAPSULES.filter((id) => hub[id].status !== 200).join(", ") || `${CAPSULES.length}/${CAPSULES.length}`);
/*
 * PHASE B: a capsule destination may display a HIGHER depth when it also holds
 * reviewed research — Jaipur shows "Curated", Kyoto "Researched". What every
 * one of them must still do is state a depth from the shared vocabulary and
 * say what it offers.
 */
const DEPTH_WORDS = /Documented|Well documented|Researched|Deeply documented/;
check("Every hub states a depth from the shared vocabulary",
  CAPSULES.every((id) => DEPTH_WORDS.test(text(hub[id].body))),
  CAPSULES.filter((id) => !DEPTH_WORDS.test(text(hub[id].body))).join(", ") || `${CAPSULES.length}/${CAPSULES.length}`);
check("Every hub says what it offers",
  CAPSULES.every((id) => /What you can explore here/.test(text(hub[id].body))));
check("Sikkim still declares deep, and says so",
  /Deeply documented/.test(text((await get(`${BASE}/destinations/sikkim`)).body)));

/* ========================================================================
   3. NO SIKKIM CONTENT UNDER ANOTHER DESTINATION
   ======================================================================== */
section("3. Destination isolation");

const SIKKIM_SLUGS = ["aritar", "tsomgo-lake", "rumtek", "the-dharma-kings", "yuksom-coronation-1642"];
for (const id of CAPSULES) {
  /*
   * RE-AIMED. This counted ANY detail page under a capsule as leakage, which
   * was right while a capsule had no long-form content of its own. Fourteen
   * destinations now have story articles, so the old form reported the
   * feature as the defect.
   *
   * The section is headed "NO SIKKIM CONTENT UNDER ANOTHER DESTINATION" and
   * SIKKIM_SLUGS sits directly above it: that is the rule. Sections Sikkim
   * alone has must still be absent entirely; `stories` must exist only as
   * this destination's own slugs.
   */
  const leaked = [];
  /* `archive` dropped: capsules now build their own catalogues, and
     qa:archive asserts every built archive page is the capsule's own object. */
  for (const section of ["monasteries"]) {
    const count = htmlCount(join(OUT, id, section));
    if (count > 0) leaked.push(`${section}:${count}`);
  }
  for (const slug of SIKKIM_SLUGS) {
    for (const section of ["places", "stories", "history"]) {
      if (existsSync(join(OUT, id, section, `${slug}.html`))) leaked.push(`${section}/${slug}`);
    }
  }
  check(`${id}: generates no detail pages from another destination's corpus`,
    leaked.length === 0, leaked.join(", ") || "none");
}

for (const slug of SIKKIM_SLUGS.slice(0, 3)) {
  const response = await get(`${BASE}/destinations/delhi/places/${slug}`);
  check(`Delhi refuses Sikkim's "${slug}"`, response.status === 404, `HTTP ${response.status}`);
}

const sikkimNames = ["Rumtek", "Pemayangtse", "Tsomgo", "Yuksom", "Gangtok"];
for (const id of CAPSULES) {
  const discover = await get(`${BASE}/destinations/${id}/discover`);
  const found = sikkimNames.filter((name) => text(discover.body).includes(name));
  check(`${id}: discovery renders no Sikkim record`, found.length === 0, found.join(", ") || "clean");
  const foreign = hrefsOf(discover.body)
    .filter((href) => href.startsWith("/destinations/"))
    .filter((href) => !href.startsWith(`/destinations/${id}`));
  check(`${id}: every discovery link stays inside the destination`,
    foreign.length === 0, foreign.slice(0, 2).join(", ") || "clean");
}

/* ========================================================================
   4. IMAGES BELONG TO THEIR DESTINATION
   ======================================================================== */
section("4. Images");

const credits = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const capsuleCredits = credits.filter((credit) => credit.key.startsWith("capsule/"));
check("Vendored capsule photographs are credited", capsuleCredits.length > 0,
  `${capsuleCredits.length} files`);
check("Every capsule photograph names a licence and a Commons page",
  capsuleCredits.every((credit) => credit.license && credit.commonsFilePage),
  `${capsuleCredits.filter((c) => !c.license).length} without a licence`);
check("Every credited file exists on disk",
  capsuleCredits.every((credit) => existsSync(`public${credit.localPath}`)),
  `${capsuleCredits.filter((c) => !existsSync(`public${c.localPath}`)).length} missing`);

for (const id of CAPSULES) {
  const discover = await get(`${BASE}/destinations/${id}/discover`);
  const images = imagesOf(discover.body);
  const wrongDestination = images.filter(
    (tag) => /images%2Fcapsule%2F([a-z-]+)%2F/.exec(tag)?.[1] !== undefined &&
      /images%2Fcapsule%2F([a-z-]+)%2F/.exec(tag)[1] !== id,
  );
  const sikkimImage = images.filter((tag) => /%2Fmon%2F|%2Fplace%2F|gallery%2Fmonastery/.test(tag));
  check(`${id}: every photograph is its own`,
    wrongDestination.length === 0 && sikkimImage.length === 0,
    wrongDestination.length + sikkimImage.length === 0 ? `${images.length} images` : "foreign image");
  check(`${id}: every photograph carries alt text`,
    images.every((tag) => /alt="[^"]+"/.test(tag)), `${images.length} images`);
}

/* ========================================================================
   5. EVERY CLAIM CITES A SOURCE
   ======================================================================== */
section("5. Sources and verification");

for (const id of CAPSULES) {
  const loaded = await import(`../../src/data/destinations/capsules/${id}.ts`);
  const capsule = loaded.capsule;
  const validation = validateCapsule(capsule);
  check(`${id}: passes the capsule validator`, validation.ok,
    validation.errors[0] ?? `${validation.counts.places} places, ${validation.counts.sources} sources`);

  const items = [...capsule.places, ...capsule.experiences, ...capsule.history, ...capsule.stories];
  check(`${id}: every item cites at least one source`,
    items.every((item) => item.sourceIds.length > 0), `${items.length} items`);
  check(`${id}: every source resolves to a link and a retrieval method`,
    capsule.sources.every((source) => /^https?:\/\//.test(source.url) && source.retrievalMethod),
    `${capsule.sources.length} sources`);
  check(`${id}: no source is model-proposed`,
    capsule.sources.every((source) => source.retrievalMethod !== "model-proposed"));
  /*
 * PHASE B raised the contract: 10-20 catalogued places, up to 15 dated events
 * and up to 15 stories. Still bounded on both sides — the upper bound is what
 * keeps a "capsule" from quietly becoming an unreviewed archive, and the lower
 * one is what keeps it from thinning out.
 */
  check(`${id}: within the capsule size limits`,
    capsule.places.length >= 5 && capsule.places.length <= 20 &&
      capsule.history.length <= 15 && capsule.stories.length <= 15,
    `${capsule.places.length} places, ${capsule.history.length} history, ${capsule.stories.length} stories`);

  const discover = await get(`${BASE}/destinations/${id}/discover`);
  check(`${id}: the discovery page publishes its citations`,
    /Where this comes from/.test(text(discover.body)) &&
      hrefsOf(discover.body).some((href) => href.startsWith("https://en.wikipedia.org/")));
}

/* ========================================================================
   6-7. PLANNER AND DISCOVERY
   ======================================================================== */
section("6-7. Planner and discovery");

for (const id of CAPSULES) {
  const plan = await get(`${BASE}/destinations/${id}/plan`);
  const stops = [...mainOf(plan.body).matchAll(/<h4[^>]*>[\s\S]*?>([^<]+)<\/a>/g)].map((m) => m[1]);
  check(`${id}: the planner builds an itinerary`, plan.status === 200 && stops.length > 0,
    `${stops.length} stops`);
  check(`${id}: the plan states no travel time or price`,
    !/\b\d+\s?(min|mins|hours?)\b[^.]{0,20}\b(drive|away)\b/i.test(text(plan.body)) &&
      !/(₹|\bRs\.?\s?\d)/.test(text(plan.body)));

  const discover = await get(`${BASE}/destinations/${id}/discover`);
  const cards = [...mainOf(discover.body).matchAll(/<h3[^>]*>[\s\S]*?>([^<]+)<\/a>/g)].length;
  check(`${id}: discovery renders its records`, discover.status === 200 && cards > 0, `${cards} cards`);
  /*
   * The page states "N of the 10 interests are offered here" only when N < 10
   * — its own comment calls "10 of the 10" noise rather than honesty. Kochi
   * became the first capsule to carry all ten, and this check, which assumed
   * every capsule is partial, failed on a destination getting BETTER.
   *
   * Both states are valid; what must never happen is a destination offering an
   * interest no record carries. So: either the shortfall sentence is present,
   * or all ten labels are.
   */
  const discoverText = text(discover.body);
  const ALL_LABELS = [
    "Architecture", "Art", "Culture", "Food", "Heritage",
    "History", "Museums", "Nature", "Local life", "Religious heritage",
  ];
  const offersAll = ALL_LABELS.every((label) => discoverText.includes(label));
  check(`${id}: offers only interests it can satisfy`,
    /of the 10\s+interests this system knows about/.test(discoverText) || offersAll,
    offersAll ? "carries all ten" : "states its shortfall");
}

/* Cross-destination pin: a Sikkim id must not enter a capsule's plan. */
const crossPin = await get(`${BASE}/destinations/delhi/plan?pin=site:rumtek`);
check("A Sikkim experience id is refused by a capsule's planner",
  crossPin.status === 200 && !/Rumtek/.test(text(crossPin.body)));

/* ========================================================================
   8. MISSING DATA STAYS MISSING
   ======================================================================== */
section("8. Honest absence");

let noCoordinate = 0;
let noPhotograph = 0;
for (const id of CAPSULES) {
  const loaded = await import(`../../src/data/destinations/capsules/${id}.ts`);
  noCoordinate += loaded.capsule.places.filter((place) => !place.coordinates).length;
  noPhotograph += loaded.capsule.places.filter((place) => !place.image).length;
}
check("Some places genuinely have no coordinate, and none was invented",
  noCoordinate > 0, `${noCoordinate} places without one`);
check("Some places genuinely have no photograph, and none was borrowed",
  noPhotograph > 0, `${noPhotograph} places without one`);

const withoutPhoto = await get(`${BASE}/destinations/mumbai/discover`);
check("A place with no photograph says so rather than showing another",
  /No verified photograph/.test(text(withoutPhoto.body)) || noPhotograph === 0);

/*
 * A HISTORICAL COST IS NOT A TOURISM PRICE.
 *
 * Phase B's larger place lists brought in two sourced sentences with currency
 * in them: the Taj Mahal "completed in 1653 at a cost estimated at the time to
 * be around ₹32 million", and a 2006 renovation of the Hawa Mahal. Neither is
 * something a traveller pays, and flagging them would be the same mistake as
 * reading "opening hours are not verified" as fabricated opening hours.
 *
 * The rule is the one `qa:release` settled on: currency is a practical claim
 * only when it stands next to a practical word. A ticket price would still
 * fail; a seventeenth-century construction budget does not.
 */
const PRACTICAL_WORD = /\b(?:ticket|entry|admission|fee|room|night|booking|fare|rate)\b/i;
const FABRICATION = [
  [/\b\d{1,2}[:.]\d{2}\s*[-]\s*\d{1,2}[:.]\d{2}/, "opening hours", false],
  [/(₹|\bRs\.?\s?\d|\bINR\b)/, "a practical price", true],
  [/\bmost beautiful\b|\bmust[- ]see\b|\bbest place\b|\bworld[- ]famous\b|\bnumber one\b/i, "a ranking claim", false],
];
for (const [pattern, what, needsPracticalWord] of FABRICATION) {
  const hits = [];
  for (const id of CAPSULES) {
    const body = text((await get(`${BASE}/destinations/${id}/discover`)).body);
    /* Quoted source text is excluded: these pages quote their sources, and a
       source's own words are not the product's claim. */
    const authored = body.replace(/"[^"]*"/g, " ");
    const found = pattern.exec(authored);
    if (!found) continue;
    if (needsPracticalWord) {
      const window = authored.slice(Math.max(0, found.index - 80), found.index + 80);
      if (!PRACTICAL_WORD.test(window)) continue;
    }
    hits.push(id);
  }
  check(`No capsule page states ${what}`, hits.length === 0, hits.join(", ") || "clean");
}

/* ========================================================================
   9. SIKKIM IS UNCHANGED
   ======================================================================== */
section("9. Sikkim regression");

const BASELINE = { monasteries: 15, stories: 70, history: 26, places: 38, archive: 78 };
for (const [name, expected] of Object.entries(BASELINE)) {
  const actual = htmlCount(join(OUT, "sikkim", name));
  check(`Sikkim's ${name} count is unchanged`, actual === expected, `${actual} (baseline ${expected})`);
}
check("Sikkim's own places still have their pages",
  (await get(`${BASE}/destinations/sikkim/places/tsomgo-lake`)).status === 200);
check("Sikkim's own stories still have their pages",
  (await get(`${BASE}/destinations/sikkim/stories/the-dharma-kings`)).status === 200);

/* ========================================================================
   10. GLOBAL SURFACES
   ======================================================================== */
section("10. Global surfaces");

const globalDiscover = await get(`${BASE}/discover?interests=heritage`);
const matched = text(globalDiscover.body);
check("Capsule destinations appear in interest-first discovery",
  CAPSULES.filter((id) => matched.toLowerCase().includes(id.replace("-", " "))).length >= 5,
  CAPSULES.filter((id) => matched.toLowerCase().includes(id.replace("-", " "))).join(", "));
check("They are described as what each offers, not ranked",
  /how much each destination actually offers/i.test(matched) && !/\bbest\b|\bmost beautiful\b/i.test(matched));

const compare = await get(`${BASE}/destinations/compare?ids=sikkim,delhi,agra`);
check("Capsule destinations can be compared", compare.status === 200 &&
  /Delhi/.test(text(compare.body)) && /Agra/.test(text(compare.body)));
check("The comparison still shows absence as unavailable",
  /Not yet available/.test(text(compare.body)));

const searchIndex = await get(`${BASE}/api/search-index`);
const index = searchIndex.status === 200 ? JSON.parse(searchIndex.body) : [];
const capsuleGroups = index.filter((group) => CAPSULES.includes(group.destinationId));
/*
 * PHASE B: a destination may own MORE than one group. Jaipur and Kyoto hold
 * both a capsule and published research, and each contributes its own records
 * — two ways of knowing a place, two groups, both correctly attributed. What
 * must hold is that every capsule destination owns at least one.
 */
const owners = new Set(capsuleGroups.map((group) => group.destinationId));
check("Every capsule destination owns at least one search group",
  CAPSULES.every((id) => owners.has(id)),
  CAPSULES.filter((id) => !owners.has(id)).join(", ") ||
    `${capsuleGroups.length} groups across ${owners.size} destinations`);
check("A capsule's search entries point only at that destination",
  capsuleGroups.every((group) =>
    group.items.every((item) => item.href.startsWith(`/destinations/${group.destinationId}`)),
  ));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
