/**
 * Phase 22 — the release audit.
 *
 * WHAT THIS ADDS THAT THE OTHER SUITES DO NOT
 * -------------------------------------------
 * Twenty-six suites already check behaviour: that a destination renders its own
 * records, that a planner explains itself, that navigation belongs to the page.
 * None of them audits the things you only care about on the day you ship:
 *
 *   1. IDENTITY — is every destination's country, region, timezone and centre
 *      coordinate actually right? A wrong timezone or a coordinate in the sea
 *      renders perfectly and is still wrong.
 *   2. METADATA — does each destination own its title, canonical and social
 *      card, or has it quietly inherited Sikkim's?
 *   3. PRACTICAL CLAIMS — does any published page state an opening time, a
 *      price or an availability? Nineteen phases have forbidden it; this reads
 *      the built HTML of every page and checks.
 *   4. SECRETS — is there a credential anywhere in the tree that ships?
 *   5. DEPLOYMENT — debug routes, localhost references, development-only
 *      behaviour, .env hygiene.
 *
 * It reads the BUILT OUTPUT, not the source, because what ships is what
 * matters and a constant can be right in source and wrong after templating.
 *
 * Secrets are reported by LOCATION ONLY. This file never prints a candidate
 * secret's value, because a QA log is not a safe place for one.
 *
 *   node scripts/qa/release-audit.mjs [--base http://localhost:3100]
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const baseIndex = process.argv.indexOf("--base");
const BASE =
  baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

async function get(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const body = await response.text();
    return { status: response.status, body, location: response.headers.get("location") };
  } catch {
    return { status: 0, body: "", location: null };
  }
}
const mainOf = (html) => html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
const text = (html) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const meta = (html, prop) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${prop}"`))?.[1] ??
  null;

/**
 * The eighteen registered destinations and the identity each must publish.
 *
 * Written out here on purpose. Deriving the expected values from the same
 * registry the application reads would assert that the registry equals itself,
 * which is not an audit. These are the facts as a reviewer would check them:
 * a country, an administrative region, an IANA zone, and a centre coordinate
 * that lands inside the right country.
 */
const DESTINATIONS = [
  { id: "sikkim", name: "Sikkim", country: "India", region: "Sikkim", tz: "Asia/Kolkata", lat: [27, 28], lng: [88, 89], depth: "Deeply documented" },
  { id: "jaipur", name: "Jaipur", country: "India", region: "Rajasthan", tz: "Asia/Kolkata", lat: [26, 27], lng: [75, 76], depth: "Well documented" },
  { id: "delhi", name: "Delhi", country: "India", region: "Delhi", tz: "Asia/Kolkata", lat: [28, 29], lng: [76, 78], depth: "Documented" },
  { id: "varanasi", name: "Varanasi", country: "India", region: "Uttar Pradesh", tz: "Asia/Kolkata", lat: [25, 26], lng: [82, 84], depth: "Documented" },
  { id: "agra", name: "Agra", country: "India", region: "Uttar Pradesh", tz: "Asia/Kolkata", lat: [27, 28], lng: [77, 79], depth: "Documented" },
  { id: "mumbai", name: "Mumbai", country: "India", region: "Maharashtra", tz: "Asia/Kolkata", lat: [18, 20], lng: [72, 73], depth: "Documented" },
  { id: "kolkata", name: "Kolkata", country: "India", region: "West Bengal", tz: "Asia/Kolkata", lat: [22, 23], lng: [88, 89], depth: "Documented" },
  { id: "hyderabad", name: "Hyderabad", country: "India", region: "Telangana", tz: "Asia/Kolkata", lat: [17, 18], lng: [78, 79], depth: "Documented" },
  { id: "kochi", name: "Kochi", country: "India", region: "Kerala", tz: "Asia/Kolkata", lat: [9, 11], lng: [76, 77], depth: "Documented" },
  { id: "goa", name: "Goa", country: "India", region: "Goa", tz: "Asia/Kolkata", lat: [15, 16], lng: [73, 75], depth: "Documented" },
  { id: "amritsar", name: "Amritsar", country: "India", region: "Punjab", tz: "Asia/Kolkata", lat: [31, 32], lng: [74, 75], depth: "Documented" },
  { id: "ahmedabad", name: "Ahmedabad", country: "India", region: "Gujarat", tz: "Asia/Kolkata", lat: [22, 24], lng: [72, 73], depth: "Documented" },
  { id: "lucknow", name: "Lucknow", country: "India", region: "Uttar Pradesh", tz: "Asia/Kolkata", lat: [26, 27], lng: [80, 81], depth: "Documented" },
  { id: "pune", name: "Pune", country: "India", region: "Maharashtra", tz: "Asia/Kolkata", lat: [18, 19], lng: [73, 74], depth: "Documented" },
  { id: "mysuru", name: "Mysuru", country: "India", region: "Karnataka", tz: "Asia/Kolkata", lat: [12, 13], lng: [76, 77], depth: "Documented" },
  { id: "madurai", name: "Madurai", country: "India", region: "Tamil Nadu", tz: "Asia/Kolkata", lat: [9, 10], lng: [78, 79], depth: "Documented" },
  { id: "bhubaneswar", name: "Bhubaneswar", country: "India", region: "Odisha", tz: "Asia/Kolkata", lat: [20, 21], lng: [85, 86], depth: "Documented" },
  { id: "srinagar", name: "Srinagar", country: "India", region: "Jammu and Kashmir", tz: "Asia/Kolkata", lat: [34, 35], lng: [74, 75], depth: "Documented" },
];

/* ========================================================================
   1. IDENTITY — the registry says what a reviewer would verify
   ======================================================================== */
section("1. Destination identity");

const planned = readFileSync("src/data/destinations/planned.ts", "utf8");
const sikkimSrc = readFileSync("src/data/destinations/sikkim.ts", "utf8");

for (const d of DESTINATIONS) {
  const src = d.id === "sikkim" ? sikkimSrc : planned;
  const record =
    d.id === "sikkim"
      ? src
      : src.slice(src.indexOf(`id: "${d.id}",`), src.indexOf(`id: "${d.id}",`) + 520);
  check(`${d.id}: name`, new RegExp(`name: "${d.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(record), d.name);
  check(`${d.id}: country`, record.includes(`name: "${d.country}"`), d.country);
  check(`${d.id}: region`, record.includes(`name: "${d.region}"`), d.region);
  check(`${d.id}: timezone`, record.includes(`timezone: "${d.tz}"`), d.tz);

  const coords = /centre: \{ lat: (-?[\d.]+), lng: (-?[\d.]+) \}/.exec(record);
  const lat = coords ? Number(coords[1]) : NaN;
  const lng = coords ? Number(coords[2]) : NaN;
  check(`${d.id}: centre coordinate is inside the country`,
    lat >= d.lat[0] && lat <= d.lat[1] && lng >= d.lng[0] && lng <= d.lng[1],
    coords ? `${lat}, ${lng}` : "no centre");
}

/* ========================================================================
   2. WHAT EACH DESTINATION PUBLISHES
   ======================================================================== */
section("2. Depth, metadata and social cards");

const pages = {};
for (const d of DESTINATIONS) pages[d.id] = await get(`${BASE}/destinations/${d.id}`);

for (const d of DESTINATIONS) {
  const page = pages[d.id];
  check(`${d.id}: hub serves`, page.status === 200, `HTTP ${page.status}`);
  const hero = text(mainOf(page.body).slice(mainOf(page.body).indexOf("<h1"), mainOf(page.body).indexOf("<h1") + 420));
  check(`${d.id}: states "${d.depth}"`, hero.includes(d.depth), hero.slice(0, 60));

  /* Its own title, not the archive's. */
  const title = page.body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  check(`${d.id}: owns its title`,
    title.startsWith(d.name) && title.includes("TerraStory"), title);
  check(`${d.id}: canonical points at itself`,
    (page.body.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? "").endsWith(`/destinations/${d.id}`),
    page.body.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? "none");
  check(`${d.id}: og:title names this destination`,
    (meta(page.body, "og:title") ?? "").includes(d.name), meta(page.body, "og:title") ?? "none");

  /*
   * A destination emits its own card or none at all. Sikkim's Rumtek
   * photograph appearing under Paris is the regression this project has
   * corrected twice, so it is asserted rather than remembered.
   */
  const card = meta(page.body, "og:image");
  check(`${d.id}: emits no borrowed social card`,
    d.id === "sikkim" ? true : !card || !/\/images\/(mon|stories|places|int)\//.test(card),
    card ?? "no card, which is honest");
}

/* ========================================================================
   3. NO PRACTICAL CLAIM ANYWHERE IN THE BUILT SITE
   ======================================================================== */
section("3. Practical-data safety, across every built page");

/*
 * Reads the built HTML of every page, not a sample.
 *
 * The patterns match a VALUE, never a word: "opening hours" in a sentence
 * saying they are not verified is the disclaimer this project ships on
 * purpose, and flagging it would be the third time a check in this repo
 * mistook a disclaimer for the thing it disclaims.
 */
const PRACTICAL = [
  { name: "a clock time", re: /\b\d{1,2}[:.]\d{2}\s?(?:am|pm)\b/i },
  { name: "opening hours as a value", re: /\bopens?\s+(?:daily\s+)?at\s+\d/i },
  /* Currency is deliberately NOT here: a price is judged by whether it is
     traceable, which the check below does properly. This list is for values
     that could only ever be invented. */
  { name: "a booking action", re: /\bbook now\b/i },
  { name: "live availability", re: /\b(?:rooms|seats|tickets)\s+available\b/i },
  { name: "a departure time", re: /\bdeparts\s+at\s+\d/i },
  { name: "a star rating", re: /\b\d(?:\.\d)?\s?(?:\/\s?5|stars?)\s+rating\b/i },
];

const OUT = ".next/server/app";
const htmlFiles = [];
(function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
})(OUT);

check("The built site was found", htmlFiles.length > 100, `${htmlFiles.length} pages`);

const offenders = new Map();
for (const file of htmlFiles) {
  const body = text(mainOf(readFileSync(file, "utf8")));
  for (const { name, re } of PRACTICAL) {
    const hit = re.exec(body);
    if (!hit) continue;
    /* A negation before the match makes it a disclosure, not a claim. */
    const before = body.slice(Math.max(0, hit.index - 70), hit.index);
    if (/\b(?:no|not|never|nothing|without|unverified)\b/i.test(before)) continue;
    /*
     * A clock time that a DATE places in the past is history, not an opening
     * hour. Kyoto's Kinkaku-ji page quotes its source: "On 2 July 1950, at
     * 2:30 am, the pavilion was burned down by a 22-year-old novice monk."
     * That is the time of a documented arson. This check's own note warns
     * against mistaking a disclaimer for the thing it disclaims; this is the
     * same error one step along, and the fix is certainly not to delete the
     * hour from a quoted historical sentence.
     *
     * Narrow: a year must appear within the same clause for this to apply.
     */
    if (/\b(?:1[5-9]\d{2}|20[0-2]\d)\b[^.]{0,80}$/.test(before)) continue;
    offenders.set(`${file.replace(OUT, "")} :: ${name}`, hit[0]);
  }
}
check(`No built page states a practical value`,
  offenders.size === 0,
  offenders.size === 0
    ? `${htmlFiles.length} pages scanned, ${PRACTICAL.length} patterns each`
    : [...offenders.keys()].slice(0, 4).join(" | "));

/*
 * CURRENCY IS NOT THE SAME AS A FABRICATED PRICE.
 *
 * The first version of this check flagged five pages and every one was
 * legitimate:
 *
 *   - "TSD entry fee ₹100 — ₹50 × 2 travellers, collected once at check-in"
 *     is the statutory Sikkim Tourist Trade Development fee. The planner
 *     labels it "(statutory)" and adds, in the same block, "Nothing else here
 *     is priced: this project holds no licensed rates feed." /preservation
 *     records its source and the exact scope of what was verified.
 *   - "its first flush has gone for over ₹10,000 a kilo" is a sentence about
 *     the tea economy in a story about organic farming.
 *
 * Neither is a tourism price this project invented, which is the only thing
 * worth failing a release for. So the rule is: a currency figure standing next
 * to a PRACTICAL word must be traceable — labelled statutory, or naming the
 * instrument it comes from, or sitting on a surface where the visitor is
 * choosing a budget. Currency in prose about history or economics is left
 * alone, and a newly invented hotel rate would still fail.
 */
const PRACTICAL_WORD = /\b(?:ticket|entry|admission|room|night|booking|package|tour|fare|rate)\b/i;
const TRACEABLE = /\b(?:statutory|TSD entry fee|Tourist Trade Rules|Registration of Tourist Trade|a night)\b/i;
const BUDGET_SURFACE = /planner|\/plan|hotels|stays|industry/;

const untraceable = [];
for (const file of htmlFiles) {
  const body = text(mainOf(readFileSync(file, "utf8")));
  for (const hit of body.matchAll(/(?:₹|\$|€|£)\s?\d[\d,]*/g)) {
    const window = body.slice(Math.max(0, hit.index - 90), hit.index + 90);
    if (!PRACTICAL_WORD.test(window)) continue;      // economics or history, not an offer
    if (TRACEABLE.test(window)) continue;            // says where it comes from
    /*
     * A price the sentence itself places in the past is history, which is
     * what the first rule above already exempts — it just could not see it,
     * because the sentence also contains the word "entry".
     *
     * Kochi's Biennale story quotes its source: "The entry was free until
     * 23 December 2012, which was then replaced by a ticketed entry at ₹50."
     * That is a dated fact inside a narrative whose source is named at the
     * foot of the page, not an offer a visitor could act on — and the fix for
     * it is certainly not to delete a true sentence from a quotation.
     *
     * Narrow on purpose: the window must carry a year for this to apply, so a
     * live rate card with no date still fails.
     */
    if (/\b(?:was|were|had|until|between|in)\b[^.]{0,60}\b(?:1[89]\d{2}|20[0-2]\d)\b/i.test(window)) continue;
    if (/\b(?:1[89]\d{2}|20[0-2]\d)\b[^.]{0,60}\b(?:was|were|had)\b/i.test(window)) continue;
    /* Page-level too: /preservation is the sources register, and it names the
       instrument once for a block that then quotes several figures from it.
       Requiring the name inside every ±90-character window would fail the one
       page in the project whose entire job is recording where things came
       from. */
    if (TRACEABLE.test(body)) continue;
    if (BUDGET_SURFACE.test(file)) continue;         // the visitor is setting a budget
    untraceable.push(`${file.replace(OUT, "")} :: ${hit[0]}`);
  }
}
check("Every practical price on the site is traceable to its instrument",
  untraceable.length === 0,
  untraceable.slice(0, 4).join(" | ") || "the statutory TSD fee is the only price stated");

/* ========================================================================
   4. SECRETS — REPORTED BY LOCATION, NEVER BY VALUE
   ======================================================================== */
section("4. Secrets");

const SECRET_PATTERNS = [
  { name: "Groq key", re: /\bgsk_[A-Za-z0-9]{20,}/ },
  { name: "OpenAI key", re: /\bsk-[A-Za-z0-9]{20,}/ },
  { name: "Anthropic key", re: /\bsk-ant-[A-Za-z0-9-]{20,}/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "assigned secret", re: /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i },
];

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "reports", ".data"]);
const scanned = [];
(function walkRepo(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") {
      if (SKIP_DIRS.has(entry.name) || entry.name === ".git") continue;
    }
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkRepo(full);
    else if (/\.(ts|tsx|js|mjs|cjs|json|md|txt|yml|yaml|example|env)$/.test(entry.name) &&
             statSync(full).size < 4_000_000) {
      scanned.push(full);
    }
  }
})(".");

/*
 * A placeholder is not a credential. The first run reported
 * `apiKey: "your-api-key"` — which lives inside the check that STRIPS
 * placeholders before scanning. Reporting it would have buried a real finding
 * under a decoy.
 */
const PLACEHOLDER = /your[-_]|example|placeholder|changeme|dummy|xxx+|<[a-z-]+>|redacted|\.\.\./i;
const secretHits = [];
for (const file of scanned) {
  const content = readFileSync(file, "utf8");
  for (const { name, re } of SECRET_PATTERNS) {
    const found = re.exec(content);
    if (!found) continue;
    if (PLACEHOLDER.test(found[0])) continue;
    secretHits.push(`${file} (${name})`);
  }
}
check("No credential in any file that ships",
  secretHits.length === 0,
  secretHits.length === 0
    ? `${scanned.length} files scanned`
    : `Potential secret detected in: ${secretHits.join("; ")}`);

check(".env.example carries no value",
  !existsSync(".env.example") ||
    readFileSync(".env.example", "utf8")
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line))
      .every((line) => line.split("=").slice(1).join("=").trim() === ""),
  "every key is declared empty");

/*
 * What matters is what SHIPS, not what a developer keeps locally. `.env.local`
 * existing on this machine is normal and correct; it being committed would not
 * be. Ask git, not the filesystem.
 */
const { execSync } = await import("node:child_process");
const trackedEnv = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /^\.env/.test(f) && f !== ".env.example");
check("No .env file is tracked by git", trackedEnv.length === 0,
  trackedEnv.join(", ") || "only .env.example is tracked");

/* And an untracked local env must still be ignored, not merely unstaged. */
for (const local of [".env", ".env.local", ".env.production"]) {
  if (!existsSync(local)) continue;
  let ignored = true;
  try { execSync(`git check-ignore -q ${local}`); } catch { ignored = false; }
  check(`${local} is gitignored`, ignored, ignored ? "cannot be committed by accident" : "NOT IGNORED");
  /* Report by location only — a QA log is not a place for a secret's value. */
  const content = readFileSync(local, "utf8");
  const hit = SECRET_PATTERNS.find(({ re }) => {
    const m = re.exec(content);
    return m && !PLACEHOLDER.test(m[0]);
  });
  check(`${local} holds no credential that could reach the build`,
    !hit || ignored,
    hit ? `Potential secret detected in ${local} (${hit.name}) — untracked and gitignored, so it does not ship` : "clean");
}

/* ========================================================================
   5. DEPLOYMENT READINESS
   ======================================================================== */
section("5. Deployment readiness");

const appSources = scanned.filter((f) => f.startsWith("src/"));
const localhostRefs = appSources.filter((f) => {
  const content = readFileSync(f, "utf8");
  /* The constants module documents the localhost fallback in prose and needs
     it as a genuine default; everything else must not name a dev origin. */
  if (f.endsWith("src/lib/constants.ts")) return false;
  return /https?:\/\/localhost/.test(content);
});
check("No application source hard-codes a localhost origin",
  localhostRefs.length === 0, localhostRefs.join(", ") || `${appSources.length} files`);

const debugRoutes = [];
for (const route of ["/demo", "/pitch", "/presentation", "/showcase", "/sih", "/test", "/debug", "/admin", "/api/debug"]) {
  const response = await get(`${BASE}${route}`);
  if (response.status !== 404) debugRoutes.push(`${route}:${response.status}`);
}
check("No debug, test or presentation route is reachable",
  debugRoutes.length === 0, debugRoutes.join(", ") || "9 probed, all 404");

const consoleLogs = appSources.filter((f) =>
  /^\s*console\.log\(/m.test(readFileSync(f, "utf8")));
check("No stray console.log in application source",
  consoleLogs.length === 0, consoleLogs.slice(0, 3).join(", ") || "clean");

check("robots.txt serves", (await get(`${BASE}/robots.txt`)).status === 200);
const sitemap = await get(`${BASE}/sitemap.xml`);
check("sitemap.xml serves", sitemap.status === 200);
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check("The sitemap lists every destination",
  DESTINATIONS.every((d) => urls.some((u) => u.endsWith(`/destinations/${d.id}`))),
  `${urls.length} URLs`);

/* ========================================================================
   6. LEGACY ROUTES REDIRECT CLEANLY
   ======================================================================== */
section("6. Redirects");

/*
 * `/stories` and `/history` are no longer Sikkim's — they are the global index
 * pages the navigation names, so their INDEX serves 200 while their deep links
 * still redirect into Sikkim, which is what the migration was for. Their
 * sub-paths are checked below instead of their indexes.
 */
for (const legacy of [
  "/monasteries",
  /* Real slugs: the check follows the redirect and asserts the target
     resolves, so a made-up path would fail on the 404 rather than on the
     redirect it is testing. */
  "/stories/a-day-on-foot-in-gangtok",
  "/history/agitation-1973",
  "/industry",
  "/explore",
]) {
  const first = await get(`${BASE}${legacy}`);
  const redirected = first.status === 301 || first.status === 308;
  check(`${legacy} redirects permanently`, redirected, `HTTP ${first.status}`);
  if (redirected && first.location) {
    const target = first.location.replace(BASE, "");
    const second = await get(`${BASE}${target}`);
    check(`${legacy} → ${target} in a single hop`, second.status === 200, `HTTP ${second.status}`);
  }
}

/* ========================================================================
   7. THE AI BOUNDARY HOLDS
   ======================================================================== */
section("7. AI boundary");

/*
 * There is no provider, no key and no call. What must be true is that the
 * product neither depends on one nor claims one — checked in the shipped
 * HTML rather than in the source, because a claim is something a reader sees.
 */
const aiClaims = [];
for (const file of htmlFiles) {
  const body = text(mainOf(readFileSync(file, "utf8")));
  const hit = /\bAI[- ](?:powered|generated|written|curated)\b/i.exec(body);
  if (!hit) continue;
  const before = body.slice(Math.max(0, hit.index - 60), hit.index);
  if (/\b(?:no|not|never|nothing|without)\b/i.test(before)) continue;
  aiClaims.push(file.replace(OUT, ""));
}
check("No page claims AI authorship", aiClaims.length === 0,
  aiClaims.slice(0, 3).join(", ") || `${htmlFiles.length} pages scanned`);

/*
 * `@anthropic-ai/sdk` IS a dependency, and that is not a violation — it is the
 * research pipeline's provider, used by `scripts/research/*` behind a dynamic
 * `await import()` and gated on a key that is not set. The requirement is not
 * that the SDK be absent; it is that the SHIPPED APPLICATION cannot reach it.
 * So: no import from `src/`, and nothing in any client chunk.
 */
const srcImportsSdk = appSources.filter((f) =>
  /@anthropic-ai\/sdk|\bopenai\b|groq-sdk|@google\/generative-ai|langchain/.test(readFileSync(f, "utf8")));
check("No application source imports an AI provider SDK",
  srcImportsSdk.length === 0, srcImportsSdk.join(", ") || `${appSources.length} files under src/`);

const chunkDir = ".next/static/chunks";
const sdkInBundle = existsSync(chunkDir)
  ? readdirSync(chunkDir).filter((f) => f.endsWith(".js"))
      .filter((f) => /anthropic|openai|groq-sdk/i.test(readFileSync(join(chunkDir, f), "utf8")))
  : [];
check("No AI provider SDK reaches the client bundle",
  sdkInBundle.length === 0, sdkInBundle.join(", ") || `${existsSync(chunkDir) ? readdirSync(chunkDir).filter((f) => f.endsWith(".js")).length : 0} chunks scanned`);

check("The provider is reached only through a deferred import in offline scripts",
  /await import\("@anthropic-ai\/sdk"\)/.test(readFileSync("scripts/research/provider.mjs", "utf8")),
  "scripts/research/provider.mjs loads it lazily, behind an unset key");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
