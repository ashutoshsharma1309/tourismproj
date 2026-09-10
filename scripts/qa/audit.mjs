/**
 * Frontend audit harness — Sikkim Darshan.
 *
 * Loads every route in a FRESH browser context with a cold HTTP cache, so what
 * it measures is the first-visit experience, not a warmed one. For each route
 * it records console errors, failed requests, and every <img> that finished
 * layout with naturalWidth === 0 (the browser's own definition of a broken
 * image), then writes a screenshot.
 *
 * Usage: node scripts/qa/audit.mjs [--viewport=desktop|mobile] [--base=URL]
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  /* Accepts --base=URL and --base URL. Only the "=" form used to be read, so
     `npm run qa:audit -- --base http://localhost:3100` silently fell back to
     :3000 and every route failed with ERR_CONNECTION_REFUSED — nine red lines
     that looked like application failures rather than a mistyped flag. */
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const at = process.argv.indexOf(`--${name}`);
  if (at !== -1 && process.argv[at + 1] && !process.argv[at + 1].startsWith("--")) {
    return process.argv[at + 1];
  }
  return fallback;
};

/* QA_BASE_URL lets the whole battery target one server. Phase 19 needed it:
   a second, stale `next start` was sharing this repo's .next directory, and a
   suite that silently defaulted to port 3000 measured the wrong build. */
const BASE = arg("base", process.env.QA_BASE_URL ?? "http://localhost:3000");

/* Fail fast and clearly when nothing is serving, instead of attributing the
   connection error to every route under test. */
try {
  const probe = await fetch(BASE, { method: "GET" });
  if (!probe.ok && probe.status >= 500) throw new Error(`HTTP ${probe.status}`);
} catch (error) {
  console.error(
    `\nCannot reach ${BASE} — ${error instanceof Error ? error.message : error}\n` +
      `Start the dev server, or pass the right port:\n` +
      `  npm run ${process.env.npm_lifecycle_event ?? "qa:audit"} -- --base=http://localhost:3100\n`,
  );
  process.exit(1);
}

const VIEWPORT_NAME = arg("viewport", "desktop");
const ONLY = arg("only", null);

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  small: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
  mobileL: { width: 430, height: 932 },
  mobileS: { width: 375, height: 812 },
};

const OUT = `reports/qa/${VIEWPORT_NAME}`;
mkdirSync(OUT, { recursive: true });

/** Pull the real route list out of the running app rather than hardcoding it. */
async function discoverRoutes(page) {
  const routes = new Set([
    "/",
    "/monasteries",
    "/stories",
    "/hotels",
    "/planner",
    "/preservation",
    "/permits",
    "/responsible",
    "/planner/result?interests=Monasteries&budget=30000&duration=4&travellers=2&style=balanced&tier=3-star",
    "/this-route-does-not-exist",
  ]);

  // Crawl the index pages AND the global chrome, so routes added later (a new
  // section, a new nav entry) get audited without editing this list.
  const DETAIL_PREFIXES = ["/monasteries/", "/stories/", "/history/"];
  for (const index of ["/", "/monasteries", "/stories", "/history"]) {
    const res = await page.goto(`${BASE}${index}`, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || res.status() >= 400) continue;
    routes.add(index);
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const h of hrefs) {
      if (!h || !h.startsWith("/")) continue;
      const clean = h.split("#")[0];
      if (!clean) continue;
      if (DETAIL_PREFIXES.some((p) => clean.startsWith(p))) routes.add(clean);
      else routes.add(clean); // nav, footer and CTA targets count too
    }
  }
  return [...routes];
}

/** Everything the browser knows about one <img> after the page has settled. */
const IMAGE_PROBE = () =>
  Array.from(document.querySelectorAll("img")).map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      src: el.currentSrc || el.src || "",
      alt: el.getAttribute("alt"),
      complete: el.complete,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      loading: el.getAttribute("loading"),
      width: Math.round(r.width),
      height: Math.round(r.height),
      inViewport: r.top < innerHeight && r.bottom > 0 && r.width > 0,
      hidden: cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0",
    };
  });

async function auditRoute(browser, route) {
  // The 404 probe is SUPPOSED to 404 — that is the custom not-found page doing
  // its job, so its own document response and console note are not failures.
  const expects404 = route.includes("does-not-exist");

  // Fresh context per route: no cookies, no storage, no carried-over cache.
  const context = await browser.newContext({
    viewport: VIEWPORTS[VIEWPORT_NAME],
    isMobile: VIEWPORT_NAME.startsWith("mobile"),
    hasTouch: VIEWPORT_NAME.startsWith("mobile"),
    deviceScaleFactor: 1,
    bypassCSP: false,
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failed = [];
  const responses = [];

  const page = await context.newPage();
  await page.route("**/*", (r) => r.continue()); // force network, no memory cache reuse
  page.on("console", (m) => {
    if (m.type() === "error") {
      if (expects404 && /404/.test(m.text())) return;
      consoleErrors.push(m.text().slice(0, 400));
    }
    if (m.type() === "warning" && /hydrat|Warning:/i.test(m.text()))
      consoleErrors.push(`[warn] ${m.text().slice(0, 400)}`);
  });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 400)));
  page.on("requestfailed", (r) =>
    failed.push({ url: r.url().slice(0, 200), reason: r.failure()?.errorText }),
  );
  page.on("response", (r) => {
    if (r.status() >= 400) {
      if (expects404 && r.request().resourceType() === "document") return;
      responses.push({ url: r.url().slice(0, 200), status: r.status(), type: r.request().resourceType() });
    }
  });

  const started = Date.now();
  let navError = null;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
  } catch (e) {
    navError = String(e).split("\n")[0];
  }
  const loadMs = Date.now() - started;

  // Give lazy/animated content a beat, then scroll the full page so anything
  // below the fold is actually asked to load before we judge it.
  await page.waitForTimeout(1200);
  // Scroll at human speed. Flinging a viewport-height per 120ms outruns
  // Chrome's lazy-load thresholds, so images get skipped and then reported
  // "pending" — a defect the harness invented rather than found.
  //
  // Every evaluate below is guarded: a dev-server hot reload can destroy the
  // execution context mid-call, and that is a property of the harness's timing,
  // not a defect in the page.
  const safe = async (fn, fallback) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  await safe(() => page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        y += 400;
        scrollTo(0, y);
        if (y < document.body.scrollHeight) setTimeout(step, 220);
        else setTimeout(resolve, 1200);
      };
      step();
    });
  }), null);

  // Poll until every image has resolved one way or the other. A fixed sleep
  // reports "pending" for images that were merely still downloading, which
  // makes the harness cry wolf; waiting for settle distinguishes "slow" from
  // "broken", and only the latter is a defect.
  for (let i = 0; i < 40; i++) {
    const s = await safe(
      () => page.evaluate(() => [...document.querySelectorAll("img")].every((x) => x.complete)),
      false,
    );
    if (s) break;
    await page.waitForTimeout(500);
  }

  const images = await safe(() => page.evaluate(IMAGE_PROBE), []);
  const broken = images.filter((i) => i.complete && i.naturalWidth === 0 && !i.hidden);
  const pending = images.filter((i) => !i.complete && !i.hidden);

  // Horizontal overflow is the classic mobile failure.
  const overflow = await safe(
    () =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        offenders: Array.from(document.querySelectorAll("*"))
          .filter(
            (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 2,
          )
          .slice(0, 8)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`),
      })),
    { scrollWidth: 0, clientWidth: 0, offenders: [] },
  );

  const title = await page.title().catch(() => "");
  const slug = route.replace(/[^\w-]/g, "_").slice(0, 60) || "root";
  // Back to the top so screenshots are comparable run to run.
  await safe(() => page.evaluate(() => scrollTo(0, 0)), null);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${slug}.png`, fullPage: false }).catch(() => {});

  await context.close();
  return {
    route,
    title,
    loadMs,
    navError,
    imageCount: images.length,
    broken,
    pending,
    consoleErrors,
    pageErrors,
    failed,
    http4xx5xx: responses,
    overflow: overflow.scrollWidth > overflow.clientWidth + 2 ? overflow : null,
  };
}

const browser = await chromium.launch({ channel: "chrome" });
const probe = await browser.newContext();
const probePage = await probe.newPage();
const routes = ONLY ? ONLY.split(",") : await discoverRoutes(probePage);
await probe.close();

console.log(`Auditing ${routes.length} routes at ${VIEWPORT_NAME} (${JSON.stringify(VIEWPORTS[VIEWPORT_NAME])})\n`);

const results = [];
for (const route of routes) {
  const r = await auditRoute(browser, route);
  results.push(r);
  const flags = [
    r.navError && "NAV-FAIL",
    r.broken.length && `${r.broken.length} broken img`,
    r.pending.length && `${r.pending.length} pending img`,
    r.pageErrors.length && `${r.pageErrors.length} page err`,
    r.consoleErrors.length && `${r.consoleErrors.length} console err`,
    r.http4xx5xx.length && `${r.http4xx5xx.length} http err`,
    r.failed.length && `${r.failed.length} req fail`,
    r.overflow && "H-OVERFLOW",
  ].filter(Boolean);
  console.log(
    `${flags.length ? "FAIL" : "ok  "}  ${route.padEnd(46)} ${String(r.loadMs).padStart(6)}ms  imgs:${String(r.imageCount).padStart(3)}  ${flags.join(", ")}`,
  );
}

await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(`\nWrote ${OUT}/results.json and ${results.length} screenshots.`);
