/**
 * Render the product and keep the pictures.
 *
 * DOM tests say a page served and a heading exists. They do not say the hero
 * is a decapitated tower, the cards are black rectangles, or the timeline is
 * a wall of text — every one of which this programme found only by looking.
 * This captures the seven benchmark destinations across their modules at a
 * desktop and a phone width, plus the global surfaces, so a person (or the
 * next session) can look.
 *
 * It also reports two things a screenshot cannot show: images that never
 * loaded (`naturalWidth === 0`) and horizontal overflow, per page.
 *
 *   npm run start &
 *   node scripts/qa/visual-capture.mjs [--out reports/visual]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const outIndex = process.argv.indexOf("--out");
const OUT = outIndex > -1 ? process.argv[outIndex + 1] : "reports/visual";

const BENCHMARK = ["sikkim", "jaipur", "mumbai", "varanasi", "delhi", "agra", "kochi"];
const MODULES = ["", "/stories", "/culture", "/history", "/archive"];
const GLOBAL = ["/", "/destinations", "/discover", "/stories", "/history"];
const WIDTHS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];
let captured = 0;

for (const viewport of WIDTHS) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();

  const routes = [
    ...GLOBAL,
    ...BENCHMARK.flatMap((id) => MODULES.map((m) => `/destinations/${id}${m}`)),
  ];

  for (const route of routes) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 90_000 }).catch(() => null);
    if (!response || response.status() !== 200) {
      /* A 404 module is an honest absence, not a defect — recorded, not failed. */
      /* A per-destination MODULE may 404 honestly (no corpus). A global route
         or a destination hub may not. */
      const honest404 = /^\/destinations\/[^/]+\/(stories|culture|history|archive)$/.test(route);
      if (response?.status() === 404 && honest404) continue;
      problems.push(`${viewport.name} ${route}: ${response ? `HTTP ${response.status()}` : "no response"}`);
      continue;
    }
    /* Scroll through so lazy images request, then settle. */
    await page.evaluate(async () => {
      const step = 700;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    /* Native lazy images below the fold are never REQUESTED by a programmatic
       scroll pass — a probe found 25 of Paris's 50 at phone width with
       `complete === false`, visible, in flow, and no request made. That is
       not a broken image; it is a browser waiting for a human. Force them
       eager, then wait for every image to finish: anything still incomplete
       or 0px wide after 15 s has a real problem worth the report. */
    await page.evaluate(() => { for (const i of document.images) i.loading = "eager"; });
    await page
      .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(500);

    const facts = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      /* Forced eager above, so incomplete here means a request that never
         finished, and 0px means one that failed. */
      broken: [...document.querySelectorAll("img")].filter((i) => !i.complete || i.naturalWidth === 0).length,
      images: document.querySelectorAll("img").length,
      height: document.body.scrollHeight,
    }));
    if (facts.overflow > 1) problems.push(`${viewport.name} ${route}: ${facts.overflow}px horizontal overflow`);
    if (facts.broken > 0) problems.push(`${viewport.name} ${route}: ${facts.broken} of ${facts.images} images failed to load`);

    const name = `${viewport.name}${route === "/" ? "_home" : route.replace(/\//g, "_")}`;
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    /* The first viewport too. A 22,000px phone page scaled to fit is a
       texture, not a screenshot; the fold is what a visitor actually judges. */
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `${name}_top.png`), fullPage: false });
    captured++;
  }
  await context.close();
}
await browser.close();

/* A run that captured nothing has verified nothing. This reported "no
   overflow, no broken images" on 0 screenshots once, while the server was
   returning 404 to every route. */
if (captured === 0) problems.push("captured 0 screenshots — the server answered no route with 200");
console.log(`\n${captured} screenshots -> ${OUT}`);
for (const line of problems) console.log(`PROBLEM  ${line}`);
console.log(`\n${problems.length === 0 ? "no overflow, no broken images" : `${problems.length} problems`}`);
process.exit(problems.length > 0 ? 1 : 0);
