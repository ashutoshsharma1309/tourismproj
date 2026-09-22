import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { advisories, govMembers, partnerProperties } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";
import { isKnownDestination } from "@/lib/destinations/registry";
import { transitionProperty } from "@/lib/partners/store";

import type { GovContext } from "./access";
import { canGov, inScope } from "./permissions";

/**
 * Every write the government console makes, audited with the organisation
 * that made it.
 *
 * TWO CHECKS, ALWAYS
 * ------------------
 * The role must carry the capability, and the record must sit inside the
 * organisation's jurisdiction. Both are checked here, from the session's
 * context, and the jurisdiction check is repeated inside the partner store's
 * transaction for a verification decision — so a decision cannot be made on
 * another state's property even if this layer were bypassed.
 */

export type GovResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const OUT_OF_SCOPE = "That destination is outside your authority.";
const NOT_PERMITTED = "Your role does not include this.";

export interface AdvisoryInput {
  destinationId: string;
  kind: "PERMIT" | "WEATHER" | "CLOSURE" | "RESTRICTION" | "OTHER";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  body: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  source: string | null;
}

/** A verification decision within the officer's jurisdiction. */
export async function govDecide(
  context: GovContext,
  input: { propertyId: string; to: "UNDER_REVIEW" | "VERIFIED" | "APPROVED" | "PUBLISHED" | "UNPUBLISHED" | "REJECTED"; note: string | null; checks: string[] },
): Promise<GovResult<{ status: string; changed: boolean }>> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  if (!canGov(context.role, "decideVerification")) return { ok: false, error: NOT_PERMITTED };
  if ((input.to === "REJECTED" || input.to === "UNPUBLISHED") && !input.note) {
    return { ok: false, error: "Say why in the note: the partner reads it." };
  }
  const result = await transitionProperty({
    propertyId: input.propertyId,
    to: input.to,
    actorId: context.session.id,
    note: input.note,
    checks: input.checks.map((field) => ({ field, method: `verified by ${context.org.authority}` })),
    by: { role: "government", orgId: context.org.id, destinations: context.destinations },
  });
  if (!result.ok) return { ok: false, error: result.error };
  const { data: moved } = result;
  return { ok: true, data: { status: moved.status, changed: moved.changed } };
}

/**
 * Ask the partner for more information. This does not move the lifecycle —
 * inventing a state for "waiting on the applicant" would let a record sit
 * outside the machine — it records the request on the row and audits it, and
 * the partner sees the note and the date on their listing.
 */
export async function govRequestClarification(
  context: GovContext,
  propertyId: string,
  note: string,
): Promise<GovResult> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  if (!canGov(context.role, "requestClarification")) return { ok: false, error: NOT_PERMITTED };
  if (!note.trim()) return { ok: false, error: "Say what is needed: the partner reads this." };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: partnerProperties.id, destinationId: partnerProperties.destinationId, note: partnerProperties.reviewNote })
      .from(partnerProperties)
      .where(eq(partnerProperties.id, propertyId))
      .limit(1)
      .for("update");
    if (!row) return { ok: false, error: "No such property." };
    if (!inScope(context.destinations, row.destinationId)) return { ok: false, error: OUT_OF_SCOPE };
    const now = new Date();
    await tx
      .update(partnerProperties)
      .set({ reviewNote: note, clarificationRequestedAt: now, reviewerId: context.session.id, updatedAt: now })
      .where(eq(partnerProperties.id, propertyId));
    await tx.insert(auditLogs).values({
      actorId: context.session.id,
      action: "partner_property.clarification_requested",
      entityType: "partner_property",
      entityId: propertyId,
      before: { note: row.note },
      after: { note, orgId: context.org.id, by: "government" },
    });
    return { ok: true, data: null };
  });
}

/* ------------------------------------------------------------- advisories */

function advisoryProblem(context: GovContext, input: AdvisoryInput): string | null {
  if (!canGov(context.role, "manageAdvisories")) return NOT_PERMITTED;
  if (!isKnownDestination(input.destinationId) || !inScope(context.destinations, input.destinationId)) return OUT_OF_SCOPE;
  if (!input.title.trim()) return "An advisory needs a title.";
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) return "The advisory must end after it starts.";
  return null;
}

/** Drafted, never published by writing it: publication is a separate, audited act. */
export async function createAdvisory(context: GovContext, input: AdvisoryInput): Promise<GovResult<{ advisoryId: string }>> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  const problem = advisoryProblem(context, input);
  if (problem) return { ok: false, error: problem };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(advisories)
      .values({
        destinationId: input.destinationId,
        kind: input.kind,
        severity: input.severity,
        title: input.title.trim(),
        body: input.body,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        source: input.source ?? context.org.authority,
        orgId: context.org.id,
        status: "DRAFT",
        createdBy: context.session.id,
      })
      .returning({ id: advisories.id });
    if (!row) return { ok: false, error: "The advisory could not be saved." };
    await tx.insert(auditLogs).values({
      actorId: context.session.id,
      action: "advisory.drafted",
      entityType: "advisory",
      entityId: row.id,
      after: { destinationId: input.destinationId, kind: input.kind, severity: input.severity, title: input.title.trim(), orgId: context.org.id },
    });
    return { ok: true, data: { advisoryId: row.id } };
  });
}

/** Publish or withdraw an advisory this organisation issued. Idempotent. */
export async function setAdvisoryStatus(
  context: GovContext,
  advisoryId: string,
  to: "PUBLISHED" | "WITHDRAWN",
): Promise<GovResult<{ changed: boolean }>> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  if (!canGov(context.role, "manageAdvisories")) return { ok: false, error: NOT_PERMITTED };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(advisories)
      .where(and(eq(advisories.id, advisoryId), eq(advisories.orgId, context.org.id)))
      .limit(1)
      .for("update");
    if (!row) return { ok: false, error: "No such advisory." };
    if (!inScope(context.destinations, row.destinationId)) return { ok: false, error: OUT_OF_SCOPE };
    if (row.status === to) return { ok: true, data: { changed: false } };
    const now = new Date();
    await tx
      .update(advisories)
      .set({ status: to, publishedAt: to === "PUBLISHED" ? now : row.publishedAt, updatedAt: now })
      .where(eq(advisories.id, advisoryId));
    await tx.insert(auditLogs).values({
      actorId: context.session.id,
      action: to === "PUBLISHED" ? "advisory.published" : "advisory.withdrawn",
      entityType: "advisory",
      entityId: advisoryId,
      before: { status: row.status },
      after: { status: to, orgId: context.org.id },
    });
    return { ok: true, data: { changed: true } };
  });
}

/* ------------------------------------------------------------------- team */

export async function addGovMember(context: GovContext, email: string, role: "REVIEWER" | "MANAGER"): Promise<GovResult> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  if (!canGov(context.role, "manageTeam")) return { ok: false, error: NOT_PERMITTED };
  const address = email.trim().toLowerCase();
  try {
    return await db.transaction(async (tx) => {
      const [member] = await tx
        .insert(govMembers)
        .values({ orgId: context.org.id, email: address, role, invitedBy: context.session.id })
        .onConflictDoNothing({ target: govMembers.email })
        .returning({ id: govMembers.id });
      if (!member) {
        const [existing] = await tx.select({ orgId: govMembers.orgId }).from(govMembers).where(eq(govMembers.email, address)).limit(1);
        return existing?.orgId === context.org.id
          ? { ok: true, data: null }
          : { ok: false, error: "That address already belongs to another organisation." };
      }
      await tx.insert(auditLogs).values({
        actorId: context.session.id,
        action: "gov_member.added",
        entityType: "gov_member",
        entityId: member.id,
        after: { orgId: context.org.id, role },
      });
      return { ok: true, data: null };
    });
  } catch (error) {
    const e = error as { constraint_name?: string; cause?: { constraint_name?: string } };
    if ((e.constraint_name ?? e.cause?.constraint_name) === "gov_members_not_partner") {
      return { ok: false, error: "That address belongs to a partner organisation." };
    }
    throw error;
  }
}

export async function removeGovMember(context: GovContext, memberId: string): Promise<GovResult> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  if (!canGov(context.role, "manageTeam")) return { ok: false, error: NOT_PERMITTED };
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ id: govMembers.id, userId: govMembers.userId }).from(govMembers).where(and(eq(govMembers.id, memberId), eq(govMembers.orgId, context.org.id))).limit(1);
    if (!row) return { ok: true, data: null };
    /* An organisation always keeps someone who can manage it. */
    const managers = await tx.select({ id: govMembers.id }).from(govMembers).where(and(eq(govMembers.orgId, context.org.id), inArray(govMembers.role, ["MANAGER"])));
    if (managers.length === 1 && managers[0]?.id === memberId) {
      return { ok: false, error: "An organisation must keep at least one manager." };
    }
    await tx.delete(govMembers).where(eq(govMembers.id, memberId));
    await tx.insert(auditLogs).values({
      actorId: context.session.id,
      action: "gov_member.removed",
      entityType: "gov_member",
      entityId: memberId,
      before: { orgId: context.org.id },
    });
    return { ok: true, data: null };
  });
}
