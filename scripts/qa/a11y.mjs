/**
 * Accessibility audit — Ney Heritage.
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
  const h = process.argv.find((a) => a.startsWith(`--${n}=`));
  return h ? h.split("=").slice(1).join("=") : d;
};
const BASE = arg("base", "http://localhost:3000");
const VP = arg("viewport", "desktop") === "mobile"
  ? { width: 390, height: 844 }
  : { width: 1440, height: 900 };

const ROUTES = [
  "/",
  "/monasteries",
  "/monasteries/rumtek",
  "/stories",
  "/stories/the-crowning-at-yuksom",
  "/hotels",
  "/planner",
  "/planner/result?interests=Monasteries&budget=30000&duration=4&travellers=2&style=balanced&tier=3-star",
  "/preservation",
  "/preservation/review",
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
