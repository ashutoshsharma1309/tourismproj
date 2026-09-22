import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { availability, bookingItems, bookings, listingUnits, partnerProperties, partners } from "@/db/schema";
import { quoteListing, type UnitQuote } from "@/lib/booking/engine";

/**
 * Traveller-side reads for search, the listing's booking panel and checkout.
 *
 * VALID means PUBLISHED and the vendor still VERIFIED or APPROVED — the same
 * rule as the public partner-stay pages, applied here in SQL so an invalid
 * listing is never a search result.
 */

const valid = and(eq(partnerProperties.status, "PUBLISHED"), inArray(partners.status, ["VERIFIED", "APPROVED"]));

export type SearchListing = typeof partnerProperties.$inferSelect;

export interface SearchFilters {
  destinationId?: string;
  type?: string;
  amenities: string[];
}

export async function validListings(filters: SearchFilters): Promise<SearchListing[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ listing: partnerProperties })
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(
      and(
        valid,
        filters.destinationId ? eq(partnerProperties.destinationId, filters.destinationId) : undefined,
        filters.type ? sql`${partnerProperties.type}::text = ${filters.type}` : undefined,
        ...filters.amenities.map(
          (amenity) => sql`EXISTS (SELECT 1 FROM unnest(${partnerProperties.amenities}) AS a WHERE lower(a) = ${amenity.toLowerCase()})`,
        ),
      ),
    )
    .orderBy(asc(partnerProperties.name));
  return rows.map((r) => r.listing);
}

/** Amenities that valid listings actually publish — the filter offers nothing else. */
export async function amenityOptions(destinationId?: string): Promise<string[]> {
  if (!hasDatabase) return [];
  const rows = await db.execute<{ amenity: string }>(sql`
    SELECT DISTINCT lower(a) AS amenity
    FROM partner_properties p
    JOIN partners v ON v.id = p.partner_id
    CROSS JOIN LATERAL unnest(p.amenities) AS a
    WHERE p.status = 'PUBLISHED' AND v.status IN ('VERIFIED', 'APPROVED')
      ${destinationId ? sql`AND p.destination_id = ${destinationId}` : sql``}
    ORDER BY 1
    LIMIT 24
  `);
  return rows.map((r) => r.amenity);
}

/** Which listings have at least one room type with a rate — "direct booking set up". */
export async function listingsWithRates(listingIds: string[]): Promise<Set<string>> {
  if (!hasDatabase || listingIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ listingId: listingUnits.listingId })
    .from(listingUnits)
    .where(and(inArray(listingUnits.listingId, listingIds), sql`${listingUnits.basePricePaise} IS NOT NULL`));
  const withOverrides = await db
    .selectDistinct({ listingId: listingUnits.listingId })
    .from(listingUnits)
    .innerJoin(availability, eq(availability.listingUnitId, listingUnits.id))
    .where(and(inArray(listingUnits.listingId, listingIds), sql`${availability.pricePaiseOverride} IS NOT NULL`));
  return new Set([...rows.map((r) => r.listingId), ...withOverrides.map((r) => r.listingId)]);
}

export async function quoteForListing(listingId: string, stay: { checkIn: string; checkOut: string; guests: number }): Promise<UnitQuote[]> {
  if (!hasDatabase) return [];
  return quoteListing(db, listingId, stay);
}

export interface CheckoutView {
  booking: typeof bookings.$inferSelect;
  item: typeof bookingItems.$inferSelect;
  listing: typeof partnerProperties.$inferSelect;
  unitName: string;
  unitCapacity: number;
}

/** One reservation, only for the traveller who made it. */
export async function checkoutFor(code: string, userId: string): Promise<CheckoutView | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .select({ booking: bookings, item: bookingItems, listing: partnerProperties, unitName: listingUnits.name, unitCapacity: listingUnits.capacity })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(partnerProperties, eq(bookingItems.listingId, partnerProperties.id))
    .innerJoin(listingUnits, eq(bookingItems.listingUnitId, listingUnits.id))
    .where(and(eq(bookings.code, code), eq(bookings.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Rooms currently held (pending, not yet expired) per listing, for a partner's overview. */
export async function heldRoomsByListing(listingIds: string[]): Promise<Map<string, number>> {
  if (!hasDatabase || listingIds.length === 0) return new Map();
  const rows = await db
    .select({ listingId: bookingItems.listingId, rooms: sql<number>`coalesce(sum(${bookingItems.qty}), 0)::int` })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .where(and(inArray(bookingItems.listingId, listingIds), eq(bookingItems.status, "HELD"), eq(bookings.status, "PENDING_PAYMENT"), sql`${bookings.holdExpiresAt} > now()`))
    .groupBy(bookingItems.listingId);
  return new Map(rows.map((r) => [r.listingId, Number(r.rooms)]));
}
