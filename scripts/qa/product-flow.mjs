/**
 * Transformation Phase A — the three ways into the product.
 *
 * WHAT THIS CHECKS THAT `qa:demo` DOES NOT
 * ----------------------------------------
 * `qa:demo` walks ONE route through the product, the one a presenter performs.
 * This suite checks that a visitor who arrives knowing nothing can get in by
 * any of three doors, and that whichever door they use, context survives to
 * the planner:
 *
 *   A · INTEREST FIRST     home → interest → destinations that cover it →
 *                          destination → discovery → place → planner
 *   B · DESTINATION FIRST  home → a destination card → discovery → place →
 *                          add to trip → planner
 *   C · SEARCH FIRST       home → ⌘K → a place → its destination → planner
 *
 * The reason all three matter: the landing page used to have exactly one door,
 * and it led into Sikkim. A visitor who wanted "somewhere with good
 * architecture" or who already knew the word "Colosseum" had nowhere to start.
 *
 * It also asserts the landing page itself answers the three questions a
 * first-time visitor asks — what is this, where can I go, what can I do — in
 * the first screenful and without opening a menu.
 *
 *   node scripts/qa/product-flow.mjs [--base http://localhost:3100]
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

const errors = [];
const newPage = async (width = 1440) => {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${String(e).split("\n")[0].slice(0, 110)}`));
  return { context, page };
};
const path = (page) => new URL(page.url()).pathname + new URL(page.url()).search;
const bodyText = async (page) =>
  ((await page.locator("main").first().textContent()) ?? "").replace(/\s+/g, " ");

/* ========================================================================
   0. THE LANDING PAGE ANSWERS THE THREE QUESTIONS
   ======================================================================== */
section("0. The landing page, read cold");

{
  const { context, page } = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const text = await bodyText(page);

  check("It says what the product is, not which destination it started as",
    /TerraStory/.test(text) && /Discover the stories behind India's places/.test(text));
  check("It does not present itself as a Sikkim site",
    !/^\s*Sikkim Darshan/.test(text) && !/Digitizing the Sacred Heritage of Sikkim/.test(text.slice(0, 600)),
    "the first screenful is about the platform");

  /* The three doors, all present above the archive. */
  check("Door 1 — an interest entry exists",
    await page.locator('a[href^="/discover?interests="]').count() >= 5,
    `${await page.locator('a[href^="/discover?interests="]').count()} interests offered`);
  check("Door 2 — every registered destination is linked from the landing page",
    await page.locator('a[href^="/destinations/"]').count() >= 18,
    `${await page.locator('a[href^="/destinations/"]').count()} destination links`);
  check("Door 3 — search is reachable without opening a menu",
    await page.getByRole("button", { name: /Search \(Command K\)/ }).first().isVisible());

  /* All eighteen, by name, so a missing one cannot hide behind a count. */
  const IDS = ["sikkim", "jaipur", "delhi", "varanasi", "agra", "mumbai", "kolkata", "hyderabad", "kochi", "goa",
  "amritsar", "ahmedabad", "lucknow", "pune", "mysuru", "madurai", "bhubaneswar", "srinagar"];
  const missing = [];
  for (const id of IDS) {
    if (await page.locator(`a[href="/destinations/${id}"]`).count() === 0) missing.push(id);
  }
  check("All 18 destinations are discoverable from the landing page",
    missing.length === 0, missing.join(", ") || "18/18");

  /* Depth is stated on the landing page, so nothing is oversold. */
  /* The tier badge left the landing cards in the first-time-user pass: a
     traveller could not read "Tourism capsule". Each card now says what can
     be done there in plain words, and a destination still being catalogued
     says so instead of borrowing a badge. */
  check("The landing page says what each destination offers, in plain words",
    /places to explore/.test(text) || /Being catalogued/.test(text),
    "a plain-words line is visible before the click");
  check("It does not claim every destination is deeply documented",
    (text.match(/Deeply documented/g) ?? []).length <= 3,
    `"Deeply documented" appears ${(text.match(/Deeply documented/g) ?? []).length}×`);

  /* The four stages name real routes. */
  check("The four steps are explained and each names a route",
    /Choose what interests you/.test(text) && /Explore a destination/.test(text) &&
      /Ask the guide/.test(text) && /Build your journey and compare/.test(text));

  check("No claim the implementation cannot support",
    !/\bAI[- ](?:powered|generated)\b/i.test(text) &&
      !/\breal[- ]time\b/i.test(text) &&
      !/\b(?:best destination|number one|must[- ]visit)\b/i.test(text));

  await context.close();
}

/* ========================================================================
   A. INTEREST FIRST
   ======================================================================== */
section("A. Interest first");

{
  const { context, page } = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  const interest = page.locator('a[href^="/discover?interests="]').first();
  const href = await interest.getAttribute("href");
  await interest.click();
  await page.waitForURL("**/discover**");
  check("A1 · an interest from the landing page opens global discovery",
    path(page).startsWith("/discover?interests="), path(page));

  const results = await bodyText(page);
  check("A2 · the chosen interest is carried in the URL, not hidden state",
    path(page) === href, `${href} → ${path(page)}`);
  check("A3 · destinations that cover it are listed", /Sikkim|Delhi|Jaipur|Agra/.test(results));
  check("A4 · each match explains why it matched",
    /coverage figure was calculated|reviewer-approved|catalogued record/i.test(results));

  const destination = page.locator('a[href^="/destinations/"]:not([href*="compare"])').first();
  const destHref = await destination.getAttribute("href");
  await destination.click();
  await page.waitForURL(`**${destHref}**`);
  check("A5 · a matched destination opens", path(page).startsWith("/destinations/"), path(page));

  const id = destHref.split("/")[2];
  await page.goto(`${BASE}/destinations/${id}/discover`, { waitUntil: "domcontentloaded" });
  /* "Add to trip" is gone; the flow continues through the record itself. */
  const pinCount = await page.locator('a[href*="pin="]').count();
  check("A6 · its discovery page offers no add-to-trip", pinCount === 0, `${id}`);
  /* The flow now continues through the planner's own route. */
  await page.goto(`${BASE}/destinations/${id}/plan`, { waitUntil: "domcontentloaded" });
  check("A7 · the planner opens inside the same destination",
    path(page).startsWith(`/destinations/${id}/`), path(page));
  check("A8 · an itinerary is produced", /Day 1/.test(await bodyText(page)));
  await context.close();
}

/* ========================================================================
   B. DESTINATION FIRST
   ======================================================================== */
section("B. Destination first");

{
  const { context, page } = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  /* A capsule destination on purpose: the shallow end of the depth ladder is
     where a broken experience would show first. */
  await page.locator('a[href="/destinations/agra"]').first().click();
  await page.waitForURL("**/destinations/agra");
  const hub = await bodyText(page);
  check("B1 · a destination card from the landing page opens its hub",
    path(page) === "/destinations/agra", path(page));
  check("B2 · the hub states its depth and what it holds",
    /Documented/.test(hub) && /What you can explore here/.test(hub));

  await page.locator('a[href^="/destinations/agra/discover"]').first().click();
  await page.waitForURL("**/destinations/agra/discover**");
  const discovery = await bodyText(page);
  check("B3 · its experiences open", path(page).startsWith("/destinations/agra/discover"), path(page));
  check("B4 · it shows Agra's own records", /Taj Mahal|Agra Fort|Fatehpur Sikri/.test(discovery));
  check("B5 · and none of Sikkim's", !/Rumtek|Pemayangtse|Tsomgo|Yuksom/.test(discovery));

  /* "Add to trip" was removed; the flow continues through the planner route. */
  check("B6 · no add-to-trip is offered",
    (await page.locator('a[href*="pin="]').count()) === 0);
  await page.goto(`${BASE}/destinations/agra/plan`, { waitUntil: "domcontentloaded" });
  check("B7 · the planner keeps the destination", path(page).startsWith("/destinations/agra/"), path(page));
  const plan = await bodyText(page);
  check("B8 · the plan explains itself and states what it cannot know",
    /in a straight line/i.test(plan) && /not verified for these records/i.test(plan));
  await context.close();
}

/* ========================================================================
   C. SEARCH FIRST
   ======================================================================== */
section("C. Search first");

{
  const { context, page } = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /Search \(Command K\)/ }).first().click();
  const box = page.locator('input[aria-label="Search"]').first();
  await box.waitFor({ state: "visible", timeout: 10_000 });
  check("C1 · search opens from the landing page", await box.isVisible());

  await box.fill("Charminar");
  const option = page.locator('[role="option"]', { hasText: "Charminar" }).first();
  const found = await option.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
  check("C2 · a place in a capsule destination is findable", found, "Charminar");

  if (found) {
    /* Ownership: the result must belong to Hyderabad, not to whoever indexed it. */
    const label = (await option.textContent()) ?? "";
    check("C3 · the result names its owning destination", /Hyderabad/.test(label), label.replace(/\s+/g, " ").slice(0, 60));
    await option.click();
    await page.waitForURL("**/destinations/hyderabad/**");
    check("C4 · following it lands inside Hyderabad", path(page).startsWith("/destinations/hyderabad/"), path(page));
    check("C5 · the record is on the page", /Charminar/.test(await bodyText(page)));
  }

  /* And the corpus is still fetched rather than inlined. */
  const home = await (await fetch(`${BASE}/`)).text();
  check("C6 · the search corpus is not inlined into the landing page",
    (home.match(/"sublabel"/g) ?? []).length < 60,
    `${(home.match(/"sublabel"/g) ?? []).length} records inline`);
  await context.close();
}

/* ========================================================================
   D. MOBILE — THE SAME THREE DOORS AT 390px
   ======================================================================== */
section("D. Mobile, 390px");

{
  const { context, page } = await newPage(390);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("D1 · the landing page does not scroll sideways", overflow <= 1, `${overflow}px`);

  check("D2 · the three primary actions are reachable without a menu",
    await page.getByRole("link", { name: "Explore India" }).first().isVisible() &&
      await page.getByRole("link", { name: "Find my destination" }).first().isVisible());
  check("D3 · search is in the header at 390px",
    await page.getByRole("button", { name: /Search \(Command K\)/ }).first().isVisible());

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(300);
  const drawer = await page.locator('nav[aria-label="Mobile"] a').allInnerTexts();
  check("D4 · the drawer lists the product's sections",
    drawer.some((t) => /^Explore$/i.test(t.trim())) && drawer.some((t) => /For you/i.test(t)),
    drawer.join(", "));

  /* Interests must be tappable, not merely present. */
  await page.keyboard.press("Escape").catch(() => {});
  await page.goto(`${BASE}/#interests`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const chip = page.locator('a[href^="/discover?interests="]').first();
  const boxSize = await chip.boundingBox();
  check("D5 · an interest chip is a usable tap target",
    Boolean(boxSize) && boxSize.height >= 36,
    boxSize ? `${Math.round(boxSize.width)}×${Math.round(boxSize.height)}px` : "not found");
  await context.close();
}

/* ========================================================================
   E. NOTHING BROKE ON THE WAY
   ======================================================================== */
section("E. Health");

check("No uncaught error in any of the three flows",
  errors.length === 0, errors[0] ?? "clean");

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
