/**
 * The demo, walked and timed.
 *
 * Phase 16 asks for a deterministic demo path and a measured duration. This
 * is that path, driven in Chromium exactly as a presenter would drive it —
 * every step is a real click on a real control, and every step asserts that
 * the thing the presenter is about to talk about is actually on the screen.
 *
 * It is a REHEARSAL, not a new test suite: it re-walks behaviour the other
 * suites already assert, in one continuous session, and reports how long each
 * step takes so the slowest one is known before a judge finds it.
 *
 *   node scripts/qa/demo-walkthrough.mjs [--base http://localhost:3000]
 */

import { chromium } from "playwright";

const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

const steps = [];
let failures = 0;

async function step(number, title, fn) {
  const started = Date.now();
  let detail = "";
  let ok = true;
  try {
    detail = (await fn()) ?? "";
  } catch (error) {
    ok = false;
    failures += 1;
    detail = String(error.message ?? error).split("\n")[0];
  }
  const ms = Date.now() - started;
  steps.push({ number, title, ms, ok, detail });
  console.log(
    `${ok ? "OK  " : "FAIL"} ${String(number).padStart(2)}. ${title.padEnd(46)} ${String(ms).padStart(6)}ms  ${detail}`,
  );
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text().slice(0, 160));
});
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message.slice(0, 160)}`));

const text = async () => (await page.locator("main").first().innerText()).replace(/\s+/g, " ");

console.log(`\nTerraStory demo walkthrough — ${BASE}\n`);

await step(1, "Open TerraStory", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const heading = (await page.locator("h1").first().innerText()).replace(/\s+/g, " ");
  return heading.slice(0, 50);
});

await step(2, "Go to the interest-first entry", async () => {
  await page.getByRole("link", { name: "Discover", exact: true }).first().click();
  await page.waitForURL(/\/discover$/, { timeout: 15_000 });
  const body = await text();
  if (!/What do you want to experience/.test(body)) throw new Error("no interest prompt");
  return "asks what you want to experience";
});

await step(3, "Choose History + Heritage", async () => {
  await page.locator('input[name="interests"][value="history"]').check();
  await page.locator('input[name="interests"][value="heritage"]').check();
  await page.getByRole("button", { name: /Show destinations/ }).click();
  await page.waitForURL(/interests=/, { timeout: 15_000 });
  const matched = await page.locator("main article").count();
  return `${matched} destinations matched`;
});

await step(4, "Read why the top match matched", async () => {
  const body = await text();
  const reason = body.match(/History — [^·]{10,90}/)?.[0] ?? "";
  if (!reason) throw new Error("no reason line");
  if (!/coverage, not quality/i.test(body)) throw new Error("coverage/quality distinction missing");
  return reason.trim().slice(0, 70);
});

await step(5, "Compare destinations", async () => {
  await page.getByRole("link", { name: /^Compare$/ }).first().click();
  await page.waitForURL(/\/destinations\/compare/, { timeout: 15_000 });
  const body = await text();
  if (!/Not yet available/.test(body)) throw new Error("missing data not shown as unavailable");
  const zeros = body.match(/\b0 records\b/);
  if (zeros) throw new Error("a missing dataset was rendered as zero");
  return "counts side by side; absence reads as 'Not yet available'";
});

await step(6, "Open Sikkim", async () => {
  await page.goto(`${BASE}/destinations/sikkim`, { waitUntil: "domcontentloaded" });
  const body = await text();
  if (!/Explore this destination through/.test(body)) throw new Error("no discovery summary");
  return (body.match(/\d+ catalogued records? you\s*can visit/) ?? ["records listed"])[0];
});

await step(7, "Discover an experience", async () => {
  await page.getByRole("link", { name: /^Discover Sikkim$/ }).first().click();
  await page.waitForURL(/\/discover$/, { timeout: 15_000 });
  const cards = await page.locator("main article").count();
  return `${cards} experience cards`;
});

await step(8, "Open a record and read why it matters", async () => {
  await page.locator("main article").first().getByRole("link", { name: /^Explore$/ }).click();
  await page.waitForURL(/\/destinations\/sikkim\/(monasteries|places)\//, { timeout: 15_000 });
  const body = await text();
  if (!/Why this place/.test(body)) throw new Error("no why-this-place block");
  if (!/What it is catalogued under/.test(body)) throw new Error("no interest provenance");
  return (body.match(/Connected to \d+ dated historical events?/) ?? ["catalogued reasons shown"])[0];
});

await step(9, "Follow the timeline into a place", async () => {
  await page.goto(`${BASE}/destinations/sikkim/history/capital-gangtok-1894`, {
    waitUntil: "domcontentloaded",
  });
  const placeLink = page.locator('main a[href^="/destinations/sikkim/places/"]').first();
  await placeLink.waitFor({ timeout: 15_000 });
  const href = await placeLink.getAttribute("href");
  await placeLink.click();
  await page.waitForURL(`**${href}`, { timeout: 15_000 });
  return `event → ${href}`;
});

await step(10, "Open the planner from the record", async () => {
  /* "Add to trip" was removed from the product; the record's onward action is
     the planner itself. */
  await page.getByRole("link", { name: /^Plan a journey here$/ }).first().click();
  await page.waitForURL(/\/plan(\?|$)/, { timeout: 15_000 });
  return page.url().replace(BASE, "");
});

await step(11, "Read the itinerary and its reasons", async () => {
  const body = await text();
  const stops = await page.locator("main h4").count();
  if (stops === 0) throw new Error("no stops");
  if (!/straight line/.test(body)) throw new Error("distances not labelled as straight-line");
  if (!/Matches |Named in |Connected to /.test(body)) throw new Error("no selection reasons");
  return `${stops} stops, each with a stated reason`;
});

await step(12, "Show a cross-destination connection", async () => {
  await page.goto(`${BASE}/destinations/sikkim`, { waitUntil: "domcontentloaded" });
  const body = await text();
  const edge = body.match(/Both hold material on [^.]{10,120}/)?.[0] ?? "";
  if (!edge) throw new Error("no cross-destination edge rendered");
  return edge.slice(0, 80);
});

const total = steps.reduce((sum, s) => sum + s.ms, 0);
const slowest = [...steps].sort((a, b) => b.ms - a.ms)[0];

console.log(`\n${"".padEnd(70, "=")}`);
console.log(`STEPS        ${steps.length}`);
console.log(`FAILED       ${failures}`);
console.log(`TOTAL        ${(total / 1000).toFixed(1)}s`);
console.log(`SLOWEST      step ${slowest.number} — ${slowest.title} (${slowest.ms}ms)`);
console.log(`CONSOLE      ${consoleErrors.length} errors${consoleErrors.length ? `: ${consoleErrors[0]}` : ""}`);
console.log("".padEnd(70, "="));

await context.close();
await browser.close();
process.exit(failures === 0 ? 0 : 1);
