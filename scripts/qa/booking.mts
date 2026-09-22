/**
 * Booking — search, rooms and rates, holds, expiry and checkout (Phase 2).
 *
 * WHAT THIS GUARDS
 * ----------------
 * "Nobody gets a room that is not there": no oversell, no double booking, no
 * hold that outlives its time, no price nobody configured, no confirmation
 * without payment. Each is asserted here against the real engine and a real
 * Postgres, including genuinely parallel transactions.
 *
 * A–B run without anything. C needs DATABASE_URL. D needs a server as well,
 * with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for sign-in and,
 * to test the sweep route, CRON_SECRET set on the server and QA_CRON_SECRET
 * here to the same value.
 *
 *   pnpm qa:booking
 *   QA_BASE_URL=http://localhost:3100 QA_CRON_SECRET=… pnpm qa:booking
 *
 * Every row created is synthetic ("(QA synthetic)", qa-booking-* addresses)
 * and removed at the end.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { cancelHold, createHold, quoteListing, releaseExpiredHolds, type Db } from "@/lib/booking/engine";
import {
  bookingCode,
  isBookingCode,
  isHoldPayable,
  nightsOf,
  paiseToRupeeInput,
  quantityProblem,
  quoteNights,
  roomsFor,
  rupeesToPaise,
  stayProblem,
} from "@/lib/booking/stay";
import { addDays, todayInKolkata } from "@/lib/partners/calendar";

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
   A. PURE RULES
   ====================================================================== */
section("A. Stay, quantity, money and quotes");

const T = "2026-09-17";
check("a valid stay passes", stayProblem("2026-09-20", "2026-09-22", T) === null);
check("arrival in the past is refused", stayProblem("2026-09-16", "2026-09-18", T) === "past");
check("departure on arrival day is refused", stayProblem("2026-09-20", "2026-09-20", T) === "order");
check("departure before arrival is refused", stayProblem("2026-09-22", "2026-09-20", T) === "order");
check("a date that does not exist is refused", stayProblem("2026-02-30", "2026-03-02", "2026-01-01") === "invalid-date");
check("a non-date is refused", stayProblem("tomorrow", "2026-09-22", T) === "invalid-date");
check("more than 30 nights is refused", stayProblem("2026-09-20", "2026-10-21", T) === "too-long" && stayProblem("2026-09-20", "2026-10-20", T) === null);
check("nights exclude the departure day", nightsOf("2026-09-30", "2026-10-02").join() === "2026-09-30,2026-10-01");
check("rooms must be 1–10 whole rooms", quantityProblem(0, 2) === "rooms" && quantityProblem(11, 2) === "rooms" && quantityProblem(1.5, 2) === "rooms" && quantityProblem(10, 2) === null);
check("guests must be 1–50", quantityProblem(1, 0) === "guests" && quantityProblem(1, 51) === "guests");
check("a party must fit the rooms", quantityProblem(1, 3, 2) === "capacity" && quantityProblem(2, 3, 2) === null);
check("rooms needed rounds up", roomsFor(5, 2) === 3 && roomsFor(1, 4) === 1);
check("rupees parse to exact paise without floats",
  rupeesToPaise("2500") === 250_000n && rupeesToPaise("2,500.50") === 250_050n && rupeesToPaise("0.1") === 10n && rupeesToPaise("19.99") === 1_999n);
check("bad rupee input is refused, never guessed",
  ["0", "-1", "2500.555", "1e3", "abc", "", "12345678"].every((v) => rupeesToPaise(v) === null));
check("paise print back as the partner typed", paiseToRupeeInput(250_000n) === "2500" && paiseToRupeeInput(250_050n) === "2500.50" && paiseToRupeeInput(null) === "");
const row = (date: string, unitsOpen: number, extra: Partial<{ closed: boolean; pricePaiseOverride: bigint | null }> = {}) =>
  ({ date, unitsOpen, closed: extra.closed ?? false, pricePaiseOverride: extra.pricePaiseOverride ?? null });
const n2 = ["2026-09-20", "2026-09-21"];
check("a night without a row is not open", !quoteNights(n2, [row("2026-09-20", 2)], 250_000n, 1).ok);
check("a closed night blocks the stay", (quoteNights(n2, [row("2026-09-20", 2), row("2026-09-21", 0, { closed: true })], 250_000n, 1) as { reason?: string }).reason === "closed");
check("no rate means not bookable, never a default", (quoteNights(n2, [row("2026-09-20", 2), row("2026-09-21", 2)], null, 1) as { reason?: string }).reason === "not-priced");
const q = quoteNights(n2, [row("2026-09-20", 2), row("2026-09-21", 1, { pricePaiseOverride: 300_000n })], 250_000n, 1);
check("a date's rate overrides the room rate and nights add exactly", q.ok && q.perRoomPaise === 550_000n && q.roomsOpen === 1);
check("too few rooms on any night is sold out", (quoteNights(n2, [row("2026-09-20", 2), row("2026-09-21", 1)], 250_000n, 2) as { reason?: string }).reason === "sold-out");
const codes = Array.from({ length: 200 }, () => bookingCode(crypto.getRandomValues(new Uint8Array(6))));
check("booking codes are readable and well-formed", codes.every(isBookingCode) && codes.every((c) => !/[01IO]/.test(c.slice(3))));
const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 1_000);
check("only a pending, unexpired hold is payable",
  isHoldPayable({ status: "PENDING_PAYMENT", holdExpiresAt: future }, new Date()) && !isHoldPayable({ status: "PENDING_PAYMENT", holdExpiresAt: past }, new Date())
  && !isHoldPayable({ status: "CANCELLED", holdExpiresAt: future }, new Date()) && !isHoldPayable({ status: "PENDING_PAYMENT", holdExpiresAt: null }, new Date()));

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
const engine = strip(read("src/lib/booking/engine.ts"));
check("holds lock the stay's availability rows in date order", /\.orderBy\(asc\(availability\.date\)\)\s*\.for\("update"\)/.test(engine));
check("expiry sweeps skip rows another transaction holds", /FOR UPDATE OF b SKIP LOCKED/.test(engine));
check("a hold re-checks the locked rows before writing", engine.indexOf('.for("update")') < engine.indexOf("quoteNights(nights, rows"));
check("a hold releases expired holds on its room type first", /releaseExpiredInTx\(tx, now, \{ unitId: input\.unitId \}\)/.test(engine));
check("holds are idempotent by key", /eq\(bookings\.idempotencyKey, input\.idempotencyKey\)/.test(engine) && /bookings_user_idempotency_unique/.test(engine));
check("a released hold never reopens a closed date", /WHEN a\.closed THEN 0/.test(engine));
const bookingSources = [...walk("src/lib/booking"), ...walk("src/app/(v1)/checkout"), "src/app/(v1)/search/page.tsx", ...walk("src/components/booking"), "src/db/queries/booking.ts"];
check("nothing in the booking path confirms a booking", bookingSources.every((f) => !/status:\s*"CONFIRMED"|'CONFIRMED'/.test(strip(read(f)))));
check("no float arithmetic on money in the booking path",
  bookingSources.every((f) => !/parseFloat|toFixed|Number\([^)]*[Pp]aise|Math\.round\([^)]*[Pp]aise/.test(strip(read(f)))),
  bookingSources.filter((f) => /parseFloat|toFixed|Number\([^)]*[Pp]aise/.test(strip(read(f)))).join(", "));
const checkoutPage = read("src/app/(v1)/checkout/[code]/page.tsx");
check("checkout marks the unpaid state and cannot pay", /checkout\.testState/.test(checkoutPage) && /disabled aria-disabled="true"/.test(checkoutPage) && /isHoldPayable/.test(checkoutPage));
check("checkout is scoped to the signed-in traveller", /requireTraveller\(/.test(checkoutPage) && /checkoutFor\(code, session\.id\)/.test(checkoutPage));
check("the reserve action sends an anonymous visitor to sign in with a way back",
  /if \(!session\) redirect\(`\/login\?next=\$\{encodeURIComponent\(returnTo\)\}`\)/.test(read("src/app/(v1)/checkout/actions.ts")) && /safeNextPath/.test(read("src/app/(v1)/checkout/actions.ts")));
const queries = strip(read("src/db/queries/booking.ts"));
check("search reads only valid listings", /eq\(partnerProperties\.status, "PUBLISHED"\), inArray\(partners\.status, \["VERIFIED", "APPROVED"\]\)/.test(queries));
check("the sweep route refuses without its secret", /if \(!secret\)/.test(read("src/app/api/cron/release-holds/route.ts")) && /timingSafeEqual/.test(read("src/app/api/cron/release-holds/route.ts")));
check("search, listing panel and checkout take words from the booking catalogue",
  ["src/app/(v1)/search/page.tsx", "src/app/(v1)/checkout/[code]/page.tsx", "src/components/booking/BookingPanel.tsx"].every((f) => /bookingTranslator\(|t\("book\./.test(read(f))));
const migration = read("drizzle/sql/0003_booking_holds.sql");
check("the database refuses an unpriced-as-zero rate, a pending hold without expiry and an inconsistent split",
  /listing_units_price_positive/.test(migration) && /bookings_pending_has_expiry/.test(migration) && /booking_items_money_consistent/.test(migration) && /availability_closed_offers_nothing/.test(migration));
check("robots keeps crawlers out of checkout", /"\/checkout\/"/.test(read("src/app/robots.ts")));

/* ======================================================================
   C. THE ENGINE AGAINST POSTGRES
   ====================================================================== */
section("C. Engine: holds, concurrency, expiry");

const databaseUrl = process.env.DATABASE_URL;
const stamp = Date.now().toString(36);
const today = todayInKolkata(new Date());
const d = (offset: number) => addDays(today, offset);

type Fixture = { partnerId: string; listingId: string; unitA: string; unitB: string; users: string[] };

async function makeFixture(sql: postgres.Sql, tag: string, userCount: number, destination = "jaipur"): Promise<Fixture> {
  const [partner] = await sql`insert into partners (organization_name, contact_name, email, status)
    values (${`QA Booking Trust ${tag} (QA synthetic)`}, 'QA Owner', ${`qa-booking-${tag}-${stamp}@terrastory.test`}, 'VERIFIED') returning id`;
  const [listing] = await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status, reviewed_at, published_at, source, amenities)
    values (${partner.id}, ${destination}, ${`QA Booking Haveli ${tag} ${stamp} (QA synthetic)`}, 'HERITAGE', '9 QA Marg, Jaipur 302001', 'PUBLISHED', now(), now(), 'qa-synthetic', ${["qa-rooftop", "breakfast"]}) returning id`;
  const [unitA] = await sql`insert into listing_units (listing_id, name, capacity, total_quantity, base_price_paise)
    values (${listing.id}, 'QA Deluxe Room', 2, 2, 250000) returning id`;
  const [unitB] = await sql`insert into listing_units (listing_id, name, capacity, total_quantity, base_price_paise)
    values (${listing.id}, 'QA Unpriced Room', 2, 1, null) returning id`;
  for (let i = 5; i <= 12; i += 1) {
    await sql`insert into availability (listing_unit_id, date, units_open, price_paise_override)
      values (${unitA.id}, ${d(i)}, 2, ${i === 6 ? 300000 : null})`;
    await sql`insert into availability (listing_unit_id, date, units_open) values (${unitB.id}, ${d(i)}, 1)`;
  }
  const users: string[] = [];
  for (let i = 0; i < userCount; i += 1) {
    const [u] = await sql`insert into users (email) values (${`qa-booking-${tag}-u${i}-${stamp}@terrastory.test`}) returning id`;
    users.push(u.id);
  }
  return { partnerId: partner.id, listingId: listing.id, unitA: unitA.id, unitB: unitB.id, users };
}

async function dropFixtures(sql: postgres.Sql) {
  const partnerIds = (await sql`select id from partners where email like ${`qa-booking-%-${stamp}@terrastory.test`}`).map((r) => r.id);
  const userIds = (await sql`select id from users where email like ${`qa-booking-%-${stamp}@terrastory.test`}`).map((r) => r.id);
  const listingIds = partnerIds.length ? (await sql`select id from partner_properties where partner_id in ${sql(partnerIds)}`).map((r) => r.id) : [];
  const bookingIds = listingIds.length
    ? (await sql`select distinct booking_id from booking_items where listing_id in ${sql(listingIds)}`).map((r) => r.booking_id)
    : [];
  const unitIds = listingIds.length ? (await sql`select id from listing_units where listing_id in ${sql(listingIds)}`).map((r) => r.id) : [];
  const entities = [...partnerIds, ...listingIds, ...unitIds, ...bookingIds];
  if (entities.length) await sql`delete from audit_logs where entity_id in ${sql(entities)}`;
  if (bookingIds.length) await sql`delete from bookings where id in ${sql(bookingIds)}`;
  if (userIds.length) await sql`delete from bookings where user_id in ${sql(userIds)}`;
  if (partnerIds.length) await sql`delete from partners where id in ${sql(partnerIds)}`;
  return { userIds };
}

const avail = async (sql: postgres.Sql, unitId: string, date: string) =>
  (await sql`select units_open, units_held, units_booked, closed from availability where listing_unit_id = ${unitId} and date = ${date}`)[0];
const key = () => crypto.randomUUID();

if (!databaseUrl) {
  console.log("SKIP  sections C–D — DATABASE_URL is not set (load .env.local)");
} else {
  const sql = postgres(databaseUrl, { ssl: "require", max: 10, prepare: false, onnotice: () => undefined });
  const db = drizzle(sql, { schema, casing: "snake_case" }) as unknown as Db;
  try {
    const f = await makeFixture(sql, "engine", 8);
    const [u0, u1, u2, u3, u4, u5, u6, u7] = f.users as [string, string, string, string, string, string, string, string];

    /* C1. Available → hold succeeds, with the configured price. */
    const k1 = key();
    const h1 = await createHold(db, { userId: u0, unitId: f.unitA, checkIn: d(5), checkOut: d(7), rooms: 1, guests: 2, idempotencyKey: k1 }, new Date());
    check("C1 an available room type is held", h1.ok, JSON.stringify(h1, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
    const code1 = h1.ok ? h1.code : "";
    check("C1 the total is the configured nightly rates, in paise", h1.ok && h1.totalPaise === 550_000n);
    const [b1] = await sql`select id, status, total_paise, guest_count, hold_expires_at from bookings where code = ${code1}`;
    const minutes = b1 ? (new Date(b1.hold_expires_at).getTime() - Date.now()) / 60_000 : 0;
    check("C1 the booking is PENDING_PAYMENT with a 10-minute hold", b1?.status === "PENDING_PAYMENT" && b1.total_paise === "550000" && minutes > 9 && minutes <= 10.1, `${b1?.status} ${minutes.toFixed(2)} min`);
    const [i1] = await sql`select status, qty, subtotal_paise, platform_fee_paise, vendor_payout_paise, nightly_prices from booking_items where booking_id = ${b1?.id}`;
    check("C1 the item freezes each night's price and a zero fee without an agreement",
      i1?.status === "HELD" && i1.subtotal_paise === "550000" && i1.platform_fee_paise === "0" && i1.vendor_payout_paise === "550000"
      && JSON.stringify(i1.nightly_prices) === JSON.stringify([{ date: d(5), pricePaise: "250000" }, { date: d(6), pricePaise: "300000" }]));
    const a5 = await avail(sql, f.unitA, d(5));
    const a7 = await avail(sql, f.unitA, d(7));
    check("C1 rooms move from open to held on each night only", a5?.units_open === 1 && a5.units_held === 1 && a7?.units_open === 2 && a7.units_held === 0);
    check("C1 the hold is audited", (await sql`select count(*)::int n from audit_logs where entity_id = ${b1?.id} and action = 'booking.hold_created'`)[0]?.n === 1);

    /* C2. Idempotent. */
    const again = await createHold(db, { userId: u0, unitId: f.unitA, checkIn: d(5), checkOut: d(7), rooms: 1, guests: 2, idempotencyKey: k1 }, new Date());
    check("C2 the same attempt returns the same hold", again.ok && again.code === code1 && again.reused);
    check("C2 and takes no more rooms", (await avail(sql, f.unitA, d(5)))?.units_held === 1 && (await sql`select count(*)::int n from bookings where user_id = ${u0}`)[0]?.n === 1);
    const kParallel = key();
    const sameKey = await Promise.all([0, 1, 2].map(() => createHold(db, { userId: u1, unitId: f.unitA, checkIn: d(9), checkOut: d(10), rooms: 1, guests: 1, idempotencyKey: kParallel }, new Date())));
    check("C2 three parallel submissions with one key make one hold",
      sameKey.every((r) => r.ok) && new Set(sameKey.map((r) => (r.ok ? r.code : ""))).size === 1 && (await avail(sql, f.unitA, d(9)))?.units_held === 1,
      JSON.stringify(sameKey.map((r) => (r.ok ? `${r.code}${r.reused ? "*" : ""}` : r.error))));

    /* C3. Concurrency: one room left, six travellers at once. */
    const race = await Promise.all([u2, u3, u4, u5, u6, u7].map((userId) =>
      createHold(db, { userId, unitId: f.unitA, checkIn: d(5), checkOut: d(7), rooms: 1, guests: 2, idempotencyKey: key() }, new Date())));
    const winners = race.filter((r) => r.ok).length;
    check("C3 six parallel holds for the last room: exactly one succeeds", winners === 1, race.map((r) => (r.ok ? "ok" : r.error)).join(","));
    check("C3 the others are told it is sold out", race.filter((r) => !r.ok).every((r) => !r.ok && (r.error === "sold-out" || r.error === "busy")));
    const after = await sql`select date::text, units_open, units_held from availability where listing_unit_id = ${f.unitA} and date in (${d(5)}, ${d(6)})`;
    check("C3 inventory is exactly exhausted, never negative", after.every((r) => r.units_open === 0 && r.units_held === 2), JSON.stringify(after));
    const twoRooms = await Promise.all([u2, u3].map((userId) =>
      createHold(db, { userId, unitId: f.unitA, checkIn: d(11), checkOut: d(12), rooms: 2, guests: 4, idempotencyKey: key() }, new Date())));
    check("C3 two parallel two-room holds on a two-room type: one succeeds", twoRooms.filter((r) => r.ok).length === 1);

    /* C4. Unavailable → not bookable. */
    const tryHold = (over: Partial<Parameters<typeof createHold>[1]>) =>
      createHold(db, { userId: u7, unitId: f.unitA, checkIn: d(7), checkOut: d(8), rooms: 1, guests: 2, idempotencyKey: key(), ...over }, new Date());
    const err = (r: Awaited<ReturnType<typeof createHold>>) => (r.ok ? "ok" : r.error);
    check("C4 a room type without a rate is not bookable", err(await tryHold({ unitId: f.unitB })) === "not-priced");
    await sql`update availability set closed = true, units_open = 0 where listing_unit_id = ${f.unitA} and date = ${d(8)}`;
    check("C4 a closed date is not bookable", err(await tryHold({ checkIn: d(8), checkOut: d(9) })) === "closed");
    check("C4 a date the partner never opened is not bookable", err(await tryHold({ checkIn: d(20), checkOut: d(21) })) === "not-open");
    check("C4 a sold-out date is not bookable", err(await tryHold({ checkIn: d(5), checkOut: d(6) })) === "sold-out");
    check("C4 more guests than the rooms hold is refused", err(await tryHold({ guests: 3, rooms: 1 })) === "capacity");
    check("C4 a quote agrees with the engine", (await quoteListing(db, f.listingId, { checkIn: d(5), checkOut: d(6), guests: 2 })).every((u) => !u.quote.ok));
    await sql`update partner_properties set status = 'UNPUBLISHED' where id = ${f.listingId}`;
    check("C4 an unpublished listing is not bookable", err(await tryHold({})) === "not-bookable");
    await sql`update partner_properties set status = 'PUBLISHED' where id = ${f.listingId}`;
    await sql`update partners set status = 'SUSPENDED' where id = ${f.partnerId}`;
    check("C4 a suspended vendor's rooms are not bookable", err(await tryHold({})) === "not-bookable");
    await sql`update partners set status = 'VERIFIED' where id = ${f.partnerId}`;
    await sql`update partner_properties set status = 'PUBLISHED' where id = ${f.listingId}`;

    /* C5. Invalid date and quantity. */
    check("C5 arrival in the past is rejected", err(await tryHold({ checkIn: d(-1), checkOut: d(1) })) === "past");
    check("C5 departure before arrival is rejected", err(await tryHold({ checkIn: d(7), checkOut: d(6) })) === "order");
    check("C5 a same-day stay is rejected", err(await tryHold({ checkIn: d(7), checkOut: d(7) })) === "order");
    check("C5 an impossible date is rejected", err(await tryHold({ checkIn: "2027-02-30", checkOut: "2027-03-01" })) === "invalid-date");
    check("C5 a stay over 30 nights is rejected", err(await tryHold({ checkIn: d(5), checkOut: d(40) })) === "too-long");
    check("C5 zero rooms is rejected", err(await tryHold({ rooms: 0 })) === "rooms");
    check("C5 eleven rooms is rejected", err(await tryHold({ rooms: 11 })) === "rooms");
    check("C5 a fraction of a room is rejected", err(await tryHold({ rooms: 1.5 })) === "rooms");
    check("C5 zero guests is rejected", err(await tryHold({ guests: 0 })) === "guests");
    check("C5 none of the rejections took a room", (await avail(sql, f.unitA, d(7)))?.units_held === 0);

    /* C6. Expiry releases, once. */
    await sql`update bookings set hold_expires_at = now() - interval '1 minute' where code = ${code1}`;
    const [expiring] = await sql`select status, hold_expires_at from bookings where code = ${code1}`;
    check("C6 an expired hold is not payable", !isHoldPayable({ status: expiring?.status, holdExpiresAt: new Date(expiring?.hold_expires_at) }, new Date()));
    const released = await releaseExpiredHolds(db, new Date());
    const [expired] = await sql`select id, status from bookings where code = ${code1}`;
    check("C6 the sweep expires it", released >= 1 && expired?.status === "EXPIRED", `released ${released}`);
    check("C6 its rooms return on its nights", (await avail(sql, f.unitA, d(5)))?.units_held === 1 && (await avail(sql, f.unitA, d(5)))?.units_open === 1);
    check("C6 the item is cancelled and the expiry audited",
      (await sql`select status from booking_items where booking_id = ${expired?.id}`)[0]?.status === "CANCELLED"
      && (await sql`select count(*)::int n from audit_logs where entity_id = ${expired?.id} and action = 'booking.hold_expired'`)[0]?.n === 1);
    await releaseExpiredHolds(db, new Date());
    check("C6 a second sweep changes nothing", (await avail(sql, f.unitA, d(5)))?.units_open === 1 && (await sql`select count(*)::int n from audit_logs where entity_id = ${expired?.id}`)[0]?.n === 2);
    const late = await cancelHold(db, { code: code1, userId: u0 }, new Date());
    check("C6 an expired hold cannot be revived or released twice", late.ok && !late.changed && late.status === "EXPIRED");

    /* C7. A date closed during a hold stays closed when the hold ends. */
    const h7 = await createHold(db, { userId: u6, unitId: f.unitA, checkIn: d(10), checkOut: d(11), rooms: 1, guests: 2, idempotencyKey: key() }, new Date());
    await sql`update availability set closed = true, units_open = 0 where listing_unit_id = ${f.unitA} and date = ${d(10)}`;
    await sql`update bookings set hold_expires_at = now() - interval '1 second' where code = ${h7.ok ? h7.code : ""}`;
    await releaseExpiredHolds(db, new Date());
    const a10 = await avail(sql, f.unitA, d(10));
    check("C7 released rooms do not reopen a date the partner closed", h7.ok && a10?.closed === true && a10.units_open === 0 && a10.units_held === 0, JSON.stringify(a10));

    /* C8. Cancel: owner only, idempotent. */
    const h8 = await createHold(db, { userId: u5, unitId: f.unitA, checkIn: d(7), checkOut: d(8), rooms: 1, guests: 1, idempotencyKey: key() }, new Date());
    const code8 = h8.ok ? h8.code : "";
    check("C8 another traveller cannot release a hold", (await cancelHold(db, { code: code8, userId: u4 }, new Date())).ok === false && (await avail(sql, f.unitA, d(7)))?.units_held === 1);
    const c8 = await cancelHold(db, { code: code8, userId: u5 }, new Date());
    check("C8 the traveller releases their hold", c8.ok && c8.changed && c8.status === "CANCELLED" && (await avail(sql, f.unitA, d(7)))?.units_open === 2);
    const c8b = await cancelHold(db, { code: code8, userId: u5 }, new Date());
    check("C8 releasing again is a no-op", c8b.ok && !c8b.changed && (await avail(sql, f.unitA, d(7)))?.units_open === 2);

    /* C9. A new hold reclaims rooms from expired holds on the same room type. */
    const h9 = await createHold(db, { userId: u4, unitId: f.unitA, checkIn: d(12), checkOut: d(13), rooms: 2, guests: 2, idempotencyKey: key() }, new Date());
    await sql`update bookings set hold_expires_at = now() - interval '1 second' where code = ${h9.ok ? h9.code : ""}`;
    const h9b = await createHold(db, { userId: u3, unitId: f.unitA, checkIn: d(12), checkOut: d(13), rooms: 2, guests: 2, idempotencyKey: key() }, new Date());
    check("C9 an expired hold's rooms are available to the next traveller without waiting for a sweep", h9.ok && h9b.ok, err(h9b));

    /* C10. The database is the floor. */
    const refused = async (q: Promise<unknown>) => { try { await q; return false; } catch { return true; } };
    check("C10 availability cannot go negative", await refused(sql`update availability set units_open = -1 where listing_unit_id = ${f.unitA} and date = ${d(7)}`));
    check("C10 a closed date cannot offer rooms", await refused(sql`update availability set units_open = 1 where listing_unit_id = ${f.unitA} and date = ${d(10)}`));
    check("C10 a pending booking must have an expiry", await refused(sql`insert into bookings (code, user_id, status, total_paise) values (${`TS-QA${stamp.slice(-4).toUpperCase()}`}, ${u7}, 'PENDING_PAYMENT', 1)`));
    check("C10 fee and payout must add up to the subtotal",
      await refused(sql`update booking_items set platform_fee_paise = 1 where booking_id = (select id from bookings where code = ${h9b.ok ? h9b.code : ""})`));
    check("C10 a zero rate cannot be stored", await refused(sql`update listing_units set base_price_paise = 0 where id = ${f.unitA}`));
  } catch (e) {
    const error = e as Error;
    check("C  the engine section ran to completion", false, `${error.message.split("\n")[0]} ${(error.stack ?? "").split("\n").find((l) => /booking\.mts/.test(l))?.trim() ?? ""}`);
  }

  /* ====================================================================
     D. THROUGH THE SERVER
     ==================================================================== */
  section("D. Search → listing → hold → checkout, in a browser");
  let home: Response | null = null;
  try { home = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(60_000) }); } catch { home = null; }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!home || home.status !== 200) {
    console.log(`SKIP  section D — no server answered at ${BASE}`);
  } else if (!supabaseUrl || !serviceKey) {
    console.log("SKIP  section D — NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to sign in");
  } else {
    const { chromium } = await import("playwright");
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const authIds: string[] = [];
    const browser = await chromium.launch();
    let ip = 40;
    const signIn = async (email: string, next: string, viewport = { width: 1280, height: 900 }) => {
      const created = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (created.data.user) authIds.push(created.data.user.id);
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error || !link.data.properties?.hashed_token) throw new Error(`generateLink failed: ${link.error?.message}`);
      if (link.data.user && !authIds.includes(link.data.user.id)) authIds.push(link.data.user.id);
      ip += 1;
      const context = await browser.newContext({ viewport, extraHTTPHeaders: { "x-forwarded-for": `10.78.0.${ip}` } });
      const page = await context.newPage();
      await page.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`, { waitUntil: "load" });
      await page.waitForURL(/\/auth\/continue/, { timeout: 30_000 });
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 60_000 });
      return { context, page };
    };
    const overflow = (page: import("playwright").Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const get = async (path: string) => {
      const r = await fetch(`${BASE}${path}`, { redirect: "manual", signal: AbortSignal.timeout(120_000) });
      return { status: r.status, location: r.headers.get("location") ?? "", body: (await r.text()).replace(/<!--.*?-->/g, "") };
    };

    try {
      const g = await makeFixture(sql, "web", 0, "jaipur");
      const [listingName] = (await sql`select name from partner_properties where id = ${g.listingId}`).map((r) => r.name as string);
      const stayPath = `/destinations/jaipur/partner-stays/${g.listingId}`;
      const dated = `checkIn=${d(7)}&checkOut=${d(9)}&guests=2`;

      /* D1. Search. */
      let r = await get("/search?destination=jaipur");
      check("D1 /search serves and is noindex", r.status === 200 && /noindex/.test(r.body), `HTTP ${r.status}`);
      check("D1 a valid listing is searchable in its destination", r.body.includes(listingName));
      r = await get("/search?destination=agra");
      check("D1 it is not a result for another destination", r.status === 200 && !r.body.includes(listingName));
      r = await get("/search?destination=jaipur&type=HOSTEL");
      check("D1 the kind filter excludes it", !r.body.includes(listingName));
      r = await get("/search?destination=jaipur&amenity=qa-rooftop");
      check("D1 an amenity the listing publishes finds it, and is offered as a filter", r.body.includes(listingName) && /value="qa-rooftop"/.test(r.body));
      r = await get(`/search?destination=jaipur&${dated}`);
      check("D1 with open dates it shows the real total for the stay", r.body.includes(listingName) && /Rooms open for your dates, from ₹5,000 for the stay/.test(r.body));
      r = await get(`/search?destination=jaipur&checkIn=${d(25)}&checkOut=${d(26)}&guests=2`);
      check("D1 with dates nobody opened it is not a result", !r.body.includes(listingName));
      r = await get(`/search?destination=jaipur&checkIn=${d(9)}&checkOut=${d(7)}`);
      check("D1 an invalid date range is rejected with a message", /Departure must be after arrival/.test(r.body) && r.body.includes(listingName));
      await sql`update partner_properties set status = 'UNPUBLISHED' where id = ${g.listingId}`;
      r = await get("/search?destination=jaipur");
      check("D1 an unpublished listing is not searchable", !r.body.includes(listingName));
      await sql`update partners set status = 'SUSPENDED' where id = ${g.partnerId}`;
      await sql`update partners set status = 'VERIFIED' where id = ${g.partnerId}`;
      await sql`update partner_properties set status = 'PUBLISHED' where id = ${g.listingId}`;

      /* D2. Listing panel. */
      r = await get(`${stayPath}?${dated}`);
      check("D2 the listing shows the priced room type with its real total", r.status === 200 && /QA Deluxe Room/.test(r.body) && /₹5,000 per room for 2 nights/.test(r.body));
      check("D2 the unpriced room type is shown as not bookable, with no price", /Not bookable online for these dates/.test(r.body) && (r.body.match(/data-reserve=/g) ?? []).length === 1);
      r = await get(stayPath);
      check("D2 without dates the panel asks for them and prices nothing", /Choose your dates to see which rooms are open/.test(r.body) && !/per room for/.test(r.body));

      /* D3. Anonymous reserve → sign in and come back. */
      const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const ap = await anon.newPage();
      await ap.goto(`${BASE}${stayPath}?${dated}#book`, { waitUntil: "load" });
      await ap.locator(`form[data-reserve="${g.unitA}"] button[type="submit"]`).click();
      await ap.waitForURL(/\/login\?next=/, { timeout: 60_000 });
      const next = decodeURIComponent(new URL(ap.url()).searchParams.get("next") ?? "");
      check("D3 an anonymous traveller is sent to sign in and back to the same stay", next.startsWith(stayPath) && next.includes(`checkIn=${d(7)}`), next);
      check("D3 and no room was held", (await avail(sql, g.unitA, d(7)))?.units_held === 0);
      const anonCheckout = await get("/checkout/TS-ABCDEF");
      check("D3 checkout without a session goes to sign-in", [302, 303, 307, 308].includes(anonCheckout.status) && /\/login/.test(anonCheckout.location), `HTTP ${anonCheckout.status}`);
      await anon.close();

      /* D4. Signed in: hold → checkout. */
      const traveller = await signIn(`qa-booking-web-t1-${stamp}@terrastory.test`, `${stayPath}?${dated}`);
      const tp = traveller.page;
      await tp.goto(`${BASE}${stayPath}?${dated}#book`, { waitUntil: "load" });
      await tp.locator(`form[data-reserve="${g.unitA}"] button[type="submit"]`).click();
      await tp.waitForURL(/\/checkout\/TS-[2-9A-HJ-NP-Z]{6}$/, { timeout: 60_000 });
      const code = tp.url().split("/").pop() ?? "";
      const [held] = await sql`select id, status, total_paise, user_id from bookings where code = ${code}`;
      check("D4 reserving holds the room and opens checkout", held?.status === "PENDING_PAYMENT" && (await avail(sql, g.unitA, d(7)))?.units_held === 1);
      const body = await tp.locator("main").innerText();
      check("D4 checkout shows the stay and the breakdown", /QA Deluxe Room/.test(body) && body.includes(listingName) && /Night of/.test(body));
      check("D4 the total shown is the total stored", (await tp.locator("[data-total-paise]").getAttribute("data-total-paise")) === held?.total_paise && held?.total_paise === "500000");
      check("D4 no tax or fee line is invented", !/GST|service fee|convenience fee|taxes \d/i.test(body) && /no taxes or fees/.test(body));
      check("D4 payment is marked as a test state and cannot be used",
        /Test state/.test(body) && /not a confirmed booking/.test(body) && (await tp.locator('[data-payment-state="not-connected"] button[disabled]').count()) === 1);
      check("D4 the hold's countdown is shown", /Time left/.test(body) && (await tp.locator('[role="timer"]').count()) === 1);
      await tp.reload({ waitUntil: "load" });
      check("D4 reloading checkout creates no second hold", (await sql`select count(*)::int n from bookings where user_id = ${held?.user_id}`)[0]?.n === 1);
      await tp.fill("#contact-phone", "+91 98765 43210");
      await tp.getByRole("button", { name: "Save telephone" }).click();
      await tp.waitForSelector("text=Telephone saved.", { timeout: 30_000 });
      check("D4 the traveller's telephone is saved to the hold", (await sql`select contact_phone from bookings where code = ${code}`)[0]?.contact_phone === "+91 98765 43210");

      for (const width of [375, 390, 768, 1440]) {
        await tp.setViewportSize({ width, height: 900 });
        for (const path of [`/search?destination=jaipur&${dated}`, `${stayPath}?${dated}`, `/checkout/${code}`]) {
          await tp.goto(`${BASE}${path}`, { waitUntil: "load" });
          const over = await overflow(tp);
          check(`D5 ${path.replace(g.listingId, "[id]").replace(code, "[code]").split("?")[0]} fits ${width}px`, over <= 1, `${over}px over`);
        }
      }
      await tp.setViewportSize({ width: 1280, height: 900 });

      /* D6. Another traveller cannot see it. */
      const other = await signIn(`qa-booking-web-t2-${stamp}@terrastory.test`, "/search");
      const otherView = await other.page.goto(`${BASE}/checkout/${code}`, { waitUntil: "load" });
      check("D6 another traveller gets 404 on this checkout", otherView?.status() === 404, `HTTP ${otherView?.status()}`);
      await other.context.close();

      /* D7. Release from checkout. */
      await tp.goto(`${BASE}/checkout/${code}`, { waitUntil: "load" });
      await tp.getByRole("button", { name: "Release these rooms" }).click();
      await tp.waitForSelector('[data-hold-state="CANCELLED"]', { timeout: 60_000 });
      check("D7 releasing from checkout cancels the hold and returns the room",
        (await sql`select status from bookings where code = ${code}`)[0]?.status === "CANCELLED" && (await avail(sql, g.unitA, d(7)))?.units_open === 2);
      check("D7 a released hold offers no payment", (await tp.locator('[data-payment-state]').count()) === 0);

      /* D8. Expiry seen from checkout. */
      await tp.goto(`${BASE}${stayPath}?${dated}#book`, { waitUntil: "load" });
      await tp.locator(`form[data-reserve="${g.unitA}"] button[type="submit"]`).click();
      await tp.waitForURL(/\/checkout\/TS-/, { timeout: 60_000 });
      const code2 = tp.url().split("/").pop() ?? "";
      await sql`update bookings set hold_expires_at = now() - interval '1 second' where code = ${code2}`;
      await tp.reload({ waitUntil: "load" });
      check("D8 an expired hold shows as expired, with no payment", (await tp.locator('[data-hold-state="EXPIRED"]').count()) === 1 && (await tp.locator("[data-payment-state]").count()) === 0);
      check("D8 and its room is back", (await sql`select status from bookings where code = ${code2}`)[0]?.status === "EXPIRED" && (await avail(sql, g.unitA, d(7)))?.units_open === 2);
      await traveller.context.close();

      /* D9. The sweep route. */
      const noAuth = await fetch(`${BASE}/api/cron/release-holds`, { signal: AbortSignal.timeout(60_000) });
      check("D9 the sweep route refuses without its secret", noAuth.status === 401 || noAuth.status === 503, `HTTP ${noAuth.status}`);
      const cronSecret = process.env.QA_CRON_SECRET;
      if (cronSecret) {
        const authed = await fetch(`${BASE}/api/cron/release-holds`, { headers: { authorization: `Bearer ${cronSecret}` }, signal: AbortSignal.timeout(60_000) });
        const json = (await authed.json().catch(() => ({}))) as { released?: number };
        check("D9 the sweep route runs with its secret", authed.status === 200 && typeof json.released === "number", `HTTP ${authed.status}`);
        const wrong = await fetch(`${BASE}/api/cron/release-holds`, { headers: { authorization: `Bearer ${cronSecret}x` }, signal: AbortSignal.timeout(60_000) });
        check("D9 a wrong secret is refused", wrong.status === 401);
      } else {
        console.log("SKIP  D9 authorised sweep — set QA_CRON_SECRET to the server's CRON_SECRET");
      }
    } catch (e) {
      const error = e as Error;
      check("D  the browser flow ran to completion", false, `${error.message.split("\n")[0]} ${(error.stack ?? "").split("\n").find((l) => /booking\.mts/.test(l))?.trim() ?? ""}`);
    } finally {
      await browser.close().catch(() => undefined);
      for (const id of authIds) {
        try {
          await sql`delete from bookings where user_id = ${id}`;
          await sql`update audit_logs set actor_id = null where actor_id = ${id}`;
          await sql`delete from users where id = ${id}`;
          await admin.auth.admin.deleteUser(id);
        } catch (e) {
          console.log(`WARN  auth cleanup: ${(e as Error).message}`);
        }
      }
    }
  }

  try {
    await dropFixtures(sql);
    await sql`delete from users where email like ${`qa-booking-%-${stamp}@terrastory.test`}`;
  } catch (e) {
    console.log(`WARN  cleanup incomplete: ${(e as Error).message}`);
  }
  await Promise.race([sql.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
