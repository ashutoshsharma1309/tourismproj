import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { advisories, govMembers, listingUnits, partnerProperties, partners, vendorDocuments } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";

/**
 * Reads for the government console. EVERY function takes the permitted
 * destination ids first and filters on them in SQL, so a record outside the
 * organisation's jurisdiction is not merely hidden — it is never selected.
 *
 * Nothing here selects a traveller's identity. The queue is vendors, their
 * listings and their business documents; the analytics are counts of supply
 * and of reservations, never who made them.
 */

export type QueueStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "APPROVED" | "PUBLISHED" | "UNPUBLISHED" | "REJECTED";

export interface QueueRow {
  propertyId: string;
  name: string;
  destinationId: string;
  accommodationType: string;
  vendorType: string;
  organisationName: string;
  vendorStatus: string;
  status: QueueStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  clarificationRequestedAt: Date | null;
  documents: number;
}

export async function verificationQueue(destinations: string[], statuses?: QueueStatus[]): Promise<QueueRow[]> {
  if (!hasDatabase || destinations.length === 0) return [];
  const rows = await db
    .select({
      propertyId: partnerProperties.id,
      name: partnerProperties.name,
      destinationId: partnerProperties.destinationId,
      accommodationType: partnerProperties.type,
      vendorType: partners.vendorType,
      organisationName: partners.organizationName,
      vendorStatus: partners.status,
      status: partnerProperties.status,
      submittedAt: partnerProperties.createdAt,
      reviewedAt: partnerProperties.reviewedAt,
      clarificationRequestedAt: partnerProperties.clarificationRequestedAt,
      documents: sql<number>`(SELECT count(*)::int FROM vendor_documents d WHERE d.vendor_id = ${partners.id})`,
    })
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(
      and(
        inArray(partnerProperties.destinationId, destinations),
        statuses && statuses.length > 0 ? inArray(partnerProperties.status, statuses) : undefined,
      ),
    )
    .orderBy(asc(partnerProperties.createdAt));
  return rows as QueueRow[];
}

/** One queue item, or null when it is outside the officer's jurisdiction. */
export async function queueItem(destinations: string[], propertyId: string) {
  if (!hasDatabase || destinations.length === 0) return null;
  const [row] = await db
    .select({ property: partnerProperties, partner: partners })
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(and(eq(partnerProperties.id, propertyId), inArray(partnerProperties.destinationId, destinations)))
    .limit(1);
  if (!row) return null;
  const [documents, units, trail] = await Promise.all([
    db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, row.partner.id)).orderBy(desc(vendorDocuments.createdAt)),
    db.select({ n: count() }).from(listingUnits).where(eq(listingUnits.listingId, propertyId)),
    db
      .select({ id: auditLogs.id, action: auditLogs.action, at: auditLogs.at, after: auditLogs.after })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "partner_property"), eq(auditLogs.entityId, propertyId)))
      .orderBy(desc(auditLogs.at)),
  ]);
  return { ...row, documents, units: Number(units[0]?.n ?? 0), trail };
}

export interface SupplyTotals {
  vendors: number;
  verifiedVendors: number;
  publishedListings: number;
  listingsInReview: number;
  roomTypes: number;
  roomNightsOpen: number;
  reservationsStarted: number;
  publishedAdvisories: number;
}

export interface DestinationSupply {
  destinationId: string;
  vendors: number;
  publishedListings: number;
  roomNightsOpen: number;
}

/**
 * Operational totals for the jurisdiction. Counts of rows that exist; a
 * destination with nothing reports zero rather than being dropped, because
 * "no verified supply here" is the fact an officer needs.
 */
export async function supplyAnalytics(destinations: string[], today: string): Promise<{ totals: SupplyTotals; byDestination: DestinationSupply[] }> {
  const empty = {
    totals: { vendors: 0, verifiedVendors: 0, publishedListings: 0, listingsInReview: 0, roomTypes: 0, roomNightsOpen: 0, reservationsStarted: 0, publishedAdvisories: 0 },
    byDestination: destinations.map((destinationId) => ({ destinationId, vendors: 0, publishedListings: 0, roomNightsOpen: 0 })),
  };
  if (!hasDatabase || destinations.length === 0) return empty;
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [totalsRow] = await db
    .select({
      vendors: sql<number>`count(DISTINCT ${partnerProperties.partnerId})::int`,
      verifiedVendors: sql<number>`count(DISTINCT ${partnerProperties.partnerId}) FILTER (WHERE ${partners.status} IN ('VERIFIED', 'APPROVED'))::int`,
      publishedListings: sql<number>`count(*) FILTER (WHERE ${partnerProperties.status} = 'PUBLISHED')::int`,
      listingsInReview: sql<number>`count(*) FILTER (WHERE ${partnerProperties.status} IN ('PENDING', 'UNDER_REVIEW'))::int`,
    })
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(inArray(partnerProperties.destinationId, destinations));

  const inventory = await db.execute<{ destination_id: string; room_types: number; room_nights_open: number }>(sql`
    SELECT p.destination_id,
           count(DISTINCT u.id)::int AS room_types,
           coalesce(sum(a.units_open) FILTER (WHERE a.date BETWEEN ${today}::date AND ${today}::date + 29), 0)::int AS room_nights_open
    FROM partner_properties p
    JOIN listing_units u ON u.listing_id = p.id
    LEFT JOIN availability a ON a.listing_unit_id = u.id
    WHERE p.destination_id IN ${sql`(${sql.join(destinations.map((d) => sql`${d}`), sql`, `)})`}
    GROUP BY p.destination_id
  `);

  const reservations = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    JOIN partner_properties p ON p.id = bi.listing_id
    WHERE p.destination_id IN ${sql`(${sql.join(destinations.map((d) => sql`${d}`), sql`, `)})`}
      AND b.created_at >= ${since.toISOString()}
  `);

  const perDestination = await db
    .select({
      destinationId: partnerProperties.destinationId,
      vendors: sql<number>`count(DISTINCT ${partnerProperties.partnerId})::int`,
      publishedListings: sql<number>`count(*) FILTER (WHERE ${partnerProperties.status} = 'PUBLISHED')::int`,
    })
    .from(partnerProperties)
    .where(inArray(partnerProperties.destinationId, destinations))
    .groupBy(partnerProperties.destinationId);

  const [advisoryRow] = await db
    .select({ n: count() })
    .from(advisories)
    .where(and(inArray(advisories.destinationId, destinations), eq(advisories.status, "PUBLISHED")));

  const nights = new Map(inventory.map((r) => [r.destination_id, r]));
  const vendorsBy = new Map(perDestination.map((r) => [r.destinationId, r]));
  return {
    totals: {
      vendors: Number(totalsRow?.vendors ?? 0),
      verifiedVendors: Number(totalsRow?.verifiedVendors ?? 0),
      publishedListings: Number(totalsRow?.publishedListings ?? 0),
      listingsInReview: Number(totalsRow?.listingsInReview ?? 0),
      roomTypes: inventory.reduce((sum, r) => sum + Number(r.room_types), 0),
      roomNightsOpen: inventory.reduce((sum, r) => sum + Number(r.room_nights_open), 0),
      reservationsStarted: Number(reservations[0]?.n ?? 0),
      publishedAdvisories: Number(advisoryRow?.n ?? 0),
    },
    byDestination: destinations.map((destinationId) => ({
      destinationId,
      vendors: Number(vendorsBy.get(destinationId)?.vendors ?? 0),
      publishedListings: Number(vendorsBy.get(destinationId)?.publishedListings ?? 0),
      roomNightsOpen: Number(nights.get(destinationId)?.room_nights_open ?? 0),
    })),
  };
}

/** Advisories this organisation issued, newest first. */
export async function advisoriesForOrg(orgId: string, destinations: string[]) {
  if (!hasDatabase || destinations.length === 0) return [];
  return db
    .select()
    .from(advisories)
    .where(and(eq(advisories.orgId, orgId), inArray(advisories.destinationId, destinations)))
    .orderBy(desc(advisories.createdAt));
}

/** Travellers: the advisories in force for a destination right now. */
export async function publishedAdvisories(destinationId: string) {
  if (!hasDatabase) return [];
  const now = new Date();
  const rows = await db
    .select({
      id: advisories.id,
      kind: advisories.kind,
      severity: advisories.severity,
      title: advisories.title,
      body: advisories.body,
      startsAt: advisories.startsAt,
      endsAt: advisories.endsAt,
      source: advisories.source,
      authority: sql<string | null>`(SELECT o.authority FROM gov_organisations o WHERE o.id = ${advisories.orgId})`,
      publishedAt: advisories.publishedAt,
    })
    .from(advisories)
    .where(and(eq(advisories.destinationId, destinationId), eq(advisories.status, "PUBLISHED")))
    .orderBy(desc(advisories.severity), desc(advisories.publishedAt));
  /* A window that has not opened or has closed is not in force. */
  return rows.filter((row) => (!row.startsAt || row.startsAt <= now) && (!row.endsAt || row.endsAt > now));
}

export async function govTeam(orgId: string) {
  if (!hasDatabase) return [];
  return db
    .select({ id: govMembers.id, email: govMembers.email, role: govMembers.role, linked: sql<boolean>`${govMembers.userId} IS NOT NULL`, createdAt: govMembers.createdAt })
    .from(govMembers)
    .where(eq(govMembers.orgId, orgId))
    .orderBy(asc(govMembers.createdAt));
}

/** Decisions this organisation has made, for its own record. */
export async function govDecisionTrail(orgId: string, limit = 50) {
  if (!hasDatabase) return [];
  return db
    .select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, at: auditLogs.at, after: auditLogs.after })
    .from(auditLogs)
    .where(sql`${auditLogs.after} ->> 'orgId' = ${orgId}`)
    .orderBy(desc(auditLogs.at))
    .limit(limit);
}
