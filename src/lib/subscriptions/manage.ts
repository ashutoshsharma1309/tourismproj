import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { partnerMembers, partnerSubscriptions, partners, plans } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";
import type { PartnerMessageKey } from "@/lib/i18n/partner-messages";

import { entitlementsFor } from "./access";
import { can, withinLimit } from "./entitlements";

/**
 * Every write to subscriptions and teams, audited in the same transaction.
 *
 * A plan change touches ONLY the subscription row. Listings, room types,
 * availability, holds and bookings are never rewritten by it — a partner who
 * drops below a limit keeps what they have and cannot add more
 * (lib/subscriptions/entitlements.ts).
 */

const DAY = 86_400_000;

export interface AssignInput {
  partnerId: string;
  planCode: string;
  /** TRIAL uses the plan's trial length; ACTIVE runs until `periodEnd`, or open-ended. */
  mode: "TRIAL" | "ACTIVE";
  periodEnd: Date | null;
  note: string | null;
}

/** A reviewer puts a partner on a plan. Idempotent: the same assignment twice changes nothing. */
export async function assignSubscription(
  reviewerId: string,
  input: AssignInput,
  now = new Date(),
): Promise<{ ok: true; changed: boolean } | { ok: false; error: string }> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  return db.transaction(async (tx) => {
    const [partner] = await tx.select({ id: partners.id }).from(partners).where(eq(partners.id, input.partnerId)).limit(1).for("update");
    if (!partner) return { ok: false, error: "No such partner." };
    const [plan] = await tx.select().from(plans).where(and(eq(plans.code, input.planCode), eq(plans.isActive, true))).limit(1);
    if (!plan) return { ok: false, error: "No such plan." };
    if (input.mode === "TRIAL" && plan.trialDays === 0) return { ok: false, error: `${plan.name} has no trial.` };
    if (input.periodEnd && input.periodEnd.getTime() <= now.getTime()) return { ok: false, error: "The period must end in the future." };

    const [current] = await tx.select().from(partnerSubscriptions).where(eq(partnerSubscriptions.partnerId, input.partnerId)).limit(1).for("update");
    const next = {
      planCode: plan.code,
      status: input.mode === "TRIAL" ? ("TRIALING" as const) : ("ACTIVE" as const),
      trialEndsAt: input.mode === "TRIAL" ? new Date(now.getTime() + plan.trialDays * DAY) : null,
      currentPeriodStart: now,
      currentPeriodEnd: input.mode === "TRIAL" ? null : input.periodEnd,
      cancelAtPeriodEnd: false,
    };
    const same =
      current &&
      current.planCode === next.planCode &&
      current.status === next.status &&
      !current.cancelAtPeriodEnd &&
      (next.status === "TRIALING"
        ? current.trialEndsAt !== null && current.trialEndsAt.getTime() > now.getTime()
        : (current.currentPeriodEnd?.getTime() ?? null) === (next.currentPeriodEnd?.getTime() ?? null));
    if (same) return { ok: true, changed: false };

    const before = current ? { planCode: current.planCode, status: current.status, trialEndsAt: current.trialEndsAt, currentPeriodEnd: current.currentPeriodEnd } : null;
    if (current) {
      await tx
        .update(partnerSubscriptions)
        .set({ ...next, assignedBy: reviewerId, note: input.note, updatedAt: now })
        .where(eq(partnerSubscriptions.id, current.id));
    } else {
      await tx.insert(partnerSubscriptions).values({ partnerId: input.partnerId, ...next, assignedBy: reviewerId, note: input.note });
    }
    await tx.insert(auditLogs).values({
      actorId: reviewerId,
      action: "subscription.assigned",
      entityType: "partner",
      entityId: input.partnerId,
      before,
      after: { planCode: next.planCode, status: next.status, trialEndsAt: next.trialEndsAt, currentPeriodEnd: next.currentPeriodEnd, note: input.note },
    });
    return { ok: true, changed: true };
  });
}

/** End a subscription now (EXPIRED) or at the end of its period. Idempotent. */
export async function endSubscription(
  reviewerId: string,
  partnerId: string,
  when: "now" | "period-end",
  now = new Date(),
): Promise<{ ok: true; changed: boolean } | { ok: false; error: string }> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(partnerSubscriptions).where(eq(partnerSubscriptions.partnerId, partnerId)).limit(1).for("update");
    if (!current) return { ok: false, error: "This partner has no subscription; it is on the default plan." };
    if (when === "now") {
      if (current.status === "EXPIRED") return { ok: true, changed: false };
      await tx.update(partnerSubscriptions).set({ status: "EXPIRED", currentPeriodEnd: now, trialEndsAt: current.status === "TRIALING" ? now : current.trialEndsAt, updatedAt: now }).where(eq(partnerSubscriptions.id, current.id));
    } else {
      if (current.cancelAtPeriodEnd || current.status === "EXPIRED") return { ok: true, changed: false };
      if (!current.currentPeriodEnd && current.status !== "TRIALING") return { ok: false, error: "An open-ended subscription has no period end; end it now instead." };
      await tx.update(partnerSubscriptions).set({ cancelAtPeriodEnd: true, updatedAt: now }).where(eq(partnerSubscriptions.id, current.id));
    }
    await tx.insert(auditLogs).values({
      actorId: reviewerId,
      action: when === "now" ? "subscription.ended" : "subscription.cancel_at_period_end",
      entityType: "partner",
      entityId: partnerId,
      before: { planCode: current.planCode, status: current.status },
      after: { when },
    });
    return { ok: true, changed: true };
  });
}

type TeamResult = { ok: true } | { ok: false; error: PartnerMessageKey };

async function ownerOf(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], partnerId: string, actorId: string) {
  const [row] = await tx.select({ ownerUserId: partners.ownerUserId, email: partners.email }).from(partners).where(eq(partners.id, partnerId)).limit(1).for("update");
  return row && row.ownerUserId === actorId ? row : null;
}

/** The owner adds a staff member, within the plan's team limit. */
export async function addTeamMember(scope: { partnerId: string; actorId: string }, email: string): Promise<TeamResult> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  const address = email.trim().toLowerCase();
  try {
    return await db.transaction(async (tx) => {
      const owner = await ownerOf(tx, scope.partnerId, scope.actorId);
      if (!owner) return { ok: false, error: "error.ownerOnly" };
      const plan = await entitlementsFor(scope.partnerId, tx);
      if (!can(plan, "addTeamMembers")) return { ok: false, error: "error.planFeature" };
      const [members] = await tx.select({ n: count() }).from(partnerMembers).where(eq(partnerMembers.partnerId, scope.partnerId));
      if (!withinLimit(plan, "teamMembers", Number(members?.n ?? 0))) return { ok: false, error: "error.planLimit" };
      if (address === owner.email.toLowerCase()) return { ok: false, error: "error.memberExists" };
      const [member] = await tx
        .insert(partnerMembers)
        .values({ partnerId: scope.partnerId, email: address, invitedBy: scope.actorId })
        .onConflictDoNothing({ target: partnerMembers.email })
        .returning({ id: partnerMembers.id });
      if (!member) {
        const [existing] = await tx.select({ partnerId: partnerMembers.partnerId }).from(partnerMembers).where(eq(partnerMembers.email, address)).limit(1);
        /* The same person added again to the same team: nothing to do. */
        return existing?.partnerId === scope.partnerId ? { ok: true } : { ok: false, error: "error.memberExists" };
      }
      await tx.insert(auditLogs).values({ actorId: scope.actorId, action: "partner_member.added", entityType: "partner_member", entityId: member.id, after: { partnerId: scope.partnerId, role: "STAFF" } });
      return { ok: true };
    });
  } catch (error) {
    const e = error as { constraint_name?: string; cause?: { constraint_name?: string } };
    if ((e.constraint_name ?? e.cause?.constraint_name) === "partner_members_not_owner") return { ok: false, error: "error.memberExists" };
    throw error;
  }
}

/** The owner removes a staff member. Removal is never gated by plan: a downgraded partner can always shrink the team. */
export async function removeTeamMember(scope: { partnerId: string; actorId: string }, memberId: string): Promise<TeamResult> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  return db.transaction(async (tx) => {
    if (!(await ownerOf(tx, scope.partnerId, scope.actorId))) return { ok: false, error: "error.ownerOnly" };
    const [removed] = await tx
      .delete(partnerMembers)
      .where(and(eq(partnerMembers.id, memberId), eq(partnerMembers.partnerId, scope.partnerId)))
      .returning({ id: partnerMembers.id });
    if (!removed) return { ok: true };
    await tx.insert(auditLogs).values({ actorId: scope.actorId, action: "partner_member.removed", entityType: "partner_member", entityId: removed.id, before: { partnerId: scope.partnerId } });
    return { ok: true };
  });
}
