import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { partnerAgreements, partnerProperties, partners, referralEvents } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";

/**
 * Every read of the partner programme. Components never touch `src/db`
 * directly (CLAUDE.md §4). Every function opens by checking `hasDatabase`:
 * a deployment without Postgres has no partners, and says so, rather than
 * failing.
 *
 * SCOPE IS IN THE QUERY, NOT THE CALLER
 * -------------------------------------
 * `propertiesForPartner(partnerId)` returns that partner's rows and no
 * others; `publishedPropertiesFor(destinationId)` returns only PUBLISHED rows
 * of that destination. A page cannot widen either by passing a different
 * argument, because the argument comes from the session or the URL segment
 * the page already owns — never from a form field.
 */

export type PartnerRow = typeof partners.$inferSelect;
export type PropertyRow = typeof partnerProperties.$inferSelect;
export type AgreementRow = typeof partnerAgreements.$inferSelect;

/**
 * What a traveller may see of a partner property: the property row plus the
 * partner's business telephone, which the application form says is shown
 * to travellers. Nothing else about the partner — no e-mail, no contact
 * name, no status history — leaves the partner and admin surfaces.
 */
export type PublicProperty = PropertyRow & { contactPhone: string | null };

const publicShape = { property: partnerProperties, contactPhone: partners.phone };
const toPublic = (row: { property: PropertyRow; contactPhone: string | null }): PublicProperty => ({
  ...row.property,
  contactPhone: row.contactPhone,
});

/**
 * A listing is valid for travellers only while it is PUBLISHED and its vendor
 * is still verified. The database unpublishes a de-verified vendor's listings
 * (drizzle/sql/0002); this second condition keeps a page honest in the moment
 * between the two.
 */
const vendorIsVerified = inArray(partners.status, ["VERIFIED", "APPROVED"]);

/** Travellers: the verified, published partner stays of one destination. */
export async function publishedPropertiesFor(destinationId: string): Promise<PublicProperty[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select(publicShape)
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(and(eq(partnerProperties.destinationId, destinationId), eq(partnerProperties.status, "PUBLISHED"), vendorIsVerified))
    .orderBy(desc(partnerProperties.publishedAt));
  return rows.map(toPublic);
}

/** One published property, for its own page. Null unless published. */
export async function publishedProperty(destinationId: string, propertyId: string): Promise<PublicProperty | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .select(publicShape)
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(
      and(
        eq(partnerProperties.id, propertyId),
        eq(partnerProperties.destinationId, destinationId),
        eq(partnerProperties.status, "PUBLISHED"),
        vendorIsVerified,
      ),
    )
    .limit(1);
  return row ? toPublic(row) : null;
}

/** A partner's own dashboard. */
export async function partnerById(partnerId: string): Promise<PartnerRow | null> {
  if (!hasDatabase) return null;
  const [row] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
  return row ?? null;
}

export async function propertiesForPartner(partnerId: string): Promise<PropertyRow[]> {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(partnerProperties)
    .where(eq(partnerProperties.partnerId, partnerId))
    .orderBy(desc(partnerProperties.createdAt));
}

export async function agreementsForPartner(partnerId: string): Promise<AgreementRow[]> {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(partnerAgreements)
    .where(eq(partnerAgreements.partnerId, partnerId))
    .orderBy(desc(partnerAgreements.createdAt));
}

export interface ReferralSummary {
  propertyId: string;
  eventType: string;
  clicks: number;
  lastAt: Date | null;
}

/**
 * Referral activity for a partner's properties: outbound clicks by type.
 * Counted, never estimated; an empty list is "No referral activity yet".
 */
export async function referralSummaryForPartner(partnerId: string): Promise<ReferralSummary[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({
      propertyId: referralEvents.propertyId,
      eventType: referralEvents.eventType,
      clicks: count(referralEvents.id),
      lastAt: sql<Date | null>`max(${referralEvents.occurredAt})`,
    })
    .from(referralEvents)
    .innerJoin(partnerProperties, eq(referralEvents.propertyId, partnerProperties.id))
    .where(eq(partnerProperties.partnerId, partnerId))
    .groupBy(referralEvents.propertyId, referralEvents.eventType);
  return rows
    .filter((row): row is typeof row & { propertyId: string } => row.propertyId !== null)
    .map((row) => ({ ...row, clicks: Number(row.clicks) }));
}

/* ------------------------------------------------------------------ admin */

export interface QueueItem {
  property: PropertyRow;
  partner: PartnerRow;
}

/** Every request, newest first, for the review console. */
export async function reviewQueue(): Promise<QueueItem[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ property: partnerProperties, partner: partners })
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .orderBy(desc(partnerProperties.createdAt));
  return rows;
}

export async function reviewItem(propertyId: string): Promise<QueueItem | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .select({ property: partnerProperties, partner: partners })
    .from(partnerProperties)
    .innerJoin(partners, eq(partnerProperties.partnerId, partners.id))
    .where(eq(partnerProperties.id, propertyId))
    .limit(1);
  return row ?? null;
}

export async function auditTrailFor(propertyId: string) {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "partner_property"), eq(auditLogs.entityId, propertyId)))
    .orderBy(desc(auditLogs.at));
}

/** Referral clicks on a property, by type, for the console. */
export async function referralCountsForProperty(propertyId: string): Promise<{ eventType: string; clicks: number }[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ eventType: referralEvents.eventType, clicks: count(referralEvents.id) })
    .from(referralEvents)
    .where(eq(referralEvents.propertyId, propertyId))
    .groupBy(referralEvents.eventType);
  return rows.map((row) => ({ eventType: row.eventType, clicks: Number(row.clicks) }));
}
