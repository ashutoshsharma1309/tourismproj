/**
 * User-journey tests — Sikkim Darshan.
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


const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

/*
 * PHASE 16 — these navigations waited on `networkidle`, which this file had
 * already rejected elsewhere (see the notes above) for the same reason: on an
 * index carrying seventy photographs, "the network went quiet" is not the
 * precondition any assertion below actually needs, and a single stalled image
 * optimizer response makes the navigation itself time out.
 *
 * `load` is the honest wait: the document and the resources it started are
 * done. Every assertion in this file is about LINKS and HEADINGS, and those
 * exist at that point. Nothing was relaxed — the checks are unchanged.
 */
/* ---------------------------------------------------------------- stories */
// The reported bug: a story card's "Read" lands on monastery content.
await page.goto(`${BASE}/destinations/sikkim/stories`, { waitUntil: "load" });
/*
 * The card grid is a client component: it exists after hydration, not at
 * `load`. Wait for the FULL grid, not merely the first card — an earlier
 * version waited for one link and then counted, which quietly reduced this
 * suite from 70 stories to 65. The archive publishes its own count in the
 * live region, so wait until the DOM agrees with it.
 */
await page
  .waitForFunction(
    () => document.querySelectorAll("a[href^='/destinations/sikkim/stories/']").length >= 70,
    undefined,
    { timeout: 20000 },
  )
  .catch(() => undefined);

const storyLinks = await page.$$eval("a[href^='/destinations/sikkim/stories/']", (as) =>
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
  await page.goto(`${BASE}/destinations/sikkim/stories`, { waitUntil: "domcontentloaded" });
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
await page.goto(`${BASE}/destinations/sikkim/monasteries`, { waitUntil: "load" });
/* Same as the stories index, and the same trap: wait for the whole grid. */
await page
  .waitForFunction(
    () => document.querySelectorAll("a[href^='/destinations/sikkim/monasteries/']").length >= 15,
    undefined,
    { timeout: 20000 },
  )
  .catch(() => undefined);
const monLinks = await page.$$eval("a[href^='/destinations/sikkim/monasteries/']", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))],
);
check("monasteries index lists cards", monLinks.length > 0, `${monLinks.length} links`);

for (const href of monLinks.slice(0, 5)) {
  await page.goto(`${BASE}${href}`, { waitUntil: "load" });
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
  check(`monastery detail ${href}`, h1.length > 0, `h1="${h1.slice(0, 40)}"`);
}

/* ------------------------------------------------- dead / decorative links */
await page.goto(`${BASE}/`, { waitUntil: "load" });
/*
 * The homepage renders some links on the client (the "continue exploring"
 * rail reads local state), so the anchor count grows for a moment after
 * `load`. Sample until it stops changing rather than guessing a delay: with a
 * fixed wait this check silently audited five fewer links than it used to.
 */
await (async () => {
  let previous = -1;
  for (let i = 0; i < 15; i += 1) {
    const count = await page.locator("a[href]").count();
    if (count === previous && count > 0) return;
    previous = count;
    await page.waitForTimeout(400);
  }
})();
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
