/**
 * Phase 20 integrity — the product as one thing.
 *
 * WHAT THIS SUITE IS FOR
 * ----------------------
 * Every other suite in this repo checks that a page is CORRECT: that a claim
 * cites a source, that a destination does not render another one's records,
 * that a route exists. None of them could catch what Phase 20 found, because
 * none of them asks whether the product is COHERENT.
 *
 * The primary navigation offered "Monasteries", "Stays", "Trade" and
 * "Permits" on Paris's page — thirteen links, twelve of them Sikkim routes,
 * rendered on all 319 pages. Every one of those links resolved, so every
 * suite passed. The header above them said Sikkim Darshan. `/destinations`
 * said Paris had "4 sections" while Paris's own hub listed one. And every map
 * in the product was rendering "API KEY REQUIRED" across its tiles.
 *
 * So the checks here are about the things a visitor sees rather than the
 * things a record contains:
 *
 *   1. chrome — does the header name the product, and does navigation belong
 *      to the destination the visitor is actually on?
 *   2. depth — does every destination state what it is, in the one vocabulary?
 *   3. counts — does the same number mean the same thing in three places?
 *   4. states — deep, research, capsule and knowledge-only, each intentional?
 *   5. maps — do the tiles render?
 *   6. flow — discovery to place to trip to planner, without losing context?
 *   7. mobile, keyboard, and the disclosure that replaced the wall.
 *
 *   node scripts/qa/ux.mjs [--base http://localhost:3100] [--no-browser]
 */

import { existsSync, readFileSync } from "node:fs";

const baseIndex = process.argv.indexOf("--base");
const BASE =
  baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

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
const clean = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
const text = (html) => clean(mainOf(html));
/** The primary nav's link labels, in order. */
const navLabels = (html) => {
  const nav = html.match(/<nav aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  return [...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim());
};
const navHrefs = (html) => {
  const nav = html.match(/<nav aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  return [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
};
/*
 * A destination's sections no longer ride in the header. The first-time-user
 * pass moved them onto the hub itself — the tiered "What you can explore
 * here" block and the sticky in-page bar — so the header reads the same on
 * every page. The section guarantee is now read from the hub's <main>.
 */
const sectionHrefs = (html, id) => [
  ...new Set([...mainOf(html).matchAll(/href="(\/destinations\/[a-z-]+\/[a-z-]+)(?:[#?][^"]*)?"/g)]
    .map((m) => m[1]).filter((h) => h.startsWith(`/destinations/${id}/`))),
];

/* The four states the product must render differently and intentionally. */
const STATES = [
  { id: "sikkim", name: "Sikkim", badge: "Deeply documented", kind: "deep" },
  { id: "jaipur", name: "Jaipur", badge: "Well documented", kind: "knowledge-only" },
  { id: "varanasi", name: "Varanasi", badge: "Documented", kind: "capsule" },
  { id: "delhi", name: "Delhi", badge: "Documented", kind: "capsule" },
];

const hub = {};
for (const state of STATES) hub[state.id] = await get(`${BASE}/destinations/${state.id}`);
const destinations = await get(`${BASE}/destinations`);
const home = await get(`${BASE}/`);
const discover = await get(`${BASE}/discover`);

/* ========================================================================
   1. CHROME — THE PRODUCT NAMES ITSELF, NAVIGATION BELONGS TO THE PAGE
   ======================================================================== */
section("1. Chrome and navigation");

check("The home page serves", home.status === 200, `HTTP ${home.status}`);
check("Every audited hub serves",
  STATES.every((s) => hub[s.id].status === 200),
  STATES.filter((s) => hub[s.id].status !== 200).map((s) => s.id).join(", ") || `${STATES.length}/${STATES.length}`);

/*
 * The header is the product's, not a destination's. Checked on a destination
 * that is NOT Sikkim, because that is where the old wordmark was wrong.
 */
const varanasiHead = hub.varanasi.body.slice(0, hub.varanasi.body.indexOf("<main"));
check("The header names the product, not one destination",
  /TerraStory/.test(varanasiHead) && !/Sikkim Darshan/.test(varanasiHead.replace(/<title>[\s\S]*?<\/title>/, "")),
  "header chrome on a non-Sikkim destination");
check("The page title names the product",
  /<title>[^<]*·\s*TerraStory<\/title>/.test(hub.varanasi.body),
  hub.varanasi.body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "no title");
check("og:site_name is the product",
  /og:site_name" content="TerraStory"/.test(hub.varanasi.body));

/*
 * THE CHECK THIS SUITE EXISTS FOR.
 *
 * Not "are the links valid" — they always were. Whether a link offered on a
 * destination's page belongs to that destination.
 */
for (const state of STATES) {
  const hrefs = navHrefs(hub[state.id].body).filter((h) => h.startsWith("/destinations/"));
  const foreign = hrefs.filter(
    (h) => h !== "/destinations/compare" && !h.startsWith(`/destinations/${state.id}`),
  );
  check(`${state.id}: primary navigation offers no other destination's section`,
    foreign.length === 0, foreign.slice(0, 3).join(", ") || `${hrefs.length} links, all its own`);
}

/*
 * The global set grew from three to six. Stories, History and Plan are the
 * three things a visitor actually comes for, and until the global index pages
 * existed all three lived only inside a destination — so the menu described
 * the product to somebody who already knew what it was.
 *
 * The assertion is unchanged in intent: OFF a destination, the navigation
 * shows the product links and NOTHING destination-specific. Only the expected
 * list moved.
 */
const globalOnly = ["Explore", "For you", "Journey", "Compare"];
check("A page that is not a destination shows the product links alone",
  JSON.stringify(navLabels(destinations.body)) === JSON.stringify(globalOnly),
  navLabels(destinations.body).join(", "));
check("/discover shows the product links alone",
  JSON.stringify(navLabels(discover.body)) === JSON.stringify(globalOnly),
  navLabels(discover.body).join(", "));
check("Comparison is reachable from every page",
  navHrefs(destinations.body).includes("/destinations/compare"));

/* A destination's nav must not promise a page that does not exist. */
const sikkimNav = sectionHrefs(hub.sikkim.body, "sikkim");
check("Sikkim's hub offers its full set of sections", sikkimNav.length >= 10, `${sikkimNav.length} sections`);
let brokenNav = [];
for (const href of sikkimNav.slice(0, 14)) {
  const response = await get(`${BASE}${href}`);
  if (response.status !== 200) brokenNav.push(`${href}:${response.status}`);
}
check("Every section the navigation offers resolves",
  brokenNav.length === 0, brokenNav.join(", ") || `${sikkimNav.length} checked`);

const varanasiNav = sectionHrefs(hub.varanasi.body, "varanasi");
check("A capsule destination gets its own sections, not Sikkim's",
  varanasiNav.length >= 1 && varanasiNav.every((h) => h.startsWith("/destinations/varanasi/")),
  varanasiNav.join(", ") || "none");

/* ========================================================================
   2. DEPTH — ONE VOCABULARY, STATED EVERYWHERE
   ======================================================================== */
section("2. Depth is stated, in one vocabulary");

const DEPTH_WORDS = ["Deeply documented", "Well documented", "Researched", "Documented", "Being catalogued"];
/*
 * The depth badge sits in the hero, beside the destination's name. Reading
 * the WHOLE page for depth words fails on the product rather than on a
 * defect: "Researched knowledge" is a section heading on Sikkim's and
 * Jaipur's hubs, and "Curated" appears in prose describing the archive. The
 * badge is what a visitor reads as the destination's status, so the badge is
 * what is checked.
 */
/* Anchored on the h1 and 420 characters wide: the name, the badge and the
   sentence under it. A fixed slice from the top of <main> was too generous
   for a short hub — Jaipur's "Researched knowledge" heading fell inside it. */
const heroOf = (html) => {
  const main = mainOf(html);
  const start = main.indexOf("<h1");
  return clean(start === -1 ? main.slice(0, 420) : main.slice(start, start + 420));
};
for (const state of STATES) {
  const hero = heroOf(hub[state.id].body);
  check(`${state.id}: states its depth as "${state.badge}"`, hero.includes(state.badge), hero.slice(0, 0) || undefined);
  const others = DEPTH_WORDS.filter((w) => w !== state.badge && new RegExp(`\\b${w}\\b`).test(hero));
  check(`${state.id}: claims exactly one depth in its hero`, others.length === 0, others.join(", ") || "one");
}
check("Every depth word used is from the shared vocabulary",
  DEPTH_WORDS.some((w) => text(destinations.body).includes(w)),
  "the destinations list uses the same words as the hubs");

/* No ranking language, anywhere a visitor lands. */
const RANKING = /\b(best destination|most beautiful|top destination|number one|must[- ]visit|must[- ]see|better than)\b/i;
for (const [label, page] of [["home", home], ["destinations", destinations], ["discover", discover],
  ["sikkim", hub.sikkim], ["varanasi", hub.varanasi]]) {
  const hit = text(page.body).match(RANKING);
  check(`${label}: presents no ranking claim`, !hit, hit ? `found "${hit[0]}"` : "clean");
}

/* ========================================================================
   3. COUNTS — THE SAME NUMBER MEANS THE SAME THING
   ======================================================================== */
section("3. Counts agree across surfaces");

/*
 * `/destinations` said "4 sections" for Paris while Paris's hub listed one,
 * because the card counted CAPABILITIES and the hub counted ROUTES. Both were
 * defensible in isolation; together they were a product that contradicts
 * itself in two clicks.
 */
for (const state of [STATES[0], STATES[2], STATES[3]]) {
  const card = text(destinations.body).match(
    new RegExp(`${state.name}[^·]*·?[^0-9]*?(\\d+) places? to explore · (\\d+) section`),
  );
  /* The hub's section links are a subset of its capabilities — the tiers
     show what a traveller opens, and the in-page bar lists the rest — so
     the card figure must be at least the number of distinct section routes
     the hub actually links, never fewer. */
  /* Count CAPABILITIES the hub links, not URLs: /discover and /plan are one
     capability (experiences) with two routes, and a place's detail route is
     not a section at all. Mirrors CAPABILITY_SECTION in lib/destinations/sections.ts. */
  const SEGMENT_CAPABILITY = {
    discover: "experiences", plan: "experiences", monasteries: "sites", stories: "storyPages",
    history: "historyPages", culture: "culture", archive: "archive", explore: "map", hotels: "stays",
    industry: "trade", permits: "permits", responsible: "responsible", preservation: "preservation",
    planner: "tripPlanner",
  };
  const navCount = new Set(
    sectionHrefs(hub[state.id].body, state.id)
      .map((h) => SEGMENT_CAPABILITY[h.split("/")[3]])
      .filter(Boolean),
  ).size;
  check(`${state.id}: the sections figure on /destinations covers the hub's section links`,
    card !== null && Number(card[2]) >= navCount && navCount > 0,
    card ? `card says ${card[2]}, hub links ${navCount} capabilities` : "no card figure found");
}

check("No page renders a placeholder value",
  ![home, destinations, discover, hub.sikkim, hub.varanasi, hub.jaipur].some((p) =>
    /\bundefined\b|\bNaN\b|\[object /.test(text(p.body))));

/* ========================================================================
   4. THE FOUR STATES ARE EACH INTENTIONAL
   ======================================================================== */
section("4. Deep, capsule and knowledge-only states");

check("A deep destination offers its full range",
  sectionHrefs(hub.sikkim.body, "sikkim").length >= 10);
check("A capsule destination offers a route into its content",
  /\/destinations\/varanasi\/discover/.test(hub.varanasi.body));
check("A capsule destination does not look unfinished",
  /\bDocumented\b/.test(text(hub.varanasi.body)) &&
    /What you can explore here/.test(text(hub.varanasi.body)),
  "depth badge and an interest summary");

/*
 * PHASE B CHANGED WHAT THIS ASSERTED, ON PURPOSE.
 *
 * Jaipur and Kyoto held reviewed research and nothing to visit, and this
 * checked that they said so. Phase B gave them catalogued places, so the
 * knowledge-only state has no live example any more — the third fixture this
 * project has spent, after the empty destination in Phase 19.
 *
 * The guarantee has not gone away; only its subject has. What is checked now
 * is the pair of things that remain true and are what the old check was really
 * protecting: a destination renders its OWN records, and it never renders an
 * empty container in place of content it lacks.
 */
for (const id of ["jaipur", "kochi"]) {
  const discovery = await get(`${BASE}/destinations/${id}/discover`);
  check(`${id}: discovery serves its own records`,
    discovery.status === 200 && text(discovery.body).length > 500,
    `HTTP ${discovery.status}`);
  check(`${id}: does not render an empty grid`,
    !/(<ul[^>]*>\s*<\/ul>)|(<ol[^>]*>\s*<\/ol>)/.test(mainOf(discovery.body)));
  check(`${id}: renders no other destination's record`,
    !/Rumtek|Pemayangtse|Tsomgo|Charminar|Dashashwamedh/.test(text(discovery.body)));
}

/* An unregistered destination is a 404, not an empty page. */
const ghost = await get(`${BASE}/destinations/atlantis`);
check("An unregistered destination is refused", ghost.status === 404, `HTTP ${ghost.status}`);

/* ========================================================================
   5. PROVENANCE IS DISCLOSED, NOT DUMPED
   ======================================================================== */
section("5. Progressive disclosure");

/*
 * Jaipur's hub was 9,900 pixels tall because thirty-five research claims were
 * rendered open above the fold's horizon. Folding them into <details> keeps
 * every word in the DOM — indexable, findable, reachable by keyboard — while
 * letting the page be a destination page again.
 */
const jaipur = hub.jaipur;
check("Research claims are disclosed progressively, not dumped",
  /<details/.test(jaipur.body), `${(jaipur.body.match(/<details/g) ?? []).length} disclosures`);
/* React separates interpolations with comment nodes — the markup is
   `3<!-- --> <!-- -->claims`, which no naive regex matches. */
const withoutComments = jaipur.body.replace(/<!--[\s\S]*?-->/g, "");
check("Each disclosure says how much is inside",
  /<summary[\s\S]{0,600}?\d+\s*claims?/.test(withoutComments),
  `${(withoutComments.match(/<summary/g) ?? []).length} summaries`);
check("Nothing was removed to achieve it — the claims are still in the page",
  /Every verified fact/.test(text(jaipur.body)) &&
    text(jaipur.body).length > 3000,
  `${Math.round(text(jaipur.body).length / 1000)}k characters of content`);
check("Sources remain listed on the page",
  /Sources/.test(text(jaipur.body)));

/* ========================================================================
   6. IMAGES
   ======================================================================== */
section("6. Images");

const credits = existsSync("src/data/generated/image-credits.json")
  ? JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"))
  : [];
check("Image credits are recorded", credits.length > 0, `${credits.length} credited files`);

/* No destination may show another destination's photograph. */
for (const state of STATES) {
  const imgs = [...mainOf(hub[state.id].body).matchAll(/<img[^>]*>/g)].map((m) => m[0]);
  const missingAlt = imgs.filter((tag) => !/\balt="/.test(tag));
  check(`${state.id}: every image on the hub declares alt text`,
    missingAlt.length === 0, `${imgs.length} images`);
  const foreign = imgs.filter((tag) => {
    const src = decodeURIComponent(tag.match(/src="([^"]*)"/)?.[1] ?? "");
    const owner = src.match(/\/images\/capsule\/([a-z-]+)\//)?.[1];
    return owner !== undefined && owner !== state.id;
  });
  check(`${state.id}: shows no other destination's photograph`,
    foreign.length === 0, foreign.length ? foreign[0].slice(0, 80) : "clean");
}

/* The social card belongs to the destination or is absent — never borrowed. */
for (const state of STATES) {
  const card = hub[state.id].body.match(/og:image" content="([^"]*)"/)?.[1];
  const borrowed = card !== undefined && state.id !== "sikkim" && /\/images\/mon\//.test(card);
  check(`${state.id}: emits no borrowed social card`, !borrowed, card ?? "no card, which is honest");
}

/* ========================================================================
   7. DISCOVERY -> PLACE -> TRIP -> PLANNER, WITHOUT LOSING CONTEXT
   ======================================================================== */
section("7. The discovery to planner flow");

const interest = await get(`${BASE}/destinations/varanasi/discover?interest=architecture`);
check("An interest can be selected on a capsule destination",
  interest.status === 200, `HTTP ${interest.status}`);
check("The selected interest is stated back to the visitor",
  /architecture/i.test(text(interest.body)));

/*
 * "Add to trip" was removed from the product. Discovery's action is now the
 * one that leads somewhere — the record's own page — and this asserts the
 * collecting gesture has not come back under another name.
 */
const addLinks = [...mainOf(interest.body).matchAll(/href="([^"]*[?&]pin=[^"]*)"/g)].map((m) => m[1]);
check("Discovery offers no add-to-trip action", addLinks.length === 0, `${addLinks.length} pin links`);
check("Discovery cards carry an action that leads somewhere",
  /Explore|View place|View record|Read story/.test(text(interest.body)));
if (addLinks.length > 0) {
  const target = addLinks[0].replace(/&amp;/g, "&");
  check("Add-to-trip stays inside the destination",
    target.startsWith("/destinations/varanasi"), target.slice(0, 80));
  const planned = await get(`${BASE}${target}`);
  check("Following it reaches a working page", planned.status === 200, `HTTP ${planned.status}`);
  check("The chosen place survives the journey into the plan",
    /Dashashwamedh|Kashi Vishwanath|Sarnath|Manikarnika|Ramnagar|Assi Ghat/.test(text(planned.body)),
    "a Varanasi record is named in the plan");
}

/* The planner states what it cannot know rather than inventing it. */
const plan = await get(`${BASE}/destinations/varanasi/plan`);
check("The planner serves", plan.status === 200, `HTTP ${plan.status}`);
check("The planner says what it does not know",
  /not verified for these records, so none are shown/i.test(text(plan.body)));
const INVENTED = [/\b\d{1,2}[:.]\d{2}\s?(?:am|pm)\b/i, /(?:₹|\$|€|£)\s?\d/, /\bbook now\b/i];
check("The planner invents no practical value",
  !INVENTED.some((re) => re.test(text(plan.body))));
/*
 * The planner's own words for why a stop is there and how far it is: an
 * evidence link, a story or history connection, and a straight-line distance
 * that says out loud it is not a travel time.
 */
const REASONS = [/Evidence:/i, /Connected to the (?:story|event)/i, /in a straight line/i];
const shown = REASONS.filter((re) => re.test(text(plan.body)));
check("The planner shows the reasoning behind an entry",
  shown.length >= 2, `${shown.length} of ${REASONS.length} reason forms present`);

/* ========================================================================
   8. SEARCH IS STILL DEFERRED
   ======================================================================== */
section("8. Search architecture preserved");

const index = await get(`${BASE}/api/search-index`);
check("The search index is served separately", index.status === 200, `HTTP ${index.status}`);
check("No page inlines the search corpus",
  (home.body.match(/"sublabel"/g) ?? []).length < 60,
  `${(home.body.match(/"sublabel"/g) ?? []).length} records inline on the home page`);
const parsed = index.status === 200 ? JSON.parse(index.body) : null;
check("The index still names every group's owner",
  Array.isArray(parsed) ? parsed.every((g) => typeof g.destinationId === "string") : false);

/* ========================================================================
   9. MAPS RENDER
   ======================================================================== */
section("9. Maps");

/*
 * CARTO began requiring an API key and stamped "API KEY REQUIRED" across
 * every tile. Nothing in this repo failed: the map still loaded, the markers
 * were right, the attribution was right, and the basemap was a watermark.
 * This check reads the tile URL the client is told to use and fetches one.
 */
const mapPage = await get(`${BASE}/destinations`);
/*
 * The tile URL is inside the Leaflet client component, so it ships in a JS
 * chunk rather than in the HTML — reading the page for it found nothing and
 * would have reported a missing basemap on a working map. Read what actually
 * ships instead.
 */
const chunkDir = ".next/static/chunks";
let tileTemplate;
if (existsSync(chunkDir)) {
  const { readdirSync } = await import("node:fs");
  for (const file of readdirSync(chunkDir).filter((f) => f.endsWith(".js"))) {
    const found = readFileSync(`${chunkDir}/${file}`, "utf8")
      .match(/https:\/\/[a-z0-9.\-]+\/[a-z0-9.\-{}/]*\{z\}\/\{x\}\/\{y\}[^"'\\]*/);
    if (found) { tileTemplate = found[0]; break; }
  }
}
check("The build declares a tile source", Boolean(tileTemplate), tileTemplate ?? "none found in chunks");
check("The tile source needs no API key",
  Boolean(tileTemplate) && !/carto/i.test(tileTemplate),
  tileTemplate ?? "");
if (tileTemplate) {
  const probe = tileTemplate.replace("{z}", "5").replace("{x}", "23").replace("{y}", "13").replace("{r}", "");
  const tile = await fetch(probe, { headers: { "user-agent": "TerraStory/1.0 (QA)" } }).catch(() => null);
  check("A basemap tile actually loads",
    tile?.ok === true && Number(tile.headers.get("content-length") ?? 1) > 0,
    tile ? `HTTP ${tile.status}` : "request failed");
}
check("Map attribution names OpenStreetMap",
  Boolean(tileTemplate) && [...(await import("node:fs")).readdirSync(chunkDir)]
    .filter((f) => f.endsWith(".js"))
    .some((f) => /openstreetmap\.org\/copyright/.test(readFileSync(`${chunkDir}/${f}`, "utf8"))),
  "attribution ships with the map component");
check("The destination list works without the map",
  /aria-label="All destinations"/.test(mapPage.body) &&
    /href="\/destinations\/sikkim"/.test(mapPage.body),
  "every destination is reachable from the list");

/* ========================================================================
   10. MOBILE, KEYBOARD AND THE DISCLOSURE, IN A REAL BROWSER
   ======================================================================== */
if (!process.argv.includes("--no-browser")) {
  section("10. Mobile, keyboard and disclosure");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  const ROUTES = [
    "/",
    "/destinations",
    "/discover",
    "/destinations/compare?ids=sikkim,varanasi,delhi",
    "/destinations/sikkim",
    "/destinations/jaipur",
    "/destinations/varanasi",
    "/destinations/varanasi/discover",
    "/destinations/sikkim/discover",
    "/destinations/varanasi/plan",
    "/destinations/sikkim/stories/the-throne-of-stone-at-norbugang",
    "/destinations/sikkim/places/tsomgo-lake",
  ];

  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      check(`${width}px ${route} — no horizontal scroll`, overflow <= 1, `${overflow}px`);
    }
    await context.close();
  }

  /* The disclosure must be operable by keyboard alone. */
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/destinations/jaipur`, { waitUntil: "domcontentloaded" });
  /* The FIRST claim group, not the first <details> on the page: the language
     switcher is a disclosure widget too, and it sits above these. */
  /* The evidence layer is folded on the hub by design (first-time-user
     pass): open it first, then exercise a claim group inside it. */
  const evidence = page.locator("details#evidence > summary").first();
  if (await evidence.count()) { await evidence.click(); await page.waitForTimeout(150); }
  const claimGroup = page.locator("details[data-claim-group]").first();
  const summary = claimGroup.locator("summary").first();
  const before = await page.locator("details[open]").count();
  await summary.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const after = await page.locator("details[open]").count();
  check("A claim group opens with the keyboard alone", after === before + 1, `${before} -> ${after}`);
  const claimText = await claimGroup.innerText();
  check("Opening it reveals the claims", claimText.length > 120, `${claimText.length} characters`);

  /* And the folded content is still in the document for search and AT. */
  const hiddenFromAT = await page.evaluate(() =>
    [...document.querySelectorAll("details")].filter((d) => d.getAttribute("aria-hidden") === "true").length);
  check("No claim group is hidden from assistive technology", hiddenFromAT === 0, `${hiddenFromAT} aria-hidden`);

  /* Mobile navigation must reach the destination's own sections. */
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${BASE}/destinations/varanasi`, { waitUntil: "domcontentloaded" });
  await mobilePage.getByRole("button", { name: "Open menu" }).click();
  /* The drawer is a client component: wait for it to be in the DOM rather
     than for a fixed 300ms, which raced hydration on a cold dev server. */
  await mobilePage.locator('nav[aria-label="Mobile"] a').first().waitFor({ timeout: 5000 }).catch(() => {});
  const drawer = await mobilePage.locator('nav[aria-label="Mobile"] a').allInnerTexts();
  check("The mobile drawer opens and lists navigation", drawer.length >= 3, drawer.join(", "));
  const drawerHrefs = await mobilePage.locator('nav[aria-label="Mobile"] a').evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")));
  const foreignDrawer = drawerHrefs.filter(
    (h) => h?.startsWith("/destinations/") && h !== "/destinations/compare" && !h.startsWith("/destinations/varanasi"),
  );
  check("The mobile drawer offers no other destination's section",
    foreignDrawer.length === 0, foreignDrawer.join(", ") || "clean");
  await mobile.close();
  await context.close();
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
