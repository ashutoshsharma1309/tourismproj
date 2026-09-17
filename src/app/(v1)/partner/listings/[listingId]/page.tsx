import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { copyFor } from "@/components/partners/workspace/copy";
import { paiseToRupeeInput } from "@/lib/booking/stay";
import { ListingDetailsForm, MoveListingForm } from "@/components/partners/workspace/ListingForms";
import { AddUnitForm, EditUnitForm } from "@/components/partners/workspace/UnitForms";
import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { listingForPartner, unitsForPartnerListing } from "@/db/queries/partner-inventory";
import { getDestination } from "@/lib/destinations/registry";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";
import { isVerifiedVendor, partnerMayMove, type VendorStatus } from "@/lib/partners/vendor";

export const metadata: Metadata = { title: "Manage listing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DETAIL_KEYS = [
  "field.description", "field.localCharacter", "field.amenities", "field.amenitiesHint", "field.checkInFrom",
  "field.checkOutBy", "field.houseRules", "field.cancellationTerms", "field.cancellationHint", "detail.save", "detail.saving",
] as const;
const UNIT_KEYS = [
  "field.unitName", "field.unitNameHint", "field.capacity", "field.quantity", "detail.addUnit", "detail.adding",
  "detail.saveUnit", "detail.deleteUnit", "field.basePrice", "field.basePriceHint", "detail.noRate",
] as const;

function Fact({ label, value, missing }: { label: string; value: string | null; missing: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className="mt-0.5 text-small break-words">{value ?? <span className="text-subtle">{missing}</span>}</dd>
    </div>
  );
}

/**
 * One listing, for its owner: review status and the publish control, the
 * verified facts (read-only), the descriptive details the partner keeps
 * current, and its room types. Another partner's listing id answers 404 —
 * the query is scoped to the session's partner.
 */
export default async function PartnerListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const next = `/partner/listings/${listingId}`;
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess(next);
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next={next} />;
  const { partner } = access;
  if (!UUID.test(listingId)) notFound();
  const [listing, units] = await Promise.all([listingForPartner(partner.id, listingId), unitsForPartnerListing(partner.id, listingId)]);
  if (!listing) notFound();

  const status = listing.status as PropertyStatus;
  const verified = isVerifiedVendor(partner.status as VendorStatus);
  const move = status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
  const canMove = partnerMayMove(status, move) && (move === "UNPUBLISHED" || verified);
  const missing = t("field.notGiven");

  return (
    <WorkspaceShell partner={partner} current="/partner/listings" t={t} title={listing.name}>
      <section aria-labelledby="status" className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="status" className="text-small font-medium text-muted">{t("detail.status")}</h2>
          <Badge tone={PROPERTY_STATUS_TONE[status]}>{t(`listing.${status}`)}</Badge>
        </div>
        <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">{t(`listing.${status}.detail`)}</p>
        {listing.reviewNote ? (
          <p className="mt-2 rounded-lg border border-border bg-surface-muted/40 p-3 text-small leading-relaxed">
            <span className="font-medium">{t("overview.reviewerNote")}</span> {listing.reviewNote}
          </p>
        ) : null}
        <div className="mt-4">
          {canMove ? (
            <MoveListingForm copy={copyFor(t, ["detail.publish", "detail.unpublish"])} listingId={listing.id} to={move} />
          ) : status !== "PUBLISHED" ? (
            <p className="text-small text-subtle">{t("detail.publishLocked")}</p>
          ) : null}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="facts">
          <h2 id="facts" className="font-display text-h3">{t("detail.facts")}</h2>
          <p className="mt-1 text-small leading-relaxed text-muted">{t("detail.factsNote")}</p>
          <dl className="mt-4 grid gap-4 rounded-xl border border-border p-5 sm:grid-cols-2">
            <Fact label={t("field.type")} value={ACCOMMODATION_LABEL[listing.type]} missing={missing} />
            <Fact label={t("field.destination")} value={getDestination(listing.destinationId)?.name ?? listing.destinationId} missing={missing} />
            <div className="sm:col-span-2"><Fact label={t("field.address")} value={listing.address} missing={missing} /></div>
            <Fact label={t("field.area")} value={listing.area} missing={missing} />
            <Fact label={t("field.mapsUrl")} value={listing.mapsUrl} missing={missing} />
            <Fact label={t("field.officialWebsite")} value={listing.officialWebsite} missing={missing} />
            <Fact label={t("field.bookingUrl")} value={listing.bookingUrl} missing={missing} />
          </dl>
        </section>

        <section aria-labelledby="about">
          <h2 id="about" className="font-display text-h3">{t("detail.about")}</h2>
          <div className="mt-4">
            <ListingDetailsForm
              copy={copyFor(t, DETAIL_KEYS)}
              listingId={listing.id}
              initial={{
                description: listing.description ?? "",
                localCharacter: listing.localCharacter ?? "",
                amenities: (listing.amenities ?? []).join(", "),
                checkInFrom: listing.checkInFrom ?? "",
                checkOutBy: listing.checkOutBy ?? "",
                houseRules: listing.houseRules ?? "",
                cancellationTerms: listing.cancellationTerms ?? "",
              }}
            />
          </div>
        </section>
      </div>

      <section aria-labelledby="units" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="units" className="font-display text-h2">{t("detail.units")}</h2>
          {units.length > 0 ? (
            <Link href={`/partner/calendar?listing=${listing.id}&unit=${units[0]?.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
              {t("detail.openCalendar")}
            </Link>
          ) : null}
        </div>
        <p className="mt-1 max-w-prose text-small leading-relaxed text-muted">{t("detail.unitsLede")}</p>
        <p className="mt-1 max-w-prose text-caption text-subtle">{t("detail.notVisible")}</p>
        {units.length === 0 ? <p className="mt-4 text-body text-muted">{t("detail.noUnits")}</p> : null}
        <ul className="mt-4 space-y-3">
          {units.map((unit) => (
            <li key={unit.id}>
              <EditUnitForm copy={copyFor(t, UNIT_KEYS)} unit={{ id: unit.id, name: unit.name, capacity: unit.capacity, totalQuantity: unit.totalQuantity, basePrice: paiseToRupeeInput(unit.basePricePaise) }} />
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <AddUnitForm copy={copyFor(t, UNIT_KEYS)} listingId={listing.id} />
        </div>
      </section>
    </WorkspaceShell>
  );
}
