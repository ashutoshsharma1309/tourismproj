/**
 * User-journey tests — Ney Heritage.
 *
 * Walks the site the way a first-time visitor would: clicking real links,
 * following CTAs, opening detail pages and going back. Asserts that what the
 * card promised is what the destination actually shows.
 *
 * Usage: node scripts/qa/flows.mjs [--base=URL]
 */

import { chromium } from "playwright";

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
const BASE = arg("base", "http://localhost:3000");

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


const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

/* ---------------------------------------------------------------- stories */
// The reported bug: a story card's "Read" lands on monastery content.
await page.goto(`${BASE}/stories`, { waitUntil: "networkidle" });

const storyLinks = await page.$$eval("a[href^='/stories/']", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))],
);
check("stories index lists story links", storyLinks.length > 0, `${storyLinks.length} links`);

for (const href of storyLinks) {
  /*
   * "networkidle" here meant waiting for every image on a 70-card index to
   * settle, 70 times over — minutes of wall clock, and a timeout whenever the
   * dev server was busy compiling. Waiting for the specific card this iteration
   * is about to click is both faster and a stricter precondition.
   */
  await page.goto(`${BASE}/stories`, { waitUntil: "domcontentloaded" });
  const card = page.locator(`a[href='${href}']`).first();
  await card.waitFor({ state: "visible", timeout: 15_000 });
  const cardTitle = (await card.innerText().catch(() => "")).split("\n").filter(Boolean);
  await card.click();
  /*
   * waitForLoadState("networkidle") was here, and it made this suite report 70
   * failures that were not failures. A Next soft navigation resolves that state
   * immediately — the network was already idle — so page.url() was read before
   * the client-side transition had committed, and every story "landed on
   * /stories". Waiting for the URL itself waits for the thing being asserted.
   */
  await page.waitForURL(`**${href}`, { timeout: 10_000 }).catch(() => {});
  const url = page.url();
  /* And wait for the heading to actually render before reading it — the URL
     commits before the new page paints, so reading straight away returns "". */
  const heading = page.locator("h1").first();
  await heading.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  const h1 = await heading.innerText().catch(() => "");
  const landedRight = url.includes(href);
  // Does the story page actually show the story the card advertised?
  const titleMatch = cardTitle.some(
    (t) => t.length > 8 && h1.toLowerCase().includes(t.toLowerCase().slice(0, 24)),
  );
  check(
    `story card → ${href}`,
    landedRight && titleMatch,
    landedRight ? `h1="${h1.slice(0, 50)}"` : `landed on ${url}`,
  );
}

/* ------------------------------------------------------------ monasteries */
await page.goto(`${BASE}/monasteries`, { waitUntil: "networkidle" });
const monLinks = await page.$$eval("a[href^='/monasteries/']", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))],
);
check("monasteries index lists cards", monLinks.length > 0, `${monLinks.length} links`);

for (const href of monLinks.slice(0, 5)) {
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
  check(`monastery detail ${href}`, h1.length > 0, `h1="${h1.slice(0, 40)}"`);
}

/* ------------------------------------------------- dead / decorative links */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const hrefs = await page.$$eval("a[href]", (as) =>
  as.map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/")),
);
const uniq = [...new Set(hrefs)];
for (const h of uniq) {
  const res = await page.request.get(`${BASE}${h}`);
  check(`home link ${h}`, res.status() < 400, `status ${res.status()}`);
}

// Buttons that look interactive but do nothing.
const buttons = await page.$$eval("button", (bs) =>
  bs.map((b) => ({
    text: (b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 40),
    disabled: b.disabled,
    type: b.getAttribute("type"),
  })),
);
console.log(`\nHome buttons (${buttons.length}):`, JSON.stringify(buttons));

/* ------------------------------------------------------------ footer links */
const footer = await page.$$eval("footer a[href]", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))].filter((h) => h && h.startsWith("/")),
);
for (const h of footer) {
  const res = await page.request.get(`${BASE}${h}`);
  check(`footer link ${h}`, res.status() < 400, `status ${res.status()}`);
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("\nFAILURES:");
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
}
