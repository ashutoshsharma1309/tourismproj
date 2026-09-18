import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ConsoleGate } from "@/components/government/ConsoleGate";
import { ConsoleShell } from "@/components/government/ConsoleShell";
import { supplyAnalytics } from "@/db/queries/government";
import { getDestination } from "@/lib/destinations/registry";
import { govAccess, govLanguage } from "@/lib/government/access";
import { canGov } from "@/lib/government/permissions";
import { govTranslator } from "@/lib/i18n/government-messages";
import { todayInKolkata } from "@/lib/partners/calendar";

export const metadata: Metadata = { title: "Government console", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Supply and verification in one jurisdiction. Every figure is a count of
 * rows inside the officer's destinations; a destination with nothing reports
 * zero, because "no verified supply here" is a finding, not an absence.
 */
export default async function GovernmentOverviewPage() {
  const t = govTranslator(await govLanguage());
  const access = await govAccess();
  if (access.kind !== "ok") return <ConsoleGate access={access} t={t} />;
  const { totals, byDestination } = canGov(access.role, "viewAnalytics")
    ? await supplyAnalytics(access.destinations, todayInKolkata(new Date()))
    : { totals: null, byDestination: [] };

  const cards = totals
    ? ([
        ["overview.vendors", totals.vendors],
        ["overview.verifiedVendors", totals.verifiedVendors],
        ["overview.publishedListings", totals.publishedListings],
        ["overview.listingsInReview", totals.listingsInReview],
        ["overview.roomTypes", totals.roomTypes],
        ["overview.roomNightsOpen", totals.roomNightsOpen],
        ["overview.reservationsStarted", totals.reservationsStarted],
        ["overview.publishedAdvisories", totals.publishedAdvisories],
      ] as const)
    : [];

  return (
    <ConsoleShell context={access} current="/government" t={t} title={t("overview.title")} lede={t("overview.lede")}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-border bg-surface p-4">
            <dt className="text-caption leading-snug text-subtle">{t(key)}</dt>
            <dd className="mt-1 font-mono text-h2" data-numeric data-metric={key.replace("overview.", "")}>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10" aria-labelledby="by-destination">
        <h2 id="by-destination" className="font-display text-h2">{t("overview.byDestination")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-md text-small">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-medium">{t("overview.destination")}</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">{t("overview.vendors")}</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">{t("overview.publishedListings")}</th>
                <th scope="col" className="py-2 text-right font-medium">{t("overview.roomNightsOpen")}</th>
              </tr>
            </thead>
            <tbody>
              {byDestination.map((row) => (
                <tr key={row.destinationId} className="border-b border-border" data-destination={row.destinationId}>
                  <th scope="row" className="py-2 pr-4 text-left font-normal">{getDestination(row.destinationId)?.name ?? row.destinationId}</th>
                  <td className="py-2 pr-4 text-right font-mono" data-numeric>{row.vendors}</td>
                  <td className="py-2 pr-4 text-right font-mono" data-numeric>{row.publishedListings}</td>
                  <td className="py-2 text-right font-mono" data-numeric>{row.roomNightsOpen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/government/queue" className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline">
          {t("overview.openQueue")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-8 space-y-2 rounded-xl border border-border bg-surface-muted/40 p-5">
        <p className="max-w-prose text-small leading-relaxed text-muted">{t("overview.noTraveller")}</p>
        <p className="max-w-prose text-small leading-relaxed text-muted">{t("overview.noPayments")}</p>
      </div>
    </ConsoleShell>
  );
}
