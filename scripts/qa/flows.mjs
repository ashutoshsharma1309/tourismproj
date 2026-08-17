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
  const h = process.argv.find((a) => a.startsWith(`--${n}=`));
  return h ? h.split("=").slice(1).join("=") : d;
};
const BASE = arg("base", "http://localhost:3000");

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
  await page.goto(`${BASE}/stories`, { waitUntil: "networkidle" });
  const card = page.locator(`a[href='${href}']`).first();
  const cardTitle = (await card.innerText().catch(() => "")).split("\n").filter(Boolean);
  await card.click();
  await page.waitForLoadState("networkidle");
  const url = page.url();
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
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
