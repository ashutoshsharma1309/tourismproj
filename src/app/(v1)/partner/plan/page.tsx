import type { Metadata } from "next";
import { Check } from "lucide-react";

import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { usageForPartner } from "@/db/queries/partner-analytics";
import { partnerTranslator, type PartnerT } from "@/lib/i18n/partner-messages";
import { formatINR } from "@/lib/money";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { allPlans, entitlementsFor } from "@/lib/subscriptions/access";
import { FEATURES, type Entitlements } from "@/lib/subscriptions/entitlements";

export const metadata: Metadata = { title: "Plan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateOf = (at: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(at);

function stateLine(t: PartnerT, e: Entitlements, subscribedName: string | null): string {
  switch (e.state) {
    case "TRIALING":
      return t("plan.state.TRIALING", { date: e.endsAt ? dateOf(e.endsAt) : "" });
    case "ACTIVE":
      return e.endsAt ? t("plan.state.ACTIVE.until", { date: dateOf(e.endsAt) }) : t("plan.state.ACTIVE");
    case "PAST_DUE_GRACE":
      return t("plan.state.PAST_DUE_GRACE", { date: e.endsAt ? dateOf(e.endsAt) : "" });
    case "CANCELLING":
      return t("plan.state.CANCELLING", { date: e.endsAt ? dateOf(e.endsAt) : "" });
    case "LAPSED":
      return t("plan.state.LAPSED", { plan: subscribedName ?? "", current: e.planName });
    default:
      return t("plan.state.DEFAULT");
  }
}

/**
 * The partner's plan: what applies now, how much of each limit is used, and
 * every plan side by side from the plans table. Read-only — plan changes are
 * made by a reviewer while billing is not enabled.
 */
export default async function PartnerPlanPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/plan");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/plan" />;
  const { partner } = access;
  const [plans, entitlements, usage] = await Promise.all([allPlans(), entitlementsFor(partner.id), usageForPartner(partner.id)]);
  const subscribedName = plans.find((p) => p.code === entitlements.subscribedPlanCode)?.name ?? null;
  const usageRows = [
    { label: t("plan.usage.listings"), used: usage.listings, limit: entitlements.limits.listings },
    { label: t("plan.usage.roomTypes"), used: usage.maxRoomTypesOnAListing, limit: entitlements.limits.roomTypesPerListing },
    { label: t("plan.usage.team"), used: usage.teamMembers, limit: entitlements.limits.teamMembers },
  ];

  return (
    <WorkspaceShell partner={partner} current="/partner/plan" t={t} title={t("plan.title")} lede={t("plan.lede")}>
      <section aria-labelledby="current" className="rounded-xl border border-border bg-surface p-5" data-plan={entitlements.planCode} data-plan-state={entitlements.state}>
        <h2 id="current" className="text-small font-medium text-muted">{t("plan.current")}</h2>
        <p className="mt-1 font-display text-h2">{entitlements.planName}</p>
        <p className="mt-1 text-body text-muted">{stateLine(t, entitlements, subscribedName)}</p>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-small font-medium">{t("plan.usage")}</h3>
            <dl className="mt-2 space-y-2">
              {usageRows.map((row) => (
                <div key={row.label} className="flex flex-wrap justify-between gap-2 text-small">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-mono" data-numeric>
                    {row.limit === null ? t("plan.unlimited", { used: row.used }) : t("plan.of", { used: row.used, limit: row.limit })}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="text-small font-medium">{t("plan.features")}</h3>
            <ul className="mt-2 space-y-1.5">
              {FEATURES.map((feature) => {
                const on = entitlements.features.has(feature);
                return (
                  <li key={feature} className={on ? "flex items-center gap-2 text-small" : "flex items-center gap-2 text-small text-subtle line-through"}>
                    {on ? <Check className="size-4 text-success" aria-hidden /> : <span className="size-4" aria-hidden />}
                    {t(`plan.feature.${feature}`)}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="all-plans" className="mt-10">
        <h2 id="all-plans" className="font-display text-h2">{t("plan.all")}</h2>
        <p className="mt-2 max-w-prose text-small leading-relaxed text-muted">{t("plan.priceNote")}</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {plans.filter((p) => p.isActive).map((plan) => {
            const limits = plan.entitlements.limits;
            return (
              <li key={plan.code} className={plan.code === entitlements.planCode ? "rounded-xl border-2 border-primary bg-surface p-5" : "rounded-xl border border-border bg-surface p-5"}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-h3">{plan.name}</h3>
                  {plan.code === entitlements.planCode ? <Badge tone="jade">{t("plan.yours")}</Badge> : null}
                </div>
                <p className="mt-1 text-body" data-numeric>
                  {plan.monthlyPricePaise === null || plan.monthlyPricePaise === 0n ? t("plan.free") : t("plan.price", { amount: formatINR(plan.monthlyPricePaise) })}
                </p>
                <p className="mt-2 text-small leading-relaxed text-muted">{plan.summary}</p>
                <ul className="mt-3 space-y-1 text-small">
                  {limits.listings !== null && limits.listings !== undefined ? (
                    <li>{limits.listings === 1 ? t("plan.limit.listingsOne") : t("plan.limit.listings", { count: limits.listings })}</li>
                  ) : null}
                  {limits.roomTypesPerListing ? <li>{t("plan.limit.roomTypes", { count: limits.roomTypesPerListing })}</li> : null}
                  {limits.teamMembers ? <li>{t("plan.limit.team", { count: limits.teamMembers })}</li> : null}
                  {plan.entitlements.features.filter((f): f is (typeof FEATURES)[number] => (FEATURES as readonly string[]).includes(f)).map((f) => (
                    <li key={f} className="flex items-center gap-2"><Check className="size-3.5 text-success" aria-hidden />{t(`plan.feature.${f}`)}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
    </WorkspaceShell>
  );
}
