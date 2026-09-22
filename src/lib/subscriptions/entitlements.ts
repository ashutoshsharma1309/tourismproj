/**
 * ★ The one place that decides what a partner's plan allows.
 *
 * Every gate in the product calls `can()` or `withinLimit()` with an
 * `Entitlements` built here. Nothing else compares plan codes, so reshaping a
 * plan is a data change (drizzle/sql/0004) and a new gate is a new feature
 * name — never an `if (plan === "PRO")` somewhere in a page.
 *
 * WHAT COUNTS AS "ON A PLAN"
 * --------------------------
 *   TRIALING  until `trialEndsAt`
 *   ACTIVE    until `currentPeriodEnd` (open-ended when there is none)
 *   PAST_DUE  keeps the plan for a short grace period after the period ends
 *   CANCELLED keeps the plan until the period it was paid for ends
 *   EXPIRED   never
 * Anything not on a plan falls back to the DEFAULT plan (Free). Expiry is
 * computed from dates on every check, so a subscription whose date has passed
 * is restricted at once, whether or not a sweep has rewritten its status.
 *
 * Restriction never removes what exists: a partner above a limit keeps every
 * listing, room type, hold and booking, and simply cannot add more.
 */

export const FEATURES = ["createListing", "manageInventory", "viewAnalytics", "addTeamMembers", "advancedReports"] as const;
export type Feature = (typeof FEATURES)[number];
export type LimitName = "listings" | "roomTypesPerListing" | "teamMembers";

export const PAST_DUE_GRACE_DAYS = 7;

export interface PlanRow {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  entitlements: { features: string[]; limits: Partial<Record<LimitName, number | null>> };
}

export interface SubscriptionRow {
  planCode: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export type EffectiveState = "DEFAULT" | "TRIALING" | "ACTIVE" | "PAST_DUE_GRACE" | "CANCELLING" | "LAPSED";

export interface Entitlements {
  /** The plan whose features apply right now. */
  planCode: string;
  planName: string;
  /** The plan the partner is subscribed to, even if it no longer applies. */
  subscribedPlanCode: string | null;
  state: EffectiveState;
  features: ReadonlySet<Feature>;
  limits: Record<LimitName, number | null>;
  /** When the current entitlement stops applying, if it does. */
  endsAt: Date | null;
}

const DAY = 86_400_000;

function isFeature(value: string): value is Feature {
  return (FEATURES as readonly string[]).includes(value);
}

function fromPlan(plan: PlanRow): Pick<Entitlements, "features" | "limits"> {
  const limits = plan.entitlements.limits ?? {};
  return {
    features: new Set(plan.entitlements.features.filter(isFeature)),
    limits: {
      listings: limits.listings ?? null,
      roomTypesPerListing: limits.roomTypesPerListing ?? null,
      teamMembers: limits.teamMembers ?? null,
    },
  };
}

/** Is a subscription still entitled to its plan at `now`? And until when? */
export function subscriptionState(sub: SubscriptionRow, now: Date): { applies: boolean; state: EffectiveState; endsAt: Date | null } {
  const t = now.getTime();
  switch (sub.status) {
    case "TRIALING":
      return sub.trialEndsAt && sub.trialEndsAt.getTime() > t
        ? { applies: true, state: "TRIALING", endsAt: sub.trialEndsAt }
        : { applies: false, state: "LAPSED", endsAt: sub.trialEndsAt };
    case "ACTIVE":
      if (!sub.currentPeriodEnd) return { applies: true, state: "ACTIVE", endsAt: null };
      return sub.currentPeriodEnd.getTime() > t
        ? { applies: true, state: sub.cancelAtPeriodEnd ? "CANCELLING" : "ACTIVE", endsAt: sub.currentPeriodEnd }
        : { applies: false, state: "LAPSED", endsAt: sub.currentPeriodEnd };
    case "PAST_DUE": {
      const graceEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd.getTime() + PAST_DUE_GRACE_DAYS * DAY) : null;
      return graceEnd && graceEnd.getTime() > t
        ? { applies: true, state: "PAST_DUE_GRACE", endsAt: graceEnd }
        : { applies: false, state: "LAPSED", endsAt: graceEnd };
    }
    case "CANCELLED":
      return sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > t
        ? { applies: true, state: "CANCELLING", endsAt: sub.currentPeriodEnd }
        : { applies: false, state: "LAPSED", endsAt: sub.currentPeriodEnd };
    case "EXPIRED":
    default:
      return { applies: false, state: "LAPSED", endsAt: sub.currentPeriodEnd ?? sub.trialEndsAt };
  }
}

/**
 * The entitlements that apply now. Throws only if the plan table has no
 * default plan, which is a deployment error, not a partner's problem.
 */
export function resolveEntitlements(plans: PlanRow[], sub: SubscriptionRow | null, now: Date): Entitlements {
  const fallback = plans.find((p) => p.isDefault);
  if (!fallback) throw new Error("No default plan is configured (drizzle/sql/0004_subscriptions.sql).");
  if (sub) {
    const plan = plans.find((p) => p.code === sub.planCode);
    const { applies, state, endsAt } = subscriptionState(sub, now);
    if (plan && applies) {
      return { planCode: plan.code, planName: plan.name, subscribedPlanCode: sub.planCode, state, endsAt, ...fromPlan(plan) };
    }
    return { planCode: fallback.code, planName: fallback.name, subscribedPlanCode: sub.planCode, state: "LAPSED", endsAt, ...fromPlan(fallback) };
  }
  return { planCode: fallback.code, planName: fallback.name, subscribedPlanCode: null, state: "DEFAULT", endsAt: null, ...fromPlan(fallback) };
}

export function can(entitlements: Entitlements, feature: Feature): boolean {
  return entitlements.features.has(feature);
}

/** May one more be added, given how many exist? A null limit is no plan limit. */
export function withinLimit(entitlements: Entitlements, limit: LimitName, current: number): boolean {
  const max = entitlements.limits[limit];
  return max === null || current < max;
}

/** The cheapest active plan that includes a feature — for "available on Growth". */
export function lowestPlanWith(plans: PlanRow[], feature: Feature): PlanRow | null {
  return plans.filter((p) => p.isActive && p.entitlements.features.includes(feature))[0] ?? null;
}
