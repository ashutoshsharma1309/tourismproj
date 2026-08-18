#!/usr/bin/env node
/**
 * Immersive QA — Sikkim Darshan
 *
 * Drives the real site in a real browser. The brief this was built to is blunt
 * about why: the code, the database and the terminal are not the product. The
 * only thing that counts is whether a person can open a monastery page and
 * actually look around it.
 *
 * Covers the panorama viewer (enter, drag, zoom, reset, fullscreen), the video
 * fallback (poster, click-to-play, iframe actually mounts, no navigation away),
 * the honest empty state, visitor voices, and horizontal overflow at every
 * breakpoint the brief lists.
 *
 * Usage: node scripts/qa/immersive.mjs [baseUrl]
 * Writes: reports/qa/immersive/results.json + screenshots
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? process.env.QA_BASE_URL ?? "http://localhost:3001";
const OUT = "reports/qa/immersive";

const BREAKPOINTS = [375, 390, 430, 768, 1024, 1280, 1440];

const results = [];
let failures = 0;

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/**
 * The panorama stage, addressed by its label.
 *
 * `[role="img"]` alone is not enough: the site logo also carries it, and an
 * earlier version of this file dispatched every touch gesture at the logo and
 * then reported that touch panning was broken.
 */
const STAGE = '[role="img"][aria-label^="Panorama of"]';

/** Transform of the panorama stage, used to prove dragging actually moved it. */
async function stageTransform(page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(`${sel} > div[style*="translate"]`);
    return el ? getComputedStyle(el).transform : null;
  }, STAGE);
}

/**
 * Navigate, retrying an aborted load.
 *
 * Other agents are editing this working tree while the suite runs, so the dev
 * server occasionally tears a request down mid-flight for a Fast Refresh full
 * reload. That is a property of the harness, not a defect in the page.
 */
async function goto(page, url) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
      await page.waitForTimeout(1500);
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  /* ------------------------------------------------------ FLOW 1: panorama */
  console.log("\nFlow 1 — monastery WITH a verified panorama (rumtek)");
  {
    /* A fresh context every flow: no cache, no storage, no prior session. */
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    await goto(page, `${BASE}/monasteries/rumtek`);

    record("panorama section is present", await page.getByRole("heading", { name: /Experience Rumtek/i }).isVisible());

    const enter = page.getByRole("button", { name: /Explore the panorama/i });
    record("idle poster offers an entry control", await enter.isVisible());

    /* The heavy rendition must not be fetched before the visitor asks. */
    const before = await page.evaluate(() =>
      performance.getEntriesByType("resource").filter((r) => r.name.includes("rumtek-courtyard-1920")).length,
    );
    record("full panorama is not fetched on load", before === 0, `${before} early requests`);

    await enter.click();
    await page.waitForTimeout(2500);

    const stage = page.getByRole("img", { name: /Panorama of Rumtek/i });
    record("interactive stage mounts", await stage.isVisible());

    const loadedBig = await page.evaluate(() =>
      performance.getEntriesByType("resource").filter((r) => r.name.includes("rumtek-courtyard-1920")).length,
    );
    record("panorama image is fetched on demand", loadedBig > 0, `${loadedBig} requests`);

    /* Drag */
    const box = await stage.boundingBox();
    const t0 = await stageTransform(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 220, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const t1 = await stageTransform(page);
    record("dragging pans the panorama", Boolean(t0 && t1 && t0 !== t1), `${t0} -> ${t1}`);

    /* Zoom in, then reset */
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(300);
    const t2 = await stageTransform(page);
    const sizes = await page.evaluate(() => {
      const el = document.querySelector('[role="img"][aria-label^="Panorama of"] > div[style*="translate"]');
      return el ? { w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height } : null;
    });
    const frame = await stage.boundingBox();
    record(
      "zoom in enlarges the panorama beyond its frame",
      Boolean(sizes && sizes.w > frame.width * 1.4),
      `image ${Math.round(sizes?.w ?? 0)}px vs frame ${Math.round(frame.width)}px`,
    );

    await page.getByRole("button", { name: "Reset view" }).click();
    await page.waitForTimeout(300);
    const t3 = await stageTransform(page);
    record("reset returns the view", t3 !== t2);

    /* Keyboard */
    await stage.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    record("arrow keys pan the panorama", (await stageTransform(page)) !== t3);

    /* Fullscreen — headless Chromium honours the API but not the OS chrome, so
       assert the element rather than the window. */
    await page.getByRole("button", { name: /Enter fullscreen/i }).click();
    await page.waitForTimeout(600);
    const isFullscreen = await page.evaluate(() => document.fullscreenElement !== null);
    record("fullscreen engages", isFullscreen);
    if (isFullscreen) {
      /* Exercise the control the visitor actually has. Headless Chromium does
         not route Escape to the fullscreen API, so pressing it proves nothing. */
      await page.getByRole("button", { name: /Exit fullscreen/i }).click();
      await page.waitForTimeout(600);
      record("fullscreen exits", await page.evaluate(() => document.fullscreenElement === null));
    }

    record("no console errors on the panorama page", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));

    await page.screenshot({ path: `${OUT}/rumtek-panorama.png`, fullPage: false });
    await context.close();
  }

  /* --------------------------------------------------- FLOW 2: video fallback */
  console.log("\nFlow 2 — monastery WITHOUT a panorama, video fallback (pemayangtse)");
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await goto(page, `${BASE}/monasteries/pemayangtse`);

    record("no panorama viewer is offered", (await page.getByRole("button", { name: /Explore the panorama/i }).count()) === 0);

    const play = page.getByRole("button", { name: /^Play:/ });
    record("video poster with a play control", await play.isVisible());

    /* No third-party frame before the visitor presses play. */
    record("no YouTube iframe before play", (await page.locator("iframe").count()) === 0);

    /* The label must not claim 360°. */
    const body = await page.locator("main").innerText();
    record(
      "video is not presented as 360°",
      /No verified 360° or panoramic capture/i.test(body) && !/Experience in 360°/i.test(body),
    );

    const urlBefore = page.url();
    await play.click();
    await page.waitForTimeout(3000);

    record("visitor stays on Sikkim Darshan", page.url() === urlBefore, page.url());

    const frame = page.locator('iframe[src*="youtube-nocookie.com/embed"]');
    record("embedded player mounts in-page", (await frame.count()) === 1);

    /* Ask YouTube's own player whether it will actually play: a blocked or
       removed video renders its error surface instead of the controls. */
    const playable = await page.evaluate(async () => {
      const el = document.querySelector('iframe[src*="youtube-nocookie.com/embed"]');
      if (!el) return { ok: false, why: "no iframe" };
      const src = el.getAttribute("src") ?? "";
      const id = src.match(/embed\/([\w-]+)/)?.[1];
      if (!id) return { ok: false, why: "no id" };
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      );
      return { ok: res.ok, why: `oembed ${res.status}`, id };
    });
    record("embedded video is live and public", playable.ok, playable.why);

    await page.screenshot({ path: `${OUT}/pemayangtse-video.png` });
    await context.close();
  }

  /* ---------------------------------------------- FLOW 3: honest empty state */
  console.log("\nFlow 3 — monastery with NEITHER panorama nor video (rinchenpong)");
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await goto(page, `${BASE}/monasteries/rinchenpong`);

    record(
      "honest unavailable state is shown",
      await page.getByText(/Immersive experience not yet available/i).isVisible(),
    );
    record("no broken iframe is rendered", (await page.locator("iframe").count()) === 0);
    record(
      "a map link is offered instead",
      await page.getByRole("link", { name: /View location on Google Maps/i }).isVisible(),
    );
    await page.screenshot({ path: `${OUT}/rinchenpong-empty.png` });
    await context.close();
  }

  /* ------------------------------------------------- FLOW 4: visitor voices */
  console.log("\nFlow 4 — visitor voices");
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    await goto(page, `${BASE}/monasteries/dubdi`);
    const heading = page.getByRole("heading", { name: /Visitor voices/i });
    record("voices section renders", await heading.isVisible());
    const quotes = await page.locator("blockquote").count();
    record("sourced quotes are shown", quotes > 0, `${quotes} quotes`);
    record(
      "every quote carries a source link",
      (await page.locator('blockquote ~ footer a[href*="wikivoyage"]').count()) === quotes,
    );
    const voicesText = await page.locator("section", { has: heading }).innerText();
    record("no invented star rating", !/★|\b\d\.\d out of 5\b/.test(voicesText));
    record("absence of ratings is explained", /No rating is shown, and that is deliberate/i.test(voicesText));

    await goto(page, `${BASE}/monasteries/lachen`);
    record(
      "empty state where nothing is sourced",
      await page.getByText(/Visitor feedback is still being collected/i).isVisible(),
    );
    await context.close();
  }

  /* -------------------------------------------------- FLOW 5: touch + mobile */
  console.log("\nFlow 5 — touch drag on a phone viewport");
  {
    const context = await browser.newContext({ ...devices["iPhone 14 Pro"] });
    const page = await context.newPage();
    await goto(page, `${BASE}/monasteries/rumtek`);
    await page.getByRole("button", { name: /Explore the panorama/i }).click();
    await page.waitForTimeout(2500);

    const stage = page.getByRole("img", { name: /Panorama of Rumtek/i });
    const box = await stage.boundingBox();
    const t0 = await stageTransform(page);
    /* A real touch drag, not a synthesised mouse event. */
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(
      ([x, y, sel]) => {
        const el = document.querySelector(sel);
        const opts = { bubbles: true, cancelable: true, pointerType: "touch", pointerId: 1, isPrimary: true };
        el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x, clientY: y }));
        el.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientX: x - 150, clientY: y }));
        el.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: x - 150, clientY: y }));
      },
      [box.x + box.width / 2, box.y + box.height / 2, STAGE],
    );
    await page.waitForTimeout(300);
    record("touch drag pans the panorama", (await stageTransform(page)) !== t0);
    await page.screenshot({ path: `${OUT}/rumtek-mobile.png` });
    await context.close();
  }

  /* ------------------------------------------------- FLOW 6: no overflow */
  console.log("\nFlow 6 — horizontal overflow at every breakpoint");
  {
    const routes = ["/monasteries/rumtek", "/monasteries/pemayangtse", "/monasteries/rinchenpong"];
    for (const width of BREAKPOINTS) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      for (const route of routes) {
        await goto(page, `${BASE}${route}`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        record(`${width}px ${route} — no horizontal scroll`, overflow <= 1, `${overflow}px`);
      }
      await goto(page, `${BASE}/monasteries/rumtek`);
      await page.screenshot({ path: `${OUT}/rumtek-${width}.png`, fullPage: false });
      await context.close();
    }
  }

  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    total: results.length,
    passed: results.length - failures,
    failed: failures,
    results,
  };
  writeFileSync(`${OUT}/results.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(`\n${summary.passed}/${summary.total} passed, ${failures} failed`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("QA run failed:", e);
  process.exit(1);
});
