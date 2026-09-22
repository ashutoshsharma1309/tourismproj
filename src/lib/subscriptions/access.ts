import "server-only";

import { asc, eq } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { partnerSubscriptions, plans } from "@/db/schema";

import { resolveEntitlements, type Entitlements, type PlanRow, type SubscriptionRow } from "./entitlements";

type Runner = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function allPlans(runner: Runner = db): Promise<(PlanRow & typeof plans.$inferSelect)[]> {
  if (!hasDatabase) return [];
  return runner.select().from(plans).orderBy(asc(plans.sortOrder));
}

export async function subscriptionFor(partnerId: string, runner: Runner = db) {
  if (!hasDatabase) return null;
  const [row] = await runner.select().from(partnerSubscriptions).where(eq(partnerSubscriptions.partnerId, partnerId)).limit(1);
  return row ?? null;
}

/**
 * A partner's entitlements, read in the caller's transaction when one is
 * given — so a gate and the write it guards see the same subscription.
 */
export async function entitlementsFor(partnerId: string, runner: Runner = db, now = new Date()): Promise<Entitlements> {
  const [planRows, sub] = await Promise.all([allPlans(runner), subscriptionFor(partnerId, runner)]);
  return resolveEntitlements(planRows, sub as SubscriptionRow | null, now);
}
