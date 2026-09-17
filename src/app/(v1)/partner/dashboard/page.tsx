import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { listingSummariesForPartner } from "@/db/queries/partner-inventory";
import { agreementsForPartner, referralSummaryForPartner } from "@/db/queries/partners";
import { getDestination } from "@/lib/destinations/registry";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { formatINR } from "@/lib/money";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { todayInKolkata } from "@/lib/partners/calendar";
import { PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";
import { isVerifiedVendor, type VendorStatus } from "@/lib/partners/vendor";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * A partner's overview: organisation status, each listing's review status,
 * whether its rooms and calendar are set up, referral activity and commercial
 * terms. The partner comes from the session (`partnerAccess` → `partnerFor`),
 * never from the URL, and every number is a count of real rows or absent.
 * Bookings are not shown because none exist yet; this page will not
 * pretend otherwise.
 */
export default async function PartnerDashboardPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/dashboard");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/dashboard" />;
  const { partner } = access;

  const today = todayInKolkata(new Date());
  const [summaries, agreements, referrals] = await Promise.all([
    listingSummariesForPartner(partner.id, today),
    agreementsForPartner(partner.id),
    referralSummaryForPartner(partner.id),
  ]);
  const vendorStatus = partner.status as VendorStatus;
  const verified = isVerifiedVendor(vendorStatus);
  const activeAgreements = agreements.filter((a) => a.status === "ACTIVE");

  return (
    <WorkspaceShell partner={partner} current="/partner/dashboard" t={t} title={t("overview.title")}>
      <section aria-labelledby="organisation" className="rounded-xl border border-border bg-surface p-5">
        <h2 id="organisation" className="text-small font-medium text-muted">{t("overview.verification")}</h2>
        <p className="mt-2 font-display text-h3">{t(`vendor.${vendorStatus}`)}</p>
        <p className="mt-1 max-w-prose text-body leading-relaxed text-muted">{t(`vendor.${vendorStatus}.detail`)}</p>
        {partner.verificationNote ? (
          <p className="mt-3 rounded-lg border border-border bg-surface-muted/40 p-3 text-small leading-relaxed">
            <span className="font-medium">{t("overview.reviewerNote")}</span> {partner.verificationNote}
          </p>
        ) : null}
        <Link href="/partner/verification" className="mt-3 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline">
          {t("overview.manageVerification")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <section className="mt-10" aria-labelledby="properties">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="properties" className="font-display text-h2">{t("overview.listings")}</h2>
          <Link href={verified ? "/partner/listings/new" : "/partner/apply"} className="text-small font-medium text-primary hover:underline">
            {verified ? t("overview.addListing") : t("overview.addProperty")}
          </Link>
        </div>
        {summaries.length === 0 ? <p className="mt-4 text-body text-muted">{t("overview.noListings")}</p> : null}
        <ul className="mt-4 space-y-4">
          {summaries.map(({ listing, units, openDays }) => {
            const status = listing.status as PropertyStatus;
            const destination = getDestination(listing.destinationId);
            const clicks = referrals.filter((r) => r.propertyId === listing.id);
            return (
              <li key={listing.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-h3">{listing.name}</h3>
                  <Badge tone={PROPERTY_STATUS_TONE[status]}>{t(`listing.${status}`)}</Badge>
                </div>
                <p className="mt-1 text-caption text-muted">
                  {ACCOMMODATION_LABEL[listing.type]}, {destination?.name ?? listing.destinationId}
                  {listing.area ? `, ${listing.area}` : ""}
                </p>
                <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">{t(`listing.${status}.detail`)}</p>
                {listing.reviewNote ? (
                  <p className="mt-2 rounded-lg border border-border bg-surface-muted/40 p-3 text-small leading-relaxed">
                    <span className="font-medium">{t("overview.reviewerNote")}</span> {listing.reviewNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/partner/listings/${listing.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                    {t("overview.manage")}
                  </Link>
                  {status === "PUBLISHED" ? (
                    <Link
                      href={`/destinations/${listing.destinationId}/partner-stays/${listing.id}`}
                      className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
                    >
                      {t("overview.seePublic")}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-caption text-subtle">{t("overview.inventory")}</p>
                    <p className="mt-1 text-small text-muted" data-testid="inventory-summary">
                      {units === 0 ? t("overview.noUnits") : t("overview.unitsSummary", { units, days: openDays })}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-subtle">{t("overview.referrals")}</p>
                    {clicks.length === 0 ? (
                      <p className="mt-1 text-small text-muted">{t("overview.noReferrals")}</p>
                    ) : (
                      <dl className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2">
                        {clicks.map((row) => (
                          <div key={row.eventType}>
                            <dt className="text-caption text-subtle">{t(`event.${row.eventType as "OFFICIAL_WEBSITE" | "BOOKING_LINK" | "CALL" | "MAPS"}`)}</dt>
                            <dd className="font-mono text-body" data-numeric>
                              {row.clicks} {row.clicks === 1 ? t("overview.click") : t("overview.clicks")}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className="mt-2 text-caption text-subtle">{t("overview.referralsNote")}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="terms">
        <h2 id="terms" className="font-display text-h2">{t("overview.terms")}</h2>
        {activeAgreements.length === 0 ? (
          <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">{t("overview.noTerms")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activeAgreements.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-surface p-4 text-body">
                <p className="font-medium">{a.type.replace(/_/g, " ").toLowerCase()}</p>
                <p className="mt-1 text-small text-muted">
                  {[
                    a.commissionBps !== null ? t("overview.commission", { percent: a.commissionBps / 100 }) : null,
                    a.feePaise !== null ? t("overview.fee", { amount: formatINR(a.feePaise) }) : null,
                    a.validUntil ? t("overview.validUntil", { date: a.validUntil.toISOString().slice(0, 10) }) : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="what-next">
        <h2 id="what-next" className="font-display text-h3">{t("overview.next")}</h2>
        <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">{t("overview.nextBody")}</p>
      </section>
    </WorkspaceShell>
  );
}
