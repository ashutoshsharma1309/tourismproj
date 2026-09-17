/**
 * Phase 1 acceptance — the journey a visitor assembles.
 *
 * WHAT THIS SUITE IS FOR
 * ----------------------
 * Multi-destination selection is the first genuinely stateful thing in this
 * product. Everything else is a URL or a static page; this is a list a person
 * builds across pages and expects to survive a refresh. It therefore has the
 * failure modes nothing else here has — a hydration mismatch that blanks the
 * tree, a stale journey naming a destination that no longer exists, a
 * selection that reads as chosen but is not stored.
 *
 * AND IT GUARDS THE LINE AGAINST "ADD TO TRIP"
 * --------------------------------------------
 * The removed feature was a *collecting* gesture on individual records. This
 * one is destination-level, on a screen whose whole purpose is choosing. The
 * distinction is easy to erode, so the suite asserts the old label has not
 * come back and that no per-record pin link exists.
 *
 *   node scripts/qa/journey.mjs [--base http://localhost:3000]
 */

import { chromium } from "playwright";

const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));

const addButton = (name) =>
  page.getByRole("button", { name: new RegExp(`Add ${name} to your journey`, "i") });
const inJourney = (name) =>
  page.getByRole("button", { name: new RegExp(`Remove ${name} from your journey`, "i") });
const trayText = async () => (await page.locator("#your-journey").innerText()).replace(/\s+/g, " ");

/* ======================================================================
   A. TESTS 01–03 — the global entry
   ====================================================================== */
section("A. Global entry");

await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90_000 });
await page.waitForTimeout(1200);

/*
 * "NOT SIKKIM-FIRST" IS ABOUT DOMINANCE, NOT MENTIONS.
 *
 * A raw mention count is the wrong measure: Sikkim is one of the fifteen and
 * legitimately appears as a destination tile, as the depth example, and in the
 * preservation links, and capping mentions at an arbitrary number would push
 * toward hiding the deepest destination rather than balancing the page.
 *
 * What Phase 1 actually requires is that Sikkim is not the page's SUBJECT. So:
 * no heading names it, and its share of destination links is close to the 1/15
 * a neutral page would give it.
 */
const headings = await page.locator("main h1, main h2").allInnerTexts();
check("TEST 01: no homepage heading names Sikkim",
  headings.every((h) => !/Sikkim/i.test(h)),
  headings.filter((h) => /Sikkim/i.test(h)).join(" | ") || `${headings.length} headings, none`);

const destLinks = await page.locator('main a[href^="/destinations/"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href") ?? ""));
const sikkimLinks = destLinks.filter((h) => h.startsWith("/destinations/sikkim")).length;
const share = destLinks.length ? sikkimLinks / destLinks.length : 0;
check("TEST 01: Sikkim does not dominate the homepage's destination links",
  share <= 0.3,
  `${sikkimLinks} of ${destLinks.length} links (${Math.round(share * 100)}%)`);

const exploreCta = page.getByRole("link", { name: /^Explore India$/ }).first();
check("TEST 02: the primary CTA exists", await exploreCta.count() > 0);

const addButtons = await page.getByRole("button", { name: /to your journey$/i }).count();
check("TEST 03: all 18 destinations offer selection", addButtons === 18, `${addButtons} controls`);

/* ======================================================================
   B. TESTS 04–07 — selection
   ====================================================================== */
section("B. Selection");

await addButton("Mumbai").click();
await page.waitForTimeout(250);
check("TEST 04: Mumbai becomes selected", await inJourney("Mumbai").count() > 0);
check("TEST 04: the tray states the count", /1 destination selected/i.test(await trayText()),
  (await trayText()).slice(0, 60));

await addButton("Kochi").click();
await page.waitForTimeout(250);
check("TEST 05: Mumbai and Kochi are both selected",
  await inJourney("Mumbai").count() > 0 && await inJourney("Kochi").count() > 0);
check("TEST 05: the count is two", /2 destinations selected/i.test(await trayText()));

await page.locator("#your-journey").getByRole("button", { name: /Remove Mumbai/i }).click();
await page.waitForTimeout(250);
const afterRemoval = await trayText();
check("TEST 06: removing Mumbai leaves only Kochi",
  /1 destination selected/i.test(afterRemoval) && /Kochi/.test(afterRemoval) && !/Mumbai/.test(afterRemoval),
  afterRemoval.slice(0, 70));

await addButton("Jaipur").click();
await addButton("Agra").click();
await page.waitForTimeout(300);
check("TEST 07: the count is correct at three", /3 destinations selected/i.test(await trayText()));

/* Order is the order chosen, not alphabetical. */
const chips = await page.locator("#your-journey li").allInnerTexts();
check("TEST 07: chips keep the order they were chosen in",
  chips.length === 3 && /Kochi/.test(chips[0]) && /Jaipur/.test(chips[1]) && /Agra/.test(chips[2]),
  chips.map((c) => c.replace(/\s+/g, " ").trim()).join(" | "));

/* ======================================================================
   C. TEST 10 — persistence
   ====================================================================== */
section("C. Persistence");

await page.reload({ waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1200);
check("TEST 10: the journey survives a refresh",
  /3 destinations selected/i.test(await trayText()), (await trayText()).slice(0, 60));
check("TEST 10: no crash and no console error on reload", errors.length === 0,
  errors[0] ?? "clean");

/* It must also survive navigating away and back — the provider is in the
   layout, but localStorage is what actually carries it. */
await page.goto(`${BASE}/destinations`, { waitUntil: "load", timeout: 90000 });
await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1000);
check("TEST 10: the journey survives navigation",
  /3 destinations selected/i.test(await trayText()));

/* ======================================================================
   D. TEST 14 — Begin my journey, and the routing contract
   ====================================================================== */
section("D. Begin my journey");

const begin = page.getByRole("link", { name: /^Begin my journey$/ });
check("The begin action is present", await begin.count() > 0);
await begin.first().click();
await page.waitForURL(/\/destinations\/[a-z-]+$/, { timeout: 15_000 }).catch(() => {});
check("It opens the FIRST chosen destination, not a combined page",
  new URL(page.url()).pathname === "/destinations/kochi",
  new URL(page.url()).pathname);

/* ======================================================================
   E. Keyboard and clearing
   ====================================================================== */
section("E. Keyboard and reset");

await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(900);
const firstAdd = page.getByRole("button", { name: /to your journey$/i }).first();
await firstAdd.focus();
const focusVisible = await page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return false;
  const s = getComputedStyle(el);
  return s.outlineStyle !== "none" || s.boxShadow !== "none";
});
check("TEST 14: a focused selection control shows a visible ring", focusVisible);

await page.keyboard.press("Enter");
await page.waitForTimeout(250);
check("TEST 14: it toggles from the keyboard",
  /destination[s]? selected/i.test(await trayText()));

await page.locator("#your-journey").getByRole("button", { name: /^Clear$/ }).click();
await page.waitForTimeout(250);
check("Clearing empties the journey",
  /Choose where to begin/i.test(await trayText()), (await trayText()).slice(0, 50));

/* ======================================================================
   F. The line against "Add to trip"
   ====================================================================== */
section("F. Not a re-introduction of Add to trip");

const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
check("The removed label has not returned", !/Add to trip/i.test(bodyText));
check("No per-record pin link exists on discovery",
  (await (await context.newPage()).goto(`${BASE}/destinations/sikkim/discover`)
    .then(async (r) => (await r.text()).match(/pin=/g)?.length ?? 0)) === 0);
check("The journey states where it is kept",
  /kept in this browser only/i.test(await trayText()) || /kept in this browser/i.test(bodyText));

/* ======================================================================
   G. Stale storage is survivable
   ====================================================================== */
section("G. Hostile storage");

for (const [label, raw] of [
  ["a destination that does not exist", '{"destinations":["atlantis"],"interests":[]}'],
  ["a non-array", '{"destinations":"mumbai","interests":null}'],
  ["outright garbage", "not json at all"],
  ["an oversized list", JSON.stringify({ destinations: Array(500).fill("jaipur"), interests: [] })],
]) {
  await page.evaluate((value) => window.localStorage.setItem("terrastory.journey.v1", value), raw);
  const before = errors.length;
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(900);
  const text = await trayText();
  check(`Survives ${label}`,
    errors.length === before && /Choose where to begin|destination[s]? selected/i.test(text),
    text.slice(0, 50));
}

/* ======================================================================
   H. PHASE 5 — THE MULTI-DESTINATION JOURNEY
   ====================================================================== */
section("H. Sequential journey");

/*
 * Start from a clean journey. Earlier sections leave selections behind, and
 * the first run of this section inherited a Kyoto from section E — so every
 * count read "of 4" and four assertions failed on a product that was working.
 */
await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
await page.evaluate(() => window.localStorage.removeItem("terrastory.journey.v1"));
await page.reload({ waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1000);
for (const name of ["Mumbai", "Kolkata", "Delhi"]) {
  await page.getByRole("button", { name: new RegExp(`Add ${name} to your journey`, "i") }).click();
  await page.waitForTimeout(200);
}

await page.goto(`${BASE}/journey`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1100);
const summary = (await page.locator("main").innerText()).replace(/\s+/g, " ");
check("The summary lists the journey in the chosen order",
  /01[\s\S]*Mumbai[\s\S]*02[\s\S]*Kolkata[\s\S]*03[\s\S]*Delhi/.test(summary),
  "order preserved, not re-sorted");
check("It states progress out of the total", /0 of 3 complete/i.test(summary), summary.slice(0, 60));
check("It labels its counts as inventory, not engagement",
  /not a measure of how much of it you read/i.test(summary));

/* The indicator appears inside the Darshan, and marks the current one. */
await page.goto(`${BASE}/destinations/mumbai`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1100);
const nav = page.locator('nav[aria-label="Your journey"]');
check("A journey indicator appears inside the Darshan", await nav.count() > 0);
check("It marks the destination being viewed",
  (await nav.first().innerText()).includes("Mumbai"));
check("It does not turn the page into a progress dashboard",
  (await nav.first().innerText()).length < 220, "one line");

/* Completing Mumbai should offer Kolkata, by name. */
await page.getByRole("button", { name: /Mark Mumbai complete/i }).click();
await page.waitForTimeout(400);
const afterComplete = (await page.locator("main").innerText()).replace(/\s+/g, " ");
check("Completing a destination offers the NEXT one by name",
  /Continue to Kolkata/i.test(afterComplete), "sequential hand-off");
check("It does not offer to add anything to a trip",
  !/Add to trip/i.test(afterComplete));

await page.getByRole("link", { name: /Continue to Kolkata/i }).click();
await page.waitForURL(/\/destinations\/kolkata/, { timeout: 15_000 });
check("The hand-off actually navigates to the next destination",
  new URL(page.url()).pathname === "/destinations/kolkata", new URL(page.url()).pathname);

/* Resume: leave and come back. */
await page.goto(`${BASE}/journey`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1000);
const resumed = (await page.locator("main").innerText()).replace(/\s+/g, " ");
check("Progress survives navigation", /1 of 3 complete/i.test(resumed), resumed.slice(0, 60));
check("The resume action names continuing, not restarting",
  /Continue your journey/i.test(resumed));

/* The last destination completes the journey rather than pointing onward. */
for (const d of ["kolkata", "delhi"]) {
  await page.goto(`${BASE}/destinations/${d}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Mark .* complete/i }).click();
  await page.waitForTimeout(350);
}
const lastPage = (await page.locator("main").innerText()).replace(/\s+/g, " ");
check("The final destination offers the journey, not a next stop",
  /See your journey/i.test(lastPage) && !/Continue to /i.test(lastPage));

await page.goto(`${BASE}/journey`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1000);
const finished = (await page.locator("main").innerText()).replace(/\s+/g, " ");
check("A finished journey says so", /Journey complete/i.test(finished), finished.slice(0, 60));
check("And offers a comparison of what was explored",
  /Compare these destinations/i.test(finished));

/* Reset is deliberate. */
await page.getByRole("button", { name: /^Start over$/ }).click();
await page.waitForTimeout(300);
check("Resetting asks before destroying the journey",
  /Clear your destinations and progress\?/i.test(await page.locator("main").innerText()));
await page.getByRole("button", { name: /Keep it/i }).click();
await page.waitForTimeout(300);
check("Declining the reset keeps the journey",
  /Journey complete|of 3 complete/i.test(await page.locator("main").innerText()));

await page.getByRole("button", { name: /^Start over$/ }).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: /Yes, reset/i }).click();
await page.waitForTimeout(400);
check("Confirming the reset clears it",
  /Your journey is empty/i.test(await page.locator("main").innerText()));

/* A single-destination journey gets no multi-destination furniture. */
await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(900);
await page.getByRole("button", { name: /Add Kochi to your journey/i }).click();
await page.waitForTimeout(250);
await page.goto(`${BASE}/destinations/kochi`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1000);
check("A one-destination journey shows no journey indicator",
  (await page.locator('nav[aria-label="Your journey"]').count()) === 0,
  "no stepper for a single stop");

await browser.close();
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
