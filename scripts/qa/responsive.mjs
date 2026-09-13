/**
 * Every width the brief names, on the routes that carry the product.
 *
 * `qa:ux` already checks 390, 768 and 1440. This widens that to the nine
 * widths actually asked for — 320 at the bottom, where a 375-designed layout
 * usually breaks first, and 1920 at the top, where a max-width that was never
 * set shows up as a line of text the full width of the monitor.
 *
 * The test is horizontal overflow, because it is the one responsive failure
 * that is unambiguous: a page whose scrollWidth exceeds its viewport has
 * content the reader cannot reach without scrolling sideways, and no design
 * intends that.
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
/* 360 is named by the Culture brief; the rest were already covered. */
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const ROUTES = [
  "/",
  "/destinations",
  "/destinations/sikkim",
  "/destinations/jaipur",
  "/destinations/varanasi",
  "/discover",
  "/plan",
  "/stories",
  "/history",
  "/destinations/compare?ids=sikkim,jaipur,varanasi",
  /* The newest layouts, and so the ones most worth checking: a culture shelf
     grid, a story index and a long-form article. */
  "/destinations/varanasi/culture",
  "/destinations/jaipur/culture",
  "/destinations/varanasi/stories",
  "/destinations/varanasi/stories/craft-banarasi-sari",
];

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed++; return; }
  failures.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const route of ROUTES) {
    /* DOM, not "load": overflow is a property of the markup and the CSS, and
       every photograph sits in an aspect-ratio box, so waiting for 140 pages'
       worth of images changed nothing but the clock — 39 minutes on the
       eighteen-destination build, and the battery's 15-minute cap killed it. */
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    /* Let late-loading media settle; a lazily-sized image can widen a row. */
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${width}px ${route}: no horizontal scroll`, overflow <= 1, `${overflow}px over`);
  }
  await context.close();
}
await browser.close();

for (const line of failures) console.log(line);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
