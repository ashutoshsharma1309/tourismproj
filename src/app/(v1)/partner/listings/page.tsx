import type { Metadata } from "next";
import Link from "next/link";

import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { listingSummariesForPartner } from "@/db/queries/partner-inventory";
import { getDestination } from "@/lib/destinations/registry";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { todayInKolkata } from "@/lib/partners/calendar";
import { PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";
import { isVerifiedVendor, type VendorStatus } from "@/lib/partners/vendor";

export const metadata: Metadata = { title: "Listings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PartnerListingsPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/listings");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/listings" />;
  const { partner } = access;
  const status = partner.status as VendorStatus;
  const verified = isVerifiedVendor(status);
  const summaries = await listingSummariesForPartner(partner.id, todayInKolkata(new Date()));

  return (
    <WorkspaceShell
      partner={partner}
      current="/partner/listings"
      t={t}
      title={t("listings.title")}
      lede={t("listings.lede")}
      actions={
        verified ? (
          <Link href="/partner/listings/new" className={buttonClasses({ variant: "primary", size: "md" })}>
            {t("listings.new")}
          </Link>
        ) : null
      }
    >
      {!verified ? (
        <div className="mb-6 rounded-xl border border-border bg-surface-muted/40 p-5" role="note">
          <p className="font-medium">{t("listings.lockedTitle")}</p>
          <p className="mt-1 text-small leading-relaxed text-muted">{t("listings.lockedBody", { status: t(`vendor.${status}`).toLowerCase() })}</p>
        </div>
      ) : null}
      {summaries.length === 0 ? (
        <p className="text-body text-muted">{t("listings.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {summaries.map(({ listing, units }) => {
            const listingStatus = listing.status as PropertyStatus;
            return (
              <li key={listing.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{listing.name}</p>
                    <Badge tone={PROPERTY_STATUS_TONE[listingStatus]}>{t(`listing.${listingStatus}`)}</Badge>
                  </div>
                  <p className="mt-0.5 text-caption text-subtle">
                    {ACCOMMODATION_LABEL[listing.type]}, {getDestination(listing.destinationId)?.name ?? listing.destinationId}.{" "}
                    {units === 0 ? t("listings.noUnits") : t("listings.units", { count: units })}
                  </p>
                </div>
                <Link href={`/partner/listings/${listing.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                  {t("listings.open")}
                  <span className="sr-only">: {listing.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WorkspaceShell>
  );
}
