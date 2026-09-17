import { and, asc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  availability,
  bookingItems,
  bookings,
  listingUnits,
  partnerAgreements,
  partnerProperties,
  partners,
} from "@/db/schema";
import type * as schema from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";
import { commissionForTransaction, type Agreement } from "@/lib/partners/commission";
import { isVerifiedVendor, type VendorStatus } from "@/lib/partners/vendor";

import {
  bookingCode,
  HOLD_MINUTES,
  nightsOf,
  quantityProblem,
  quoteNights,
  roomsFor,
  stayProblem,
  type NightlyQuote,
} from "./stay";

/**
 * ★ The booking engine: holds, their expiry and their release.
 *
 * `availability` is the only source of truth for "can this be sold" (CLAUDE.md
 * §2 R3). A hold is one transaction that
 *
 *   1. returns the same booking for a repeated idempotency key,
 *   2. releases any expired hold on the same room type first,
 *   3. locks the stay's availability rows — `SELECT … FOR UPDATE`, in date
 *      order, so two holds on overlapping dates queue instead of deadlocking,
 *   4. re-checks every night against the locked rows (open, not closed,
 *      priced, enough rooms), and
 *   5. moves rooms from `units_open` to `units_held`, writes the booking, its
 *      item and an audit row.
 *
 * Nothing is read and then written outside that lock, so two travellers
 * reaching for the last room cannot both get it: the second transaction waits
 * for the first, then sees zero rooms open. The database's own constraints
 * (counters ≥ 0, open + held + booked ≤ quantity) are the floor under this.
 *
 * WHY THIS FILE TAKES `db` AS AN ARGUMENT
 * The concurrency guarantee is proved by running real parallel transactions
 * against Postgres (scripts/qa/booking.mts). The engine therefore has no
 * `server-only` import and no Next.js dependency; the server wrapper
 * (lib/booking/holds.ts) passes the app's handle in.
 *
 * No confirmation happens here. A hold is PENDING_PAYMENT until a payment
 * gateway's webhook says otherwise, which is Phase 3.
 */

export type Db = PostgresJsDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Runner = Db | Tx;

export type HoldError =
  | "invalid-date"
  | "past"
  | "order"
  | "too-long"
  | "too-far"
  | "rooms"
  | "guests"
  | "capacity"
  | "not-found"
  | "not-bookable"
  | "not-open"
  | "closed"
  | "not-priced"
  | "sold-out"
  | "busy";

export interface HoldInput {
  userId: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  idempotencyKey: string;
  contactPhone?: string | null;
}

export type HoldResult =
  | { ok: true; code: string; holdExpiresAt: Date; totalPaise: bigint; reused: boolean }
  | { ok: false; error: HoldError };

const todayInKolkata = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

function pgCode(error: unknown): { code?: string; constraint?: string } {
  const e = error as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  return { code: e?.code ?? e?.cause?.code, constraint: e?.constraint_name ?? e?.cause?.constraint_name };
}

/* ------------------------------------------------------------------ reads */

export interface UnitQuote {
  unitId: string;
  name: string;
  capacity: number;
  totalQuantity: number;
  quote: NightlyQuote;
  /** The fewest rooms of this type the party fits in. */
  roomsNeeded: number;
}

/**
 * Every room type of a listing, quoted for a stay. Read-only: callers that
 * want expired holds counted as free again release them first.
 */
export async function quoteListing(
  db: Runner,
  listingId: string,
  stay: { checkIn: string; checkOut: string; guests: number },
): Promise<UnitQuote[]> {
  const units = await db
    .select()
    .from(listingUnits)
    .where(eq(listingUnits.listingId, listingId))
    .orderBy(asc(listingUnits.createdAt));
  if (units.length === 0) return [];
  const nights = nightsOf(stay.checkIn, stay.checkOut);
  const rows = await db
    .select()
    .from(availability)
    .where(
      and(
        inArray(availability.listingUnitId, units.map((u) => u.id)),
        gte(availability.date, stay.checkIn),
        lt(availability.date, stay.checkOut),
      ),
    );
  return units.map((unit) => ({
    unitId: unit.id,
    name: unit.name,
    capacity: unit.capacity,
    totalQuantity: unit.totalQuantity,
    quote: quoteNights(
      nights,
      rows.filter((r) => r.listingUnitId === unit.id),
      unit.basePricePaise,
      roomsFor(stay.guests, unit.capacity),
    ),
    roomsNeeded: roomsFor(stay.guests, unit.capacity),
  }));
}

/* --------------------------------------------------------------- releases */

/** Give a held item's rooms back — to `units_open` only on dates the partner has not closed. */
async function restoreHeld(tx: Tx, item: { listingUnitId: string; startDate: string; endDate: string; qty: number }) {
  await tx
    .select({ id: availability.id })
    .from(availability)
    .where(
      and(
        eq(availability.listingUnitId, item.listingUnitId),
        gte(availability.date, item.startDate),
        lt(availability.date, item.endDate),
      ),
    )
    .orderBy(asc(availability.date))
    .for("update");
  await tx.execute(sql`
    UPDATE availability AS a
    SET units_held = GREATEST(0, a.units_held - ${item.qty}),
        units_open = CASE
          WHEN a.closed THEN 0
          ELSE LEAST(a.units_open + ${item.qty}, u.total_quantity - GREATEST(0, a.units_held - ${item.qty}) - a.units_booked)
        END,
        updated_at = now()
    FROM listing_units AS u
    WHERE u.id = a.listing_unit_id
      AND a.listing_unit_id = ${item.listingUnitId}
      AND a.date >= ${item.startDate}::date
      AND a.date < ${item.endDate}::date
  `);
}

async function releaseBooking(
  tx: Tx,
  booking: { id: string; code: string },
  to: "EXPIRED" | "CANCELLED",
  actorId: string | null,
  now: Date,
) {
  const items = await tx
    .select()
    .from(bookingItems)
    .where(and(eq(bookingItems.bookingId, booking.id), eq(bookingItems.status, "HELD")))
    .orderBy(asc(bookingItems.listingUnitId), asc(bookingItems.startDate));
  for (const item of items) await restoreHeld(tx, item);
  if (items.length) {
    await tx.update(bookingItems).set({ status: "CANCELLED" }).where(and(eq(bookingItems.bookingId, booking.id), eq(bookingItems.status, "HELD")));
  }
  await tx.update(bookings).set({ status: to, updatedAt: now }).where(eq(bookings.id, booking.id));
  await tx.insert(auditLogs).values({
    actorId,
    action: to === "EXPIRED" ? "booking.hold_expired" : "booking.hold_cancelled",
    entityType: "booking",
    entityId: booking.id,
    before: { status: "PENDING_PAYMENT" },
    after: { status: to, code: booking.code, rooms: items.map((i) => ({ unitId: i.listingUnitId, from: i.startDate, to: i.endDate, qty: i.qty })) },
  });
}

/**
 * Expire every hold whose time is up — optionally only those on one room
 * type or one listing. `SKIP LOCKED`: a hold another transaction is already
 * releasing (or paying for) is left to it, so two sweeps never double-restore.
 * Safe to run any number of times.
 */
export async function releaseExpiredHolds(db: Db, now: Date, scope?: { unitId?: string; listingId?: string }): Promise<number> {
  return db.transaction((tx) => releaseExpiredInTx(tx, now, scope));
}

async function releaseExpiredInTx(tx: Tx, now: Date, scope?: { unitId?: string; listingId?: string }): Promise<number> {
  const scoped = scope?.unitId
    ? sql`AND EXISTS (SELECT 1 FROM booking_items bi WHERE bi.booking_id = b.id AND bi.listing_unit_id = ${scope.unitId})`
    : scope?.listingId
      ? sql`AND EXISTS (SELECT 1 FROM booking_items bi WHERE bi.booking_id = b.id AND bi.listing_id = ${scope.listingId})`
      : sql``;
  const expired = await tx.execute<{ id: string; code: string }>(sql`
    SELECT b.id, b.code FROM bookings b
    WHERE b.status = 'PENDING_PAYMENT' AND b.hold_expires_at <= ${now.toISOString()}::timestamptz ${scoped}
    ORDER BY b.hold_expires_at
    FOR UPDATE OF b SKIP LOCKED
  `);
  for (const booking of expired) await releaseBooking(tx, booking, "EXPIRED", null, now);
  return expired.length;
}

/**
 * The traveller lets their own hold go. Idempotent: a hold that is already
 * cancelled, expired or paid answers with its status and changes nothing.
 */
export async function cancelHold(
  db: Db,
  input: { code: string; userId: string },
  now: Date,
): Promise<{ ok: true; status: string; changed: boolean } | { ok: false; error: "not-found" }> {
  return db.transaction(async (tx) => {
    const [booking] = await tx
      .select({ id: bookings.id, code: bookings.code, status: bookings.status, holdExpiresAt: bookings.holdExpiresAt })
      .from(bookings)
      .where(and(eq(bookings.code, input.code), eq(bookings.userId, input.userId)))
      .limit(1)
      .for("update");
    if (!booking) return { ok: false, error: "not-found" };
    if (booking.status !== "PENDING_PAYMENT") return { ok: true, status: booking.status, changed: false };
    const expired = booking.holdExpiresAt !== null && booking.holdExpiresAt.getTime() <= now.getTime();
    await releaseBooking(tx, booking, expired ? "EXPIRED" : "CANCELLED", expired ? null : input.userId, now);
    return { ok: true, status: expired ? "EXPIRED" : "CANCELLED", changed: true };
  });
}

/* ------------------------------------------------------------------- hold */

export async function createHold(db: Db, input: HoldInput, now: Date): Promise<HoldResult> {
  const today = todayInKolkata(now);
  const stay = stayProblem(input.checkIn, input.checkOut, today);
  if (stay) return { ok: false, error: stay };
  const quantity = quantityProblem(input.rooms, input.guests);
  if (quantity) return { ok: false, error: quantity };
  if (!/^[A-Za-z0-9-]{16,64}$/.test(input.idempotencyKey)) return { ok: false, error: "busy" };

  try {
    return await db.transaction(async (tx) => {
      /* 1. The same attempt, again: the same answer. */
      const [previous] = await tx
        .select({ code: bookings.code, holdExpiresAt: bookings.holdExpiresAt, totalPaise: bookings.totalPaise })
        .from(bookings)
        .where(and(eq(bookings.userId, input.userId), eq(bookings.idempotencyKey, input.idempotencyKey)))
        .limit(1);
      if (previous) {
        return { ok: true, code: previous.code, holdExpiresAt: previous.holdExpiresAt ?? now, totalPaise: previous.totalPaise, reused: true };
      }

      /* 2. Expired holds on this room type give their rooms back first. */
      await releaseExpiredInTx(tx, now, { unitId: input.unitId });

      /* The room type, its listing and its vendor must all still be valid. */
      const [target] = await tx
        .select({ unit: listingUnits, listingStatus: partnerProperties.status, vendorStatus: partners.status, vendorId: partners.id, listingId: partnerProperties.id })
        .from(listingUnits)
        .innerJoin(partnerProperties, eq(listingUnits.listingId, partnerProperties.id))
        .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
        .where(eq(listingUnits.id, input.unitId))
        .limit(1)
        .for("share", { of: [listingUnits, partnerProperties, partners] });
      if (!target) return { ok: false, error: "not-found" };
      if (target.listingStatus !== "PUBLISHED" || !isVerifiedVendor(target.vendorStatus as VendorStatus)) {
        return { ok: false, error: "not-bookable" };
      }
      const capacity = quantityProblem(input.rooms, input.guests, target.unit.capacity);
      if (capacity) return { ok: false, error: capacity };

      /* 3. Lock the stay's rows, in date order. */
      const nights = nightsOf(input.checkIn, input.checkOut);
      const rows = await tx
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.listingUnitId, input.unitId),
            gte(availability.date, input.checkIn),
            lte(availability.date, nights[nights.length - 1] ?? input.checkIn),
          ),
        )
        .orderBy(asc(availability.date))
        .for("update");

      /* 4. Re-check against the locked rows. */
      const quote = quoteNights(nights, rows, target.unit.basePricePaise, input.rooms);
      if (!quote.ok) return { ok: false, error: quote.reason };

      /* 5. Open → held. */
      await tx
        .update(availability)
        .set({
          unitsOpen: sql`${availability.unitsOpen} - ${input.rooms}`,
          unitsHeld: sql`${availability.unitsHeld} + ${input.rooms}`,
          updatedAt: now,
        })
        .where(and(eq(availability.listingUnitId, input.unitId), inArray(availability.date, nights)));

      const subtotal = quote.perRoomPaise * BigInt(input.rooms);
      /* The platform's share is frozen now, from an ACTIVE signed agreement
         only. With no agreement it is zero, never a default rate. */
      const agreements = await tx
        .select()
        .from(partnerAgreements)
        .where(and(eq(partnerAgreements.partnerId, target.vendorId), eq(partnerAgreements.status, "ACTIVE"), eq(partnerAgreements.type, "PERCENTAGE_COMMISSION")));
      const fee = agreements
        .map((a) => commissionForTransaction(a as Agreement, { amountPaise: subtotal, confirmedAt: now }))
        .find((v): v is bigint => v !== null) ?? 0n;
      const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);

      let booking: { id: string; code: string } | undefined;
      for (let attempt = 0; attempt < 5 && !booking; attempt += 1) {
        const code = bookingCode(crypto.getRandomValues(new Uint8Array(6)));
        const [inserted] = await tx
          .insert(bookings)
          .values({
            code,
            userId: input.userId,
            status: "PENDING_PAYMENT",
            totalPaise: subtotal,
            guestCount: input.guests,
            contactPhone: input.contactPhone ?? null,
            holdExpiresAt,
            idempotencyKey: input.idempotencyKey,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: bookings.code })
          .returning({ id: bookings.id, code: bookings.code });
        booking = inserted;
      }
      if (!booking) throw new Error("booking code space exhausted after 5 attempts");

      await tx.insert(bookingItems).values({
        bookingId: booking.id,
        listingId: target.listingId,
        listingUnitId: input.unitId,
        vendorId: target.vendorId,
        startDate: input.checkIn,
        endDate: input.checkOut,
        qty: input.rooms,
        unitPricePaise: quote.nights[0]?.pricePaise ?? 0n,
        subtotalPaise: subtotal,
        platformFeePaise: fee,
        vendorPayoutPaise: subtotal - fee,
        nightlyPrices: quote.nights.map((n) => ({ date: n.date, pricePaise: n.pricePaise.toString() })),
        status: "HELD",
      });
      await tx.insert(auditLogs).values({
        actorId: input.userId,
        action: "booking.hold_created",
        entityType: "booking",
        entityId: booking.id,
        after: {
          code: booking.code,
          unitId: input.unitId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          rooms: input.rooms,
          guests: input.guests,
          totalPaise: subtotal.toString(),
          holdExpiresAt: holdExpiresAt.toISOString(),
        },
      });
      return { ok: true, code: booking.code, holdExpiresAt, totalPaise: subtotal, reused: false };
    });
  } catch (error) {
    const { code, constraint } = pgCode(error);
    /* The same idempotency key committed by a parallel request: return that booking. */
    if (code === "23505" && constraint === "bookings_user_idempotency_unique") {
      const [same] = await db
        .select({ code: bookings.code, holdExpiresAt: bookings.holdExpiresAt, totalPaise: bookings.totalPaise })
        .from(bookings)
        .where(and(eq(bookings.userId, input.userId), eq(bookings.idempotencyKey, input.idempotencyKey)))
        .limit(1);
      if (same) return { ok: true, code: same.code, holdExpiresAt: same.holdExpiresAt ?? now, totalPaise: same.totalPaise, reused: true };
    }
    /* A counter constraint caught what the lock should have: refuse, never oversell. */
    if (code === "23514") return { ok: false, error: "sold-out" };
    /* Lock timeout or serialization failure under load. */
    if (code === "40001" || code === "40P01" || code === "55P03") return { ok: false, error: "busy" };
    throw error;
  }
}
