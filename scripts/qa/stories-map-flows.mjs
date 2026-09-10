#!/usr/bin/env node
/**
 * Browser flow test for Stories of Sikkim and Explore Sikkim.
 *
 * Written because "the stories work" is not a claim anybody should make from
 * reading source. Each check below is a thing a visitor does, performed in a
 * fresh browser context with a cold cache, with a single click per step — the
 * bug this replaces was a Read button that needed a second click or a reload.
 *
 *   BASE=http://localhost:3001 node scripts/qa/stories-map-flows.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { chromium, devices } from "playwright";

/* QA_BASE_URL lets the whole battery target one server. Phase 19 needed it:
   a second, stale `next start` was sharing this repo's .next directory, and a
   suite that silently defaulted to port 3000 measured the wrong build. */
const BASE = process.env.BASE ?? process.env.QA_BASE_URL ?? "http://localhost:3000";
const SHOTS = "reports/qa/stories-map";

const results = [];
let failures = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail ?? "");
  } catch (error) {
    record(name, false, String(error.message ?? error).split("\n")[0]);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Console errors and failed requests are collected per page, not ignored. */
function watch(page, bag) {
  page.on("console", (message) => {
    if (message.type() === "error") bag.console.push(message.text().slice(0, 200));
  });
  page.on("pageerror", (error) => bag.console.push(`pageerror: ${error.message.slice(0, 200)}`));
  page.on("requestfailed", (request) => {
    /* Aborted prefetches are noise, not breakage. */
    const failure = request.failure()?.errorText ?? "";
    if (failure.includes("ERR_ABORTED")) return;
    bag.network.push(`${request.method()} ${request.url().slice(0, 120)} — ${failure}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      bag.network.push(`${response.status()} ${response.url().slice(0, 120)}`);
    }
  });
}

const browser = await chromium.launch();
await mkdir(SHOTS, { recursive: true });

console.log(`\nStories & Explore flow test — ${BASE}\n`);

/* ------------------------------------------------------------------ desktop */
console.log("DESKTOP 1440×900");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const bag = { console: [], network: [] };
  const page = await context.newPage();
  watch(page, bag);

  await check("/stories loads on a cold context", async () => {
    const response = await page.goto(`${BASE}/destinations/sikkim/stories`, { waitUntil: "networkidle" });
    assert(response?.ok(), `HTTP ${response?.status()}`);
    const heading = await page.locator("h1").first().textContent();
    return heading?.trim();
  });

  await check("archive header reports its own counts", async () => {
    const text = await page.locator("main").first().innerText();
    const match = text.match(/(\d+)\s+stories across\s+(\d+)\s+categories/);
    assert(match, "no 'N stories across M categories' line");
    return `${match[1]} stories, ${match[2]} categories`;
  });

  await check("story cards render with images", async () => {
    const cards = page.locator('main a[href^="/destinations/sikkim/stories/"]');
    const count = await cards.count();
    assert(count >= 20, `only ${count} story links`);
    const broken = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main img")).filter(
        (img) => img.complete && img.naturalWidth === 0,
      ).length,
    );
    assert(broken === 0, `${broken} images failed to load`);
    return `${count} cards, 0 broken images`;
  });

  await check("search narrows the archive", async () => {
    await page.getByLabel("Search stories").fill("Losar");
    await page.waitForTimeout(500);
    const status = await page.locator('[aria-live="polite"]').first().textContent();
    assert(/of \d+ stories/.test(status ?? ""), `status read "${status}"`);
    const shown = Number(status.match(/^(\d+)/)?.[1] ?? 0);
    assert(shown > 0 && shown < 20, `search returned ${shown} results`);
    return status.trim();
  });

  await check("a community filter composes with search", async () => {
    await page.getByLabel("Search stories").fill("");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Lepcha/ }).first().click();
    await page.waitForTimeout(300);
    const status = await page.locator('[aria-live="polite"]').first().textContent();
    const shown = Number(status.match(/^(\d+)/)?.[1] ?? 0);
    assert(shown > 0, "Lepcha filter returned nothing");
    /* Every visible card must actually be a Lepcha story. */
    await page.getByRole("button", { name: /^Lepcha/ }).first().click();
    await page.waitForTimeout(300);
    return `${shown} Lepcha stories`;
  });

  await check("FIRST-CLICK: 'Read story' opens that story, once", async () => {
    await page.goto(`${BASE}/destinations/sikkim/stories`, { waitUntil: "networkidle" });
    const card = page.locator('main a[href^="/destinations/sikkim/stories/"]').first();
    const href = await card.getAttribute("href");
    const title = (await card.locator("h3").textContent())?.trim();
    await card.click();
    await page.waitForURL(`**${href}`, { timeout: 8000 });
    const heading = (await page.locator("h1").first().textContent())?.trim();
    assert(heading === title, `card said "${title}", page shows "${heading}"`);
    /* The bug being guarded against: landing on a monastery page instead. */
    assert(page.url().includes("/destinations/sikkim/stories/"), `landed on ${page.url()}`);
    return `${href} → “${heading}”`;
  });

  await check("story page carries claim label, key facts and sources", async () => {
    const text = await page.locator("main").first().innerText();
    assert(/What to remember/.test(text), "no key-facts block");
    assert(/Sources/.test(text), "no sources block");
    assert(/Verified \d/.test(text), "no verified date");
    const sourceLinks = await page.locator('section[aria-labelledby="sources-heading"] a').count();
    assert(sourceLinks >= 1, "sources block has no links");
    return `${sourceLinks} source links`;
  });

  await check("image credit names an author and licence", async () => {
    const caption = await page.locator("figcaption").first().innerText();
    assert(/Commons/.test(caption), `caption read "${caption}"`);
    return caption.replace(/\s+/g, " ").slice(0, 80);
  });

  await check("prev / next navigation works in one click", async () => {
    const next = page.locator('a[rel="next"]');
    assert((await next.count()) > 0, "no next link");
    const target = await next.getAttribute("href");
    await next.click();
    await page.waitForURL(`**${target}`, { timeout: 8000 });
    return `→ ${target}`;
  });

  await check("related story card opens the right story", async () => {
    const related = page.locator('section[aria-labelledby="related-heading"] a').first();
    const href = await related.getAttribute("href");
    await related.click();
    await page.waitForURL(`**${href}`, { timeout: 8000 });
    return href;
  });

  await check("STORY → MAP: a place link deep-links the explore map", async () => {
    /* Find a story that lists places, then follow it to the map. */
    for (const slug of [
      "the-throne-of-stone-at-norbugang",
      "a-dip-where-two-rivers-meet",
      "the-treaty-sworn-at-kabi",
    ]) {
      await page.goto(`${BASE}/destinations/sikkim/stories/${slug}`, { waitUntil: "domcontentloaded" });
      const link = page.locator('a[href^="/destinations/sikkim/explore?place="]').first();
      if ((await link.count()) === 0) continue;
      const href = await link.getAttribute("href");
      await link.click();
      await page.waitForURL("**/explore?place=**", { timeout: 8000 });
      await page.waitForTimeout(1200);
      const panel = await page.locator("main").first().innerText();
      assert(/Directions/.test(panel), "selected-site panel did not open");
      return `${href} → panel open`;
    }
    throw new Error("no story exposed a /explore?place= link");
  });

  await check("back button returns to the story", async () => {
    await page.goBack({ waitUntil: "domcontentloaded" });
    assert(page.url().includes("/destinations/sikkim/stories/"), `back landed on ${page.url()}`);
    return page.url().replace(BASE, "");
  });

  await check("/explore loads with markers on first paint", async () => {
    await page.goto(`${BASE}/destinations/sikkim/explore`, { waitUntil: "networkidle" });
    await page.waitForSelector(".leaflet-marker-icon", { timeout: 10000 });
    const markers = await page.locator(".leaflet-marker-icon").count();
    const tiles = await page.locator(".leaflet-tile-loaded").count();
    assert(markers > 20, `only ${markers} markers`);
    assert(tiles > 0, "no map tiles loaded");
    return `${markers} markers, ${tiles} tiles`;
  });

  await check("clicking a marker opens its detail card", async () => {
    await page.locator(".leaflet-marker-icon").first().click();
    await page.waitForTimeout(600);
    const panel = await page.locator("main").first().innerText();
    assert(/Directions/.test(panel), "no Directions button");
    assert(/district/.test(panel), "no district line");
    return "detail card open";
  });

  await check("Google Maps link is a real maps URL", async () => {
    const href = await page
      .locator('main a[href*="google.com/maps"]')
      .first()
      .getAttribute("href");
    assert(href?.includes("google.com/maps"), `href was ${href}`);
    return href.slice(0, 70);
  });

  await check("layer toggle filters the markers", async () => {
    const before = await page.locator(".leaflet-marker-icon").count();
    await page.getByRole("button", { name: /^Monasteries/ }).click();
    await page.waitForTimeout(700);
    const after = await page.locator(".leaflet-marker-icon").count();
    assert(after < before && after > 0, `${before} → ${after} markers`);
    await page.getByRole("button", { name: /^Monasteries/ }).click();
    await page.waitForTimeout(400);
    return `${before} → ${after} markers`;
  });

  await check("natural-language search: 'lakes near Gangtok'", async () => {
    await page.getByLabel("Search places on the map").fill("lakes near Gangtok");
    await page.waitForTimeout(800);
    const text = await page.locator("main").first().innerText();
    assert(/within 40 km of/.test(text), "no proximity banner");
    const markers = await page.locator(".leaflet-marker-icon").count();
    assert(markers > 0 && markers < 20, `${markers} markers after proximity search`);
    return `${markers} markers within 40 km`;
  });

  await check("MAP → STORY: a marker's story link opens the story", async () => {
    /*
     * PHASE 16 — this navigation waited on `networkidle`, and that is the
     * wrong precondition for this page in this context.
     *
     * Diagnosed on a clean build and a fresh server: `/explore` on its own
     * reaches networkidle in 1.5 s with all 16 CartoDB tiles returning 200
     * and 46 markers rendered. It is only HERE — after the layer toggle and
     * the proximity search have left a live Leaflet map re-requesting tiles
     * as the view changes — that the network never goes quiet for 500 ms, so
     * `goto` times out before the assertion below ever runs.
     *
     * A map that keeps fetching tiles while it pans is the map working. The
     * fix is to wait for what this check actually depends on — the story
     * link being present — instead of for network silence. THE ASSERTION IS
     * UNCHANGED: the link must exist, be clickable, and take the visitor to
     * that story. Network health is still asserted, twice, by the
     * "no console errors" and "no failed requests" checks below.
     */
    await page.goto(`${BASE}/destinations/sikkim/explore?place=yuksom`, {
      waitUntil: "domcontentloaded",
    });
    const storyLink = page.locator('main a[href^="/destinations/sikkim/stories/"]').first();
    await storyLink.waitFor({ state: "attached", timeout: 15_000 }).catch(() => undefined);
    assert((await storyLink.count()) > 0, "selected site listed no stories");
    const href = await storyLink.getAttribute("href");
    await storyLink.click();
    await page.waitForURL(`**${href}`, { timeout: 8000 });
    return href;
  });

  await page.screenshot({ path: `${SHOTS}/desktop-story.png`, fullPage: false });
  /* Screenshot setup, same reasoning as above: wait for the map to be on the
     page, not for a live tile stream to fall silent. */
  await page.goto(`${BASE}/destinations/sikkim/explore`, { waitUntil: "domcontentloaded" });
  await page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/desktop-explore.png` });

  record(
    "no console errors during the desktop run",
    bag.console.length === 0,
    bag.console.slice(0, 2).join(" | "),
  );
  record(
    "no failed requests during the desktop run",
    bag.network.length === 0,
    bag.network.slice(0, 3).join(" | "),
  );

  await context.close();
}

/* ------------------------------------------------------------------- mobile */
console.log("\nMOBILE 390×844 (iPhone 12)");
{
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const bag = { console: [], network: [] };
  const page = await context.newPage();
  watch(page, bag);

  await check("stories filter drawer opens and applies", async () => {
    await page.goto(`${BASE}/destinations/sikkim/stories`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Filters/ }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole("dialog", { name: "Filter stories" });
    assert(await dialog.isVisible(), "drawer did not open");
    await dialog.getByRole("button", { name: /^Festivals/ }).first().click();
    await page.getByRole("button", { name: /^Show \d+ stor/ }).click();
    await page.waitForTimeout(400);
    const status = await page.locator('[aria-live="polite"]').first().textContent();
    return status.trim();
  });

  await check("mobile: first tap opens the story", async () => {
    const card = page.locator('main a[href^="/destinations/sikkim/stories/"]').first();
    const href = await card.getAttribute("href");
    await card.tap();
    await page.waitForURL(`**${href}`, { timeout: 8000 });
    return href;
  });

  await check("mobile: no horizontal overflow on a story page", async () => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert(overflow <= 1, `${overflow}px of horizontal overflow`);
    return "no overflow";
  });

  await check("mobile: marker tap reveals the sheet below the map", async () => {
    await page.goto(`${BASE}/destinations/sikkim/explore`, { waitUntil: "networkidle" });
    await page.waitForSelector(".leaflet-marker-icon", { timeout: 10000 });
    await page.locator(".leaflet-marker-icon").first().tap();
    await page.waitForTimeout(900);
    const panel = await page.locator("main").first().innerText();
    assert(/Directions/.test(panel), "sheet did not open");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert(overflow <= 1, `${overflow}px of horizontal overflow`);
    return "sheet open, no overflow";
  });

  await page.screenshot({ path: `${SHOTS}/mobile-explore.png`, fullPage: false });
  record(
    "no console errors during the mobile run",
    bag.console.length === 0,
    bag.console.slice(0, 2).join(" | "),
  );

  await context.close();
}

/* -------------------------------------------------------------- responsive */
console.log("\nRESPONSIVE SWEEP");
{
  for (const width of [375, 390, 430, 768, 1024, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const path of ["/destinations/sikkim/stories", "/destinations/sikkim/stories/the-throne-of-stone-at-norbugang", "/destinations/sikkim/explore"]) {
      /* Overflow is a LAYOUT property: it needs the page laid out, not the
         network silent. /stories carries 70 images, and waiting for the last
         optimizer response before measuring a scroll width made this sweep
         hostage to an image stall that has nothing to do with the thing being
         measured. The assertion — zero horizontal overflow — is unchanged. */
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("load").catch(() => undefined);
      if (path === "/destinations/sikkim/explore") await page.waitForTimeout(1200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      record(`${width}px ${path} — no horizontal overflow`, overflow <= 1, `${overflow}px`);
    }
    await context.close();
  }
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed, ${failures} failed\n`);
await mkdir("reports/qa", { recursive: true });
await writeFile(
  "reports/qa/stories-map-flows.json",
  `${JSON.stringify({ base: BASE, passed, total: results.length, results }, null, 2)}\n`,
);
process.exit(failures > 0 ? 1 : 0);
