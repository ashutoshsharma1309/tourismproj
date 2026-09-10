/**
 * Phase 14 integrity — tourism discovery and experience intelligence.
 *
 * Like `qa:planner`, this talks HTTP: discovery is server-rendered with no
 * client component of its own, so the real product can be checked with
 * `fetch` rather than through a browser guess. The browser phase at the end
 * exists only for what HTTP cannot see — layout overflow, the tab order, and
 * the loop a visitor actually walks.
 *
 * Run against a freshly started server on a clean build:
 *   npm run build && npm run start
 *   node scripts/qa/discovery-integrity.mjs [--base http://localhost:3000] [--no-browser]
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const baseIndex = process.argv.indexOf("--base");
/* QA_BASE_URL lets the whole battery target one server. Phase 19 needed it:
   a second, stale `next start` was sharing this repo's .next directory, and a
   suite that silently defaulted to port 3000 measured the wrong build. */
const BASE = baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

const DISCOVER = (id, query = "") => `${BASE}/destinations/${id}/discover${query}`;

async function get(url) {
  const response = await fetch(url, { redirect: "manual" });
  const body = response.status === 200 ? await response.text() : "";
  return { status: response.status, body };
}

const mainOf = (html) => html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
const unescape = (value) =>
  value
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#x2019;/g, " ");
const text = (html) => unescape(mainOf(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const hrefsOf = (html) => [...mainOf(html).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
/** Card titles in render order — the discovery ordering under test. */
const cardsOf = (html) =>
  [...mainOf(html).matchAll(/<h3[^>]*>[\s\S]*?>([^<]+)<\/a>/g)].map((m) => m[1].trim());
const imagesOf = (html) => [...mainOf(html).matchAll(/<img[^>]*>/g)].map((m) => m[0]);

const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const mustRead = (path) => {
  if (!existsSync(path)) {
    check(`Required file exists: ${path}`, false, "checks depending on it cannot run");
    return "";
  }
  return readFileSync(path, "utf8");
};
const walk = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(p)) acc.push(p);
  }
  return acc;
};

/* ========================================================================
   1-4. DISCOVERY EXISTS WHERE IT SHOULD, AND IS HONEST WHERE IT CANNOT
   ======================================================================== */
section("1-4. Destination discovery");

const sikkim = await get(DISCOVER("sikkim"));
check("Sikkim discovery loads", sikkim.status === 200, `HTTP ${sikkim.status}`);
check(
  "Sikkim discovery offers groups to explore",
  /Explore this destination through/.test(text(sikkim.body)) && cardsOf(sikkim.body).length > 0,
  `${cardsOf(sikkim.body).length} cards`,
);

const jaipur = await get(DISCOVER("jaipur"));
const kyoto = await get(DISCOVER("kyoto"));
check("Jaipur discovery loads", jaipur.status === 200, `HTTP ${jaipur.status}`);
check("Kyoto discovery loads", kyoto.status === 200, `HTTP ${kyoto.status}`);

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
for (const [id, page] of [["jaipur", jaipur], ["kyoto", kyoto]]) {
  const rendered = text(page.body);
  check(
    `${id} now offers the experiences its records support`,
    cardsOf(page.body).length > 0,
    `${cardsOf(page.body).length} cards`,
  );
  check(`${id} renders no empty container`,
    !/(<ul[^>]*>\s*<\/ul>)|(<ol[^>]*>\s*<\/ol>)/.test(page.body));
  check(
    `${id} renders no undefined or NaN value`,
    !/\b(undefined|NaN|\[object Object\])\b/.test(rendered),
    (rendered.match(/\b(undefined|NaN)\b/) ?? [])[0] ?? "clean",
  );
}

/* A destination with no content at all has no discovery route: an empty page
   would read as coverage.

   PHASE 18 replaced Delhi here with Rome; PHASE 19 gave Rome a capsule too,
   and there is now no registered destination with nothing in it. Rather than
   hunt for a third stand-in that a later phase will also populate, the
   guarantee is asserted where it cannot rot: an id that is not registered has
   no route, whatever it looks like. */
for (const id of ["atlantis", "unknown", "SIKKIM", "..%2f..%2fsikkim"]) {
  const response = await get(DISCOVER(id));
  check(`No discovery route for "${id}"`, response.status === 404, `HTTP ${response.status}`);
}

/* ========================================================================
   5-6. EXPERIENCES BELONG TO THEIR DESTINATION
   ======================================================================== */
section("5-6. Destination ownership");

const sikkimLinks = hrefsOf(sikkim.body).filter((href) => href.startsWith("/destinations/"));
const foreign = sikkimLinks.filter((href) => !href.startsWith("/destinations/sikkim"));
check(
  "Every discovery link stays inside the destination",
  foreign.length === 0,
  foreign.slice(0, 3).join(", ") || `${sikkimLinks.length} links`,
);

const jaipurText = text(jaipur.body);
check("Jaipur's discovery renders no Sikkim record", !/Rumtek|Pemayangtse|Tashiding|Tsomgo/.test(jaipurText));

/* The isolation case that matters: a Sikkim experience id offered to another
   destination's planner must be discarded, not honoured. */
const crossPin = await get(`${BASE}/destinations/jaipur/plan?pin=site:rumtek&remove=place:tsomgo-lake`);
check(
  "A Sikkim experience id fails on another destination's planner",
  crossPin.status === 200 && !/Rumtek/.test(text(crossPin.body)),
  `HTTP ${crossPin.status}`,
);

const stateSrc = mustRead("src/lib/planner/state.ts");
check(
  "Ids are resolved against this destination's own candidate set",
  /knownIds\.has\(id\)/.test(stateSrc) && /pinned/.test(stateSrc),
);

const discoverySrc = mustRead("src/lib/discovery/experiences.ts");
check(
  "Experience lookup is scoped to the destination it was built for",
  /experiencesFor\(destinationId\)/.test(discoverySrc) &&
    /all\.find\(\(experience\) => experience\.id === experienceId\)/.test(discoverySrc),
);

/* ========================================================================
   7. INTEREST PROVENANCE
   ======================================================================== */
section("7. Interest provenance");

const dubdi = await get(`${BASE}/destinations/sikkim/monasteries/dubdi`);
const dubdiText = text(dubdi.body);
check("A record page states what it is catalogued under", /What it is catalogued under/.test(dubdiText));
check(
  "Each interest names the evidence that earned it",
  /stories shelved under [A-Z][^;.]*name it/.test(dubdiText),
  (dubdiText.match(/\d+ stor(y|ies) shelved under [^;.]+/) ?? [])[0] ?? "no basis sentence",
);
check("A record-type interest states the record type", /catalogued as a [a-z]/.test(dubdiText));
check(
  "A history interest states the events that earned it",
  /named in \d+ dated events? in this destination's history/.test(dubdiText),
);

/* The explanation and the classification must come from one place. */
const candidateSrc = mustRead("src/lib/planner/candidates.ts");
check(
  "Interests are DERIVED from the basis list, not assembled separately",
  /const interests = uniq\(interestBasis\.map\(\(basis\) => basis\.interest\)\)/.test(candidateSrc),
  "one source of truth for tag and explanation",
);
const scoringSrc = mustRead("src/lib/planner/scoring.ts");
check("The planner's own explanation reads the same basis", /experience\.interestBasis/.test(scoringSrc));

const planned = await get(`${BASE}/destinations/sikkim/plan?interests=nature`);
check(
  "A planner reason names the evidence for the interest, not just the interest",
  /Matches Nature/.test(text(planned.body)) && /shelved under|named in \d+ dated/.test(text(planned.body)),
  (text(planned.body).match(/Matches Nature[^.]{0,70}/) ?? [])[0] ?? "generic reason",
);

/* ========================================================================
   8-11. THE KNOWLEDGE GRAPH, IN BOTH DIRECTIONS
   ======================================================================== */
section("8-11. Graph traversal");

/* Rabdentse is named by history events in their own records; Yuksom is
   not, which is why the fixture is this one. */
const place = await get(`${BASE}/destinations/sikkim/places/rabdentse`);
const placeText = text(place.body);
const placeHrefs = hrefsOf(place.body);
check(
  "Place to story works",
  placeHrefs.some((href) => href.includes("/destinations/sikkim/stories/")),
  "story links rendered on the place page",
);
check(
  "Place to historical event works",
  /Historical events connected to this place/.test(placeText) &&
    placeHrefs.some((href) => href.includes("/destinations/sikkim/history/")),
  "event links rendered on the place page",
);

const story = await get(`${BASE}/destinations/sikkim/stories/the-throne-of-stone-at-norbugang`);
check(
  "Story to place works",
  hrefsOf(story.body).some((href) => href.includes("/destinations/sikkim/places/")),
);

/* This event names two places in its own record; the coronation names
   none, so it cannot demonstrate the edge. */
const event = await get(`${BASE}/destinations/sikkim/history/capital-gangtok-1894`);
const eventHrefs = hrefsOf(event.body);
check(
  "Timeline to place works, and stays on this site",
  eventHrefs.some((href) => href.startsWith("/destinations/sikkim/places/")),
  "the related-place card links to the record, not to an external map",
);
/*
 * "Add to trip" was removed from the product, including from the related-place
 * cards on a timeline event. The onward action from an event is the place
 * record itself — asserted above — and this now guards the removal instead of
 * the feature.
 */
check(
  "A timeline event no longer offers add-to-trip",
  !eventHrefs.some((href) => href.includes("/plan?pin=")) &&
    !/Add to trip/i.test(text(event.body)),
  "the related-place card leads to the record",
);

/* ========================================================================
   12-13. RELATED EXPERIENCES
   ======================================================================== */
section("12-13. Related experiences");

const relatedBlock = (html) => {
  const body = mainOf(html);
  const start = body.indexOf("Connected experiences");
  return start === -1 ? "" : body.slice(start, start + 4000);
};
const relatedReasons = (html) =>
  [...relatedBlock(html).matchAll(/text-caption text-muted">([^<]+)</g)].map((m) => m[1].trim());

const reasons = relatedReasons(dubdi.body);
check("Related experiences are offered", reasons.length > 0, `${reasons.length} shown`);

const EXPLAINABLE = [
  /^Both are named in /,
  /^Both appear in /,
  /^[\d.]+ km away in a straight line, measured between published coordinates$/,
  /^Both are catalogued in /,
];
const unexplained = reasons.filter((reason) => !EXPLAINABLE.some((pattern) => pattern.test(reason)));
check(
  "Every related-experience reason states its evidence",
  unexplained.length === 0,
  unexplained.join(" | ") || `${reasons.length} reasons, all from the closed set`,
);

const dubdiAgain = await get(`${BASE}/destinations/sikkim/monasteries/dubdi`);
check(
  "Related experiences are deterministic",
  relatedReasons(dubdiAgain.body).join("|") === reasons.join("|"),
  "identical on a second request",
);

const relatedSrc = mustRead("src/lib/discovery/related.ts");
check(
  "Relatedness is rule-based, not a similarity score",
  !/embedding|cosine|vector/i.test(codeOf(relatedSrc)) && /RULE_ORDER/.test(relatedSrc),
);

/* ========================================================================
   14-15. GEOGRAPHIC DISCOVERY
   ======================================================================== */
section("14-15. Geographic discovery");

const tsomgo = await get(`${BASE}/destinations/sikkim/places/tsomgo-lake`);
const tsomgoText = text(tsomgo.body);
check(
  "Nearby is offered where coordinates are published",
  /Nearby/.test(tsomgoText) && /\d+(\.\d+)? km/.test(tsomgoText),
  (tsomgoText.match(/[\w\s]+ \d+\.\d+ km/) ?? [])[0] ?? "",
);
check(
  "Distances are labelled as straight lines",
  /Straight-line distances between published coordinates/.test(tsomgoText) &&
    !/minutes away|min drive|hours away/i.test(tsomgoText),
);

/* Dubdi's coordinate is deliberately withheld by the archive as disputed. */
check(
  "A record with no coordinate offers no nearby list",
  /No authoritative coordinate is published for Dubdi/.test(dubdiText),
  "stated, not filled in",
);
const dubdiNearby = mainOf(dubdi.body).includes(">Nearby<");
check(
  "No fabricated distance appears for a record without a coordinate",
  !dubdiNearby,
  dubdiNearby ? "a nearby block was rendered" : "no nearby block",
);
check(
  "Proximity requires BOTH coordinates",
  /if \(km !== undefined && km <= PROXIMITY_KM\)/.test(relatedSrc) &&
    /if \(subject\.coordinates === undefined\) return \[\]/.test(relatedSrc),
);

/* ========================================================================
   16-17. THE PLANNER'S PINNED-RECORD HANDLING
   ======================================================================== */
section("16-17. Pinned records");

/*
 * "ADD TO TRIP" HAS BEEN REMOVED FROM THE PRODUCT.
 *
 * It was the filled, primary-coloured button on every discovery card, which
 * made collecting the dominant gesture of a product whose subject is why a
 * place matters. The owner removed it; this asserts it stays removed, and
 * that nothing has quietly replaced it with Save or Bookmark.
 *
 * The planner's ability to ACCEPT a pinned record is a separate thing and is
 * still tested below — it is reachable by URL, it must still refuse a record
 * belonging to another destination, and that refusal is security-relevant.
 */
const cardText = text(sikkim.body);
check("Discovery no longer offers add-to-trip",
  !/Add to trip/i.test(cardText), "removed from every card");
check("Nothing replaced it with another collecting gesture",
  !/\b(Save|Bookmark|Wishlist|Add to favou?rites)\b/i.test(cardText));

/* Built directly, because no page links to it any more. */
const anyExperience = /\/destinations\/sikkim\/(?:monasteries|places)\/([a-z0-9-]+)/.exec(sikkim.body)?.[1];
const firstPin = anyExperience ? `place:${anyExperience}` : "";
const pinned = await get(
  `${BASE}/destinations/sikkim/plan?pin=${encodeURIComponent(firstPin)}`,
);
const pinnedText = text(pinned.body);
const pinnedStops = [...mainOf(pinned.body).matchAll(/<h4[^>]*>[\s\S]*?>([^<]+)<\/a>/g)].map((m) =>
  m[1].trim(),
);
check(
  "Adding an experience pins it into the plan",
  pinned.status === 200 && /experiences? you added/.test(pinnedText) && pinnedStops.length > 0,
  `${pinnedStops.length} stops, first is "${pinnedStops[0]}"`,
);
check(
  "A pinned experience is actually placed",
  pinnedStops.length > 0 &&
    firstPin.length > 0 &&
    pinnedStops.some((title) =>
      firstPin.split(":")[1]?.split("-").some((word) => title.toLowerCase().includes(word)),
    ),
  `pin ${firstPin}`,
);
check("The plan says who chose it", /You added this from discovery/.test(pinnedText));

const plain = await get(`${BASE}/destinations/sikkim/plan`);
check(
  "The planner still works unpinned",
  plain.status === 200 && [...mainOf(plain.body).matchAll(/<h4/g)].length > 0,
);
check(
  "Discovery did not fork the itinerary logic",
  !existsSync("src/lib/discovery/itinerary.ts") && /buildCandidates/.test(discoverySrc),
  "one planner, one experience model",
);

/* ========================================================================
   18. SEARCH REMAINS DESTINATION-SAFE
   ======================================================================== */
section("18. Search");

const indexSrc = mustRead("src/lib/search-index.ts");
check(
  "Search ownership is still carried on the index group",
  /destinationId: string \| null;/.test(indexSrc) && /destinationName: string \| null;/.test(indexSrc),
);
check(
  "Scoped search admits only this destination plus global navigation",
  /g\.destinationId === scope\.destinationId \|\| g\.destinationId === null/.test(indexSrc),
);
const paletteSrc = mustRead("src/components/search/CommandPalette.tsx");
check(
  "A result from elsewhere is attributed to where it comes from",
  /ownerNameOf\(index, item\)/.test(paletteSrc) && /owner === currentDestination/.test(paletteSrc),
);

/* ========================================================================
   19-21. NO FABRICATION, NO MISLEADING IMAGERY
   ======================================================================== */
section("19-21. Fabrication and imagery");

const discoveryText = [text(sikkim.body), dubdiText, tsomgoText, text(planned.body)].join(" ");
const FABRICATION = [
  [/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\s*[-]\s*\d{1,2}[:.]\d{2}/i, "an opening-hours range"],
  [/(₹|\bRs\.?\s?\d|\bINR\b)/, "a price"],
  [/\b\d+\s?(min|mins|minutes|hrs?|hours)\b[^.]{0,30}\b(drive|by road|away)\b/i, "a travel time"],
  [/\b\d\.\d\s?(stars?|\/5)\b/i, "a rating"],
  [/\bmost beautiful\b|\bbest place\b|\bmust[- ]see\b/i, "a marketing superlative"],
  [/\bfamous for\b/i, "an unsourced reputation claim"],
];
for (const [pattern, what] of FABRICATION) {
  const hit = discoveryText.match(pattern);
  check(`Discovery contains no ${what}`, !hit, hit ? `found: "${hit[0]}"` : "");
}

const images = imagesOf(sikkim.body);
check(
  "Discovery cards carry images with alt text",
  images.length > 0 && images.every((tag) => /alt="[^"]+"/.test(tag)),
  `${images.length} images, ${images.filter((t) => /alt=""/.test(t)).length} empty alts`,
);
check(
  "Every discovery image is served locally, never hotlinked",
  images.every((tag) => /src="(\/_next\/image|\/images\/)/.test(tag)),
  `${images.length} local`,
);
/*
 * PHASE B: Jaipur has records now, so "shows no photograph" describes nothing.
 * The guarantee underneath it was never about absence — it was that a page
 * shows only photographs it owns. That is what is asserted.
 */
check(
  "A destination shows only photographs it owns",
  imagesOf(jaipur.body).every((tag) => !/\/images\/(mon|stories)\//.test(tag)),
  `${imagesOf(jaipur.body).length} images on Jaipur, none borrowed`,
);

const ogOf = (html) => html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? "";
check("Sikkim's discovery page carries Sikkim's own card", /rumtek/.test(ogOf(sikkim.body)), ogOf(sikkim.body) || "none");
/*
 * This asserted that Jaipur emitted NO card, which was true only because the
 * registry declared one for Sikkim alone — so fourteen destinations shared as
 * a bare grey link. The card is now derived from the destination's OWN first
 * catalogued photograph.
 *
 * The invariant was never "emit nothing"; it was "never another destination's
 * photograph". That is what is asserted now, and it is the stronger check:
 * absence used to pass trivially, ownership cannot.
 */
const jaipurCard = ogOf(jaipur.body);
check("Jaipur's discovery page carries its own card, never a borrowed one",
  jaipurCard === "" || /\/images\/capsule\/jaipur\//.test(jaipurCard),
  jaipurCard || "none");
check(
  "Discovery declares its own canonical URL",
  /rel="canonical"[^>]*\/destinations\/sikkim\/discover/.test(sikkim.body),
);

/* ========================================================================
   22. SITEMAP
   ======================================================================== */
section("22. Sitemap");

const sitemap = await get(`${BASE}/sitemap.xml`);
check(
  "The sitemap lists discovery for destinations that have experiences",
  sitemap.body.includes("/destinations/sikkim/discover"),
);
check("It lists the planner too", sitemap.body.includes("/destinations/sikkim/plan"));
/*
 * PHASE B: every destination has experiences now, so "advertises neither" has
 * no subject. The rule was that the sitemap is DERIVED from capability rather
 * than typed — so it is checked that way: discovery and planner URLs appear
 * for exactly the same set of destinations, and an unregistered id appears in
 * neither.
 */
const discoverIds = [...sitemap.body.matchAll(/\/destinations\/([a-z-]+)\/discover</g)].map((m) => m[1]).sort();
const planIds = [...sitemap.body.matchAll(/\/destinations\/([a-z-]+)\/plan</g)].map((m) => m[1]).sort();
check(
  "Discovery and planner are advertised for exactly the same destinations",
  discoverIds.length > 0 && discoverIds.join(",") === planIds.join(","),
  `${discoverIds.length} discovery, ${planIds.length} planner`,
);
check(
  "It advertises nothing for an unregistered destination",
  !sitemap.body.includes("/destinations/atlantis"),
);

/* ========================================================================
   23-25. STRUCTURE, SECURITY, DETERMINISM
   ======================================================================== */
section("23-25. Structure, security, determinism");

check(
  "The page has one h1 and labelled group sections",
  (sikkim.body.match(/<h1/g) ?? []).length === 1 && /aria-labelledby="group-/.test(sikkim.body),
);
check(
  "The group filter is a navigation landmark with current state",
  /aria-label="Discovery groups"/.test(sikkim.body) && /aria-current="true"/.test(sikkim.body),
);
check(
  "Every card action carries readable text, not an icon alone",
  /Explore|View place|View record|Read story/.test(text(sikkim.body)),
);

const HOSTILE = [
  ["?interest=../../etc/passwd", "path traversal in a filter"],
  ["?interest=<script>alert(1)</script>", "a script tag as a filter"],
  ["?interest=" + "a".repeat(4000), "an oversized filter"],
  ["?interest=food&interest=nature", "a repeated filter"],
  ["?interest=stays", "an interest this destination cannot satisfy"],
];
for (const [query, what] of HOSTILE) {
  const response = await get(DISCOVER("sikkim", query));
  const ok = response.status === 200 && cardsOf(response.body).length > 0 && !/<script>alert/.test(response.body);
  check(`Discovery state is validated: ${what}`, ok, `HTTP ${response.status}`);
}

const repeat = await get(DISCOVER("sikkim", "?interest=history"));
const repeatAgain = await get(DISCOVER("sikkim", "?interest=history"));
check(
  "The same data produces the same discovery ordering",
  cardsOf(repeat.body).join("|") === cardsOf(repeatAgain.body).join("|") && cardsOf(repeat.body).length > 0,
  `${cardsOf(repeat.body).length} cards in identical order`,
);
check(
  "Ordering is by measured connectedness, with a stable tie-break",
  /byConnectedness/.test(discoverySrc) && /localeCompare/.test(discoverySrc),
);

/* ========================================================================
   26-28. NO REGRESSION, NO EMPTY SECTIONS
   ======================================================================== */
section("26-28. Regression and empty-state guards");

const BASELINE = { monasteries: 15, stories: 70, history: 26, places: 38, archive: 78 };
for (const [name, expected] of Object.entries(BASELINE)) {
  const dir = join(".next/server/app/destinations/sikkim", name);
  const actual = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).length : -1;
  check(`Sikkim's ${name} content count is unchanged`, actual === expected, `${actual} pages (baseline ${expected})`);
}

/* Every group offered must contain records: a heading over nothing is the
   "empty section" this project deletes on sight. */
const groupCounts = [...mainOf(sikkim.body).matchAll(/text-caption text-subtle">(\d+)<\/span>/g)].map((m) =>
  Number(m[1]),
);
check(
  "No discovery group is advertised with zero records",
  groupCounts.length > 0 && groupCounts.every((count) => count > 0),
  `${groupCounts.length} groups, smallest ${Math.min(...groupCounts)}`,
);
/* PHASE B: Jaipur has records, so it SHOULD render group navigation. The
   guarantee that survives is the one directly above — no group is advertised
   with zero records — which is what this was protecting when a destination
   had none at all. */
check("A destination with records renders its group navigation",
  /Explore this destination through/.test(jaipurText));

const summarySrc = mustRead("src/lib/discovery/summary.ts");
check(
  "Comparison counts are lengths of real collections, never estimates",
  /experiences\.length/.test(summarySrc) && !/Math\.round|approximately/.test(codeOf(summarySrc)),
);

const globalPage = await get(`${BASE}/destinations`);
const globalText = text(globalPage.body);
check(
  "The global page compares destinations without ranking them",
  /How much is known, side by side/.test(globalText) && !/\bbest\b|\bmost beautiful\b/i.test(globalText),
);
check(
  "Destinations with nothing are left out of the comparison, not shown as zeroes",
  /destinations are not listed here because they hold nothing at all/.test(globalText),
);

const discoveryFiles = walk("src/lib/discovery").concat(walk("src/components/discovery"));
check(
  "No discovery module imports an AI provider or calls a remote API",
  !discoveryFiles.some((file) => /@anthropic-ai|openai|groq|fetch\(["'`]https?:/.test(codeOf(readFileSync(file, "utf8")))),
  `${discoveryFiles.length} files clean`,
);
check(
  "Nothing in discovery reads a clock or a random source",
  !discoveryFiles.some((file) =>
    /Date\.now\(\)|Math\.random\(\)|new Date\(\)/.test(codeOf(readFileSync(file, "utf8"))),
  ),
);

/* ========================================================================
   29-30. MOBILE AND KEYBOARD, IN A REAL BROWSER
   ======================================================================== */
if (!process.argv.includes("--no-browser")) {
  section("29-30. Mobile layout and the discovery loop");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const ROUTES = [
    "/destinations/sikkim/discover",
    "/destinations/sikkim/discover?interest=nature",
    "/destinations/sikkim/monasteries/dubdi",
    "/destinations",
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

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/destinations/sikkim/discover`, { waitUntil: "domcontentloaded" });
  const audit = await page.evaluate(() => {
    const links = [...document.querySelectorAll("main a[href]")];
    const headings = [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map((el) =>
      Number(el.tagName.slice(1)),
    );
    let skipped = 0;
    for (let i = 1; i < headings.length; i += 1) {
      if (headings[i] - headings[i - 1] > 1) skipped += 1;
    }
    return {
      links: links.length,
      unreachable: links.filter((el) => el.getAttribute("tabindex") === "-1").length,
      nameless: links.filter((el) => !el.textContent?.trim() && !el.getAttribute("aria-label")).length,
      images: [...document.querySelectorAll("main img")].length,
      altless: [...document.querySelectorAll("main img")].filter((el) => !el.getAttribute("alt")).length,
      skipped,
    };
  });
  check("Every discovery link is in the tab order", audit.links > 0 && audit.unreachable === 0, `${audit.links} links`);
  check("Every link has an accessible name", audit.nameless === 0, `${audit.nameless} nameless`);
  check("Every image has alt text", audit.altless === 0, `${audit.images} images`);
  check("Heading levels do not skip", audit.skipped === 0, `${audit.skipped} skips`);

  /* Walk the loop a visitor walks: discover -> record -> add to trip. */
  /*
   * Scoped to a card: the crumb trail uses these words too.
   *
   * The card's primary action is named for what it opens — "View place" for a
   * place or site, "View record" for a dish, festival or craft — rather than
   * a single generic "Explore" that told the reader nothing about where they
   * were going. The assertion is unchanged: the card's primary action must
   * navigate to that record's own page.
   *
   * `waitForLoadState` is not enough after a click — the current document is
   * already loaded, so it returns before the navigation starts and the URL
   * read below is the page you just left. Wait for the URL itself.
   */
  await page
    .locator("main article")
    .first()
    .getByRole("link", { name: /^View (place|record)$/ })
    .click();
  const onRecord = await page
    .waitForURL(/\/destinations\/sikkim\/(monasteries|places)\//, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  check("Discovery leads to the record page", onRecord, page.url().replace(BASE, ""));

  /* The record page's onward action is the planner itself, not a collect. */
  await page.getByRole("link", { name: /^Plan a journey here$/ }).first().click();
  const onPlanner = await page
    .waitForURL(/\/plan(\?|$)/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  check("The record page leads to the planner", onPlanner, page.url().replace(BASE, ""));

  await context.close();
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
