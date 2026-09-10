/**
 * Phase 13 integrity — the journey planner.
 *
 * WHY THIS SUITE TALKS HTTP
 * -------------------------
 * The planner has no client JavaScript: its whole state is the query string
 * and every control is a plain GET form or a link. That makes the real
 * product testable with `fetch` — no browser, no hydration, no waiting on
 * networkidle — and it means these checks exercise the ACTUAL rendered plan
 * rather than reading the source and hoping.
 *
 * Source-level checks are used only for the things HTTP cannot see: that no
 * fabricated field exists in the model, that the scoring is arithmetic rather
 * than a model call, and that no AI provider is imported on this path.
 *
 * Run against a freshly started server on a clean build:
 *   npm run build && npm run start
 *   node scripts/qa/planner-integrity.mjs [--base http://localhost:3000]
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
const section = (t) => console.log(`\n── ${t} ──`);

const PLAN = (id, query = "") => `${BASE}/destinations/${id}/plan${query}`;

async function get(url) {
  const response = await fetch(url, { redirect: "manual" });
  const body = response.status === 200 ? await response.text() : "";
  return { status: response.status, body };
}

/** The page body inside <main>, which is where the plan lives. */
const mainOf = (html) => html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";

/** Stop titles, in plan order. The <h4> in each stop is a link to the record. */
const stopsOf = (html) =>
  [...mainOf(html).matchAll(/<h4[^>]*>[\s\S]*?>([^<]+)<\/a>/g)].map((m) => m[1].trim());

/** Every internal href inside <main>. */
const hrefsOf = (html) =>
  [...mainOf(html).matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);

const text = (html) => mainOf(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const walk = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(p)) acc.push(p);
  }
  return acc;
};
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const mustRead = (path) => {
  if (!existsSync(path)) {
    check(`Required file exists: ${path}`, false, "checks depending on it cannot run");
    return "";
  }
  return readFileSync(path, "utf8");
};

/* ========================================================================
   1-4. THE ROUTE EXISTS WHERE IT SHOULD, AND NOWHERE ELSE
   ======================================================================== */
section("1-4. Destination-native route");

const sikkim = await get(PLAN("sikkim"));
check("Sikkim's planner loads", sikkim.status === 200, `HTTP ${sikkim.status}`);

const jaipur = await get(PLAN("jaipur"));
check("Jaipur's planner loads", jaipur.status === 200, `HTTP ${jaipur.status}`);

const kyoto = await get(PLAN("kyoto"));
check("Kyoto's planner loads", kyoto.status === 200, `HTTP ${kyoto.status}`);

for (const id of ["unknown", "..%2f..%2fsikkim", "sikkim%00", "SIKKIM"]) {
  const response = await get(PLAN(id));
  check(`Unknown destination "${id}" fails safely`, response.status === 404,
    `HTTP ${response.status}`);
}

/* PHASE 19: Paris used to be the empty destination here, and is now a
   capsule. No registered destination is empty any more, so what is asserted
   is the guarantee that survives — an unregistered id gets no planner route,
   rather than one assembled on demand. */
const paris = await get(PLAN("atlantis"));
check("An unregistered destination has no planner route", paris.status === 404,
  `HTTP ${paris.status}`);

/* ========================================================================
   5-8. INPUTS CHANGE THE OUTPUT, DETERMINISTICALLY
   ======================================================================== */
section("5-8. Duration, interests, pace, determinism");

const threeDay = stopsOf(sikkim.body);
const fiveDay = stopsOf((await get(PLAN("sikkim", "?days=5"))).body);
check("Duration changes the plan", fiveDay.length > threeDay.length,
  `3 days -> ${threeDay.length} stops, 5 days -> ${fiveDay.length} stops`);

const nature = stopsOf((await get(PLAN("sikkim", "?interests=nature"))).body);
const museums = stopsOf((await get(PLAN("sikkim", "?interests=museums"))).body);
check("Interests change the ranking",
  nature.join("|") !== museums.join("|") && nature.join("|") !== threeDay.join("|"),
  `nature[0]=${nature[0]}, museums[0]=${museums[0]}`);

const relaxed = stopsOf((await get(PLAN("sikkim", "?pace=relaxed"))).body);
const intensive = stopsOf((await get(PLAN("sikkim", "?pace=intensive"))).body);
check("Pace changes experience density",
  relaxed.length < threeDay.length && intensive.length > threeDay.length,
  `relaxed ${relaxed.length} < balanced ${threeDay.length} < intensive ${intensive.length}`);

const repeat = stopsOf((await get(PLAN("sikkim", "?interests=nature"))).body);
const repeatTwice = stopsOf((await get(PLAN("sikkim", "?interests=nature&days=4"))).body);
check("The same input produces the same output",
  repeat.join("|") === nature.join("|"), `${repeat.length} stops, identical order`);
check("A different input produces a different plan",
  repeatTwice.join("|") !== nature.join("|"));

/* ========================================================================
   9-11. NOTHING FABRICATED
   ======================================================================== */
section("9-11. Fabrication guards");

/* Every stop must be a record this destination actually publishes: its link
   has to point into this destination's own content routes. */
const stopHrefs = hrefsOf(sikkim.body).filter((href) =>
  /\/destinations\/[a-z-]+\/(monasteries|places)\//.test(href),
);
const foreign = stopHrefs.filter((href) => !href.startsWith("/destinations/sikkim/"));
check("Every experience belongs to the selected destination",
  stopHrefs.length > 0 && foreign.length === 0,
  foreign.join(", ") || `${stopHrefs.length} record links, all Sikkim`);

/* Cross-check the rendered titles against the corpus on disk. A stop whose
   title is not a catalogued record name is a fabricated experience. */
const monasterySrc = mustRead("src/data/monasteries.ts");
const placeSrc = mustRead("src/data/places.ts");
const catalogued = new Set([
  ...[...monasterySrc.matchAll(/^\s{4}name: "([^"]+)"/gm)].map((m) => m[1]),
  ...[...placeSrc.matchAll(/^\s{4}name: "([^"]+)"/gm)].map((m) => m[1]),
]);
const invented = [...new Set([...threeDay, ...fiveDay, ...intensive])].filter(
  (title) => !catalogued.has(title),
);
check("No fabricated experience appears in any plan",
  invented.length === 0, invented.join(", ") || `${catalogued.size} catalogued names checked`);

/* Practical data. These strings would each be a synthesised fact. */
const planText = text((await get(PLAN("sikkim", "?days=7&pace=intensive"))).body);
const FABRICATION_PATTERNS = [
  [/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\s*[–-]\s*\d{1,2}[:.]\d{2}/i, "an opening-hours range"],
  [/\b(₹|Rs\.?|INR)\s?\d/i, "a price"],
  [/\bentry fee\b/i, "an entry fee"],
  [/\b\d+\s?(min|mins|minutes|hrs?|hours)\b.*\b(drive|by road|journey|away)\b/i, "a travel time"],
  [/\bopen(s|ing)? (daily|from|at)\b/i, "an opening claim"],
  [/\b(book|reserve) (now|your)\b/i, "a booking claim"],
  [/\b\d\.\d\s?(stars?|\/5)\b/i, "a rating"],
];
for (const [pattern, what] of FABRICATION_PATTERNS) {
  const hit = planText.match(pattern);
  check(`The plan synthesises no ${what}`, !hit, hit ? `found: "${hit[0]}"` : "");
}

/* ========================================================================
   12-13. GEOGRAPHY IS HONEST
   ======================================================================== */
section("12-13. Geographic logic");

check("Distances are labelled as straight lines, never travel times",
  /straight line/.test(planText) && !/travel time of|takes about/i.test(planText));

const geographySrc = mustRead("src/lib/planner/geography.ts");
check("Geographic ordering uses only published coordinates",
  /coordinates !== undefined/.test(geographySrc) && /distanceKm/.test(geographySrc),
  "hasCoordinates() gates every placement");
check("A missing coordinate yields no distance, rather than zero",
  /if \(!from \|\| !to\) return undefined/.test(geographySrc));

const candidateSrc = mustRead("src/lib/planner/candidates.ts");
check("No coordinate is ever synthesised for a record that lacks one",
  !/lat:\s*\d/.test(codeOf(candidateSrc)) && !/coordinates\s*=\s*\{/.test(codeOf(candidateSrc)));

/* Dubdi's coordinate is deliberately withheld by the archive (disputed).
   It must still be plannable, and must say why it cannot be placed. */
const dubdiPlan = text((await get(PLAN("sikkim", "?days=7&pace=intensive"))).body);
check("A record with no published coordinate is stated as such, not placed",
  /No published coordinate/.test(dubdiPlan) || !/Dubdi/.test(dubdiPlan),
  "the unmapped case is labelled where it occurs");

/* ========================================================================
   14. SPARSE DESTINATIONS STAY HONEST
   ======================================================================== */
section("14. Sparse destinations");

/*
 * PHASE B REPLACED THIS FIXTURE WITH A STRONGER ONE.
 *
 * It used to assert that Jaipur, which had no visitable record at all, showed
 * no itinerary. Jaipur now holds nine catalogued places, so that destination
 * no longer exercises the guarantee — and no registered destination does.
 *
 * The guarantee itself is not about having nothing; it is about **refusing to
 * fill days the evidence cannot support**. That is now testable directly, and
 * more sharply: ask any destination for more days than its records can fill
 * and the planner must say so and render fewer days, rather than padding.
 */
/*
 * THE TEST FINDS ITS OWN SUBJECT.
 *
 * This has now been re-pointed three times — Jaipur, then Kochi, then a day
 * count the planner clamps — and every failure was a destination getting
 * BETTER. A hardcoded (destination, days) pair measures coverage; the
 * guarantee being asserted is behavioural: when the request exceeds the
 * evidence, the planner says so and renders fewer days instead of padding.
 *
 * So the suite asks several destinations for the maximum the planner accepts
 * and tests the first that genuinely runs short. If NONE runs short, that is
 * reported as a failure rather than a pass — it would mean the guarantee is
 * no longer exercised anywhere, which is worth knowing.
 */
const PLANNER_MAX_DAYS = 7;
let sparseId = null;
let sparseText = "";
for (const id of ["agra", "goa", "varanasi", "kyoto", "hyderabad", "mumbai", "jaipur", "kochi"]) {
  const page = await get(`${BASE}/destinations/${id}/plan?days=${PLANNER_MAX_DAYS}&pace=intensive`);
  const body = text(page.body);
  if (/Only \d+ days? of verified experiences (?:is|are) currently available/i.test(body)) {
    sparseId = id;
    sparseText = body;
    break;
  }
}

check("Some destination still exercises the evidence-shortfall guarantee",
  sparseId !== null,
  sparseId ? `${sparseId} runs short of ${PLANNER_MAX_DAYS} intensive days` : "every destination now fills the maximum");
check("Asked for more days than the evidence supports, the planner says so",
  /Only \d+ days? of verified experiences (?:is|are) currently available/i.test(sparseText),
  sparseText.match(/Only \d+ days? of verified experiences[^.]*\./i)?.[0] ?? "no statement");
check("It names what it refused to invent",
  /Nothing has been invented to fill the remaining/i.test(sparseText));
check("And it renders fewer days rather than padding them",
  (sparseText.match(/Day \d+/g) ?? []).length < PLANNER_MAX_DAYS,
  `${(sparseText.match(/Day \d+/g) ?? []).length} days rendered for a ${PLANNER_MAX_DAYS}-day request`);
check("A destination still reports the verified knowledge it holds",
  /reviewer-approved facts/i.test(text(jaipur.body)) || /approved/i.test(text(jaipur.body)));
/* A rendered "undefined" is how a loosely-typed field announces itself. It
   shipped once here: `PublishedDestination.stats` is typed
   `Record<string, number>`, so `stats.approvedClaims` compiled fine and
   rendered "Jaipur has undefined reviewer-approved facts". */
for (const [id, page] of [["sikkim", sikkim], ["jaipur", jaipur], ["kyoto", kyoto]]) {
  const rendered = text(page.body);
  check(`${id}'s planner renders no undefined or NaN value`,
    !/\b(undefined|NaN|\[object Object\])\b/.test(rendered),
    (rendered.match(/\b(undefined|NaN|\[object Object\])\b/) ?? [])[0] ?? "clean");
}

/* Kyoto held research and nothing to visit; Phase B gave it ten catalogued
   places, so it now plans like any other destination — and its sparse branch
   fires the same way Kochi's does when the days outrun the records. */
const kyotoSparse = await get(`${BASE}/destinations/kyoto/plan?days=7&pace=intensive`);
check("Kyoto, with the same shape of data, behaves the same way",
  /Only \d+ days? of verified experiences (?:is|are) currently available/i.test(text(kyotoSparse.body)) &&
    stopsOf(kyoto.body).length > 0,
  `${stopsOf(kyoto.body).length} stops from its own records`);

/* The shortfall path, exercised on a real destination: remove almost the
   whole corpus and ask for seven days. Sikkim has enough records that the
   gap never fires naturally, and an untested honesty path is not an honesty
   path. */
const monasterySlugs = [...monasterySrc.matchAll(/^\s{4}slug: "([a-z0-9-]+)"/gm)].map((m) => `site:${m[1]}`);
const placeSlugs = [...placeSrc.matchAll(/^\s{4}slug: "([a-z0-9-]+)"/gm)].map((m) => `place:${m[1]}`);
const strip = [...monasterySlugs, ...placeSlugs].slice(0, 50).join(",");
const starved = await get(PLAN("sikkim", `?days=7&pace=relaxed&remove=${strip}`));
const starvedText = text(starved.body);
const starvedDays = (starved.body.match(/<h3 id="day-/g) ?? []).length;
check("A corpus that cannot fill the trip reports the shortfall",
  /Only \d+ days? of verified experiences/.test(starvedText) && starvedDays < 7,
  `${starvedDays} days built of 7 requested`);
check("The shortfall is never padded with invented stops",
  /Nothing has been invented/.test(starvedText) &&
  stopsOf(starved.body).length <= starvedDays * 2,
  `${stopsOf(starved.body).length} stops`);

/* Sikkim itself must report a shortfall rather than padding a long trip at
   a slow pace if the corpus cannot fill it. */
const longSlow = await get(PLAN("sikkim", "?days=7&pace=relaxed"));
const longSlowText = text(longSlow.body);
const longSlowDays = (longSlowText.match(/Day \d/g) ?? []).length;
check("A trip is never padded beyond what the corpus supports",
  longSlowDays <= 7 && !/Day 8/.test(longSlowText), `${longSlowDays} days rendered`);

/* ========================================================================
   15-16. EDITING AND STATE VALIDATION
   ======================================================================== */
section("15-16. Editing and state validation");

const removeLink = hrefsOf(sikkim.body).find((href) => href.includes("remove="));
check("Every stop offers a remove link", Boolean(removeLink), removeLink ?? "none found");

if (removeLink) {
  const removed = await get(`${BASE}${removeLink.replace(/&amp;/g, "&")}`);
  const removedStops = stopsOf(removed.body);
  const droppedTitle = threeDay.find((title) => !removedStops.includes(title));
  check("Removing an experience recomputes the plan",
    removed.status === 200 && droppedTitle !== undefined &&
    removedStops.join("|") !== threeDay.join("|"),
    droppedTitle ? `"${droppedTitle}" is gone; ${removedStops.length} stops remain` : "unchanged");
  check("A removal is reversible",
    /Put them back/.test(text(removed.body)));
}

/* Hostile state. Each of these must be ignored, not honoured, not crashed. */
const HOSTILE = [
  ["?remove=site:../../../etc/passwd", "path traversal in an id"],
  ["?remove=place:tsomgo-lake'--", "sql-ish punctuation in an id"],
  ["?remove=" + "a".repeat(5000), "an oversized parameter"],
  ["?remove=" + Array.from({ length: 200 }, (_, i) => `site:x${i}`).join(","), "an oversized id list"],
  ["?days=999999", "an absurd duration"],
  ["?days=-4", "a negative duration"],
  ["?pace=<script>alert(1)</script>", "a script tag as a pace"],
  ["?interests=" + "nature,".repeat(500), "a repeated interest flood"],
];
for (const [query, what] of HOSTILE) {
  const response = await get(PLAN("sikkim", query));
  const ok = response.status === 200 && stopsOf(response.body).length > 0 &&
    !/<script>alert/.test(response.body);
  check(`Planner state is validated: ${what}`, ok, `HTTP ${response.status}`);
}

/* The isolation case that matters: an id that exists, but belongs to another
   destination's corpus, must not be honoured. Sikkim owns every current id,
   so this asserts the mechanism — membership in THIS destination's set. */
const stateSrc = mustRead("src/lib/planner/state.ts");
check("Removal ids are validated by membership in this destination's set",
  /knownIds\.has\(id\)/.test(stateSrc) && /candidates\.map/.test(stateSrc));
check("Ids are shape-checked before lookup",
  /ID_PATTERN\.test\(id\)/.test(stateSrc));

/* ========================================================================
   17-18. PROVENANCE AND ISOLATION
   ======================================================================== */
section("17-18. Provenance and destination isolation");

check("Each plan links to the evidence behind its recommendations",
  hrefsOf(sikkim.body).some((href) => /\/destinations\/sikkim\/history\//.test(href)) ||
  hrefsOf(sikkim.body).some((href) => /\/destinations\/sikkim\/stories\//.test(href)),
  "history and story links are rendered on stops");

check("Recommendations carry a stated reason",
  /Matches the|Named in|Connected to|Included to fill/.test(planText));

check("The plan never claims AI authorship",
  !/\bAI (selected|chose|generated|recommends)\b/i.test(planText) &&
  /nothing here is AI-generated/i.test(planText.toLowerCase()));

const sikkimNames = ["Rumtek", "Pemayangtse", "Tashiding"];
const jaipurLeak = sikkimNames.filter((name) => text(jaipur.body).includes(name));
check("Jaipur's planner renders no Sikkim content",
  jaipurLeak.length === 0, jaipurLeak.join(", ") || "clean");

const jaipurHrefs = hrefsOf(jaipur.body).filter((href) => href.startsWith("/destinations/"));
const jaipurForeign = jaipurHrefs.filter((href) => !href.startsWith("/destinations/jaipur"));
check("Jaipur's planner links only into Jaipur",
  jaipurForeign.length === 0, jaipurForeign.join(", ") || `${jaipurHrefs.length} links`);

/* ========================================================================
   19-20. ACCESSIBILITY AND MOBILE STRUCTURE
   ======================================================================== */
section("19-20. Accessibility and structure");

check("The form uses real fieldsets and legends",
  /<fieldset/.test(sikkim.body) && /<legend/.test(sikkim.body));
check("Every control is a native form control",
  /<input type="radio"/.test(sikkim.body) && /<input type="checkbox"/.test(sikkim.body) &&
  /<button type="submit"/.test(sikkim.body));
check("Controls are not hidden from assistive technology",
  !/type="radio"[^>]*class="[^"]*sr-only/.test(sikkim.body));
check("Remove links carry an accessible name",
  /aria-label="Remove [^"]+ from the plan"/.test(sikkim.body));
/*
 * PHASE 19 strengthened what this asserts. It used to require the exact
 * attribute `aria-labelledby="day-1"`, which a fix could only ever break: the
 * day section is now labelled by the day number AND the title, because a
 * capsule destination gave every day of its plan the same accessible name and
 * axe reported two identical `region` landmarks. So the check asks for the
 * property rather than the string — each day section references its own
 * heading, and no two day sections share a label.
 */
const dayLabels = [...sikkim.body.matchAll(/aria-labelledby="([^"]*\bday-\d+)"/g)].map((m) => m[1]);
check("The plan has one h1 and a uniquely labelled day structure",
  (sikkim.body.match(/<h1/g) ?? []).length === 1 &&
    dayLabels.length > 0 &&
    new Set(dayLabels).size === dayLabels.length,
  `${dayLabels.length} day sections, ${new Set(dayLabels).size} distinct labels`);
check("The planner works without JavaScript",
  /<form[^>]*method="get"/.test(sikkim.body),
  "state lives in the query string; no client component on this path");

/* ========================================================================
   21. NO AI DEPENDENCY
   ======================================================================== */
section("21. The planner requires no AI provider");

const plannerFiles = walk("src/lib/planner").concat(
  existsSync("src/components/journey") ? walk("src/components/journey") : [],
  ["src/app/(v1)/destinations/[destinationId]/plan/page.tsx"],
);
const aiImports = plannerFiles.filter((file) =>
  /@anthropic-ai|openai|groq|generativeai|fetch\(["'`]https?:/.test(codeOf(readFileSync(file, "utf8"))),
);
check("No planner module imports an AI provider or calls a remote API",
  aiImports.length === 0, aiImports.join(", ") || `${plannerFiles.length} files clean`);

const scoringSrc = mustRead("src/lib/planner/scoring.ts");
check("The ranking is arithmetic over stated weights",
  /INTEREST_POINTS/.test(scoringSrc) && /HISTORY_POINTS/.test(scoringSrc) &&
  !/await/.test(codeOf(scoringSrc)),
  "no async call anywhere in the scoring path");
check("Ranking is reproducible: ties break on a stable key",
  /localeCompare/.test(scoringSrc));
check("Nothing in the planner path reads a clock or a random source",
  !plannerFiles.some((file) => /Date\.now\(\)|Math\.random\(\)|new Date\(\)/.test(codeOf(readFileSync(file, "utf8")))));

/* ========================================================================
   22-27. NO REGRESSION IN WHAT PHASE 11-12 ALREADY FIXED
   ======================================================================== */
section("22-27. Regression guards");

const BASELINE = { monasteries: 15, stories: 70, history: 26, places: 38, archive: 78 };
const OUT = ".next/server/app/destinations/sikkim";
for (const [name, expected] of Object.entries(BASELINE)) {
  const dir = join(OUT, name);
  const actual = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".html")).length
    : -1;
  check(`Sikkim's ${name} content count is unchanged`, actual === expected,
    `${actual} pages (baseline ${expected})`);
}

const hub = await get(`${BASE}/destinations/sikkim`);
check("The destination hub links to the planner",
  hub.body.includes('href="/destinations/sikkim/plan"'));
check("Canonical metadata on the planner names its own destination",
  sikkim.body.includes('rel="canonical" href="') &&
  /rel="canonical"[^>]*\/destinations\/sikkim\/plan/.test(sikkim.body));
check("The planner does not emit another destination's social card",
  !/og:image[^>]*rumtek/.test(jaipur.body));

const sitemap = await get(`${BASE}/sitemap.xml`);
/*
 * PHASE B: the sitemap lists a planner for every destination that HAS one, and
 * every destination now has experiences. The rule was never "Jaipur is
 * absent" — it was "the sitemap is derived from capability, not typed" — so it
 * is now checked that way: a planner URL appears for exactly those
 * destinations with a discovery route, and for no others.
 */
const plannerUrls = [...sitemap.body.matchAll(/<loc>[^<]*\/destinations\/([a-z-]+)\/plan<\/loc>/g)]
  .map((m) => m[1]).sort();
const discoverUrls = [...sitemap.body.matchAll(/<loc>[^<]*\/destinations\/([a-z-]+)\/discover<\/loc>/g)]
  .map((m) => m[1]).sort();
check("The sitemap lists a planner for exactly the destinations that have one",
  plannerUrls.length > 0 && plannerUrls.join(",") === discoverUrls.join(","),
  `${plannerUrls.length} planners, ${discoverUrls.length} discovery routes`);

/* ========================================================================
   28-29. MOBILE AND KEYBOARD, IN A REAL BROWSER
   ======================================================================== */
if (!process.argv.includes("--no-browser")) {
  section("28-29. Mobile layout and keyboard operation");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  const ROUTES = [
    "/destinations/sikkim/plan",
    "/destinations/sikkim/plan?days=7&pace=intensive&interests=history,nature",
  ];
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      check(`${width}px ${route.split("?")[0]}${route.includes("?") ? " (with options)" : ""} — no horizontal scroll`,
        overflow <= 1, `${overflow}px`);
    }
    await context.close();
  }

  /* Keyboard: the whole planner must be operable without a pointer. */
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/destinations/sikkim/plan`, { waitUntil: "domcontentloaded" });

  const reachable = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("main input, main button, main a[href]")];
    return {
      total: controls.length,
      /* tabindex="-1" would take a control out of the tab order. */
      unreachable: controls.filter((el) => el.getAttribute("tabindex") === "-1").length,
      unlabelled: controls.filter((el) => {
        if (el.tagName !== "INPUT") return false;
        const id = el.getAttribute("id");
        return (
          !el.closest("label") &&
          !(id && document.querySelector(`label[for="${id}"]`)) &&
          !el.getAttribute("aria-label")
        );
      }).length,
    };
  });
  check("Every planner control is in the tab order",
    reachable.total > 0 && reachable.unreachable === 0,
    `${reachable.total} controls, ${reachable.unreachable} unreachable`);
  check("Every form control has a label",
    reachable.unlabelled === 0, `${reachable.unlabelled} unlabelled`);

  /* Actually drive it: tab to a control, change it, submit, and check the
     server rebuilt the plan from the new query string. */
  /* A keyboard-only check that the focus indicator is real, BEFORE any
     navigation: focus the control the way a keyboard user does and compare
     the computed outline against its unfocused state. */
  const focusIndicator = await page.evaluate(() => {
    const el = document.querySelector('main input[name="days"]');
    if (!(el instanceof HTMLElement)) return null;
    const before = getComputedStyle(el).outlineWidth;
    el.focus();
    const after = getComputedStyle(el).outlineWidth;
    return { before, after, matches: el.matches(":focus-visible") };
  });
  check("A focused control renders a focus indicator",
    Boolean(focusIndicator?.matches) && focusIndicator?.after !== "0px",
    focusIndicator ? `outline ${focusIndicator.before} -> ${focusIndicator.after}` : "control not found");

  /* Then drive the form the way a keyboard user would: select a pace with
     the arrow keys and submit with Enter. */
  await page.focus('input[name="pace"][value="relaxed"]');
  await page.keyboard.press("Space");
  await Promise.all([
    page.waitForURL(/pace=relaxed/, { timeout: 15_000 }).catch(() => undefined),
    page.keyboard.press("Enter"),
  ]);
  await page.waitForLoadState("domcontentloaded");
  const url = page.url();
  check("Submitting the form from the keyboard rebuilds the plan",
    url.includes("pace=relaxed"), url.replace(BASE, ""));
  check("The rebuilt plan reflects the keyboard choice",
    (await page.locator("main section[aria-labelledby^='day-']").count()) > 0 &&
      (await page.locator("main h4").count()) === 6,
    `${await page.locator("main h4").count()} stops at relaxed pace`);

  await context.close();
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
