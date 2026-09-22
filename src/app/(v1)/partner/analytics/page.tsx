import type { Metadata } from "next";

import { PlanLocked } from "@/components/partners/workspace/PlanLocked";
import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { buttonClasses } from "@/components/ui/Button";
import { analyticsForPartner } from "@/db/queries/partner-analytics";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { todayInKolkata } from "@/lib/partners/calendar";
import { allPlans, entitlementsFor } from "@/lib/subscriptions/access";
import { can, lowestPlanWith } from "@/lib/subscriptions/entitlements";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Real counts for the partner's listings. Gated on `viewAnalytics`: the page
 * does not even query the numbers for a plan without it.
 */
export default async function PartnerAnalyticsPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/analytics");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/analytics" />;
  const { partner } = access;
  const [entitlements, plans] = await Promise.all([entitlementsFor(partner.id), allPlans()]);

  if (!can(entitlements, "viewAnalytics")) {
    return (
      <WorkspaceShell partner={partner} current="/partner/analytics" t={t} title={t("analytics.title")}>
        <PlanLocked message={t("plan.locked", { feature: t("plan.feature.viewAnalytics"), plan: lowestPlanWith(plans, "viewAnalytics")?.name ?? "" })} cta={t("plan.lockedCta")} />
      </WorkspaceShell>
    );
  }

  const rows = await analyticsForPartner(partner.id, todayInKolkata(new Date()));
  const reports = can(entitlements, "advancedReports");
  const metrics = [
    { key: "clicks", label: t("analytics.clicks") },
    { key: "holdsCreated", label: t("analytics.holds") },
    { key: "roomNightsOpen", label: t("analytics.open") },
    { key: "roomNightsHeld", label: t("analytics.held") },
    { key: "roomNightsBooked", label: t("analytics.booked") },
  ] as const;

  return (
    <WorkspaceShell
      partner={partner}
      current="/partner/analytics"
      t={t}
      title={t("analytics.title")}
      lede={t("analytics.lede")}
      actions={
        reports ? (
          <a href="/partner/reports/reservations" className={buttonClasses({ variant: "outline", size: "sm" })} download>
            {t("analytics.report")}
          </a>
        ) : null
      }
    >
      {!reports ? (
        <p className="mb-6 text-small text-muted" data-reports-locked>{t("analytics.reportLocked", { plan: lowestPlanWith(plans, "advancedReports")?.name ?? "" })}</p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-body text-muted">{t("analytics.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.listingId} className="rounded-xl border border-border bg-surface p-5" data-analytics={row.listingId}>
              <h2 className="font-display text-h4">{row.name}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {metrics.map((metric) => (
                  <div key={metric.key} className="min-w-0">
                    <dt className="text-caption text-subtle">{metric.label}</dt>
                    <dd className="mt-0.5 font-mono text-h4" data-numeric data-metric={metric.key}>{row[metric.key]}</dd>
                    {metric.key === "holdsCreated" && row.holdsReleased > 0 ? (
                      <dd className="text-caption text-subtle" data-numeric>{row.holdsReleased} {t("analytics.released")}</dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-small text-muted">{t("analytics.noRevenue")}</p>
    </WorkspaceShell>
  );
}
