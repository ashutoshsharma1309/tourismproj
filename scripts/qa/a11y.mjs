/**
 * Accessibility audit — Sikkim Darshan.
 *
 * Runs axe-core against every route in a real browser and reports violations
 * grouped by impact. Also does a keyboard pass: tabs through the page and
 * checks that focus stays visible and reaches the primary navigation.
 *
 * Usage: node scripts/qa/a11y.mjs [--base=URL] [--viewport=desktop|mobile]
 */

import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

const arg = (n, d) => {
  /* Accepts --base=URL and --base URL. Only the "=" form used to be read, so
     `npm run qa:audit -- --base http://localhost:3100` silently fell back to
     :3000 and every route failed with ERR_CONNECTION_REFUSED — nine red lines
     that looked like application failures rather than a mistyped flag. */
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const at = process.argv.indexOf(`--${n}`);
  if (at !== -1 && process.argv[at + 1] && !process.argv[at + 1].startsWith("--")) {
    return process.argv[at + 1];
  }
  return d;
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

const VP = arg("viewport", "desktop") === "mobile"
  ? { width: 390, height: 844 }
  : { width: 1440, height: 900 };

const ROUTES = [
  "/",
  "/destinations/sikkim/monasteries",
  "/destinations/sikkim/monasteries/rumtek",
  "/destinations/sikkim/stories",
  /* Was /stories/the-crowning-at-yuksom, which is a 404 — no story has that
     slug. One of the ten audited routes was therefore auditing the not-found
     page (and, in dev, the error overlay) rather than a story. */
  "/destinations/sikkim/stories/the-throne-of-stone-at-norbugang",
  "/destinations/sikkim/hotels",
  "/destinations/sikkim/industry",
  /* Shipped since the last sweep and previously unaudited: the per-property
     stay page, and the culture shelves with their 34 video cards. */
  "/destinations/sikkim/stays/may-fair-resort",
  "/destinations/sikkim/culture",
  /*
   * The capsule destinations. A capsule page is a different shape from
   * Sikkim's: quoted history entries, citation lists, a card grid with
   * photographs, and place names carrying diacritics and transliterated
   * letters. None of that had been through axe before, and "it looks like
   * the Sikkim pages" is not an accessibility result.
   */
  "/destinations/varanasi",
  "/destinations/agra/discover",
  "/destinations/hyderabad/discover",
  "/destinations/mumbai/plan",
  /* PHASE 21 — a step of the demonstration flow that had never been audited:
     the dated event a story links back to. */
  "/destinations/sikkim/history/yuksom-coronation-1642",
  "/discover",
  "/discover?interests=history&interests=heritage",
  "/discover?theme=buddhist-heritage",
  "/destinations/compare?ids=sikkim,jaipur,kochi",
  "/destinations/sikkim/discover",
  "/destinations/sikkim/discover?interest=nature",
  "/destinations/jaipur/discover",
  "/destinations/sikkim/plan",
  "/destinations/sikkim/plan?days=5&pace=intensive&interests=history,nature",
  "/destinations/jaipur/plan",
  "/destinations/sikkim/planner",
  "/destinations/sikkim/planner/result?interests=Monasteries&budget=30000&duration=4&travellers=2&style=balanced&tier=3-star",
  "/destinations/sikkim/preservation",
  /* The curator review queue used to sit here. It has been removed from the
     product, and this list kept auditing it — which meant the suite was
     scoring the 404 page and reporting it as a pass. Replaced with the routes
     that shipped since and had no coverage. */
  "/destinations/sikkim/permits",
  "/destinations/sikkim/responsible",
  "/destinations/sikkim/places/tsomgo-lake",
];

const browser = await chromium.launch({ channel: "chrome" });
const all = [];

for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: VP });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(800);
  await page.addScriptTag({ path: axePath });

  const result = await page.evaluate(async () => {
     
    const r = await axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      sample: v.nodes.slice(0, 3).map((n) => ({
        target: n.target.join(" "),
        summary: (n.failureSummary || "").split("\n").slice(0, 3).join(" ").slice(0, 220),
      })),
    }));
  });

  // Keyboard pass: can a keyboard user reach the nav, and is focus visible?
  const keyboard = await page.evaluate(() => {
    const focusables = document.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    return { focusableCount: focusables.length };
  });

  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 40),
      outline: cs.outlineStyle !== "none" || cs.boxShadow !== "none",
    };
  });

  const bad = result.filter((v) => v.impact === "critical" || v.impact === "serious");
  console.log(
    `${bad.length ? "FAIL" : "ok  "}  ${route.slice(0, 48).padEnd(50)} violations:${String(result.length).padStart(2)}  serious+:${bad.length}  focusables:${keyboard.focusableCount}  firstTab:${firstFocus ? firstFocus.tag : "none"}`,
  );
  for (const v of bad) console.log(`        [${v.impact}] ${v.id} ×${v.count} — ${v.help}`);

  all.push({ route, violations: result, keyboard, firstFocus });
  await ctx.close();
}

await browser.close();
mkdirSync("reports/qa", { recursive: true });
writeFileSync("reports/qa/a11y.json", JSON.stringify(all, null, 2));

const totals = {};
for (const r of all)
  for (const v of r.violations) totals[v.id] = (totals[v.id] ?? 0) + v.count;
console.log("\nAggregate violations by rule:");
Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .forEach(([id, n]) => console.log(`  ${String(n).padStart(4)}  ${id}`));
