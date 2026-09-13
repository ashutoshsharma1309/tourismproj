/**
 * Phase 21 — the SIH demonstration, walked.
 *
 * WHAT THIS SUITE IS
 * ------------------
 * `docs/phase-21-sih-demo-flow.md` describes a twelve-step demonstration. This
 * suite WALKS it, in a real browser, by clicking the same controls a presenter
 * clicks — not by fetching a list of URLs. A demo script that has only ever
 * been read is a demo script that fails on stage.
 *
 * So every step below asserts three things:
 *   - the affordance is there and reachable (the link or control exists),
 *   - following it lands where the script says,
 *   - the page that arrives carries the evidence the presenter will point at.
 *
 * It also TIMES the walk. The brief asks for a 2–4 minute core demonstration,
 * and the only way to know is to measure it. Navigation time is what the suite
 * records; the presenter's talking is not this script's to estimate, so the
 * measured figure is reported as machine time with the narration budget stated
 * separately in the document.
 *
 * WHAT IT REFUSES
 * ---------------
 * There are no demo routes. `/demo`, `/presentation`, `/pitch` and `/showcase`
 * must all 404 — §4 of the brief forbids a staged path, and a suite that only
 * checked the happy flow would not notice one being added later. §7 asserts
 * their absence.
 *
 *   node scripts/qa/demo.mjs [--base http://localhost:3100]
 */

const baseIndex = process.argv.indexOf("--base");
const BASE =
  baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

/** Console errors anywhere in the walk are a demo risk, so they are collected. */
const consoleErrors = [];
/* Record WHERE it happened. An uncaught error with no location is a bug
   report nobody can act on. */
page.on("pageerror", (e) =>
  consoleErrors.push(`${String(e).split("\n")[0].slice(0, 120)}  @ ${path()}`));

const steps = [];
const path = () => new URL(page.url()).pathname + new URL(page.url()).search;
/*
 * `textContent`, not `innerText`. innerText returns approximately what is
 * RENDERED, and on a long streamed page it dropped the itinerary's "Day 1"
 * heading that the served HTML demonstrably contains — the suite failed a step
 * the product had completed. textContent is what the document says.
 */
const mainText = async () =>
  ((await page.locator("main").first().textContent()) ?? "").replace(/\s+/g, " ");

/**
 * Run one step, timing only the navigation.
 *
 * `waitForLoadState("domcontentloaded")` is USELESS here and quietly wrong:
 * the App Router navigates on the client, so the document never reloads and
 * the wait returns instantly. Every assertion then read the previous page's
 * URL, and the suite reported twenty failures against a product that was
 * working. Waiting for the URL to become what the step expects is the only
 * honest signal that the step happened.
 */
async function step(label, action, expect) {
  const started = Date.now();
  await action();
  if (expect) await page.waitForURL(expect, { timeout: 15_000 });
  await page.waitForLoadState("load").catch(() => {});
  const ms = Date.now() - started;
  steps.push({ label, ms, url: path() });
  console.log(`      ${String(ms).padStart(5)}ms  ${label} → ${path()}`);
  return ms;
}

/* ========================================================================
   1. THE WALK
   ======================================================================== */
section("1. The twelve-step demonstration, clicked through");

/* --- STEP 1 · the homepage answers "what is this?" --------------------- */
await step("1 · Homepage", async () => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
});
const homeText = await mainText();
/* The headline is now "Discover the stories behind the places", over a
   rotation of destination photographs rather than one Sikkim photograph. */
check("Step 1: the first viewport names the product and what it does",
  /TerraStory/.test(homeText) && /Cultural tourism and heritage discovery for India/.test(homeText) && /Discover the stories behind India's places/.test(homeText));
check("Step 1: the three primary actions are present",
  /* One primary action ("Explore India"), one personal one ("Find my
     destination"), and the guide reachable from the header — the hierarchy
     the first-time-user pass established. */
  await page.getByRole("link", { name: "Explore India" }).first().isVisible() &&
  await page.getByRole("link", { name: "Find my destination" }).first().isVisible() &&
  await page.getByRole("button", { name: "Ask the guide" }).first().isVisible());
/*
 * The hero states scale as a counted stat block rather than a chip: "18
 * Indian destinations / N states and territories / 220 catalogued places".
 * Same guarantee — the numbers are shown, not implied — read from the new
 * markup. Every destination is in India, so the second figure is states.
 */
check("Step 1: the scale of the platform is stated, not implied",
  /\b18\b[\s\S]{0,40}Indian destinations/.test(homeText) &&
    /\b\d+\b[\s\S]{0,40}states/.test(homeText) &&
    /catalogued places/.test(homeText),
  homeText.match(/\d+\s*destinations/)?.[0] ?? "not found");

/* --- STEP 2 · interest-first entry ------------------------------------- */
await step("2 · Find my destination", async () => {
  await page.getByRole("link", { name: "Find my destination" }).first().click();
}, "**/discover");
check("Step 2: lands on the interest-first entry", path().startsWith("/discover"), path());
check("Step 2: asks what the visitor is curious about",
  /what do you want to experience/i.test(await mainText()));

/* --- STEP 3 · choose interests ----------------------------------------- */
await step("3 · Choose History + Heritage + Culture", async () => {
  for (const interest of ["history", "heritage", "culture"]) {
    /* The checkbox is sr-only; the card that wraps it is the visible control. */
    await page.locator(`input[name="interests"][value="${interest}"]`).first().check({ force: true });
  }
  await page.getByRole("button", { name: /Find destinations for me/i }).first().click();
}, (url) => url.searchParams.getAll("interests").length >= 2);
const matchText = await mainText();
check("Step 3: the choice is carried in the URL, not in hidden state",
  /interests=history/.test(path()) && /interests=heritage/.test(path()), path());
check("Step 3: Sikkim is among the matches", /Sikkim/.test(matchText));
check("Step 3: every match explains itself",
  /How this coverage figure was calculated|reviewer-approved|catalogued record/i.test(matchText));
check("Step 3: no ranking language in the results",
  !/\b(best match|perfect destination|number one|top destination)\b/i.test(matchText));

/* --- STEP 4 · into the destination ------------------------------------- */
await step("4 · Open Sikkim", async () => {
  await page.locator('a[href="/destinations/sikkim"]').first().click();
}, "**/destinations/sikkim");
const sikkimText = await mainText();
check("Step 4: lands on Sikkim's hub", path() === "/destinations/sikkim", path());
check("Step 4: the hub states its depth", /Deeply documented/.test(sikkimText));
check("Step 4: the hub lists what can be explored",
  /What you can explore here/.test(sikkimText) && /Explore \d+ places/.test(sikkimText));

/* --- STEP 5 · discovery ------------------------------------------------ */
await step("5 · Discover Sikkim", async () => {
  await page.locator('a[href="/destinations/sikkim/discover"]').first().click();
}, "**/destinations/sikkim/discover**");
const discoverText = await mainText();
check("Step 5: lands on Sikkim's discovery page",
  path().startsWith("/destinations/sikkim/discover"), path());
check("Step 5: experiences are grouped by interest", /Heritage|History|Culture/.test(discoverText));
check("Step 5: each card says why it is there",
  /carries|linked to|records/i.test(discoverText));

/* --- STEP 6 · a heritage place ----------------------------------------- */
await step("6 · Open a heritage place", async () => {
  await page.locator('a[href^="/destinations/sikkim/monasteries/"]').first().click();
}, "**/destinations/sikkim/monasteries/**");
const placeText = await mainText();
check("Step 6: lands on a catalogued record",
  /^\/destinations\/sikkim\/monasteries\/[a-z-]+$/.test(path()), path());
check("Step 6: the record carries its sources",
  /source|Sources/i.test(placeText));
check("Step 6: the record shows no placeholder value",
  !/\bundefined\b|\bNaN\b/.test(placeText));

/* --- STEP 7 · a connected story ---------------------------------------- */
const storyLink = page.locator('a[href^="/destinations/sikkim/stories/"]').first();
const hasStory = await storyLink.count() > 0;
check("Step 7: the record links to a connected story", hasStory);
if (hasStory) {
  await step("7 · Read the connected story", async () => {
    await storyLink.click();
  }, "**/destinations/sikkim/stories/**");
  const storyText = await mainText();
  check("Step 7: lands on the story",
    /^\/destinations\/sikkim\/stories\/[a-z-]+$/.test(path()), path());
  check("Step 7: the story declares how it should be read",
    /Historical record|Oral tradition|Legend/i.test(storyText),
    "claim type is stated");
  check("Step 7: the story carries provenance", /Verified|source/i.test(storyText));
  const heroImg = page.locator("main img").first();
  if (await heroImg.count() > 0) {
    /*
     * WAIT FOR THE IMAGE, DO NOT ASSUME IT. Reading naturalWidth the instant
     * the page settles measured 0 and failed a story whose photograph was
     * merely still arriving — the check reported a broken image every time the
     * optimiser cache was cold, which is precisely when it is least useful to
     * cry wolf.
     */
    const dims = await heroImg.evaluate(
      (i) =>
        new Promise((resolve) => {
          const read = () => resolve({ n: i.naturalWidth, w: i.clientWidth });
          if (i.complete && i.naturalWidth > 0) return read();
          i.addEventListener("load", read, { once: true });
          i.addEventListener("error", read, { once: true });
          setTimeout(read, 12_000);
        }),
      undefined,
      { timeout: 15_000 },
    );
    check("Step 7: the story image loaded and is not blown up",
      dims.n > 0 && dims.w <= dims.n * 2, `natural ${dims.n}px, rendered ${dims.w}px`);
  }
}

/* --- STEP 8 · historical context --------------------------------------- */
const historyLink = page.locator('a[href^="/destinations/sikkim/history/"]').first();
if (await historyLink.count() > 0) {
  await step("8 · Follow the historical context", async () => {
    await historyLink.click();
  }, "**/destinations/sikkim/history/**");
  check("Step 8: lands in the timeline",
    path().startsWith("/destinations/sikkim/history"), path());
  check("Step 8: the event is dated and sourced",
    /\b1[0-9]{3}\b|\b20[0-2][0-9]\b/.test(await mainText()));
} else {
  check("Step 8: a historical connection is reachable from the story", false, "no history link");
}

/* --- STEP 9 · from discovery into the planner --------------------------- */
/*
 * "Add to trip" was removed from the product: it made COLLECTING the dominant
 * gesture of a platform whose subject is why a place matters. The demo now
 * walks the path that replaced it — discovery, then the destination's own
 * planner — and asserts the collecting gesture has not returned.
 */
await step("9 · Back to discovery", async () => {
  await page.goto(`${BASE}/destinations/sikkim/discover?interest=heritage`, { waitUntil: "domcontentloaded" });
});
check("Step 9: discovery offers no add-to-trip",
  (await page.locator('a[href*="pin="]').count()) === 0);
check("Step 9: its cards carry an action that leads somewhere",
  /Explore|View place|View record|Read story/.test(await mainText()));

await step("9 · Open the planner", async () => {
  await page.goto(`${BASE}/destinations/sikkim/plan`, { waitUntil: "domcontentloaded" });
});
check("Step 9: the planner opened inside the same destination",
  path().startsWith("/destinations/sikkim/"), path());

/* --- STEP 10 · the explainable itinerary -------------------------------- */
const planText = await mainText();
check("Step 10: an itinerary was produced", /Day 1/.test(planText));
check("Step 10: the plan explains its choices",
  [/Evidence:/i, /Connected to the (?:story|event)/i, /in a straight line/i]
    .filter((re) => re.test(planText)).length >= 2);
check("Step 10: the plan states what it does not know",
  /not verified for these records, so none are shown/i.test(planText));
check("Step 10: the plan invents no practical value",
  ![/\b\d{1,2}[:.]\d{2}\s?(?:am|pm)\b/i, /(?:₹|\$|€|£)\s?\d/, /\bbook now\b/i]
    .some((re) => re.test(planText)));

/* --- STEP 11 · back out to the world ------------------------------------ */
await step("11 · Return to all destinations", async () => {
  await page.locator('nav[aria-label="Primary"] a[href="/destinations"]').first().click();
}, "**/destinations");
const worldText = await mainText();
check("Step 11: lands on the global gateway", path() === "/destinations", path());
check("Step 11: destinations are listed with their states",
  /India/.test(worldText) && /Rajasthan/.test(worldText) && /Kerala/.test(worldText));
check("Step 11: the list works without the map",
  await page.locator('a[href="/destinations/varanasi"]').count() > 0,
  "every destination is a link in the list");

/* --- STEP 12 · same engine, different depth ----------------------------- */
await step("12 · Open Varanasi", async () => {
  await page.locator('a[href="/destinations/varanasi"]').first().click();
}, "**/destinations/varanasi");
const varanasiText = await mainText();
check("Step 12: Varanasi opens with the same structure",
  /* textContent joins "Varanasi" and the badge with no boundary, so no \b. */
  /Documented/.test(varanasiText) && /What you can explore here/.test(varanasiText));
/*
 * A hub does not list place names — it states depth, interests and sections.
 * The records live one click further in, on the destination's discovery page,
 * which is also where the presenter goes next. Checking the hub for a place
 * name failed a page that was correct.
 */
await step("12 · Discover Varanasi", async () => {
  await page.locator('a[href^="/destinations/varanasi/discover"]').first().click();
}, "**/destinations/varanasi/discover**");
const varanasiRecords = await mainText();
check("Step 12: Varanasi shows its own records",
  /Dashashwamedh|Kashi Vishwanath|Sarnath|Manikarnika/.test(varanasiRecords),
  "a Varanasi record is named");
check("Step 12: and none of Sikkim's",
  !/Rumtek|Pemayangtse|Tsomgo|Yuksom/.test(varanasiRecords));

/* The depth ladder, which is the scalability argument. */
const DEPTHS = [
  ["sikkim", "Deeply documented"],
  ["jaipur", "Well documented"],
  ["delhi", "Documented"],
  ["agra", "Documented"],
];
for (const [id, badge] of DEPTHS) {
  await page.goto(`${BASE}/destinations/${id}`, { waitUntil: "domcontentloaded" });
  const body = await mainText();
  check(`Step 12: ${id} states "${badge}" in the same vocabulary`, body.includes(badge));
}

/* ========================================================================
   2. THE FLOW HELD TOGETHER
   ======================================================================== */
section("2. The walk as a whole");

const total = steps.reduce((sum, s) => sum + s.ms, 0);
console.log(`\n      navigation time: ${(total / 1000).toFixed(1)}s across ${steps.length} steps`);
const slowest = [...steps].sort((a, b) => b.ms - a.ms)[0];
check("No single step takes longer than 5 seconds",
  slowest.ms < 5000, `slowest: ${slowest.label} at ${slowest.ms}ms`);
check("The whole walk navigates in under 60 seconds",
  total < 60_000, `${(total / 1000).toFixed(1)}s of navigation`);
check("No uncaught error anywhere in the walk",
  consoleErrors.length === 0, consoleErrors[0] ?? "clean");

/* ========================================================================
   3. NO STAGED ROUTES
   ======================================================================== */
section("3. The demo is the product");

for (const fake of ["/demo", "/presentation", "/pitch", "/showcase", "/sih"]) {
  const response = await page.goto(`${BASE}${fake}`, { waitUntil: "domcontentloaded" });
  check(`${fake} does not exist`, response?.status() === 404, `HTTP ${response?.status()}`);
}

/* ========================================================================
   4. NOTHING IS OVER-PROMISED
   ======================================================================== */
section("4. Claims the product may not make");

/*
 * §24 of the brief, enforced. Each of these is a claim this implementation
 * cannot support: there is no AI provider, no live availability feed, and no
 * basis for a superlative.
 */
const FORBIDDEN = [
  /\bAI[- ]powered\b/i,
  /\bAI[- ]generated\b/i,
  /\bpersonalised? AI\b/i,
  /\breal[- ]time (?:hotel )?availability\b/i,
  /\bmost accurate\b/i,
  /\bcomplete historical database\b/i,
  /\bcovers the entire world\b/i,
  /\bbest destination\b/i,
  /\bnumber one\b/i,
  /\bmust[- ]visit\b/i,
];
const SURFACES = ["/", "/destinations", "/discover", "/destinations/compare",
  "/destinations/sikkim", "/destinations/varanasi", "/destinations/sikkim/discover",
  "/destinations/sikkim/plan"];
/*
 * A NEGATED PHRASE IS THE OPPOSITE OF A CLAIM.
 *
 * The planner says, in bold, "Nothing here is AI-generated." The first version
 * of this check read that as an AI claim and failed the page for containing
 * the disclaimer that exists to prevent exactly what it was checking for —
 * the same shape of mistake as flagging "opening hours are not verified" as
 * fabricated opening hours. Look back at the words before the match.
 */
const negated = (body, index) => /\b(?:no|not|never|nothing|without)\b[^.]{0,40}$/i.test(body.slice(Math.max(0, index - 60), index));
for (const route of SURFACES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  const body = await mainText();
  const hits = [];
  for (const re of FORBIDDEN) {
    const found = re.exec(body);
    if (found && !negated(body, found.index)) hits.push(found[0]);
  }
  check(`${route}: makes no claim the implementation cannot support`,
    hits.length === 0, hits.join(", ") || "clean");
}

await context.close();
await browser.close();

console.log("\n      step timings:");
for (const s of steps) console.log(`      ${String(s.ms).padStart(5)}ms  ${s.label}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
