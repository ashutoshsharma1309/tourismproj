/**
 * The government console (Phase 5).
 *
 * WHAT THIS GUARDS
 * ----------------
 * "An authority sees its own jurisdiction, decides inside it, and never
 * reaches a traveller." Partners and travellers cannot open the console at
 * all; an officer of one state cannot read or decide another's records; every
 * decision is audited against the organisation that made it; advisories reach
 * travellers only when published, with the authority named.
 *
 * A–B run without anything. C needs DATABASE_URL. D needs a server as well,
 * plus Supabase credentials for sign-in.
 *
 *   pnpm qa:government
 *   QA_BASE_URL=http://localhost:3100 pnpm qa:government
 *
 * Every row created is synthetic ("(QA synthetic)", qa-gov-* addresses) and
 * removed at the end.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

import { canGov, GOV_CAPABILITIES, inScope, permittedDestinations, type GovCapability } from "@/lib/government/permissions";

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
   A. ROLES AND JURISDICTION
   ====================================================================== */
section("A. Roles and jurisdiction");

const ALL = ["jaipur", "agra", "varanasi", "goa"];
check("a reviewer decides verifications and reads analytics",
  (["viewQueue", "decideVerification", "requestClarification", "viewAnalytics", "viewAdvisories"] as GovCapability[]).every((c) => canGov("REVIEWER", c)));
check("a reviewer cannot publish advisories or manage the team",
  !canGov("REVIEWER", "manageAdvisories") && !canGov("REVIEWER", "manageTeam"));
check("a manager can do everything a reviewer can, and publish and manage", GOV_CAPABILITIES.every((c) => canGov("MANAGER", c)));
check("no capability names a traveller or a payment", GOV_CAPABILITIES.every((c) => !/traveller|booking|payment|revenue|payout/i.test(c)));

const state = { scopeKind: "DESTINATIONS" as const, destinationIds: ["jaipur", "agra"], isActive: true };
check("a state body covers exactly its own destinations", permittedDestinations(state, ALL).join() === "jaipur,agra");
check("a national body covers every destination the registry knows", permittedDestinations({ scopeKind: "NATIONAL", destinationIds: [], isActive: true }, ALL).join() === ALL.join());
check("an inactive organisation covers nothing", permittedDestinations({ ...state, isActive: false }, ALL).length === 0);
check("a destination that is not in the registry is not covered", permittedDestinations({ ...state, destinationIds: ["jaipur", "atlantis"] }, ALL).join() === "jaipur");
check("in-scope is an exact membership test", inScope(["jaipur", "agra"], "jaipur") && !inScope(["jaipur", "agra"], "varanasi") && !inScope([], "jaipur"));

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

const CONSOLE_PAGES = [
  "src/app/(v1)/government/page.tsx",
  "src/app/(v1)/government/queue/page.tsx",
  "src/app/(v1)/government/queue/[propertyId]/page.tsx",
  "src/app/(v1)/government/advisories/page.tsx",
  "src/app/(v1)/government/team/page.tsx",
];
check("every console page resolves the officer from the session", CONSOLE_PAGES.every((f) => /await govAccess\(\)/.test(read(f))));
check("every console page takes its words from the catalogue", CONSOLE_PAGES.every((f) => /govTranslator\(/.test(read(f))));
const queries = strip(read("src/db/queries/government.ts"));
check("every console read is filtered by the permitted destinations",
  (queries.match(/inArray\(partnerProperties\.destinationId, destinations\)|destination_id IN/g) ?? []).length >= 3
  && /if \(!hasDatabase \|\| destinations\.length === 0\) return/.test(queries));
check("no console query joins to a traveller's identity or history",
  !/users\.|travelHistory|savedJourney|interests|contactPhone|bookings\.userId/.test(queries),
  (queries.match(/users\.|interests|contactPhone/g) ?? []).join(","));
const store = strip(read("src/lib/government/store.ts"));
check("every government write checks the capability and the jurisdiction",
  (store.match(/canGov\(context\.role,/g) ?? []).length >= 5 && (store.match(/inScope\(context\.destinations,/g) ?? []).length >= 2);
check("a verification decision carries its jurisdiction into the partner store",
  /by: \{ role: "government", orgId: context\.org\.id, destinations: context\.destinations \}/.test(store));
check("the partner store refuses a decision outside that jurisdiction",
  /by\.role === "government" && !by\.destinations\.includes\(row\.destinationId\)/.test(strip(read("src/lib/partners/store.ts"))));
check("clarification records a fact, not a new lifecycle state",
  /clarificationRequestedAt/.test(store) && !/PROPERTY_STATUSES|status: "CLARIFICATION/.test(store)
  && read("src/lib/partners/lifecycle.ts").includes('PENDING: ["UNDER_REVIEW", "REJECTED"]'));
check("every government write is audited with its organisation",
  (store.match(/insert\(auditLogs\)/g) ?? []).length >= 5 && (store.match(/orgId: context\.org\.id/g) ?? []).length >= 4);
check("publishing an advisory is a separate, idempotent act",
  /status: "DRAFT"/.test(store) && /if \(row\.status === to\) return \{ ok: true, data: \{ changed: false \} \}/.test(store));
check("an organisation cannot lose its last manager", /must keep at least one manager/.test(store));
const migration = read("drizzle/sql/0005_government.sql");
check("the database keeps government officers and partners apart",
  /gov_members_not_partner/.test(migration) && /partner_members_not_gov/.test(migration));
check("a published advisory must name its authority and its date",
  /advisories_published_is_attributed/.test(migration) && /advisories_window_ordered/.test(migration));
check("an organisation scoped to destinations must name at least one", /gov_organisations_scope_has_destinations/.test(migration));
const publicApi = strip(read("src/app/api/advisories/route.ts"));
check("the public advisory endpoint returns only published rows, with no officer",
  /publishedAdvisories\(destinationId\)/.test(publicApi) && !/createdBy|created_by|officer|email/.test(publicApi)
  && /eq\(advisories\.status, "PUBLISHED"\)/.test(queries));
check("robots keeps crawlers out of the console", /"\/government"/.test(read("src/app/robots.ts")));
check("the console is not linked from any public page",
  walk("src/app").concat(walk("src/components")).filter((f) => !f.includes("/government/") && !f.includes("components/government")).every((f) => !/href="\/government/.test(read(f))));

/* ======================================================================
   C. JURISDICTION IN THE DATABASE
   ====================================================================== */
section("C. Jurisdiction in the database");

const databaseUrl = process.env.DATABASE_URL;
const stamp = Date.now().toString(36);

if (!databaseUrl) {
  console.log("SKIP  sections C–D — DATABASE_URL is not set (load .env.local)");
} else {
  const sql = postgres(databaseUrl, { ssl: "require", max: 5, prepare: false, onnotice: () => undefined });
  const managerEmail = `qa-gov-manager-${stamp}@terrastory.test`;
  const reviewerEmail = `qa-gov-reviewer-${stamp}@terrastory.test`;
  const otherEmail = `qa-gov-other-${stamp}@terrastory.test`;
  const partnerEmail = `qa-gov-partner-${stamp}@terrastory.test`;
  const authIds: string[] = [];

  try {
    /* Rajasthan covers jaipur; another department covers varanasi only. */
    const [rajasthan] = await sql`insert into gov_organisations (name, authority, scope_kind, destination_ids)
      values ('QA Rajasthan Tourism (QA synthetic)', 'QA Department of Tourism, Rajasthan (QA synthetic)', 'DESTINATIONS', ${["jaipur"]}) returning id`;
    const [other] = await sql`insert into gov_organisations (name, authority, scope_kind, destination_ids)
      values ('QA Uttar Pradesh Tourism (QA synthetic)', 'QA Department of Tourism, Uttar Pradesh (QA synthetic)', 'DESTINATIONS', ${["varanasi"]}) returning id`;
    await sql`insert into gov_members (org_id, email, role) values (${rajasthan.id}, ${managerEmail}, 'MANAGER')`;
    await sql`insert into gov_members (org_id, email, role) values (${rajasthan.id}, ${reviewerEmail}, 'REVIEWER')`;
    await sql`insert into gov_members (org_id, email, role) values (${other.id}, ${otherEmail}, 'MANAGER')`;

    const [partner] = await sql`insert into partners (organization_name, contact_name, email, status)
      values ('QA Gov Partner Trust (QA synthetic)', 'QA Owner', ${partnerEmail}, 'PENDING') returning id`;
    const [inJaipur] = await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status, source)
      values (${partner.id}, 'jaipur', ${`QA Jaipur Application ${stamp} (QA synthetic)`}, 'HERITAGE', '7 QA Marg, Jaipur 302001', 'PENDING', 'qa-synthetic') returning id`;
    const [inVaranasi] = await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status, source)
      values (${partner.id}, 'varanasi', ${`QA Varanasi Application ${stamp} (QA synthetic)`}, 'GUEST_HOUSE', '8 QA Ghat, Varanasi 221001', 'PENDING', 'qa-synthetic') returning id`;

    const refused = async (q: Promise<unknown>) => { try { await q; return false; } catch { return true; } };
    check("C1 a government officer cannot also be a partner owner",
      await refused(sql`insert into gov_members (org_id, email, role) values (${rajasthan.id}, ${partnerEmail}, 'REVIEWER')`));
    check("C1 a partner team member cannot be a government officer",
      await refused(sql`insert into partner_members (partner_id, email) values (${partner.id}, ${managerEmail})`));
    check("C1 one officer belongs to one organisation",
      await refused(sql`insert into gov_members (org_id, email, role) values (${other.id}, ${managerEmail}, 'REVIEWER')`));
    check("C1 an organisation scoped to destinations must name one",
      await refused(sql`insert into gov_organisations (name, authority, scope_kind, destination_ids) values ('QA Empty', 'QA Empty', 'DESTINATIONS', ${[]})`));
    check("C2 an advisory cannot be published without an authority and a date",
      await refused(sql`insert into advisories (destination_id, title, status) values ('jaipur', 'QA orphan advisory', 'PUBLISHED')`));
    check("C2 an advisory window must end after it starts",
      await refused(sql`insert into advisories (destination_id, title, starts_at, ends_at) values ('jaipur', 'QA backwards', now() + interval '2 days', now())`));
    check("C2 an advisory belongs to a registry destination, by id",
      (await sql`select data_type from information_schema.columns where table_name = 'advisories' and column_name = 'destination_id'`)[0]?.data_type === "text");

    /* ====================================================================
       D. THROUGH THE SERVER
       ==================================================================== */
    section("D. The console in a browser");
    let home: Response | null = null;
    try { home = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(60_000) }); } catch { home = null; }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!home || home.status !== 200) {
      console.log(`SKIP  section D — no server answered at ${BASE}`);
    } else if (!supabaseUrl || !serviceKey) {
      console.log("SKIP  section D — Supabase credentials are needed to sign in");
    } else {
      const { chromium } = await import("playwright");
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const browser = await chromium.launch();
      let ip = 80;
      const signIn = async (email: string, next: string, viewport = { width: 1280, height: 900 }) => {
        const created = await admin.auth.admin.createUser({ email, email_confirm: true });
        if (created.data.user) authIds.push(created.data.user.id);
        const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
        if (link.error || !link.data.properties?.hashed_token) throw new Error(`generateLink failed: ${link.error?.message}`);
        if (link.data.user && !authIds.includes(link.data.user.id)) authIds.push(link.data.user.id);
        ip += 1;
        const context = await browser.newContext({ viewport, extraHTTPHeaders: { "x-forwarded-for": `10.80.0.${ip}` } });
        const page = await context.newPage();
        await page.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`, { waitUntil: "load" });
        await page.waitForURL(/\/auth\/continue/, { timeout: 30_000 });
        await page.getByRole("button", { name: "Continue" }).click();
        await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 60_000 });
        return { context, page };
      };
      const submitAndRead = async (page: import("playwright").Page, form: import("playwright").Locator, click: () => Promise<void>) => {
        const before = (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
        await click();
        await page.waitForFunction(
          ({ prev, handle }) => {
            const el = (handle as HTMLElement).querySelector('p[role="status"], p[role="alert"]');
            return el !== null && el.textContent !== "" && el.textContent !== prev;
          },
          { prev: before, handle: await form.elementHandle() },
          { timeout: 45_000 },
        );
        return (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
      };

      try {
        /* D1. Nobody else gets in. */
        const anon = await fetch(`${BASE}/government`, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
        const anonBody = await anon.text();
        check("D1 a signed-out visitor is told only that the console is for authorities",
          anon.status === 200 && /for tourism authorities/.test(anonBody) && !anonBody.includes("QA Jaipur Application"), `HTTP ${anon.status}`);
        const traveller = await signIn(`qa-gov-traveller-${stamp}@terrastory.test`, "/government");
        const travellerText = await traveller.page.locator("main").innerText();
        check("D1 a traveller cannot open the console", /for tourism authorities/.test(travellerText) && !/Verification/.test(travellerText));
        const travellerQueue = await traveller.page.goto(`${BASE}/government/queue/${inJaipur.id}`, { waitUntil: "load" });
        check("D1 a traveller gets nothing from a queue URL", travellerQueue?.status() === 200 && /for tourism authorities/.test(await traveller.page.locator("main").innerText()));
        await traveller.context.close();

        const partnerOwner = await signIn(partnerEmail, "/government");
        const partnerText = await partnerOwner.page.locator("main").innerText();
        check("D1 a partner cannot open the console", /for tourism authorities/.test(partnerText) && !partnerText.includes("QA Jaipur Application"));
        await partnerOwner.context.close();

        /* D2. A reviewer sees only its own jurisdiction. */
        const reviewer = await signIn(reviewerEmail, "/government/queue");
        const queueText = await reviewer.page.locator("main").innerText();
        check("D2 the queue shows the applications of this jurisdiction", queueText.includes(`QA Jaipur Application ${stamp}`), queueText.slice(0, 120));
        check("D2 and none from another jurisdiction", !queueText.includes(`QA Varanasi Application ${stamp}`));
        const outside = await reviewer.page.goto(`${BASE}/government/queue/${inVaranasi.id}`, { waitUntil: "load" });
        check("D2 an application outside the jurisdiction is 404, not a redirect", outside?.status() === 404, `HTTP ${outside?.status()}`);
        await reviewer.page.goto(`${BASE}/government`, { waitUntil: "load" });
        const overviewText = await reviewer.page.locator("main").innerText();
        check("D2 the overview counts only this jurisdiction",
          (await reviewer.page.locator('[data-destination="jaipur"]').count()) === 1 && (await reviewer.page.locator('[data-destination="varanasi"]').count()) === 0);
        check("D2 the overview says it holds no traveller data and claims no revenue",
          /no traveller data/.test(overviewText) && /no payment has been taken/i.test(overviewText));
        check("D2 a reviewer cannot publish advisories or manage the team",
          ((await reviewer.page.goto(`${BASE}/government/advisories`, { waitUntil: "load" })), (await reviewer.page.locator("[data-advisory-form]").count()) === 0)
          && ((await reviewer.page.goto(`${BASE}/government/team`, { waitUntil: "load" })), (await reviewer.page.locator("#officer-email").count()) === 0));

        /* D3. A reviewer decides, and it is audited against the organisation. */
        await reviewer.page.goto(`${BASE}/government/queue/${inJaipur.id}`, { waitUntil: "load" });
        const decide = async (to: string, note?: string, checks: string[] = []) => {
          await reviewer.page.goto(`${BASE}/government/queue/${inJaipur.id}`, { waitUntil: "load" });
          const form = reviewer.page.locator("form[data-decision]");
          if (note) await form.locator('textarea[name="note"]').fill(note);
          for (const c of checks) await form.locator(`input[name="checks"][value="${c}"]`).check();
          return submitAndRead(reviewer.page, form, () => form.locator(`button[value="${to}"]`).click());
        };
        let reply = await decide("UNDER_REVIEW");
        check("D3 a reviewer starts the review", (await sql`select status from partner_properties where id = ${inJaipur.id}`)[0]?.status === "UNDER_REVIEW", reply);
        reply = await decide("VERIFIED", "Checked against the state register (QA synthetic).", ["exists", "destination", "registration"]);
        const [verified] = await sql`select status, reviewer_id, provenance from partner_properties where id = ${inJaipur.id}`;
        check("D3 verification records who checked what",
          verified?.status === "VERIFIED" && verified.reviewer_id !== null && (verified.provenance?.checks ?? []).length === 3, `${reply} · ${JSON.stringify(verified?.provenance)}`);
        const decisions = await sql`select action, after from audit_logs where entity_id = ${inJaipur.id} order by at asc`;
        check("D3 every decision is audited against the organisation that made it",
          decisions.some((d) => d.action === "partner_property.under_review" && d.after?.by === "government" && d.after?.orgId === rajasthan.id)
          && decisions.some((d) => d.action === "partner_property.verified" && d.after?.orgId === rajasthan.id),
          decisions.map((d) => `${d.action}:${d.after?.by ?? "-"}`).join(","));
        check("D3 the operator's own status followed its verified property", (await sql`select status from partners where id = ${partner.id}`)[0]?.status === "VERIFIED");
        reply = await decide("APPROVED");
        check("D3 a reviewer approves", (await sql`select status from partner_properties where id = ${inJaipur.id}`)[0]?.status === "APPROVED", reply);
        /* Replay the decision the record already holds, as a double-submit would.
           The console no longer offers that step — the machine forbids it — so the
           replay is made by re-submitting the same value. */
        await reviewer.page.goto(`${BASE}/government/queue/${inJaipur.id}`, { waitUntil: "load" });
        const replayForm = reviewer.page.locator("form[data-decision]");
        await replayForm.locator('button[name="to"]').first().evaluate((el) => { (el as HTMLButtonElement).value = "APPROVED"; });
        reply = await submitAndRead(reviewer.page, replayForm, () => replayForm.locator('button[name="to"]').first().click());
        check("D3 repeating a decision changes nothing", /nothing changed/.test(reply) && (await sql`select status from partner_properties where id = ${inJaipur.id}`)[0]?.status === "APPROVED", reply);

        /* Clarification: a note to the operator, not a new state. */
        await reviewer.page.goto(`${BASE}/government/queue/${inJaipur.id}`, { waitUntil: "load" });
        const clarifyForm = reviewer.page.locator("form[data-decision]");
        await clarifyForm.locator('textarea[name="note"]').fill("Please send the fire safety certificate (QA synthetic).");
        reply = await submitAndRead(reviewer.page, clarifyForm, () => clarifyForm.locator('button[value="clarify"]').click());
        const [clarified] = await sql`select status, review_note, clarification_requested_at from partner_properties where id = ${inJaipur.id}`;
        check("D4 clarification is recorded without moving the lifecycle",
          clarified?.status === "APPROVED" && /fire safety/.test(clarified.review_note ?? "") && clarified.clarification_requested_at !== null, reply);
        check("D4 and it is audited", (await sql`select count(*)::int n from audit_logs where entity_id = ${inJaipur.id} and action = 'partner_property.clarification_requested'`)[0]?.n === 1);

        /* D5. Another department cannot touch it, even with the id. */
        const otherOfficer = await signIn(otherEmail, "/government/queue");
        const otherQueue = await otherOfficer.page.goto(`${BASE}/government/queue/${inJaipur.id}`, { waitUntil: "load" });
        check("D5 an officer of another state gets 404 on this application", otherQueue?.status() === 404, `HTTP ${otherQueue?.status()}`);
        await otherOfficer.page.goto(`${BASE}/government/queue/${inVaranasi.id}`, { waitUntil: "load" });
        const forged = otherOfficer.page.locator("form[data-decision]");
        await forged.locator('input[name="propertyId"]').evaluate((el, id) => { (el as HTMLInputElement).value = id; }, inJaipur.id);
        /* With a note, so what refuses this is the jurisdiction and nothing else. */
        await forged.locator('textarea[name="note"]').fill("QA synthetic cross-border rejection attempt.");
        reply = await submitAndRead(otherOfficer.page, forged, () => forged.locator('button[value="REJECTED"]').click());
        const [untouched] = await sql`select status from partner_properties where id = ${inJaipur.id}`;
        check("D5 a forged id from another jurisdiction changes nothing",
          /outside your jurisdiction/i.test(reply) && untouched?.status === "APPROVED", `${reply} · ${untouched?.status}`);

        /* D6. Advisories: drafted, published, withdrawn — and seen by travellers only when published. */
        const manager = await signIn(managerEmail, "/government/advisories");
        const advisoryForm = manager.page.locator("form[data-advisory-form]");
        await advisoryForm.locator('select[name="destinationId"]').selectOption("jaipur");
        await advisoryForm.locator('select[name="kind"]').selectOption("PERMIT");
        await advisoryForm.locator('select[name="severity"]').selectOption("WARNING");
        await advisoryForm.locator('input[name="title"]').fill(`QA permit notice ${stamp} (QA synthetic)`);
        await advisoryForm.locator('textarea[name="body"]').fill("Inner-line permits are checked at the district office (QA synthetic).");
        reply = await submitAndRead(manager.page, advisoryForm, () => advisoryForm.locator('button[type="submit"]').click());
        const [draft] = await sql`select id, status, org_id, source from advisories where destination_id = 'jaipur' and title like ${`QA permit notice ${stamp}%`}`;
        check("D6 a manager drafts an advisory, attributed to the authority",
          draft?.status === "DRAFT" && draft.org_id === rajasthan.id && /Rajasthan/.test(draft.source ?? ""), `${reply} · ${JSON.stringify(draft)}`);
        const beforePublish = await fetch(`${BASE}/api/advisories?destination=jaipur`, { signal: AbortSignal.timeout(60_000) });
        check("D6 a draft reaches no traveller", !(await beforePublish.text()).includes(`QA permit notice ${stamp}`));
        await manager.page.goto(`${BASE}/government/advisories`, { waitUntil: "load" });
        /* Publishing swaps the row's control for Withdraw, so wait for that
           rather than for a message the re-render replaces. */
        await manager.page.locator(`li[data-advisory="${draft.id}"] form button[type="submit"]`).first().click();
        await manager.page.waitForSelector(`li[data-advisory="${draft.id}"] button:has-text("Withdraw")`, { timeout: 45_000 });
        const [published] = await sql`select status, published_at from advisories where id = ${draft.id}`;
        check("D6 publishing is a separate act, on the record", published?.status === "PUBLISHED" && published.published_at !== null);
        const afterPublish = await (await fetch(`${BASE}/api/advisories?destination=jaipur`, { signal: AbortSignal.timeout(60_000) })).json() as { advisories?: { title: string; authority: string | null; kind: string }[] };
        const seen = (afterPublish.advisories ?? []).find((a) => a.title.includes(`QA permit notice ${stamp}`));
        check("D6 travellers see it with the authority named and no officer", Boolean(seen) && /Rajasthan/.test(seen?.authority ?? "") && seen?.kind === "PERMIT", JSON.stringify(seen ?? null));
        const otherDestination = await (await fetch(`${BASE}/api/advisories?destination=varanasi`, { signal: AbortSignal.timeout(60_000) })).json() as { advisories?: unknown[] };
        check("D6 it appears only for its own destination", (otherDestination.advisories ?? []).length === 0);
        check("D6 the endpoint refuses an unknown destination", (await fetch(`${BASE}/api/advisories?destination=atlantis`, { signal: AbortSignal.timeout(60_000) })).status === 400);
        /* Withdraw, and it leaves the traveller's page. */
        await manager.page.goto(`${BASE}/government/advisories`, { waitUntil: "load" });
        await manager.page.locator(`li[data-advisory="${draft.id}"] button:has-text("Withdraw")`).click();
        await manager.page.waitForSelector(`li[data-advisory="${draft.id}"] button:has-text("Publish")`, { timeout: 45_000 });
        const afterWithdraw = await (await fetch(`${BASE}/api/advisories?destination=jaipur`, { signal: AbortSignal.timeout(60_000) })).text();
        check("D6 a withdrawn advisory disappears from the traveller's page",
          (await sql`select status from advisories where id = ${draft.id}`)[0]?.status === "WITHDRAWN" && !afterWithdraw.includes(`QA permit notice ${stamp}`));
        check("D6 advisory acts are audited",
          (await sql`select count(*)::int n from audit_logs where entity_id = ${draft.id}`)[0]?.n === 3,
          (await sql`select action from audit_logs where entity_id = ${draft.id}`).map((r) => r.action).join(","));
        /* An advisory for a destination outside the jurisdiction is refused. */
        const outsideAdvisory = await sql`select count(*)::int n from advisories where destination_id = 'varanasi' and org_id = ${rajasthan.id}`;
        check("D6 a manager cannot issue an advisory outside its jurisdiction",
          outsideAdvisory[0]?.n === 0 && (await manager.page.locator('form[data-advisory-form] select[name="destinationId"] option').evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value))).join() === "jaipur");

        /* D7. The team. */
        await manager.page.goto(`${BASE}/government/team`, { waitUntil: "load" });
        await manager.page.fill("#officer-email", `qa-gov-new-${stamp}@terrastory.test`);
        await manager.page.getByRole("button", { name: "Add officer" }).click();
        await manager.page.waitForSelector(`[data-officer="qa-gov-new-${stamp}@terrastory.test"]`, { timeout: 45_000 });
        check("D7 a manager adds an officer", (await sql`select count(*)::int n from gov_members where org_id = ${rajasthan.id}`)[0]?.n === 3);
        check("D7 the addition is audited", (await sql`select count(*)::int n from audit_logs where action = 'gov_member.added'`)[0]?.n >= 1);
        await manager.page.locator(`li[data-officer="qa-gov-new-${stamp}@terrastory.test"] form button[type="submit"]`).click();
        await manager.page.waitForSelector(`[data-officer="qa-gov-new-${stamp}@terrastory.test"]`, { state: "detached", timeout: 45_000 });
        check("D7 and removes them again", (await sql`select count(*)::int n from gov_members where org_id = ${rajasthan.id}`)[0]?.n === 2);
        const selfRemove = manager.page.locator("li[data-officer] form").first();
        void selfRemove;

        for (const width of [375, 1440]) {
          await manager.page.setViewportSize({ width, height: 900 });
          for (const path of ["/government", "/government/queue", `/government/queue/${inJaipur.id}`, "/government/advisories", "/government/team"]) {
            await manager.page.goto(`${BASE}${path}`, { waitUntil: "load" });
            const over = await manager.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            check(`D8 ${path.replace(inJaipur.id, "[id]")} fits ${width}px`, over <= 1, `${over}px over`);
          }
        }
        await manager.page.setViewportSize({ width: 1280, height: 900 });
        await manager.page.keyboard.press("Tab");
        let focused = false;
        for (let i = 0; i < 25 && !focused; i += 1) {
          focused = await manager.page.evaluate(() => Boolean(document.activeElement?.closest('nav[aria-label="Government console"]')));
          if (!focused) await manager.page.keyboard.press("Tab");
        }
        check("D8 the console navigation is keyboard reachable", focused);
        await manager.context.close();
        await reviewer.context.close();
        await otherOfficer.context.close();
      } catch (e) {
        const error = e as Error;
        check("D  the console flow ran to completion", false, `${error.message.split("\n")[0]} ${(error.stack ?? "").split("\n").find((l) => /government\.mts/.test(l))?.trim() ?? ""}`);
      } finally {
        await browser.close().catch(() => undefined);
        for (const id of authIds) {
          try {
            await sql`update gov_members set user_id = null where user_id = ${id}`;
            await sql`update advisories set created_by = null where created_by = ${id}`;
            await sql`update partner_properties set reviewer_id = null where reviewer_id = ${id}`;
            await sql`update partners set verified_by = null where verified_by = ${id}`;
            await sql`update audit_logs set actor_id = null where actor_id = ${id}`;
            await sql`delete from users where id = ${id}`;
            await admin.auth.admin.deleteUser(id);
          } catch (e) {
            console.log(`WARN  auth cleanup: ${(e as Error).message}`);
          }
        }
      }
    }
  } catch (e) {
    const error = e as Error;
    check("C  the database section ran to completion", false, `${error.message.split("\n")[0]} ${(error.stack ?? "").split("\n").find((l) => /government\.mts/.test(l))?.trim() ?? ""}`);
  } finally {
    try {
      const orgIds = (await sql`select id from gov_organisations where name like '%(QA synthetic)%'`).map((r) => r.id);
      const advisoryIds = orgIds.length ? (await sql`select id from advisories where org_id in ${sql(orgIds)}`).map((r) => r.id) : [];
      const memberIds = orgIds.length ? (await sql`select id from gov_members where org_id in ${sql(orgIds)}`).map((r) => r.id) : [];
      const partnerIds = (await sql`select id from partners where email like ${`qa-gov-%-${stamp}@terrastory.test`}`).map((r) => r.id);
      const listingIds = partnerIds.length ? (await sql`select id from partner_properties where partner_id in ${sql(partnerIds)}`).map((r) => r.id) : [];
      const entities = [...advisoryIds, ...memberIds, ...partnerIds, ...listingIds];
      if (entities.length) await sql`delete from audit_logs where entity_id in ${sql(entities)}`;
      if (advisoryIds.length) await sql`delete from advisories where id in ${sql(advisoryIds)}`;
      if (orgIds.length) await sql`delete from gov_organisations where id in ${sql(orgIds)}`;
      if (partnerIds.length) await sql`delete from partners where id in ${sql(partnerIds)}`;
      await sql`delete from users where email like ${`qa-gov-%-${stamp}@terrastory.test`}`;
    } catch (e) {
      console.log(`WARN  cleanup incomplete: ${(e as Error).message}`);
    }
    await Promise.race([sql.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
