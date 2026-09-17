import "server-only";

import { and, eq } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { bookings } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";

import { cancelHold, createHold, releaseExpiredHolds, type HoldInput, type HoldResult } from "./engine";

/**
 * The booking engine bound to the app's database. Pages and actions import
 * from here; the engine itself stays free of Next.js so it can be tested with
 * real concurrent transactions.
 */

export async function placeHold(input: HoldInput): Promise<HoldResult> {
  if (!hasDatabase) return { ok: false, error: "not-bookable" };
  return createHold(db, input, new Date());
}

export async function releaseHold(code: string, userId: string) {
  if (!hasDatabase) return { ok: false as const, error: "not-found" as const };
  return cancelHold(db, { code, userId }, new Date());
}

/**
 * Expire what has run out before anyone reads availability, so an abandoned
 * hold never makes rooms look taken — and never stays payable. Cheap when
 * nothing has expired: one `SKIP LOCKED` select. A failure here must not take
 * the page down; the cron route and the next hold retry it.
 */
export async function sweepExpiredHolds(scope?: { listingId?: string; unitId?: string }): Promise<number> {
  if (!hasDatabase) return 0;
  try {
    return await releaseExpiredHolds(db, new Date(), scope);
  } catch (error) {
    console.error("booking: expired-hold sweep failed", (error as Error).message);
    return 0;
  }
}

/** The traveller's telephone for the property. Idempotent: the same number again writes nothing. */
export async function saveHoldContact(code: string, userId: string, phone: string): Promise<boolean> {
  if (!hasDatabase) return false;
  return db.transaction(async (tx) => {
    const [booking] = await tx
      .select({ id: bookings.id, contactPhone: bookings.contactPhone, status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.code, code), eq(bookings.userId, userId)))
      .limit(1)
      .for("update");
    if (!booking || booking.status !== "PENDING_PAYMENT") return false;
    if (booking.contactPhone === phone) return true;
    await tx.update(bookings).set({ contactPhone: phone, updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    await tx.insert(auditLogs).values({
      actorId: userId,
      action: "booking.contact_updated",
      entityType: "booking",
      entityId: booking.id,
      before: { hadPhone: booking.contactPhone !== null },
      after: { hasPhone: true },
    });
    return true;
  });
}
