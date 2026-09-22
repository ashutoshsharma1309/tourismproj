import type { Metadata } from "next";
import Link from "next/link";

import { copyFor } from "@/components/partners/workspace/copy";
import { NewListingForm } from "@/components/partners/workspace/ListingForms";
import { PlanLocked } from "@/components/partners/workspace/PlanLocked";
import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { listDestinations } from "@/lib/destinations/registry";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { ACCOMMODATION_LABEL, ACCOMMODATION_TYPES } from "@/lib/partners/schema";
import { isVerifiedVendor, type VendorStatus } from "@/lib/partners/vendor";
import { usageForPartner } from "@/db/queries/partner-analytics";
import { entitlementsFor } from "@/lib/subscriptions/access";
import { can, withinLimit } from "@/lib/subscriptions/entitlements";

export const metadata: Metadata = { title: "New listing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const FORM_KEYS = [
  "detail.facts", "detail.about", "field.name", "field.type", "field.destination", "field.area", "field.address",
  "field.mapsUrl", "field.officialWebsite", "field.bookingUrl", "field.description", "field.localCharacter",
  "field.amenities", "field.amenitiesHint", "field.checkInFrom", "field.checkOutBy", "field.houseRules",
  "field.cancellationTerms", "field.cancellationHint", "field.choose", "listings.create", "listings.creating",
] as const;

/** Only a verified vendor sees the form; the store refuses anyone else regardless. */
export default async function NewListingPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/listings/new");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/listings/new" />;
  const { partner } = access;
  const status = partner.status as VendorStatus;
  const [entitlements, usage] = await Promise.all([entitlementsFor(partner.id), usageForPartner(partner.id)]);
  const planAllows = can(entitlements, "createListing") && withinLimit(entitlements, "listings", usage.listings);

  return (
    <WorkspaceShell partner={partner} current="/partner/listings" t={t} title={t("listings.newTitle")} lede={t("listings.newLede")}>
      {isVerifiedVendor(status) && !planAllows ? (
        <PlanLocked message={t("plan.limitReached", { plan: entitlements.planName })} cta={t("plan.lockedCta")} />
      ) : isVerifiedVendor(status) ? (
        <NewListingForm
          copy={copyFor(t, FORM_KEYS)}
          destinations={listDestinations().map((d) => ({ value: d.id, label: `${d.name}, ${d.region?.name ?? d.country.name}` }))}
          types={ACCOMMODATION_TYPES.map((type) => ({ value: type, label: ACCOMMODATION_LABEL[type] }))}
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface-muted/40 p-5" role="note">
          <p className="font-medium">{t("listings.lockedTitle")}</p>
          <p className="mt-1 text-small leading-relaxed text-muted">{t("listings.lockedBody", { status: t(`vendor.${status}`).toLowerCase() })}</p>
          <Link href="/partner/verification" className="mt-3 inline-block text-small font-medium text-primary hover:underline">
            {t("overview.manageVerification")}
          </Link>
        </div>
      )}
    </WorkspaceShell>
  );
}
