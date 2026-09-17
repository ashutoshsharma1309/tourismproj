import { and, asc, between, desc, eq, inArray, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { availability, listingUnits, partnerProperties, vendorDocuments } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";

/**
 * Reads for the partner workspace. Every function takes the SESSION's partner
 * id first and filters by it in SQL, so a listing or room-type id from a URL
 * that belongs to someone else returns nothing — the page then answers 404,
 * the same as for an id that never existed.
 */

export type ListingRow = typeof partnerProperties.$inferSelect;
export type UnitRow = typeof listingUnits.$inferSelect;
export type AvailabilityRow = typeof availability.$inferSelect;
export type DocumentRow = typeof vendorDocuments.$inferSelect;

export interface ListingSummary {
  listing: ListingRow;
  units: number;
  /** Dates in [today, today+29] with at least one room open, across the listing's room types. */
  openDays: number;
}

export async function listingSummariesForPartner(partnerId: string, today: string): Promise<ListingSummary[]> {
  if (!hasDatabase) return [];
  const listings = await db
    .select()
    .from(partnerProperties)
    .where(eq(partnerProperties.partnerId, partnerId))
    .orderBy(desc(partnerProperties.createdAt));
  if (listings.length === 0) return [];
  const ids = listings.map((l) => l.id);
  const counts = await db
    .select({
      listingId: listingUnits.listingId,
      units: sql<number>`count(DISTINCT ${listingUnits.id})::int`,
      openDays: sql<number>`count(DISTINCT ${availability.date}) FILTER (WHERE ${availability.unitsOpen} > 0 AND ${availability.date} BETWEEN ${today}::date AND ${today}::date + 29)::int`,
    })
    .from(listingUnits)
    .leftJoin(availability, eq(availability.listingUnitId, listingUnits.id))
    .where(inArray(listingUnits.listingId, ids))
    .groupBy(listingUnits.listingId);
  const byListing = new Map(counts.map((c) => [c.listingId, c]));
  return listings.map((listing) => ({
    listing,
    units: Number(byListing.get(listing.id)?.units ?? 0),
    openDays: Number(byListing.get(listing.id)?.openDays ?? 0),
  }));
}

export async function listingForPartner(partnerId: string, listingId: string): Promise<ListingRow | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .select()
    .from(partnerProperties)
    .where(and(eq(partnerProperties.id, listingId), eq(partnerProperties.partnerId, partnerId)))
    .limit(1);
  return row ?? null;
}

export async function unitsForPartnerListing(partnerId: string, listingId: string): Promise<UnitRow[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ unit: listingUnits })
    .from(listingUnits)
    .innerJoin(partnerProperties, eq(listingUnits.listingId, partnerProperties.id))
    .where(and(eq(listingUnits.listingId, listingId), eq(partnerProperties.partnerId, partnerId)))
    .orderBy(asc(listingUnits.createdAt));
  return rows.map((r) => r.unit);
}

/** All of a partner's room types, with their listing, for the calendar's picker. */
export async function unitsForPartner(partnerId: string): Promise<{ unit: UnitRow; listingId: string; listingName: string }[]> {
  if (!hasDatabase) return [];
  return db
    .select({ unit: listingUnits, listingId: partnerProperties.id, listingName: partnerProperties.name })
    .from(listingUnits)
    .innerJoin(partnerProperties, eq(listingUnits.listingId, partnerProperties.id))
    .where(eq(partnerProperties.partnerId, partnerId))
    .orderBy(asc(partnerProperties.name), asc(listingUnits.createdAt));
}

export async function availabilityForPartnerUnit(partnerId: string, unitId: string, from: string, to: string): Promise<AvailabilityRow[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ day: availability })
    .from(availability)
    .innerJoin(listingUnits, eq(availability.listingUnitId, listingUnits.id))
    .innerJoin(partnerProperties, eq(listingUnits.listingId, partnerProperties.id))
    .where(and(eq(availability.listingUnitId, unitId), eq(partnerProperties.partnerId, partnerId), between(availability.date, from, to)))
    .orderBy(asc(availability.date));
  return rows.map((r) => r.day);
}

export async function documentsForPartner(partnerId: string): Promise<DocumentRow[]> {
  if (!hasDatabase) return [];
  return db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, partnerId)).orderBy(desc(vendorDocuments.createdAt));
}

/**
 * The organisation's decision history, for the partner. Actions and dates
 * only: which reviewer decided is internal, so the actor is not returned.
 */
export async function vendorDecisionsForPartner(partnerId: string): Promise<{ id: string; action: string; at: Date; note: string | null }[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ id: auditLogs.id, action: auditLogs.action, at: auditLogs.at, after: auditLogs.after })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "partner"), eq(auditLogs.entityId, partnerId)))
    .orderBy(desc(auditLogs.at));
  return rows.map((r) => {
    const after = (r.after ?? {}) as { note?: unknown };
    return { id: r.id, action: r.action, at: r.at, note: typeof after.note === "string" ? after.note : null };
  });
}

/** For the review console: the organisation's full trail, with actors. */
export async function vendorTrailForReviewer(partnerId: string) {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "partner"), eq(auditLogs.entityId, partnerId)))
    .orderBy(desc(auditLogs.at));
}
