/**
 * Subscriptions and feature gating (Phase 4).
 *
 * WHAT THIS GUARDS
 * ----------------
 * "A plan decides what a partner may do, and only the server decides that."
 * Every gate resolves through lib/subscriptions/entitlements.ts, a lapsed
 * subscription restricts at once, and nothing a partner already created is
 * touched by a plan change.
 *
 * A–B run without anything. C needs DATABASE_URL. D needs a server as well,
 * with QA_ADMIN_EMAIL on its ADMIN_EMAILS allowlist and Supabase credentials
 * for sign-in.
 *
 *   pnpm qa:subscriptions
 *   QA_BASE_URL=http://localhost:3100 QA_ADMIN_EMAIL=qa-admin@terrastory.test pnpm qa:subscriptions
 *
 * Every row created is synthetic ("(QA synthetic)", qa-plan-* addresses) and
 * removed at the end.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

import {
  can,
  FEATURES,
  lowestPlanWith,
  PAST_DUE_GRACE_DAYS,
  resolveEntitlements,
  subscriptionState,
  withinLimit,
  type PlanRow,
  type SubscriptionRow,
} from "@/lib/subscriptions/entitlements";

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

/* ======================================================================
   A. ENTITLEMENTS
   ====================================================================== */
section("A. Entitlements");

const free: PlanRow = { code: "FREE", name: "Free", isDefault: true, isActive: true, entitlements: { features: ["createListing", "manageInventory"], limits: { listings: 1, roomTypesPerListing: 3, teamMembers: 0 } } };
const growth: PlanRow = { code: "GROWTH", name: "Growth", isDefault: false, isActive: true, entitlements: { features: ["createListing", "manageInventory", "viewAnalytics"], limits: { listings: 5, roomTypesPerListing: 20, teamMembers: 0 } } };
const pro: PlanRow = { code: "PRO", name: "Pro", isDefault: false, isActive: true, entitlements: { features: [...FEATURES], limits: { listings: null, roomTypesPerListing: 50, teamMembers: 10 } } };
const catalogue = [free, growth, pro];
const now = new Date("2026-09-18T10:00:00Z");
const day = 86_400_000;
const at = (days: number) => new Date(now.getTime() + days * day);
const sub = (over: Partial<SubscriptionRow>): SubscriptionRow => ({ planCode: "GROWTH", status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, ...over });

const noSub = resolveEntitlements(catalogue, null, now);
check("a partner with no subscription is on the default plan", noSub.planCode === "FREE" && noSub.state === "DEFAULT" && noSub.subscribedPlanCode === null);
check("the default plan's features and limits come from its row",
  can(noSub, "createListing") && !can(noSub, "viewAnalytics") && noSub.limits.listings === 1 && noSub.limits.teamMembers === 0);

const trialing = resolveEntitlements(catalogue, sub({ status: "TRIALING", trialEndsAt: at(3) }), now);
check("a live trial gets its plan", trialing.planCode === "GROWTH" && trialing.state === "TRIALING" && can(trialing, "viewAnalytics"));
const trialOver = resolveEntitlements(catalogue, sub({ status: "TRIALING", trialEndsAt: at(-1) }), now);
check("a finished trial falls back to the default plan", trialOver.planCode === "FREE" && trialOver.state === "LAPSED" && !can(trialOver, "viewAnalytics") && trialOver.subscribedPlanCode === "GROWTH");

check("an open-ended active subscription applies", resolveEntitlements(catalogue, sub({}), now).state === "ACTIVE");
check("an active subscription inside its period applies", resolveEntitlements(catalogue, sub({ currentPeriodEnd: at(5) }), now).planCode === "GROWTH");
const lapsed = resolveEntitlements(catalogue, sub({ currentPeriodEnd: at(-1) }), now);
check("an active subscription past its period end is restricted at once", lapsed.planCode === "FREE" && lapsed.state === "LAPSED" && !can(lapsed, "viewAnalytics"));
check("a cancelling subscription keeps its plan until the period ends",
  resolveEntitlements(catalogue, sub({ currentPeriodEnd: at(2), cancelAtPeriodEnd: true }), now).state === "CANCELLING"
  && resolveEntitlements(catalogue, sub({ status: "CANCELLED", currentPeriodEnd: at(2) }), now).planCode === "GROWTH"
  && resolveEntitlements(catalogue, sub({ status: "CANCELLED", currentPeriodEnd: at(-2) }), now).planCode === "FREE");
check("past due keeps the plan for the grace period and no longer",
  resolveEntitlements(catalogue, sub({ status: "PAST_DUE", currentPeriodEnd: at(-1) }), now).planCode === "GROWTH"
  && resolveEntitlements(catalogue, sub({ status: "PAST_DUE", currentPeriodEnd: at(-(PAST_DUE_GRACE_DAYS + 1)) }), now).planCode === "FREE");
check("an expired subscription never applies", resolveEntitlements(catalogue, sub({ status: "EXPIRED", currentPeriodEnd: at(30) }), now).planCode === "FREE");
check("a subscription naming a plan that no longer exists falls back", resolveEntitlements(catalogue, sub({ planCode: "LEGACY" }), now).planCode === "FREE");
check("the state helper reports when an entitlement ends", subscriptionState(sub({ currentPeriodEnd: at(4) }), now).endsAt?.toISOString() === at(4).toISOString());
check("a catalogue with no default plan is a deployment error, not a silent allow", (() => {
  try { resolveEntitlements([growth], null, now); return false; } catch { return true; }
})());

const proEnt = resolveEntitlements(catalogue, sub({ planCode: "PRO" }), now);
check("limits: under is allowed, at is not, null is no plan limit",
  withinLimit(noSub, "listings", 0) && !withinLimit(noSub, "listings", 1) && withinLimit(proEnt, "listings", 500)
  && !withinLimit(noSub, "teamMembers", 0) && withinLimit(proEnt, "teamMembers", 9) && !withinLimit(proEnt, "teamMembers", 10));
check("every feature is reachable from some plan and named once", FEATURES.every((f) => lowestPlanWith(catalogue, f) !== null) && new Set(FEATURES).size === FEATURES.length);
check("the cheapest plan with a feature is the one offered", lowestPlanWith(catalogue, "viewAnalytics")?.code === "GROWTH" && lowestPlanWith(catalogue, "addTeamMembers")?.code === "PRO");

/* ======================================================================
   B. CODE GUARANTEES
   ====================================================================== */
section("B. Code guarantees");

const read = (f: string) => readFileSync(f, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
const sources = walk("src");
/* The schema folder may NAME plan tiers (the retired `vendors.plan_tier`
   enum); what must not exist is code branching on one. */
const planLiterals = sources.filter(
  (f) => !f.includes("lib/subscriptions/") && !f.includes("db/schema/") && /["'](PRO|GROWTH)["']/.test(strip(read(f))),
);
check("no page or store compares plan codes; gates ask the entitlement module", planLiterals.length === 0, planLiterals.join(", "));
const inventory = strip(read("src/lib/partners/inventory.ts"));
check("adding a listing is gated and counted server-side",
  /can\(plan, "createListing"\)/.test(inventory) && /withinLimit\(plan, "listings", await listingCount\(tx, scope\.partnerId\)\)/.test(inventory));
check("room types and the calendar are gated server-side",
  (inventory.match(/can\(await entitlementsFor\(scope\.partnerId, tx\), "manageInventory"\)/g) ?? []).length >= 3
  && /withinLimit\(plan, "roomTypesPerListing"/.test(inventory));
check("the apply form cannot get around the listing limit", /withinLimit\(plan, "listings", await listingCount\(tx, partner\.id\)\)/.test(strip(read("src/lib/partners/store.ts"))));
const manage = strip(read("src/lib/subscriptions/manage.ts"));
check("team changes are owner-only and gated", /ownerOf\(tx, scope\.partnerId, scope\.actorId\)/.test(manage) && /can\(plan, "addTeamMembers"\)/.test(manage) && /withinLimit\(plan, "teamMembers"/.test(manage));
check("removing a team member is never blocked by a plan", manage.split("export async function removeTeamMember")[1]?.includes("entitlementsFor") === false);
check("a plan change writes only the subscription row",
  !/partnerProperties|listingUnits|availability|bookings/.test(manage.split("export async function assignSubscription")[1]?.split("export async function endSubscription")[0] ?? "x"));
check("subscription writes are audited and idempotent", /subscription\.assigned/.test(manage) && /return \{ ok: true, changed: false \}/.test(manage));
const report = strip(read("src/app/(v1)/partner/reports/reservations/route.ts"));
check("the CSV report checks the plan on the server and is partner-scoped",
  /can\(await entitlementsFor\(access\.partner\.id\), "advancedReports"\)/.test(report) && /holdReportForPartner\(access\.partner\.id\)/.test(report) && /status: 403/.test(report));
const reportQuery = strip(read("src/db/queries/partner-analytics.ts")).split("export async function holdReportForPartner")[1]?.split("export async function")[0] ?? "";
check("the CSV report carries no traveller identity",
  !/email|contactPhone|contact_phone|userId/.test(report) && !/email|contact_phone|contactPhone|userId/.test(reportQuery), reportQuery.slice(0, 80));
const analyticsPage = read("src/app/(v1)/partner/analytics/page.tsx");
check("analytics does not even read the numbers without the feature", analyticsPage.indexOf('can(entitlements, "viewAnalytics")') < analyticsPage.indexOf("analyticsForPartner("));
check("analytics says plainly that no revenue exists yet", /analytics\.noRevenue/.test(analyticsPage) && /No payment has been taken/.test(read("src/lib/i18n/partner-messages.ts")));
const plansSql = read("drizzle/sql/0004_subscriptions.sql");
check("plans are data, with their price marked as proposed and its source named",
  /INSERT INTO plans/.test(plansSql) && /'PROPOSED'/.test(plansSql) && /docs\/sih-ppt-content\.md/.test(plansSql) && /plans_single_default/.test(plansSql));
check("a member can never be an owner of another organisation", /partner_members_not_owner/.test(plansSql));
check("the workspace pages take their words from the catalogue",
  ["src/app/(v1)/partner/plan/page.tsx", "src/app/(v1)/partner/analytics/page.tsx", "src/app/(v1)/partner/team/page.tsx"].every((f) => /partnerTranslator\(/.test(read(f))));
check("robots keeps crawlers out of the new private surfaces",
  ["/partner/analytics", "/partner/team", "/partner/plan", "/partner/reports/"].every((p) => read("src/app/robots.ts").includes(`"${p}"`)));

/* ======================================================================
   C. PLANS IN THE DATABASE
   ====================================================================== */
section("C. Plans in the database");

const databaseUrl = process.env.DATABASE_URL;
const stamp = Date.now().toString(36);

if (!databaseUrl) {
  console.log("SKIP  sections C–D — DATABASE_URL is not set (load .env.local)");
} else {
  const sql = postgres(databaseUrl, { ssl: "require", max: 5, prepare: false, onnotice: () => undefined });
  const planRows = await sql`select code, is_default, is_active, monthly_price_paise, price_status, trial_days, entitlements from plans order by sort_order`;
  check("the three plans from the business analysis are seeded", planRows.map((p) => p.code).join() === "FREE,GROWTH,PRO", planRows.map((p) => p.code).join());
  check("exactly one plan is the default", planRows.filter((p) => p.is_default).length === 1);
  check("prices are paise, marked proposed, and free is free",
    planRows.every((p) => p.price_status === "PROPOSED") && planRows[0]?.monthly_price_paise === "0" && planRows[1]?.monthly_price_paise === "99900" && planRows[2]?.monthly_price_paise === "249900",
    planRows.map((p) => p.monthly_price_paise).join());
  check("each plan's features are a subset of the features the code knows",
    planRows.every((p) => (p.entitlements.features as string[]).every((f) => (FEATURES as readonly string[]).includes(f))));
  check("the free plan alone has no analytics, no team and one listing",
    !(planRows[0]?.entitlements.features as string[]).includes("viewAnalytics") && planRows[0]?.entitlements.limits.listings === 1 && planRows[0]?.entitlements.limits.teamMembers === 0);
  const dbTrial = await sql`select code, trial_days from plans where trial_days > 0 order by code`;
  check("paid plans offer a trial", dbTrial.map((p) => p.code).join() === "GROWTH,PRO");

  /* ====================================================================
     D. THROUGH THE SERVER
     ==================================================================== */
  section("D. Gating in the workspace");

  let home: Response | null = null;
  try { home = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(60_000) }); } catch { home = null; }
  const adminEmail = process.env.QA_ADMIN_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!home || home.status !== 200) {
    console.log(`SKIP  section D — no server answered at ${BASE}`);
  } else if (!adminEmail || !supabaseUrl || !serviceKey) {
    console.log("SKIP  section D — set QA_ADMIN_EMAIL and load .env.local");
  } else {
    const { chromium } = await import("playwright");
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const browser = await chromium.launch();
    const authIds: string[] = [];
    let ip = 60;
    const ownerEmail = `qa-plan-owner-${stamp}@terrastory.test`;
    const staffEmail = `qa-plan-staff-${stamp}@terrastory.test`;
    const otherEmail = `qa-plan-other-${stamp}@terrastory.test`;

    const signIn = async (email: string, next: string) => {
      const created = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (created.data.user) authIds.push(created.data.user.id);
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error || !link.data.properties?.hashed_token) throw new Error(`generateLink failed: ${link.error?.message}`);
      if (link.data.user && !authIds.includes(link.data.user.id)) authIds.push(link.data.user.id);
      ip += 1;
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { "x-forwarded-for": `10.79.0.${ip}` } });
      const page = await context.newPage();
      await page.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`, { waitUntil: "load" });
      await page.waitForURL(/\/auth\/continue/, { timeout: 30_000 });
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 60_000 });
      return { context, page };
    };

    try {
      /* Fixtures: a verified partner on no subscription, with one published
         listing, a room type, dates and one hold — so a plan change can be
         shown not to touch any of it. */
      const [partner] = await sql`insert into partners (organization_name, contact_name, email, status)
        values ('QA Plan Trust (QA synthetic)', 'QA Owner', ${ownerEmail}, 'VERIFIED') returning id`;
      const [listing] = await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status, reviewed_at, published_at, source)
        values (${partner.id}, 'jaipur', ${`QA Plan Haveli ${stamp} (QA synthetic)`}, 'HERITAGE', '4 QA Path, Jaipur 302001', 'PUBLISHED', now(), now(), 'qa-synthetic') returning id`;
      const [unit] = await sql`insert into listing_units (listing_id, name, capacity, total_quantity, base_price_paise)
        values (${listing.id}, 'QA Plan Room', 2, 2, 250000) returning id`;
      const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()));
      const dayAt = (n: number) => new Date(today.getTime() + n * day).toISOString().slice(0, 10);
      /* One room open and one already held, so the analytics counts below have something true to report. */
      await sql`insert into availability (listing_unit_id, date, units_open, units_held) values (${unit.id}, ${dayAt(6)}, 1, 1)`;
      const [holdUser] = await sql`insert into users (email) values (${`qa-plan-traveller-${stamp}@terrastory.test`}) returning id`;
      const [booking] = await sql`insert into bookings (code, user_id, status, total_paise, guest_count, hold_expires_at, created_at)
        values (${`TS-P${stamp.slice(-5).toUpperCase()}`}, ${holdUser.id}, 'PENDING_PAYMENT', 250000, 2, now() + interval '10 minutes', now()) returning id, code`;
      await sql`insert into booking_items (booking_id, listing_id, listing_unit_id, vendor_id, start_date, end_date, qty, unit_price_paise, subtotal_paise, platform_fee_paise, vendor_payout_paise, status)
        values (${booking.id}, ${listing.id}, ${unit.id}, ${partner.id}, ${dayAt(6)}, ${dayAt(7)}, 1, 250000, 250000, 0, 250000, 'HELD')`;

      const owner = await signIn(ownerEmail, "/partner/plan");
      const op = owner.page;
      const text = () => op.locator("main").innerText();

      /* D1. Free: restricted. */
      await op.goto(`${BASE}/partner/plan`, { waitUntil: "load" });
      check("D1 a partner with no subscription sees the default plan", (await op.locator('[data-plan="FREE"][data-plan-state="DEFAULT"]').count()) === 1);
      check("D1 the plan page shows proposed prices and says billing is not enabled", /₹999/.test(await text()) && /proposed/i.test(await text()) && /billing is not enabled/i.test(await text()));
      check("D1 usage is shown against the plan's limits", /1 of 1/.test(await text()));
      await op.goto(`${BASE}/partner/listings`, { waitUntil: "load" });
      check("D1 a free partner at its listing limit is told, and offered no New listing", (await op.locator("[data-plan-locked]").count()) === 1 && (await op.locator('a[href="/partner/listings/new"]').count()) === 0);
      await op.goto(`${BASE}/partner/listings/new`, { waitUntil: "load" });
      check("D1 the new-listing form is not rendered at the limit", (await op.locator('form [name="destinationId"]').count()) === 0 && (await op.locator("[data-plan-locked]").count()) === 1);
      await op.goto(`${BASE}/partner/analytics`, { waitUntil: "load" });
      check("D1 analytics is locked on the free plan", (await op.locator("[data-plan-locked]").count()) === 1 && (await op.locator("[data-analytics]").count()) === 0 && /Growth/.test(await text()));
      await op.goto(`${BASE}/partner/team`, { waitUntil: "load" });
      check("D1 team members are locked on the free plan", (await op.locator("[data-plan-locked]").count()) === 1 && (await op.locator("#member-email").count()) === 0);
      const csvFree = await op.request.get(`${BASE}/partner/reports/reservations`);
      check("D1 the CSV report refuses on the free plan", csvFree.status() === 403, `HTTP ${csvFree.status()}`);

      /* D2. A reviewer assigns Growth; the server, not the UI, is what changed. */
      const reviewer = await signIn(adminEmail, `/admin/partners/${listing.id}`);
      const assign = async (planCode: string, mode: "ACTIVE" | "TRIAL", periodEnd = "") => {
        await reviewer.page.goto(`${BASE}/admin/partners/${listing.id}`, { waitUntil: "load" });
        const form = reviewer.page.locator("form[data-plan-assign]");
        await form.locator('select[name="planCode"]').selectOption(planCode);
        await form.locator('select[name="mode"]').selectOption(mode);
        if (periodEnd) await form.locator('input[name="periodEnd"]').fill(periodEnd);
        await form.locator('button[type="submit"]').click();
        await reviewer.page.waitForSelector('form[data-plan-assign] p[role="status"], form[data-plan-assign] p[role="alert"]', { timeout: 45_000 });
        return (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
      };
      let reply = await assign("GROWTH", "ACTIVE", dayAt(30));
      const [growthSub] = await sql`select plan_code, status, current_period_end, assigned_by from partner_subscriptions where partner_id = ${partner.id}`;
      check("D2 a reviewer puts the partner on Growth, on the record", growthSub?.plan_code === "GROWTH" && growthSub.status === "ACTIVE" && growthSub.assigned_by !== null, `${reply} · ${JSON.stringify(growthSub)}`);
      check("D2 the assignment is audited", (await sql`select count(*)::int n from audit_logs where entity_id = ${partner.id} and action = 'subscription.assigned'`)[0]?.n === 1);
      reply = await assign("GROWTH", "ACTIVE", dayAt(30));
      check("D2 assigning the same plan again changes nothing", /nothing changed/.test(reply) && (await sql`select count(*)::int n from audit_logs where entity_id = ${partner.id} and action = 'subscription.assigned'`)[0]?.n === 1, reply);

      await op.goto(`${BASE}/partner/analytics`, { waitUntil: "load" });
      check("D3 analytics opens on Growth, with real counts", (await op.locator("[data-plan-locked]").count()) === 0 && (await op.locator("[data-analytics]").count()) === 1);
      check("D3 the counts are the rows that exist", (await op.locator('[data-metric="holdsCreated"]').first().innerText()) === "1" && (await op.locator('[data-metric="roomNightsHeld"]').first().innerText()) === "1");
      check("D3 reports are still locked on Growth, and the CSV refuses",
        (await op.locator("[data-reports-locked]").count()) === 1 && (await op.request.get(`${BASE}/partner/reports/reservations`)).status() === 403);

      /* D4. A form rendered while allowed is still refused once the plan lapses. */
      await op.goto(`${BASE}/partner/listings/new`, { waitUntil: "load" });
      check("D4 Growth offers the new-listing form", (await op.locator('form [name="destinationId"]').count()) === 1);
      /* Move the whole period into the past: an end before its start is refused by the database, rightly. */
      await sql`update partner_subscriptions set current_period_start = now() - interval '2 days', current_period_end = now() - interval '1 minute' where partner_id = ${partner.id}`;
      await op.fill("#name", `QA Sneaky Listing ${stamp} (QA synthetic)`);
      await op.selectOption("#type", "HOMESTAY");
      await op.selectOption("#destinationId", "agra");
      await op.fill("#address", "5 QA Road, Agra 282001");
      await op.click('button[type="submit"]:has-text("Submit listing for review")');
      await op.waitForSelector('p[role="alert"]', { timeout: 45_000 });
      check("D4 a lapsed plan refuses the submission the page had allowed",
        /plan/i.test((await op.locator('p[role="alert"]').allTextContents()).join(" "))
        && (await sql`select count(*)::int n from partner_properties where partner_id = ${partner.id}`)[0]?.n === 1,
        (await op.locator('p[role="alert"]').allTextContents()).join(" "));

      /* D5. Trial, then Pro. */
      reply = await assign("GROWTH", "TRIAL");
      const [trialSub] = await sql`select status, trial_ends_at from partner_subscriptions where partner_id = ${partner.id}`;
      check("D5 a trial is assigned with a real end date", trialSub?.status === "TRIALING" && new Date(trialSub.trial_ends_at).getTime() > Date.now(), `${reply} · ${JSON.stringify(trialSub)}`);
      await op.goto(`${BASE}/partner/listings/new`, { waitUntil: "load" });
      await op.fill("#name", `QA Trial Listing ${stamp} (QA synthetic)`);
      await op.selectOption("#type", "HOMESTAY");
      await op.selectOption("#destinationId", "agra");
      await op.fill("#address", "6 QA Road, Agra 282001");
      await op.click('button[type="submit"]:has-text("Submit listing for review")');
      await op.waitForURL(/\/partner\/listings\/[0-9a-f-]{36}$/, { timeout: 60_000 });
      check("D5 on a trial the partner can add a listing", (await sql`select count(*)::int n from partner_properties where partner_id = ${partner.id}`)[0]?.n === 2);

      reply = await assign("PRO", "ACTIVE", dayAt(30));
      const csvPro = await op.request.get(`${BASE}/partner/reports/reservations`);
      const csv = await csvPro.text();
      check("D6 the CSV report opens on Pro", csvPro.status() === 200 && /text\/csv/.test(csvPro.headers()["content-type"] ?? ""), `HTTP ${csvPro.status()}`);
      check("D6 it holds this partner's reservation and no traveller identity",
        csv.includes(booking.code) && !csv.includes(ownerEmail) && !csv.toLowerCase().includes("qa-plan-traveller"), csv.split("\n")[1]?.slice(0, 80));

      /* D7. Team members. */
      await op.goto(`${BASE}/partner/team`, { waitUntil: "load" });
      await op.fill("#member-email", staffEmail);
      await op.getByRole("button", { name: "Add team member" }).click();
      await op.waitForSelector(`[data-member="${staffEmail}"]`, { timeout: 45_000 });
      check("D7 on Pro the owner adds a team member", (await sql`select count(*)::int n from partner_members where partner_id = ${partner.id}`)[0]?.n === 1);
      check("D7 the addition is audited", (await sql`select count(*)::int n from audit_logs where action = 'partner_member.added'`)[0]?.n >= 1);
      const ownerAsMember = await op.request.post(`${BASE}/partner/team`, { form: { email: ownerEmail } }).catch(() => null);
      void ownerAsMember;
      const staff = await signIn(staffEmail, "/partner/listings");
      const staffText = await staff.page.locator("main").innerText();
      check("D7 the team member reaches the organisation's workspace", staffText.includes(`QA Plan Haveli ${stamp}`), staffText.slice(0, 80));
      await staff.page.goto(`${BASE}/partner/team`, { waitUntil: "load" });
      check("D7 a team member cannot manage the team", (await staff.page.locator("#member-email").count()) === 0 && /Only the owner/.test(await staff.page.locator("main").innerText()));
      const staffCsv = await staff.page.request.get(`${BASE}/partner/reports/reservations`);
      check("D7 a team member shares the organisation's plan", staffCsv.status() === 200);

      /* D8. Another partner sees none of it. */
      const [otherPartner] = await sql`insert into partners (organization_name, contact_name, email, status)
        values ('QA Other Trust (QA synthetic)', 'QA Other', ${otherEmail}, 'VERIFIED') returning id`;
      await sql`insert into partner_subscriptions (partner_id, plan_code, status, current_period_end) values (${otherPartner.id}, 'PRO', 'ACTIVE', now() + interval '30 days')`;
      const other = await signIn(otherEmail, "/partner/plan");
      const otherCsv = await other.page.request.get(`${BASE}/partner/reports/reservations`);
      const otherText = await otherCsv.text();
      check("D8 another partner's report holds none of this partner's reservations", otherCsv.status() === 200 && !otherText.includes(booking.code));
      await other.page.goto(`${BASE}/partner/team`, { waitUntil: "load" });
      check("D8 and none of its team", !(await other.page.locator("main").innerText()).includes(staffEmail));
      await other.context.close();

      /* D9. Ending a subscription restricts, and keeps everything. */
      await reviewer.page.goto(`${BASE}/admin/partners/${listing.id}`, { waitUntil: "load" });
      const endForm = reviewer.page.locator("form[data-plan-end]");
      await endForm.locator('button[value="now"]').click();
      await reviewer.page.waitForSelector('form[data-plan-end] p[role="status"], form[data-plan-end] p[role="alert"]', { timeout: 45_000 });
      const [ended] = await sql`select status from partner_subscriptions where partner_id = ${partner.id}`;
      check("D9 a reviewer ends the subscription", ended?.status === "EXPIRED");
      await op.goto(`${BASE}/partner/plan`, { waitUntil: "load" });
      check("D9 the partner is back on the default plan at once", (await op.locator('[data-plan="FREE"][data-plan-state="LAPSED"]').count()) === 1);
      check("D9 analytics and reports close again",
        (await op.request.get(`${BASE}/partner/reports/reservations`)).status() === 403
        && ((await op.goto(`${BASE}/partner/analytics`, { waitUntil: "load" })), (await op.locator("[data-plan-locked]").count()) === 1));
      const [listings, booked, units] = await Promise.all([
        sql`select count(*)::int n from partner_properties where partner_id = ${partner.id} and status = 'PUBLISHED'`,
        sql`select status, total_paise from bookings where code = ${booking.code}`,
        sql`select count(*)::int n from listing_units where listing_id = ${listing.id}`,
      ]);
      check("D9 existing listings, rooms and the held booking are untouched by the plan change",
        listings[0]?.n === 1 && units[0]?.n === 1 && booked[0]?.status === "PENDING_PAYMENT" && booked[0]?.total_paise === "250000",
        JSON.stringify({ listings: listings[0]?.n, units: units[0]?.n, booking: booked[0] }));
      await op.goto(`${BASE}/partner/team`, { waitUntil: "load" });
      check("D9 the team member is still listed and can still be removed", (await op.locator(`[data-member="${staffEmail}"]`).count()) === 1);
      await op.locator(`li[data-member="${staffEmail}"] button[type="submit"]`).click();
      await op.waitForSelector(`[data-member="${staffEmail}"]`, { state: "detached", timeout: 45_000 });
      check("D9 removal works on a lapsed plan and is audited",
        (await sql`select count(*)::int n from partner_members where partner_id = ${partner.id}`)[0]?.n === 0
        && (await sql`select count(*)::int n from audit_logs where action = 'partner_member.removed'`)[0]?.n >= 1);
      const removedStaff = await staff.page.goto(`${BASE}/partner/listings`, { waitUntil: "load" });
      void removedStaff;
      check("D9 a removed member no longer reaches the workspace", /No partnership request yet/.test(await staff.page.locator("main").innerText()));
      await staff.context.close();

      for (const width of [375, 1440]) {
        await op.setViewportSize({ width, height: 900 });
        for (const path of ["/partner/plan", "/partner/analytics", "/partner/team"]) {
          await op.goto(`${BASE}${path}`, { waitUntil: "load" });
          const over = await op.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          check(`D10 ${path} fits ${width}px`, over <= 1, `${over}px over`);
        }
      }
      await reviewer.context.close();
      await owner.context.close();
    } catch (e) {
      const error = e as Error;
      check("D  the gating flow ran to completion", false, `${error.message.split("\n")[0]} ${(error.stack ?? "").split("\n").find((l) => /subscriptions\.mts/.test(l))?.trim() ?? ""}`);
    } finally {
      await browser.close().catch(() => undefined);
      try {
        const partnerIds = (await sql`select id from partners where email like ${`qa-plan-%-${stamp}@terrastory.test`}`).map((r) => r.id);
        const listingIds = partnerIds.length ? (await sql`select id from partner_properties where partner_id in ${sql(partnerIds)}`).map((r) => r.id) : [];
        const bookingIds = listingIds.length ? (await sql`select distinct booking_id from booking_items where listing_id in ${sql(listingIds)}`).map((r) => r.booking_id) : [];
        const memberIds = partnerIds.length ? (await sql`select id from partner_members where partner_id in ${sql(partnerIds)}`).map((r) => r.id) : [];
        const entities = [...partnerIds, ...listingIds, ...bookingIds, ...memberIds];
        if (entities.length) await sql`delete from audit_logs where entity_id in ${sql(entities)}`;
        if (bookingIds.length) await sql`delete from bookings where id in ${sql(bookingIds)}`;
        if (partnerIds.length) await sql`delete from partners where id in ${sql(partnerIds)}`;
        for (const id of authIds) {
          await sql`update audit_logs set actor_id = null where actor_id = ${id}`;
          await sql`update partner_subscriptions set assigned_by = null where assigned_by = ${id}`;
          await sql`update partner_properties set reviewer_id = null where reviewer_id = ${id}`;
          await sql`update partners set verified_by = null where verified_by = ${id}`;
          await sql`delete from bookings where user_id = ${id}`;
          await sql`delete from users where id = ${id}`;
          await admin.auth.admin.deleteUser(id);
        }
        await sql`delete from users where email like ${`qa-plan-%-${stamp}@terrastory.test`}`;
      } catch (e) {
        console.log(`WARN  cleanup incomplete: ${(e as Error).message}`);
      }
    }
  }
  await Promise.race([sql.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
