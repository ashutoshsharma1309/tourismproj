import { and, asc, count, eq, gte, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { bookingItems, bookings, listingUnits, partnerMembers, partnerProperties, referralEvents } from "@/db/schema";

/**
 * Analytics and reports for a partner — counts of real rows, scoped to the
 * partner in SQL. Nothing is estimated, projected or benchmarked. Traveller
 * identity never appears: holds are counted and listed by code, dates,
 * rooms, guests and amount, never by who made them.
 */

export interface ListingAnalytics {
  listingId: string;
  name: string;
  clicks: number;
  holdsCreated: number;
  holdsReleased: number;
  roomNightsOpen: number;
  roomNightsHeld: number;
  roomNightsBooked: number;
}

export async function analyticsForPartner(partnerId: string, today: string): Promise<ListingAnalytics[]> {
  if (!hasDatabase) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const listings = await db
    .select({ id: partnerProperties.id, name: partnerProperties.name })
    .from(partnerProperties)
    .where(eq(partnerProperties.partnerId, partnerId))
    .orderBy(asc(partnerProperties.name));
  if (listings.length === 0) return [];

  const clicks = await db
    .select({ listingId: referralEvents.propertyId, n: count() })
    .from(referralEvents)
    .innerJoin(partnerProperties, eq(referralEvents.propertyId, partnerProperties.id))
    .where(and(eq(partnerProperties.partnerId, partnerId), gte(referralEvents.occurredAt, since)))
    .groupBy(referralEvents.propertyId);

  const holds = await db
    .select({
      listingId: bookingItems.listingId,
      created: count(),
      released: sql<number>`count(*) FILTER (WHERE ${bookings.status} IN ('EXPIRED', 'CANCELLED'))::int`,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(partnerProperties, eq(bookingItems.listingId, partnerProperties.id))
    .where(and(eq(partnerProperties.partnerId, partnerId), gte(bookings.createdAt, since)))
    .groupBy(bookingItems.listingId);

  const nights = await db.execute<{ listing_id: string; open: number; held: number; booked: number }>(sql`
    SELECT u.listing_id, coalesce(sum(a.units_open), 0)::int AS open, coalesce(sum(a.units_held), 0)::int AS held, coalesce(sum(a.units_booked), 0)::int AS booked
    FROM availability a
    JOIN listing_units u ON u.id = a.listing_unit_id
    JOIN partner_properties p ON p.id = u.listing_id
    WHERE p.partner_id = ${partnerId} AND a.date BETWEEN ${today}::date AND ${today}::date + 29
    GROUP BY u.listing_id
  `);

  const clickMap = new Map(clicks.map((c) => [c.listingId, Number(c.n)]));
  const holdMap = new Map(holds.map((h) => [h.listingId, h]));
  const nightMap = new Map(nights.map((n) => [n.listing_id, n]));
  return listings.map((l) => ({
    listingId: l.id,
    name: l.name,
    clicks: clickMap.get(l.id) ?? 0,
    holdsCreated: Number(holdMap.get(l.id)?.created ?? 0),
    holdsReleased: Number(holdMap.get(l.id)?.released ?? 0),
    roomNightsOpen: Number(nightMap.get(l.id)?.open ?? 0),
    roomNightsHeld: Number(nightMap.get(l.id)?.held ?? 0),
    roomNightsBooked: Number(nightMap.get(l.id)?.booked ?? 0),
  }));
}

export interface HoldReportRow {
  code: string;
  listing: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  status: string;
  totalPaise: bigint;
  createdAt: Date;
}

/** Every reservation on the partner's listings, newest first. No traveller identity. */
export async function holdReportForPartner(partnerId: string): Promise<HoldReportRow[]> {
  if (!hasDatabase) return [];
  return db
    .select({
      code: bookings.code,
      listing: partnerProperties.name,
      roomType: listingUnits.name,
      checkIn: bookingItems.startDate,
      checkOut: bookingItems.endDate,
      rooms: bookingItems.qty,
      guests: bookings.guestCount,
      status: bookings.status,
      totalPaise: bookingItems.subtotalPaise,
      createdAt: bookings.createdAt,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(partnerProperties, eq(bookingItems.listingId, partnerProperties.id))
    .innerJoin(listingUnits, eq(bookingItems.listingUnitId, listingUnits.id))
    .where(eq(partnerProperties.partnerId, partnerId))
    .orderBy(sql`${bookings.createdAt} DESC`);
}

export async function teamForPartner(partnerId: string) {
  if (!hasDatabase) return [];
  return db
    .select({ id: partnerMembers.id, email: partnerMembers.email, role: partnerMembers.role, linked: sql<boolean>`${partnerMembers.userId} IS NOT NULL`, createdAt: partnerMembers.createdAt })
    .from(partnerMembers)
    .where(eq(partnerMembers.partnerId, partnerId))
    .orderBy(asc(partnerMembers.createdAt));
}

/** How much of each limit a partner uses now. */
export async function usageForPartner(partnerId: string) {
  if (!hasDatabase) return { listings: 0, maxRoomTypesOnAListing: 0, teamMembers: 0 };
  const [row] = await db.execute<{ listings: number; max_units: number; members: number }>(sql`
    SELECT
      (SELECT count(*)::int FROM partner_properties WHERE partner_id = ${partnerId} AND status <> 'REJECTED') AS listings,
      (SELECT coalesce(max(n), 0)::int FROM (SELECT count(*) AS n FROM listing_units u JOIN partner_properties p ON p.id = u.listing_id WHERE p.partner_id = ${partnerId} GROUP BY u.listing_id) t) AS max_units,
      (SELECT count(*)::int FROM partner_members WHERE partner_id = ${partnerId}) AS members
  `);
  return { listings: Number(row?.listings ?? 0), maxRoomTypesOnAListing: Number(row?.max_units ?? 0), teamMembers: Number(row?.members ?? 0) };
}
