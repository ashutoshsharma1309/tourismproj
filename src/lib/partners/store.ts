import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { partnerProperties, partners, referralEvents } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";
import { canTransition, type PropertyStatus } from "@/lib/partners/lifecycle";
import type { PartnershipRequest, ReferralEventInput } from "@/lib/partners/schema";

/**
 * Every write to the partner programme, audited (CLAUDE.md §2 R7).
 *
 * Reads live in db/queries/partners.ts; this file is the only place a row
 * changes, so the audit trail is complete by construction. Each write is
 * either idempotent (a second submission from the same e-mail updates the
 * partner record and adds a property; a duplicate property name in the same
 * destination is refused) or a status transition the lifecycle allows.
 */

export type StoreResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createPartnershipRequest(
  input: PartnershipRequest,
): Promise<StoreResult<{ partnerId: string; propertyId: string }>> {
  if (!hasDatabase) {
    return { ok: false, error: "Partnership requests are not being accepted on this deployment yet." };
  }

  return db.transaction(async (tx) => {
    /* One partner per e-mail. A second request from the same address is the
       same organisation adding a property, so the contact details refresh. */
    const [partner] = await tx
      .insert(partners)
      .values({
        organizationName: input.organizationName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
      })
      .onConflictDoUpdate({
        target: partners.email,
        set: {
          organizationName: input.organizationName,
          contactName: input.contactName,
          /* A later request that leaves the telephone blank must not erase
             the one already on file: a reviewer may have verified it. */
          phone: sql`coalesce(excluded.phone, ${partners.phone})`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: partners.id });
    if (!partner) return { ok: false, error: "The partner record could not be saved." };

    const [existing] = await tx
      .select({ id: partnerProperties.id })
      .from(partnerProperties)
      .where(
        and(
          eq(partnerProperties.partnerId, partner.id),
          eq(partnerProperties.destinationId, input.destinationId),
          eq(partnerProperties.name, input.propertyName),
        ),
      )
      .limit(1);
    if (existing) {
      return { ok: false, error: "This property has already been submitted. It is in the review queue." };
    }

    const [property] = await tx
      .insert(partnerProperties)
      .values({
        partnerId: partner.id,
        destinationId: input.destinationId,
        name: input.propertyName,
        type: input.type,
        address: input.address,
        area: input.area,
        mapsUrl: input.mapsUrl,
        officialWebsite: input.officialWebsite,
        bookingUrl: input.bookingUrl,
        description: input.description,
        localCharacter: input.localCharacter,
        amenities: input.amenities,
        status: "PENDING",
        source: "partner-submission",
        provenance: { submittedAt: new Date().toISOString(), checks: [] },
      })
      .returning({ id: partnerProperties.id });
    if (!property) return { ok: false, error: "The property could not be saved." };

    await tx.insert(auditLogs).values({
      actorId: null,
      action: "partner_property.submitted",
      entityType: "partner_property",
      entityId: property.id,
      after: { status: "PENDING", partnerId: partner.id, destinationId: input.destinationId },
    });

    return { ok: true, data: { partnerId: partner.id, propertyId: property.id } };
  });
}

export interface TransitionInput {
  propertyId: string;
  to: PropertyStatus;
  actorId: string;
  note?: string | null;
  /** What the reviewer confirmed, appended to provenance on VERIFIED. */
  checks?: { field: string; method: string }[];
}

/**
 * Move a property along its lifecycle. Refuses a transition the machine
 * does not allow, and records who did what.
 */
export async function transitionProperty(input: TransitionInput): Promise<StoreResult<{ status: PropertyStatus; destinationId: string }>> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(partnerProperties)
      .where(eq(partnerProperties.id, input.propertyId))
      .limit(1)
      .for("update");
    if (!row) return { ok: false, error: "No such property." };
    const from = row.status as PropertyStatus;
    if (!canTransition(from, input.to)) {
      return { ok: false, error: `A property that is ${from} cannot become ${input.to}.` };
    }

    const now = new Date();
    const provenance = row.provenance ?? { submittedAt: row.createdAt.toISOString(), checks: [] };
    const checks =
      input.to === "VERIFIED"
        ? [
            ...(provenance.checks ?? []),
            ...(input.checks ?? []).map((c) => ({ ...c, at: now.toISOString() })),
          ]
        : provenance.checks ?? [];

    await tx
      .update(partnerProperties)
      .set({
        status: input.to,
        reviewerId: input.actorId,
        reviewNote: input.note ?? row.reviewNote,
        reviewedAt: now,
        publishedAt: input.to === "PUBLISHED" ? now : row.publishedAt,
        provenance: { ...provenance, checks },
        updatedAt: now,
      })
      .where(eq(partnerProperties.id, input.propertyId));

    /* The partner record follows its first property forward, so a dashboard
       can say "verified" or "approved" at the organisation level. */
    const partnerStatus =
      input.to === "REJECTED" ? "REJECTED"
      : input.to === "UNDER_REVIEW" ? "UNDER_REVIEW"
      : input.to === "VERIFIED" ? "VERIFIED"
      : input.to === "APPROVED" || input.to === "PUBLISHED" || input.to === "UNPUBLISHED" ? "APPROVED"
      : null;
    if (partnerStatus) {
      await tx.update(partners).set({ status: partnerStatus, updatedAt: now }).where(eq(partners.id, row.partnerId));
    }

    await tx.insert(auditLogs).values({
      actorId: input.actorId,
      action: `partner_property.${input.to.toLowerCase()}`,
      entityType: "partner_property",
      entityId: input.propertyId,
      before: { status: from },
      after: { status: input.to, note: input.note ?? null, checks: input.checks ?? [] },
    });

    return { ok: true, data: { status: input.to, destinationId: row.destinationId } };
  });
}

/** Correct a verified field. Audited with before/after. */
export async function editProperty(
  propertyId: string,
  actorId: string,
  patch: Partial<Pick<PartnershipRequest, "address" | "area" | "mapsUrl" | "officialWebsite" | "bookingUrl" | "description" | "localCharacter">>,
): Promise<StoreResult<null>> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  const [row] = await db.select().from(partnerProperties).where(eq(partnerProperties.id, propertyId)).limit(1);
  if (!row) return { ok: false, error: "No such property." };
  await db.update(partnerProperties).set({ ...patch, updatedAt: new Date() }).where(eq(partnerProperties.id, propertyId));
  await db.insert(auditLogs).values({
    actorId,
    action: "partner_property.edited",
    entityType: "partner_property",
    entityId: propertyId,
    before: Object.fromEntries(Object.keys(patch).map((k) => [k, (row as Record<string, unknown>)[k]])),
    after: patch,
  });
  return { ok: true, data: null };
}

/**
 * Record an outbound click. Nothing else: no amount, no booking, no
 * identity. Silently a no-op without a database, because a missing click
 * count must never break the link the traveller is following.
 */
export async function recordReferral(input: ReferralEventInput, sessionHash: string): Promise<void> {
  if (!hasDatabase) return;
  await db.insert(referralEvents).values({
    propertyId: input.propertyId ?? null,
    stayRef: input.stayRef ?? null,
    destinationId: input.destinationId,
    eventType: input.eventType,
    source: input.source,
    sessionHash,
  });
}
