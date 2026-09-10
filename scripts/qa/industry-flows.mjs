/**
 * Browser flows — the licensed-operator directory.
 *
 * The directory is the one surface in this project that fetches its data at
 * runtime and filters it in the client, which makes it the one surface whose
 * failure modes cannot be caught by reading the data files. So these are the
 * checks that need a real browser: that the fetch failure degrades to a stated
 * error rather than a blank page, that the server-rendered half of the page
 * survives that failure, that a garbage query says so instead of showing
 * nothing, and that the page is readable with JavaScript switched off
 * entirely.
 *
 * Requires the production server: `npm run build && npm run start`, then
 *   node scripts/qa/industry-flows.mjs
 */


import { chromium } from "playwright";

/* QA_BASE_URL lets the whole battery target one server. This was a hard-coded
   constant with no flag and no environment fallback, so it went on testing
   whatever happened to be listening on port 3000 — in Phase 19 a second,
   stale `next start` from another session — and reported its failures as
   this build's. */
const B = process.env.QA_BASE_URL ?? "http://localhost:3000";
const out = [];
const log = (n, p, d="") => { out.push([n,p,d]); console.log(`${p?"PASS":"FAIL"}  ${n}${d?` — ${d}`:""}`); };

const browser = await chromium.launch();

/* ---- desktop ---- */
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(String(e)));

await page.goto(`${B}/industry`, { waitUntil: "networkidle" });

// directory loaded?
await page.waitForSelector('input[type="search"]', { timeout: 15000 });
const initialCount = await page.locator('li:has(> div)').count();
log("directory renders rows after fetch", initialCount > 0, `${initialCount} rows`);

// status line
const status = await page.locator('[role="status"]').first().innerText();
log("status line reports the register size", /2,763/.test(status), status.trim());

// search: real agency
const search = page.locator('input[type="search"]');
/* "Bayul" is on both registers — two hotels and one agency — so this also
   checks that a query searches across both rather than only the one showing. */
await search.fill("Bayul");
await page.waitForTimeout(600);
const bayul = await page.locator('[role="status"]').first().innerText();
log("search spans both registers", /^3 establishments/.test(bayul.trim()), bayul.trim());

// search: garbage
await search.fill("zzzzqqqqxxxx");
await page.waitForTimeout(600);
const empty = await page.locator("text=Nothing on either register matches that.").count();
log("garbage query shows the honest empty state", empty === 1);

// search: very long + unicode
await search.fill("ༀ་མ་ཎི་པདྨེ་ཧཱུྃ".repeat(200));
await page.waitForTimeout(600);
const stillAlive = await page.locator('input[type="search"]').count();
log("long unicode query does not break the page", stillAlive === 1);

// search: regex-ish input (must be treated as literal)
await search.fill("*.(");
await page.waitForTimeout(600);
const regexSafe = await page.locator('[role="status"]').first().innerText();
log("regex metacharacters are treated literally", /establishment/.test(regexSafe), regexSafe.trim());

await search.fill("");
await page.waitForTimeout(400);

// filter: district Mangan
await page.getByRole("button", { name: "Mangan", exact: true }).click();
await page.waitForTimeout(500);
const mangan = await page.locator('[role="status"]').first().innerText();
log("district filter narrows to Mangan", /^37 establishments/.test(mangan.trim()), mangan.trim());

// combine with type=hotel
await page.getByRole("button", { name: /^Hotels/ }).click();
await page.waitForTimeout(500);
const manganHotels = await page.locator('[role="status"]').first().innerText();
log("type+district compose (Mangan hotels = 20)", /^20 establishments/.test(manganHotels.trim()), manganHotels.trim());

// clear
await page.getByRole("button", { name: "Clear" }).click();
await page.waitForTimeout(500);
const cleared = await page.locator('[role="status"]').first().innerText();
log("clear restores the full set", /2,763/.test(cleared), cleared.trim());

// pagination
const before = await page.locator('li:has(> div)').count();
const more = page.getByRole("button", { name: /Show \d+ more/ });
if (await more.count()) {
  await more.click();
  await page.waitForTimeout(400);
  const after = await page.locator('li:has(> div)').count();
  log("show-more appends rows", after > before, `${before} -> ${after}`);
} else log("show-more present", false, "button missing");

/* The load-bearing rendering rule: an absent grade must render as nothing.
   Soreng has 10 registered hotels and the register grades exactly two of them
   — The Retreat (3-Star) and Splendour-Inn (2-Star). So ten rows must carry
   exactly two grade badges: if the other eight ever acquired one, eight
   businesses would be showing a rating the state never gave them. The counts
   are asserted rather than bounded, so a regression in either direction
   fails. */
/* No Clear here: the previous check left the filters cleared, and Clear only
   renders while a filter is active. */
await page.getByRole("button", { name: "Soreng", exact: true }).click();
await page.getByRole("button", { name: /^Hotels/ }).click();
await page.waitForTimeout(500);
const sorengRows = await page.locator("li:has(> div)").count();
const sorengGrades = await page.locator('li span:text-matches("Star")').count();
log("grade badges render only for the entries the register grades",
  sorengRows === 10 && sorengGrades === 2, `${sorengRows} rows, ${sorengGrades} grade badges (expect 10 / 2)`);

// capacity table is server-rendered
const capRows = await page.locator("table tbody tr").count();
log("capacity table renders six districts", capRows === 6, `${capRows} rows`);

log("no console errors on desktop", errors.length === 0, errors.slice(0,3).join(" | "));

/* ---- fetch failure path ---- */
const p2 = await browser.newPage();
await p2.route("**/api/operators", r => r.abort());
await p2.goto(`${B}/industry`, { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(2500);
const failMsg = await p2.locator("text=The register could not be loaded.").count();
log("API failure degrades to a stated error, not a blank page", failMsg === 1);
const capStillThere = await p2.locator("table tbody tr").count();
log("capacity table survives an API failure (server-rendered)", capStillThere === 6, `${capStillThere} rows`);

/* ---- mobile ---- */
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(`${B}/industry`, { waitUntil: "networkidle" });
await m.waitForSelector('input[type="search"]');
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
log("no horizontal page overflow at 390px", overflow <= 1, `${overflow}px`);

/* ---- no-JS ---- */
const nojsCtx = await browser.newContext({ javaScriptEnabled: false });
const n = await nojsCtx.newPage();
await n.goto(`${B}/industry`, { waitUntil: "domcontentloaded" });
const nojsCap = await n.locator("table tbody tr").count();
const nojsHead = await n.locator("h1").innerText();
log("capacity table readable with JavaScript disabled", nojsCap === 6, `${nojsCap} rows`);
log("headline readable with JavaScript disabled", /licenses/.test(nojsHead), nojsHead.slice(0,60));

await browser.close();
const failed = out.filter(o => !o[1]);
console.log(`\n${out.length - failed.length}/${out.length} checks passed`);
if (failed.length) { console.log("Failures:"); failed.forEach(f => console.log("  " + f[0] + (f[2]?` — ${f[2]}`:""))); process.exitCode = 1; }
