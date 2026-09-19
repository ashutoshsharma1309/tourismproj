/**
 * Accounts, travel history and personalization — engine, boundaries, flows.
 *
 * Sections A–C run without a server: the engine against TerraStory's real
 * destination knowledge, the page-to-event mapping, and code guarantees.
 * D needs a server. E needs a server with a database and Supabase Auth and
 * drives the whole traveller experience through a real browser:
 *
 *   sign up → confirm → log in → choose interests → explore → history
 *   → journey and comparison survive log-out → recommendations change with
 *   interests → clear history → user A cannot reach user B → log-out closes
 *   the account → password reset → account deletion → guide → phone widths
 *
 *   QA_BASE_URL=http://localhost:3100 pnpm qa:accounts      (.env.local loaded)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { comparisonIds, eventForLocation } from "@/lib/account/activity";
import { safeNextPath } from "@/lib/account/next";
import { allCoverage, themeIndex } from "@/lib/global";
import { listDestinations } from "@/lib/destinations/registry";
import {
  demonstratedInterests,
  recommendDestinations,
  recommendPlaces,
  type Signals,
} from "@/lib/personalization/engine";
import { isNextIntent } from "@/lib/personalization/guide";
import { ALL_INTERESTS } from "@/lib/planner/types";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
};
const section = (t: string) => console.log(`\n-- ${t} --`);

const EXPECTED = [
  "sikkim", "jaipur", "delhi", "varanasi", "agra", "mumbai", "kolkata", "hyderabad", "kochi", "goa",
  "amritsar", "ahmedabad", "lucknow", "pune", "mysuru", "madurai", "bhubaneswar", "srinagar",
];
const REMOVED = ["kyoto", "paris", "rome", "istanbul", "new-york-city"];

/* ======================================================================
   A. ENGINE, ON REAL DESTINATION KNOWLEDGE
   ====================================================================== */
section("A. Personalization engine");

const coverage = await allCoverage();
const knowledge = { coverage, themes: themeIndex(coverage) };
const empty: Signals = { interests: [], explored: [], viewed: [] };
const at = new Date("2026-09-10T10:00:00Z");

check("knowledge covers exactly the 18 Indian destinations",
  coverage.length === 18 && coverage.every((entry) => EXPECTED.includes(entry.destination.id)),
  coverage.map((entry) => entry.destination.id).join(","));
check("no signal → no recommendations (never a popular list)", recommendDestinations(empty, knowledge).length === 0);
check("no signal → no demonstrated interests", demonstratedInterests(empty, knowledge).length === 0);

const arch: Signals = { interests: ["architecture"], explored: [], viewed: [] };
const archRecs = recommendDestinations(arch, knowledge, 18);
check("an explicit interest yields recommendations", archRecs.length > 0, String(archRecs.length));
check("every architecture recommendation covers architecture in its records",
  archRecs.every((rec) => coverage.find((entry) => entry.destination.id === rec.destinationId)?.covered.includes("architecture")));
check("every architecture recommendation says it is based on that interest",
  archRecs.every((rec) => rec.reasons.some((reason) => /interest in architecture/.test(reason))), archRecs[0]?.reasons.join(" | "));
check("recommendations never name a registry-external or removed destination",
  archRecs.every((rec) => EXPECTED.includes(rec.destinationId) && !REMOVED.includes(rec.destinationId)));

check("interests are the ten the records are tagged with", ALL_INTERESTS.length === 10, ALL_INTERESTS.join(","));

const food: Signals = { interests: ["food"], explored: [], viewed: [] };
const foodIds = recommendDestinations(food, knowledge, 18).map((rec) => rec.destinationId).join();
check("changing interests changes the recommendations", foodIds !== archRecs.map((rec) => rec.destinationId).join());
check("the engine is deterministic",
  JSON.stringify(recommendDestinations(arch, knowledge)) === JSON.stringify(recommendDestinations(arch, knowledge)));

const triad: Signals = {
  interests: [],
  explored: ["jaipur", "delhi", "agra"].map((destinationId) => ({ destinationId, interactions: 3, lastExploredAt: at })),
  viewed: [],
};
const demo = demonstratedInterests(triad, knowledge);
check("history alone demonstrates interests", demo.length > 0, demo.map((row) => row.interest).join(","));
check("a demonstrated interest always rests on two or more explored destinations or viewed places",
  demo.every((row) => row.fromDestinations.length >= 2 || row.fromPlaces.length >= 2));
check("demonstrated evidence names only destinations the traveller explored",
  demo.every((row) => row.fromDestinations.every((name) => ["Jaipur", "Delhi", "Agra"].includes(name))));
const triadRecs = recommendDestinations(triad, knowledge, 18);
check("explored destinations are not recommended back", triadRecs.every((rec) => !["jaipur", "delhi", "agra"].includes(rec.destinationId)));
check("history-based reasons cite only explored destinations",
  triadRecs.every((rec) => rec.reasons.filter((reason) => reason.startsWith("You explored")).every((reason) =>
    !EXPECTED.map((id) => listDestinations().find((d) => d.id === id)?.name ?? "").filter((name) => !["Jaipur", "Delhi", "Agra"].includes(name)).some((name) => name && reason.includes(name)))));
check("no reason claims what the traveller loves or prefers",
  [...archRecs, ...triadRecs].every((rec) => rec.reasons.every((reason) => !/\b(love|loves|passion|favourite|you prefer)\b/i.test(reason))));

const single: Signals = { interests: [], explored: [{ destinationId: "varanasi", interactions: 9, lastExploredAt: at }], viewed: [] };
check("one explored destination is not enough to claim an interest", demonstratedInterests(single, knowledge).length === 0);
check("with one destination explored, no reason says 'destinations strong in'",
  recommendDestinations(single, knowledge, 18).every((rec) => rec.reasons.every((reason) => !/destinations strong in/.test(reason))));

const jaipurEntry = coverage.find((entry) => entry.destination.id === "jaipur");
const jaipurPlaces = recommendPlaces("jaipur", arch, knowledge, 50);
check("place recommendations exist for Jaipur with an architecture interest", jaipurPlaces.length > 0, String(jaipurPlaces.length));
check("every Jaipur place recommendation is one of Jaipur's own experiences",
  jaipurPlaces.every((place) => jaipurEntry?.experiences.some((experience) => experience.id === place.experience.id)));
check("no Jaipur place recommendation links into another destination",
  jaipurPlaces.every((place) => !place.experience.href.startsWith("/destinations/") || place.experience.href.startsWith("/destinations/jaipur")),
  jaipurPlaces.map((place) => place.experience.href).filter((href) => !href.startsWith("/destinations/jaipur")).join(", "));
const firstJaipur = jaipurPlaces[0]?.experience.id ?? "";
const afterView = recommendPlaces("jaipur", { ...arch, viewed: [{ destinationId: "jaipur", entityId: firstJaipur }] }, knowledge, 50);
check("a viewed place is not recommended again", !afterView.some((place) => place.experience.id === firstJaipur));
check("unknown destination → no place recommendations", recommendPlaces("paris", arch, knowledge).length === 0);

/* Isolation: a Jaipur place id recorded under Varanasi resolves to nothing. */
const wrongScope: Signals = { interests: [], explored: [], viewed: [{ destinationId: "varanasi", entityId: firstJaipur }, { destinationId: "varanasi", entityId: jaipurPlaces[1]?.experience.id ?? "" }] };
check("an entity recorded under the wrong destination demonstrates nothing", demonstratedInterests(wrongScope, knowledge).length === 0);

/* ======================================================================
   B. PAGE → EVENT MAPPING
   ====================================================================== */
section("B. Meaningful events only");

const cases: [string, string, string | null][] = [
  ["/destinations/jaipur", "", "DESTINATION_VIEWED jaipur -"],
  ["/l/hi/destinations/jaipur", "", "DESTINATION_VIEWED jaipur -"],
  ["/destinations/sikkim/places/tsomgo-lake", "", "PLACE_VIEWED sikkim place:tsomgo-lake"],
  ["/destinations/sikkim/monasteries/rumtek", "", "PLACE_VIEWED sikkim site:rumtek"],
  ["/destinations/varanasi/stories/craft-banarasi-sari", "", "STORY_VIEWED varanasi story:craft-banarasi-sari"],
  ["/destinations/agra/history", "", "HISTORY_VIEWED agra -"],
  ["/destinations/agra/culture", "", "CULTURE_VIEWED agra -"],
  ["/destinations/jaipur/stays/stay-rambagh-palace-jaipur", "", "STAY_VIEWED jaipur stay:stay-rambagh-palace-jaipur"],
  ["/destinations/agra/discover", "#place-taj-mahal", "PLACE_VIEWED agra place:taj-mahal"],
  ["/destinations/compare", "", null],
  ["/destinations", "", null],
  ["/discover", "", null],
  ["/", "", null],
  ["/destinations/agra/discover", "", null],
  ["/destinations/agra/discover", "#top", null],
  ["/account", "", null],
  ["/search", "", null],
];
for (const [path, hash, expected] of cases) {
  const event = eventForLocation(path, hash);
  const got = event ? `${event.type} ${event.destinationId} ${event.entityId ?? "-"}` : null;
  check(`${path}${hash} → ${expected ?? "nothing"}`, got === expected, String(got));
}
check("comparison ids parse, dedupe and cap at 4",
  comparisonIds("ids=jaipur,agra&ids=agra&ids=goa,kochi,delhi").join() === "jaipur,agra,goa,kochi");
check("comparison ids refuse junk", comparisonIds("ids=<script>,../x,JAIPUR").length === 0);
for (const q of ["What should I explore next?", "where should I go next", "recommend something for me"]) check(`guide treats "${q}" as personal`, isNextIntent(q));
for (const q of ["what should I see in Jaipur", "recommend food in Kochi", "temples in Varanasi"]) check(`guide leaves "${q}" to the records`, !isNextIntent(q));

/* ======================================================================
   C. CODE GUARANTEES
   ====================================================================== */
section("C. Code guarantees");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
const read = (f: string) => readFileSync(f, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const apiRoutes = walk("src/app/api/account");
check("every account API route passes the session gate", apiRoutes.length >= 5 && apiRoutes.every((f) => /await gate\(request, (true|false)\)/.test(read(f))), apiRoutes.join(", "));
check("every account write route requires same origin",
  apiRoutes.every((f) => !/export async function (POST|PUT|DELETE)/.test(read(f)) || /gate\(request, true\)/.test(read(f))));
check("no account API route reads a user id from the request",
  apiRoutes.every((f) => !/userId|user_id/.test(strip(read(f)))));
const queries = strip(read("src/db/queries/account.ts"));
const exported = queries.split("export async function").slice(1);
check("every account read filters on the session's user id", exported.every((body) => /userId\)/.test(body) || /eq\(users\.id, userId\)/.test(body)), `${exported.length} reads`);
check("session cookies are HttpOnly and SameSite=Lax", /httpOnly: true/.test(read("src/lib/auth/cookies.ts")) && /sameSite: "lax"/.test(read("src/lib/auth/cookies.ts")));
check("the proxy runs only on account, auth, partner and admin routes",
  /matcher/.test(read("src/proxy.ts")) && !/"\/destinations|"\/\(\.\*\)|"\/:path\*"/.test(read("src/proxy.ts")));
check("sign-in failure has one message for every cause", /const SIGN_IN_FAILED =/.test(read("src/app/(v1)/login/account-actions.ts")) && (read("src/app/(v1)/login/account-actions.ts").match(/SIGN_IN_FAILED/g) ?? []).length === 2);
check("sign-in, sign-up and reset are rate limited",
  ["sign-in", "sign-up", "password-reset"].every((scope) => read("src/app/(v1)/login/account-actions.ts").includes(`consumeQuota("${scope}"`)));
check("the service-role key is read only under src/db or src/lib/payments",
  walk("src").filter((f) => /SUPABASE_SERVICE_ROLE_KEY/.test(strip(read(f)))).every((f) => f.startsWith("src/db/") || f.startsWith("src/lib/payments/")));
check("history schema has no query-text, IP or device column",
  !/query_text|search|ip_address|user_agent|device|latitude|longitude/.test(strip(read("src/db/schema/travel.ts"))));
check("partner surfaces never read traveller history",
  walk("src/app/(v1)/partner").concat(walk("src/app/(v1)/admin")).every((f) => !/travelEvents|destinationAffinity|userJourneys|userComparisons|queries\/account/.test(read(f))));
check("demonstrated interests are never written to user_interests",
  !/demonstrated/.test(strip(read("src/lib/account/store.ts"))));
/* The guide's question goes to /api/assistant, which stores nothing
   (qa:guide-assistant B); its only account calls are body-less reads. */
const guideAccountCalls = [...read("src/components/guide/TripGuide.tsx").matchAll(/fetch\([^)]*\/api\/account[^)]*\)/g)].map((m) => m[0]);
check("the guide sends no question text to the account API",
  guideAccountCalls.length > 0 && guideAccountCalls.every((call) => !/clean|question|body:|method:/.test(call)));
for (const [value, expected] of [
  ["/account/history", "/account/history"],
  ["/destinations/jaipur?x=1#y", "/destinations/jaipur?x=1#y"],
  ["//evil.example", "/account"],
  ["/\\evil.example", "/account"],
  ["/\\/evil.example", "/account"],
  ["https://evil.example", "/account"],
  ["/\tevil", "/account"],
  ["javascript:alert(1)", "/account"],
  ["", "/account"],
] as const) {
  check(`safe next path: ${JSON.stringify(value)} → ${expected}`, safeNextPath(value) === expected, safeNextPath(value));
}
check("every next-path check in the app uses the one validator",
  ["src/app/auth/callback/route.ts", "src/app/(v1)/login/code/page.tsx", "src/app/(v1)/login/actions.ts", "src/app/(v1)/login/account-actions.ts", "src/app/(v1)/login/page.tsx"]
    .every((f) => /safeNextPath/.test(read(f)) && !/\/\^\\\/\(\?!\\\/\)/.test(read(f))));
check("reviewer rights and partner records require a confirmed, code-proven session",
  /isAdmin = adminEmails\(\)\.has\(email\) && provesInbox\(session\)/.test(read("src/lib/auth/session.ts")) && /!provesInbox\(session\)\) return null/.test(read("src/lib/auth/session.ts")));
check("an e-mail token link is exchanged only by a same-origin POST",
  /export async function POST/.test(read("src/app/auth/callback/route.ts")) && /isSameOrigin\(request\)/.test(read("src/app/auth/callback/route.ts")) && !/verifyOtp[\s\S]*export async function POST/.test(read("src/app/auth/callback/route.ts")));
check("a password can be set without the old one only after recent inbox proof", /recentInboxProof\(session\)/.test(read("src/app/(v1)/login/account-actions.ts")) && /recentInboxProof/.test(read("src/app/(v1)/reset-password/page.tsx")));
check("account deletion handles every table that references users",
  ["partners", "partnerProperties", "vendorDocuments", "auditLogs", "reviews", "permitApplications", "trips", "bookings"].every((table) => new RegExp(`\\b${table}\\b`).test(strip(read("src/lib/account/store.ts")).split("export async function deleteAccountData")[1] ?? "")));
check("no src/app file contains the research-firewall text", walk("src/app").filter((f) => !/\/review\//.test(f)).every((f) => !read(f).includes(".data")));

/* ======================================================================
   D. SERVER, SIGNED OUT
   ====================================================================== */
section("D. Server, signed out");

type Fetched = { status: number; body: string; headers: Headers };
const get = async (path: string, init?: RequestInit): Promise<Fetched | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${BASE}${path}`, { redirect: "manual", ...init, signal: controller.signal });
    return { status: response.status, body: (await response.text()).replace(/<!--.*?-->/g, ""), headers: response.headers };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const home = await get("/");
const serverUp = Boolean(home && home.status === 200 && /TerraStory/.test(home.body));
if (!serverUp) {
  console.log(`SKIP  sections D–E — no TerraStory server at ${BASE}`);
} else {
  for (const path of ["/account", "/account/history", "/account/profile", "/account/interests"]) {
    const response = await get(path);
    check(`${path} redirects a visitor to log in, keeping the destination`,
      response !== null && [302, 303, 307, 308].includes(response.status) && (response.headers.get("location") ?? "").includes(`/login?next=${encodeURIComponent(path)}`),
      `${response?.status} → ${response?.headers.get("location")}`);
  }
  for (const path of ["/api/account/me", "/api/account/recommendations", "/api/account/journey"]) {
    const response = await get(path);
    check(`GET ${path} is 401 without a session`, response?.status === 401, String(response?.status));
    check(`GET ${path} is never cached`, /no-store/.test(response?.headers.get("cache-control") ?? ""));
  }
  const forged = await get("/api/account/events", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ events: [] }) });
  check("a cross-site POST to the account API is refused before anything else", forged?.status === 403, String(forged?.status));
  const hintOnly = await get("/api/account/me", { headers: { cookie: "ts_signed_in=1" } });
  check("the signed-in hint alone grants nothing", hintOnly?.status === 401, String(hintOnly?.status));

  const login = await get("/login");
  const lb = login?.body ?? "";
  check("/login says Welcome back, with e-mail and password", /Welcome back/.test(lb) && /type="email"/.test(lb) && /type="password"/.test(lb));
  check("/login offers Forgot password and Create account", /Forgot password\?/.test(lb) && /Create account/.test(lb));
  check("/login labels every field (no placeholder-only inputs)", (lb.match(/<label/g) ?? []).length >= 2 && !/placeholder=/.test(lb));
  check("/login is noindex", /noindex/.test(lb));
  const signup = await get("/signup");
  const sb = signup?.body ?? "";
  check("/signup asks only for name, e-mail and password",
    /name="name"/.test(sb) && /name="email"/.test(sb) && /name="password"/.test(sb) && (sb.match(/<input(?![^>]*type="hidden")/g) ?? []).length === 3,
    String((sb.match(/<input(?![^>]*type="hidden")/g) ?? []).length));
  check("/signup explains what is stored", /stores your name, e-mail, the interests you choose/.test(sb));
  const backslash = await get("/auth/callback?next=%2F%5Cevil.example");
  check("the callback never redirects off-site through a backslash", backslash !== null && !/evil\.example/.test(backslash.headers.get("location") ?? ""), backslash?.headers.get("location") ?? "");
  const tokenGet = await get("/auth/callback?token_hash=abc123&type=magiclink&next=%2Faccount");
  check("a token link on GET only leads to the Continue page",
    tokenGet !== null && [302, 303, 307].includes(tokenGet.status) && (tokenGet.headers.get("location") ?? "").includes("/auth/continue") && !(tokenGet.headers.get("set-cookie") ?? "").includes("auth-token"),
    tokenGet?.headers.get("location") ?? "");
  const continuePage = await get("/auth/continue?token_hash=abc123&type=magiclink&next=%2F%5Cevil.example");
  check("the Continue page asks for a click and keeps next on-site",
    continuePage?.status === 200 && /method="post"/.test(continuePage.body) && /name="next" value="\/account"/.test(continuePage.body));
  const crossPost = await get("/auth/callback", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" }, body: "token_hash=abc&type=magiclink&next=%2Faccount" });
  check("a cross-site POST to the callback is refused", crossPost?.status === 403, String(crossPost?.status));
  const codeLogin = await get("/login/code?next=%2F%5Cevil.example");
  /* The form field is what is submitted; the page data merely echoes the request URL. */
  check("the code sign-in page does not carry an off-site next", codeLogin?.status === 200 && /name="next" value="\/partner\/dashboard"/.test(codeLogin.body) && !/name="next" value="[^"]*evil/.test(codeLogin.body));
  const robots = await get("/robots.txt");
  check("robots.txt keeps crawlers out of the account", robots !== null && /Disallow: \/account/.test(robots.body));
  const sitemap = await get("/sitemap.xml");
  check("no account page is in the sitemap", sitemap !== null && !/\/account|\/login|\/signup/.test(sitemap.body));
  const destination = await get("/destinations/jaipur");
  check("destination pages still render for a visitor", destination?.status === 200);
  check("destination pages do not bake personal content into their HTML", destination !== null && !/Recommended for you in/.test(destination.body));

  /* ====================================================================
     E. THE TRAVELLER, END TO END
     ==================================================================== */
  section("E. Traveller flows");
  const env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    database: process.env.DATABASE_URL,
  };
  if (!env.url || !env.service || !env.database) {
    console.log("SKIP  section E — load .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL)");
  } else {
    try {
      await flows(env.url, env.service, env.database);
    } catch (error) {
      const err = error as Error;
      const where = (err.stack ?? "").split("\n").find((line) => /accounts\.mts/.test(line))?.trim() ?? "";
      check("E  the flows ran to completion", false, `${err.message.split("\n")[0]} ${where}`);
    }
  }
}

async function flows(supabaseUrl: string, serviceKey: string, databaseUrl: string) {
  const { chromium } = await import("playwright");
  const { createClient } = await import("@supabase/supabase-js");
  const postgres = (await import("postgres")).default;
  type Page = import("playwright").Page;
  type BrowserContext = import("playwright").BrowserContext;

  const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const stamp = Date.now().toString(36);
  const emailFor = (who: string) => `qa-traveller-${who}-${stamp}@terrastory.test`;
  const PASSWORD = `Terra-${stamp}-Walk!`;
  const created: string[] = [];
  let ipSeed = 10;
  /* A fresh address range per run, so a limit spent by a previous run on a
     long-lived server is not inherited. */
  const runOctet = Math.floor(Math.random() * 250);
  const browser = await chromium.launch();

  const newContext = async (width = 1280): Promise<BrowserContext> =>
    browser.newContext({
      viewport: { width, height: 900 },
      /* One address per simulated traveller, so the per-client sign-in limit
         measures one person rather than the whole suite. */
      extraHTTPHeaders: { "x-forwarded-for": `10.${runOctet}.${Math.floor(ipSeed / 250)}.${ipSeed++ % 250}` },
    });
  const settle = (page: Page, ms = 2600) => page.waitForTimeout(ms);
  const poll = async <T,>(read: () => Promise<T>, ok: (value: T) => boolean, ms = 15_000): Promise<T> => {
    const started = Date.now();
    let value = await read();
    while (!ok(value) && Date.now() - started < ms) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      value = await read();
    }
    return value;
  };
  const userId = async (email: string): Promise<string | null> => {
    const rows = await sql`select id from users where email = ${email}`;
    return rows[0]?.id ?? null;
  };
  const createConfirmed = async (who: string, name: string) => {
    const email = emailFor(who);
    const { data: made, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !made.user) throw new Error(`createUser ${who}: ${error?.message}`);
    created.push(made.user.id);
    return email;
  };
  const logIn = async (page: Page, email: string, password = PASSWORD, next?: string) => {
    await page.goto(`${BASE}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
  };
  const logOut = async (page: Page) => {
    await page.goto(`${BASE}/account/profile`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 45_000 });
  };
  const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  try {
    /* ---------------------------------------------------------- 1. sign up */
    const signupEmail = emailFor("new");
    const signupContext = await newContext(390);
    const signupPage = await signupContext.newPage();
    await signupPage.goto(`${BASE}/signup`, { waitUntil: "load" });
    await signupPage.waitForTimeout(700);
    await signupPage.getByLabel("Name").fill("Asha Traveller");
    await signupPage.getByLabel("Email").fill(signupEmail);
    await signupPage.getByLabel("Password").fill("short");
    await signupPage.getByRole("button", { name: "Create account" }).click();
    await signupPage.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    check("E1 sign-up refuses a password under 8 characters", /at least 8/i.test((await signupPage.locator('p[role="alert"]').textContent()) ?? ""));
    check("E1 sign-up keeps what was typed after an error", (await signupPage.getByLabel("Email").inputValue()) === signupEmail);
    await signupPage.getByLabel("Password").fill(PASSWORD);
    await signupPage.getByRole("button", { name: "Create account" }).click();
    /* Supabase refuses reserved test domains, which is what this suite uses so
       no real inbox is ever written to: the form must say the address cannot
       be used, not that a link is on its way. */
    await signupPage.waitForFunction(
      () => /can.t be used|couldn.t send|Check your inbox/.test(document.querySelector('main p[role="alert"], main div[role="status"]')?.textContent ?? ""),
      undefined,
      { timeout: 45_000 },
    );
    const answerText = (await signupPage.locator('main p[role="alert"], main div[role="status"]').first().textContent()) ?? "";
    check("E1 sign-up never claims a link was sent when Supabase refused to send one", /can.t be used|couldn.t send/.test(answerText), answerText);
    check("E1 the sign-up form fits a 390px screen", (await overflow(signupPage)) <= 1);

    /* Confirmation: an account whose e-mail is not confirmed cannot log in. */
    const { data: unconfirmed, error: unconfirmedError } = await admin.auth.admin.createUser({
      email: signupEmail, password: PASSWORD, email_confirm: false, user_metadata: { full_name: "Asha Traveller" },
    });
    if (unconfirmedError || !unconfirmed.user) throw new Error(`createUser unconfirmed: ${unconfirmedError?.message}`);
    created.push(unconfirmed.user.id);
    const early = await newContext();
    const earlyPage = await early.newPage();
    await logIn(earlyPage, signupEmail);
    const refused = await earlyPage.waitForSelector('p[role="alert"]', { timeout: 45_000 }).catch(() => null);
    check("E1 an unconfirmed account cannot log in", Boolean(refused) && /confirm your e-mail/.test((await refused?.textContent()) ?? ""));
    await early.close();
    await admin.auth.admin.updateUserById(unconfirmed.user.id, { email_confirm: true });
    await signupContext.close();

    /* --------------------------------------- 2. anonymous → log in → merge */
    const a = await newContext();
    const pa = await a.newPage();
    await pa.goto(`${BASE}/destinations/varanasi`, { waitUntil: "load" });
    await settle(pa);
    const buffered = await pa.evaluate(() => window.sessionStorage.getItem("terrastory.session-activity.v1"));
    check("E2 a visitor's exploration waits in this tab session only", Boolean(buffered && buffered.includes("varanasi")) && !(await pa.evaluate(() => document.cookie.includes("ts_signed_in"))));
    await logIn(pa, signupEmail);
    await pa.waitForURL(/\/account/, { timeout: 45_000 });
    check("E2 log in lands on the account home", pa.url().includes("/account"));
    const cookies = await a.cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name.includes("auth-token"));
    check("E2 the session cookie is HttpOnly and SameSite=Lax", Boolean(sessionCookie?.httpOnly) && sessionCookie?.sameSite === "Lax", JSON.stringify({ name: sessionCookie?.name, httpOnly: sessionCookie?.httpOnly, sameSite: sessionCookie?.sameSite }));
    check("E2 page scripts cannot read the session token", !(await pa.evaluate(() => document.cookie)).includes("auth-token"));
    const aId = (await poll(() => userId(signupEmail), (id) => Boolean(id))) as string;
    const merged = await poll(
      () => sql`select destination_id from destination_affinity where user_id = ${aId}`,
      (rows) => rows.some((row) => row.destination_id === "varanasi"),
    );
    check("E2 the same session's anonymous exploration is merged at log-in", merged.some((row) => row.destination_id === "varanasi"));
    const bufferAfter = await poll(() => pa.evaluate(() => window.sessionStorage.getItem("terrastory.session-activity.v1")), (value) => value === null);
    check("E2 the tab-session buffer is emptied after merging", bufferAfter === null, String(bufferAfter));

    /* A tab signed in by an e-mail link (not its own log-in form) discards its
       anonymous activity rather than attributing it to that account. */
    const linkEmail = await createConfirmed("link", "Link Visitor");
    const linkId = created[created.length - 1] as string;
    const l = await newContext();
    const pl = await l.newPage();
    await pl.goto(`${BASE}/destinations/kochi`, { waitUntil: "load" });
    await settle(pl);
    const { data: magic } = await admin.auth.admin.generateLink({ type: "magiclink", email: linkEmail });
    await pl.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(magic?.properties?.hashed_token ?? "")}&type=magiclink&next=/account`, { waitUntil: "load" });
    await pl.waitForURL(/\/auth\/continue/, { timeout: 45_000 });
    check("E2b an e-mail link stops at Continue instead of signing in", !(await pl.evaluate(() => document.cookie.includes("ts_signed_in=1"))));
    await pl.getByRole("button", { name: "Continue" }).click();
    await pl.waitForURL(/\/account/, { timeout: 45_000 });
    await pl.waitForTimeout(2500);
    const linkAffinity = await sql`select destination_id from destination_affinity where user_id = ${linkId}`;
    check("E2b anonymous activity is not merged into an account signed in by link", linkAffinity.length === 0, JSON.stringify(linkAffinity));
    check("E2b and the tab forgets it", (await pl.evaluate(() => window.sessionStorage.getItem("terrastory.session-activity.v1"))) === null);
    await pl.goto(`${BASE}/partner/dashboard`, { waitUntil: "load" });
    check("E2b a link-proven session opens the partner area (no request yet)", /No partnership request yet/.test(await pl.locator("main").innerText()));
    await l.close();

    /* ------------------------------------------- 3. new-user home, honestly */
    const b = await newContext();
    const pb = await b.newPage();
    const bEmail = await createConfirmed("b", "Bharat Second");
    await logIn(pb, bEmail);
    await pb.waitForURL(/\/account/, { timeout: 45_000 });
    await pb.waitForTimeout(800);
    const bHome = await pb.locator("main").innerText();
    check("E3 a brand-new account is welcomed, not 'welcomed back'", /Welcome to TerraStory/.test(bHome) && !/Welcome back/.test(bHome));
    check("E3 it asks for interests and offers the 18 destinations", /Choose your interests to get personalized recommendations/.test(bHome) && /Explore 18 Indian destinations/.test(bHome));
    check("E3 it shows no invented history or recommendations", !/Continue exploring|Recently explored|Recommended because|Based on your interest/.test(bHome));
    check("E3 empty journey state says so", /You haven.t started a journey yet/.test(bHome));
    const bId = (await userId(bEmail)) as string;

    /* ----------------------------------------------------- 4. interests */
    await pa.goto(`${BASE}/account/interests`, { waitUntil: "load" });
    await pa.getByLabel(/^Architecture/).check();
    await pa.getByLabel(/^History/).check();
    await pa.getByRole("button", { name: "Save interests" }).click();
    await pa.waitForURL(/\/account\/profile/, { timeout: 45_000 });
    const savedInterests = await sql`select interest_id from user_interests where user_id = ${aId} order by interest_id`;
    check("E4 chosen interests are saved exactly", savedInterests.map((row) => row.interest_id).join() === "architecture,history", savedInterests.map((row) => row.interest_id).join());
    await pa.goto(`${BASE}/account`, { waitUntil: "load" });
    const recsBefore = (await (await pa.request.get(`${BASE}/api/account/recommendations`)).json()) as { destinations: { destinationId: string; reasons: string[] }[] };
    check("E4 recommendations appear, each with a reason", recsBefore.destinations.length > 0 && recsBefore.destinations.every((rec) => rec.reasons.length > 0));
    check("E4 interest reasons name the chosen interests", recsBefore.destinations.some((rec) => rec.reasons.some((reason) => /architecture|history/.test(reason))));
    const aHome = await pa.locator("main").innerText();
    check("E4 the account home shows Recommended for you with reasons", /Recommended for you/.test(aHome) && /Based on your interest in/.test(aHome));

    /* ----------------------------------------------------- 5. exploring */
    const agra = coverage.find((entry) => entry.destination.id === "agra");
    const agraPlace = agra?.experiences.find((experience) => experience.id.startsWith("place:") && experience.href.includes("#place-"));
    const varanasiStory = ((await import("@/lib/destinations/content")).getStories);
    const stories = (await varanasiStory("varanasi")) as { slug?: string; title?: string }[];
    const story = stories.find((entry) => entry.slug);
    await pa.goto(`${BASE}/destinations/agra`, { waitUntil: "load" });
    await settle(pa);
    if (agraPlace) {
      await pa.goto(`${BASE}${agraPlace.href}`, { waitUntil: "load" });
      await settle(pa);
    }
    if (story?.slug) {
      await pa.goto(`${BASE}/destinations/varanasi/stories/${story.slug}`, { waitUntil: "load" });
      await settle(pa);
    }
    /* Visiting a place twice within half an hour is one exploration. */
    await pa.goto(`${BASE}/destinations/agra`, { waitUntil: "load" });
    await settle(pa);
    const events = await poll(
      () => sql`select event_type, destination_id, entity_id from travel_events where user_id = ${aId}`,
      (rows) => rows.some((row) => row.event_type === "STORY_VIEWED") || !story,
    );
    check("E5 opening a destination records DESTINATION_VIEWED", events.some((row) => row.event_type === "DESTINATION_VIEWED" && row.destination_id === "agra"));
    if (agraPlace) check("E5 opening a place records PLACE_VIEWED under its own destination", events.some((row) => row.event_type === "PLACE_VIEWED" && row.destination_id === "agra" && row.entity_id === agraPlace.id), agraPlace.id);
    if (story) check("E5 reading a story records STORY_VIEWED", events.some((row) => row.event_type === "STORY_VIEWED" && row.entity_id === `story:${story.slug}`));
    check("E5 a repeat view within 30 minutes is not stored twice",
      events.filter((row) => row.event_type === "DESTINATION_VIEWED" && row.destination_id === "agra").length === 1);
    const bogus = await pa.request.post(`${BASE}/api/account/events`, {
      headers: { origin: BASE },
      data: { events: [
        { clientEventId: `bogus-${stamp}-1`, type: "PLACE_VIEWED", destinationId: "varanasi", entityId: agraPlace?.id ?? "place:taj-mahal", at: Date.now() },
        { clientEventId: `bogus-${stamp}-2`, type: "DESTINATION_VIEWED", destinationId: "paris", entityId: null },
        { clientEventId: `bogus-${stamp}-3`, type: "PLACE_VIEWED", destinationId: "agra", entityId: "place:not-a-real-place" },
      ] },
    });
    const bogusBody = (await bogus.json()) as { accepted: number };
    check("E5 the server refuses a place under the wrong destination, a removed destination and an unknown place", bogusBody.accepted === 0, JSON.stringify(bogusBody));
    const oversize = await pa.request.post(`${BASE}/api/account/events`, {
      headers: { origin: BASE },
      data: { events: Array.from({ length: 31 }, (_, i) => ({ clientEventId: `big-${stamp}-${i}`, type: "DESTINATION_VIEWED", destinationId: "goa", entityId: null })) },
    });
    check("E5 a batch over 30 events is refused", oversize.status() === 400, String(oversize.status()));
    const malformed = await pa.request.post(`${BASE}/api/account/events`, {
      headers: { origin: BASE },
      data: { events: [{ clientEventId: `stay-${stamp}-x`, type: "STAY_VIEWED", destinationId: "jaipur", entityId: "partner-stay:not-a-uuid" }] },
    });
    check("E5 a malformed partner-stay id is refused, not a server error", malformed.status() === 200 && ((await malformed.json()) as { accepted: number }).accepted === 0, String(malformed.status()));
    const replay = await pa.request.post(`${BASE}/api/account/events`, {
      headers: { origin: BASE },
      data: { events: [{ clientEventId: `replay-${stamp}`, type: "CULTURE_VIEWED", destinationId: "kochi", entityId: null }] },
    });
    const replayAgain = await pa.request.post(`${BASE}/api/account/events`, {
      headers: { origin: BASE },
      data: { events: [{ clientEventId: `replay-${stamp}`, type: "CULTURE_VIEWED", destinationId: "kochi", entityId: null }] },
    });
    check("E5 a replayed event id is stored once", ((await replay.json()) as { stored: number }).stored === 1 && ((await replayAgain.json()) as { stored: number }).stored === 0);

    await pa.goto(`${BASE}/account/history`, { waitUntil: "load" });
    const historyText = await pa.locator("main").innerText();
    check("E5 travel history lists explored destinations with first and last visit", /Destinations explored/.test(historyText) && /Agra/.test(historyText) && /Varanasi/.test(historyText) && /First explored/.test(historyText));
    if (agraPlace) check("E5 travel history lists the place by its name", historyText.includes(agraPlace.title));
    if (story?.title) check("E5 travel history lists the story by its title", historyText.includes(story.title));
    await pa.goto(`${BASE}/account`, { waitUntil: "load" });
    const continueText = await pa.locator("main").innerText();
    check("E5 the account home offers Continue exploring the latest destination", /Continue exploring/.test(continueText) && /Welcome back/.test(continueText));

    /* ----------------------------------------------------- 6. journey */
    await pa.goto(`${BASE}/`, { waitUntil: "load" });
    await pa.waitForTimeout(1500);
    await pa.getByRole("button", { name: "Add Jaipur to your journey" }).first().click();
    await pa.getByRole("button", { name: "Add Mysuru to your journey" }).first().click();
    const journeyRow = await poll(
      () => sql`select id, destination_ids, completed_ids, status, completed_at from user_journeys where user_id = ${aId} and status = 'IN_PROGRESS'`,
      (rows) => rows[0]?.destination_ids?.length === 2,
    );
    check("E6 a journey started while signed in is saved to the account", journeyRow[0]?.destination_ids?.join() === "jaipur,mysuru", JSON.stringify(journeyRow[0] ?? null));
    check("E6 a new journey is in progress with no completion date", journeyRow[0]?.status === "IN_PROGRESS" && journeyRow[0]?.completed_at === null);
    const started = await sql`select count(*)::int as n from travel_events where user_id = ${aId} and event_type = 'JOURNEY_STARTED'`;
    check("E6 starting a journey is one JOURNEY_STARTED event", started[0]?.n === 1, String(started[0]?.n));

    /* ----------------------------------------------------- 7. comparison */
    await pa.goto(`${BASE}/destinations/compare?ids=jaipur,agra,delhi`, { waitUntil: "load" });
    await settle(pa);
    await pa.goto(`${BASE}/destinations/compare?ids=delhi,jaipur,agra`, { waitUntil: "load" });
    await settle(pa);
    const comparisons = await poll(
      () => sql`select destination_ids, times_compared from user_comparisons where user_id = ${aId}`,
      (rows) => rows.length > 0,
    );
    check("E7 a comparison is saved once per set of destinations", comparisons.length === 1 && [...comparisons[0].destination_ids].sort().join() === "agra,delhi,jaipur", JSON.stringify(comparisons));

    /* ------------------------------------ 8. log out, log in: it persisted */
    await logOut(pa);
    const afterLogoutStorage = await pa.evaluate(() => ({ journey: window.localStorage.getItem("terrastory.journey.v1"), hint: document.cookie.includes("ts_signed_in=1") }));
    check("E8 logging out forgets this device's journey and the signed-in hint", afterLogoutStorage.journey === null && !afterLogoutStorage.hint, JSON.stringify(afterLogoutStorage));
    const blocked = await pa.goto(`${BASE}/account/history`, { waitUntil: "load" });
    check("E8 after log-out the history page is not reachable", pa.url().includes("/login"), `${blocked?.status()} ${pa.url()}`);
    const staleApi = await a.request.get(`${BASE}/api/account/me`);
    check("E8 after log-out the account API is 401", staleApi.status() === 401, String(staleApi.status()));
    await logIn(pa, signupEmail);
    await pa.waitForURL(/\/account/, { timeout: 45_000 });
    await pa.goto(`${BASE}/journey`, { waitUntil: "load" });
    const restored = await poll(
      () => pa.evaluate(() => window.localStorage.getItem("terrastory.journey.v1")),
      (value) => Boolean(value && value.includes("mysuru")),
    );
    check("E8 the journey comes back on log-in", Boolean(restored && restored.includes("jaipur") && restored.includes("mysuru")), String(restored));
    await pa.goto(`${BASE}/account/history`, { waitUntil: "load" });
    const persisted = await pa.locator("main").innerText();
    check("E8 the comparison is in travel history after log-in", /Comparisons/.test(persisted) && /Jaipur · Agra · Delhi|Delhi · Jaipur · Agra/.test(persisted));
    check("E8 the journey is in travel history as In progress", /Jaipur → Mysuru/.test(persisted) && /In progress/.test(persisted));

    /* ------------------------------ 9. recommendations follow the signals */
    await pa.goto(`${BASE}/destinations/jaipur`, { waitUntil: "load" });
    const forYou = await pa.waitForSelector("#for-you", { timeout: 45_000 }).catch(() => null);
    const forYouText = forYou ? await forYou.innerText() : "";
    check("E9 a destination page shows its own places recommended for the traveller", /Recommended for you in Jaipur/.test(forYouText) && /Based on your interest in/.test(forYouText));
    const forYouLinks = await pa.locator("#for-you a").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    check("E9 every recommended place link stays inside Jaipur", forYouLinks.length > 0 && forYouLinks.every((href) => href.startsWith("/destinations/jaipur")), forYouLinks.join(", "));
    const before = recsBefore.destinations.map((rec) => rec.destinationId).join();
    await pa.goto(`${BASE}/account/interests`, { waitUntil: "load" });
    await pa.getByLabel(/^Architecture/).uncheck();
    await pa.getByLabel(/^History/).uncheck();
    await pa.getByLabel(/^Nature/).check();
    await pa.getByLabel(/^Food/).check();
    await pa.getByRole("button", { name: "Save interests" }).click();
    await pa.waitForURL(/\/account\/profile/, { timeout: 45_000 });
    const recsAfter = (await (await pa.request.get(`${BASE}/api/account/recommendations`)).json()) as { destinations: { destinationId: string; reasons: string[] }[] };
    check("E9 changing interests changes the recommendations", recsAfter.destinations.map((rec) => rec.destinationId).join() !== before, `${before} → ${recsAfter.destinations.map((rec) => rec.destinationId).join()}`);
    check("E9 new reasons name the new interests, not the old ones",
      recsAfter.destinations.some((rec) => rec.reasons.some((reason) => /nature|food/.test(reason))) &&
      recsAfter.destinations.every((rec) => rec.reasons.every((reason) => !/interest in (architecture|history)/.test(reason))));
    check("E9 explored destinations are not recommended back", recsAfter.destinations.every((rec) => !["agra", "varanasi", "kochi"].includes(rec.destinationId)));

    /* ----------------------------------------------------- 10. the guide */
    await pa.goto(`${BASE}/account`, { waitUntil: "load" });
    await pa.waitForTimeout(1200);
    await pa.getByRole("button", { name: /Ask the guide/i }).first().click();
    const guideInput = pa.getByLabel("Ask the trip guide");
    await guideInput.fill("What should I explore next?");
    await guideInput.press("Enter");
    const guideReply = await pa.waitForSelector("text=Based on your interests and what you've explored", { timeout: 45_000 }).catch(() => null);
    check("E10 the guide answers 'what next' from the traveller's own signals", Boolean(guideReply));
    const firstRec = recsAfter.destinations[0];
    if (guideReply && firstRec) {
      const name = listDestinations().find((d) => d.id === firstRec.destinationId)?.name ?? "";
      check("E10 the guide names the same destination the account recommends", (await pa.locator("body").innerText()).includes(name), name);
    }
    const guideUse = await poll(() => sql`select count(*)::int as n from travel_events where user_id = ${aId} and event_type = 'AI_GUIDE_USED'`, (rows) => rows[0]?.n >= 1);
    check("E10 using the guide is recorded, without the question", guideUse[0]?.n >= 1);

    /* ------------------------------------------ 11. user A cannot reach B */
    await pb.goto(`${BASE}/destinations/amritsar`, { waitUntil: "load" });
    await settle(pb);
    await poll(() => sql`select 1 from destination_affinity where user_id = ${bId} and destination_id = 'amritsar'`, (rows) => rows.length > 0);
    await pa.goto(`${BASE}/account/history`, { waitUntil: "load" });
    /* The visible page: the raw HTML carries every destination name for the guide. */
    const aHistory = await pa.locator("main").innerText();
    check("E11 A's history does not contain B's exploration", !aHistory.includes("Amritsar"));
    const aMe = (await (await pa.request.get(`${BASE}/api/account/me`)).json()) as { recent: { destinationId: string }[] };
    check("E11 A's account API returns only A's destinations", !aMe.recent.some((row) => row.destinationId === "amritsar"));
    const bJourneyBefore = await sql`select count(*)::int as n from user_journeys where user_id = ${bId}`;
    const hijack = await pa.request.put(`${BASE}/api/account/journey`, {
      headers: { origin: BASE },
      data: { destinationIds: ["goa"], completedIds: [], userId: bId, user_id: bId },
    });
    const bJourneyAfter = await sql`select count(*)::int as n from user_journeys where user_id = ${bId}`;
    check("E11 A cannot write B's journey, even naming B's id", hijack.ok() && bJourneyAfter[0]?.n === bJourneyBefore[0]?.n);
    await pa.request.put(`${BASE}/api/account/journey`, { headers: { origin: BASE }, data: { destinationIds: ["jaipur", "mysuru"], completedIds: [] } });
    const compareHijack = await pa.request.post(`${BASE}/api/account/comparisons`, { headers: { origin: BASE }, data: { destinationIds: ["goa", "pune"], userId: bId } });
    const bComparisons = await sql`select count(*)::int as n from user_comparisons where user_id = ${bId}`;
    check("E11 A cannot add a comparison to B", compareHijack.ok() && bComparisons[0]?.n === 0);
    const crossSite = await a.request.post(`${BASE}/api/account/events`, {
      headers: { origin: "https://evil.example" },
      data: { events: [{ clientEventId: `evil-${stamp}`, type: "DESTINATION_VIEWED", destinationId: "goa", entityId: null }] },
    });
    const evilRow = await sql`select 1 from travel_events where client_event_id = ${`evil-${stamp}`}`;
    check("E11 a cross-site request with A's cookies is refused and stores nothing", crossSite.status() === 403 && evilRow.length === 0, String(crossSite.status()));
    const partnerView = await pb.goto(`${BASE}/partner/dashboard`, { waitUntil: "load" });
    const partnerText = await pb.locator("main").innerText();
    check("E11 a password session cannot open partner records; it is asked for a code", /Sign in with a one-time code/.test(partnerText));
    check("E11 the partner dashboard shows no traveller history", !/Amritsar|Travel history|Recently explored/.test(partnerText), String(partnerView?.status()));
    const adminView = await pb.goto(`${BASE}/admin/partners`, { waitUntil: "load" });
    check("E11 a traveller gets 404 on the review console", adminView?.status() === 404, String(adminView?.status()));

    /* ----------------------------------------------------- 12. clear history */
    await pa.goto(`${BASE}/account/profile`, { waitUntil: "load" });
    await pa.waitForTimeout(800);
    await pa.getByRole("button", { name: "Clear travel history" }).click();
    await pa.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    check("E12 clearing history needs confirmation", /Tick the box/.test((await pa.locator('p[role="alert"]').last().textContent()) ?? ""));
    await pa.getByLabel(/I understand this removes/).check();
    await pa.getByRole("button", { name: "Clear travel history" }).click();
    await pa.waitForSelector('p[role="status"]:has-text("Cleared")', { timeout: 45_000 });
    const [eventsLeft, affinityLeft, comparisonsLeft, interestsLeft, currentLeft] = await Promise.all([
      sql`select count(*)::int as n from travel_events where user_id = ${aId}`,
      sql`select count(*)::int as n from destination_affinity where user_id = ${aId}`,
      sql`select count(*)::int as n from user_comparisons where user_id = ${aId}`,
      sql`select count(*)::int as n from user_interests where user_id = ${aId}`,
      sql`select count(*)::int as n from user_journeys where user_id = ${aId} and status = 'IN_PROGRESS'`,
    ]);
    check("E12 every event, explored destination and comparison is deleted", eventsLeft[0]?.n === 0 && affinityLeft[0]?.n === 0 && comparisonsLeft[0]?.n === 0,
      JSON.stringify([eventsLeft[0]?.n, affinityLeft[0]?.n, comparisonsLeft[0]?.n]));
    check("E12 chosen interests and the journey in progress stay, as the page says", interestsLeft[0]?.n === 2 && currentLeft[0]?.n === 1);
    const late = await pa.request.post(`${BASE}/api/account/events`, {
      headers: { origin: BASE },
      data: { events: [{ clientEventId: `late-${stamp}`, type: "DESTINATION_VIEWED", destinationId: "lucknow", entityId: null, at: Date.now() - 120_000 }] },
    });
    check("E12 an event from before the clear cannot trickle back", ((await late.json()) as { stored: number }).stored === 0);
    const recsCleared = (await (await pa.request.get(`${BASE}/api/account/recommendations`)).json()) as { destinations: { destinationId: string; reasons: string[] }[] };
    check("E12 recommendations stop citing cleared history at once",
      recsCleared.destinations.every((rec) => rec.reasons.every((reason) => !/^You (explored|viewed)|which you explored/.test(reason))));
    check("E12 destinations explored before clearing can be recommended again",
      recsCleared.destinations.length > 0);
    await pa.goto(`${BASE}/account/history`, { waitUntil: "load" });
    check("E12 travel history is empty afterwards", /You haven.t explored any destinations yet|Journeys/.test(await pa.locator("main").innerText()) && !(await pa.locator("main").innerText()).includes("Varanasi"));

    /* ---------------------------------------------- 13. pausing recording */
    await pa.goto(`${BASE}/account/profile`, { waitUntil: "load" });
    await pa.getByLabel("Remember what I explore while signed in").uncheck();
    await pa.getByRole("button", { name: "Save", exact: true }).first().click();
    await pa.waitForURL(/saved=recording/, { timeout: 45_000 });
    await pa.goto(`${BASE}/destinations/goa`, { waitUntil: "load" });
    await settle(pa, 3500);
    const paused = await sql`select count(*)::int as n from travel_events where user_id = ${aId} and destination_id = 'goa'`;
    check("E13 with recording paused, exploring stores nothing", paused[0]?.n === 0);
    await pa.goto(`${BASE}/account/profile`, { waitUntil: "load" });
    await pa.getByLabel("Remember what I explore while signed in").check();
    await pa.getByRole("button", { name: "Save", exact: true }).first().click();
    await pa.waitForURL(/saved=recording/, { timeout: 45_000 });

    /* ----------------------------------------------------- 14. enumeration */
    const e = await newContext();
    const pe = await e.newPage();
    await logIn(pe, signupEmail, "wrong-password-123");
    await pe.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    const wrongPassword = await pe.locator('p[role="alert"]').textContent();
    await logIn(pe, emailFor("nobody"), "wrong-password-123");
    await pe.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    const unknownEmail = await pe.locator('p[role="alert"]').textContent();
    check("E14 a wrong password and an unknown e-mail get the same answer", Boolean(wrongPassword) && wrongPassword === unknownEmail, `${wrongPassword} | ${unknownEmail}`);
    await pe.goto(`${BASE}/forgot-password`, { waitUntil: "load" });
    await pe.getByLabel("Email").fill(emailFor("nobody-reset"));
    await pe.getByRole("button", { name: "Send reset link" }).click();
    await pe.waitForSelector('div[role="status"]', { timeout: 45_000 });
    check("E14 password reset answers 'if … has an account' for any address", /If .* has a TerraStory account/.test((await pe.locator('div[role="status"]').textContent()) ?? ""));
    for (let i = 0; i < 10; i += 1) {
      await logIn(pe, emailFor("nobody"), `wrong-${i}-password`);
      await pe.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    }
    check("E14 repeated failed log-ins are slowed down", /Too many attempts/.test((await pe.locator('p[role="alert"]').textContent()) ?? ""));
    await e.close();

    /* ---------------------------------------------------- 15. reset password */
    const c = await newContext(390);
    const pc = await c.newPage();
    const cEmail = await createConfirmed("c", "Chitra Reset");
    const { data: recovery } = await admin.auth.admin.generateLink({ type: "recovery", email: cEmail });
    const hashed = recovery?.properties?.hashed_token;
    await logIn(pc, cEmail);
    await pc.waitForURL(/\/account/, { timeout: 45_000 });
    await pc.goto(`${BASE}/reset-password`, { waitUntil: "load" });
    check("E15 a password session cannot set a new password without a reset link", !(await pc.getByLabel("New password", { exact: true }).count()) && /Request a new link/.test(await pc.locator("main").innerText()));
    await pc.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(hashed ?? "")}&type=recovery&next=/reset-password`, { waitUntil: "load" });
    await pc.waitForURL(/\/auth\/continue/, { timeout: 45_000 });
    await pc.getByRole("button", { name: "Continue" }).click();
    await pc.waitForURL(/\/reset-password/, { timeout: 45_000 });
    await pc.waitForTimeout(800);
    const NEW_PASSWORD = `${PASSWORD}-new`;
    await pc.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await pc.getByLabel("Confirm new password").fill(`${NEW_PASSWORD}x`);
    await pc.getByRole("button", { name: "Save new password" }).click();
    await pc.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    check("E15 mismatched new passwords are refused", /do not match/.test((await pc.locator('p[role="alert"]').textContent()) ?? ""));
    await pc.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await pc.getByLabel("Confirm new password").fill(NEW_PASSWORD);
    await pc.getByRole("button", { name: "Save new password" }).click();
    await pc.waitForSelector('div[role="status"]', { timeout: 45_000 });
    check("E15 the reset link lets the traveller choose a new password", /password has been changed/.test((await pc.locator('div[role="status"]').textContent()) ?? ""));
    check("E15 the reset page fits a 390px screen", (await overflow(pc)) <= 1);
    await logOut(pc);
    await logIn(pc, cEmail, PASSWORD);
    await pc.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    check("E15 the old password no longer works", /did not work/.test((await pc.locator('p[role="alert"]').textContent()) ?? ""));
    await logIn(pc, cEmail, NEW_PASSWORD);
    await pc.waitForURL(/\/account/, { timeout: 45_000 });
    check("E15 the new password logs in", pc.url().includes("/account"));

    /* ------------------------------------------------ 16. phone-width pages */
    for (const path of ["/account", "/account/history", "/account/profile", "/account/interests", "/destinations/jaipur"]) {
      await pc.goto(`${BASE}${path}`, { waitUntil: "load" });
      await pc.waitForTimeout(900);
      check(`E16 ${path} fits a 390px screen signed in`, (await overflow(pc)) <= 1, `${await overflow(pc)}px`);
    }
    for (const path of ["/login", "/signup", "/forgot-password", "/reset-password"]) {
      const anon = await newContext(320);
      const pp = await anon.newPage();
      await pp.goto(`${BASE}${path}`, { waitUntil: "load" });
      check(`E16 ${path} fits a 320px screen`, (await overflow(pp)) <= 1);
      const small = await pp.locator("main button, main input:not([type=hidden]), main a").evaluateAll((els) =>
        els.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.height < 24 && el.tagName !== "A";
        }).length);
      check(`E16 ${path} controls are large enough to tap`, small === 0, String(small));
      await anon.close();
    }

    /* ---------------------------------------------------- 17. delete account */
    await pc.goto(`${BASE}/account/profile`, { waitUntil: "load" });
    await pc.waitForTimeout(800);
    await pc.getByLabel("Type DELETE to confirm").fill("delete");
    await pc.getByRole("button", { name: "Delete my account" }).click();
    await pc.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    check("E17 deletion needs the exact confirmation", /Type DELETE/.test((await pc.locator('p[role="alert"]').last().textContent()) ?? ""));
    const cId = (await userId(cEmail)) as string;
    await pc.getByLabel("Type DELETE to confirm").fill("DELETE");
    await pc.getByRole("button", { name: "Delete my account" }).click();
    await pc.waitForURL((url) => url.pathname === "/", { timeout: 45_000 });
    const cRow = await sql`select 1 from users where id = ${cId}`;
    const { data: cAuth } = await admin.auth.admin.getUserById(cId);
    check("E17 deleting the account removes the user and the sign-in", cRow.length === 0 && !cAuth?.user);
    if (cRow.length === 0) created.splice(created.indexOf(cId), 1);
    await logIn(pc, cEmail, NEW_PASSWORD);
    await pc.waitForSelector('p[role="alert"]', { timeout: 45_000 });
    check("E17 a deleted account cannot log in", /did not work/.test((await pc.locator('p[role="alert"]').textContent()) ?? ""));

    /* ---------------------------------------------------- 18. signed-out guide */
    const g = await newContext();
    const pg = await g.newPage();
    await pg.goto(`${BASE}/destinations/jaipur`, { waitUntil: "load" });
    await pg.waitForTimeout(1200);
    await pg.getByRole("button", { name: /Ask the guide/i }).first().click();
    const input = pg.getByLabel("Ask the trip guide");
    await input.fill("What should I explore next?");
    await input.press("Enter");
    const anonReply = await pg.waitForSelector("text=once you log in", { timeout: 15_000 }).catch(() => null);
    check("E18 signed out, the guide does not pretend to know the visitor", Boolean(anonReply));
    await g.close();

    await a.close();
    await b.close();
    await c.close();
  } finally {
    await browser.close().catch(() => undefined);
    for (const id of created) {
      try {
        await sql`update audit_logs set actor_id = null where actor_id = ${id}`;
        await sql`update partners set owner_user_id = null where owner_user_id = ${id}`;
        await sql`delete from users where id = ${id}`;
        await admin.auth.admin.deleteUser(id);
      } catch (error) {
        console.log(`WARN  cleanup ${id}: ${(error as Error).message}`);
      }
    }
    await Promise.race([sql.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
