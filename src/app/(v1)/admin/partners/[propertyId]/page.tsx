import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { EditControls, ReviewControls } from "@/components/partners/ReviewControls";
import { Badge } from "@/components/ui/Badge";
import { auditTrailFor, referralCountsForProperty, reviewItem } from "@/db/queries/partners";
import { requireAdmin } from "@/lib/auth/session";
import { getDestination } from "@/lib/destinations/registry";
import { PROPERTY_STATUS_LABEL, PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";

export const metadata: Metadata = { title: "Review property", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_LABEL: Record<string, string> = {
  OFFICIAL_WEBSITE: "Official website",
  BOOKING_LINK: "Booking page",
  CALL: "Telephone",
  MAPS: "Map",
};

function Row({ label, value, href }: { label: string; value: string | null | undefined; href?: boolean }) {
  return (
    <div>
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className="mt-0.5 text-small break-words">
        {value ? (
          href ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {value}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : value
        ) : (
          <span className="text-subtle">Not given</span>
        )}
      </dd>
    </div>
  );
}

/**
 * One property under review: everything the partner submitted, the
 * reviewer's controls, the referral counts, and the audit trail. The
 * external links open the partner's claimed channels so the reviewer can
 * check them — they are plain anchors, not ReferralLinks, because a
 * reviewer's visit is not a traveller's referral.
 */
export default async function AdminPropertyPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) notFound();
  const { propertyId } = await params;
  if (!UUID.test(propertyId)) notFound();

  const item = await reviewItem(propertyId);
  if (!item) notFound();
  const { property, partner } = item;
  const status = property.status as PropertyStatus;
  const [trail, referrals] = await Promise.all([auditTrailFor(propertyId), referralCountsForProperty(propertyId)]);
  const destination = getDestination(property.destinationId);
  const checks = property.provenance?.checks ?? [];

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          <Link href="/admin/partners" className="hover:underline">Review console</Link> · Property
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-balance-heading">{property.name}</h1>
          <Badge tone={PROPERTY_STATUS_TONE[status]}>{PROPERTY_STATUS_LABEL[status].label}</Badge>
        </div>
        <p className="mt-2 text-body text-muted">
          {ACCOMMODATION_LABEL[property.type]} · {destination?.name ?? property.destinationId}
          {property.area ? ` · ${property.area}` : ""}
        </p>
        {status === "PUBLISHED" ? (
          <Link href={`/destinations/${property.destinationId}/partner-stays/${property.id}`} className="mt-2 inline-block text-small font-medium text-primary hover:underline">
            View public page
          </Link>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div>
            <section className="rounded-xl border border-border p-5" aria-labelledby="submitted">
              <h2 id="submitted" className="font-display text-h4">What the partner submitted</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Row label="Organisation" value={partner.organizationName} />
                <Row label="Contact" value={`${partner.contactName} · ${partner.email}${partner.phone ? ` · ${partner.phone}` : ""}`} />
                <Row label="Address" value={property.address} />
                <Row label="Area" value={property.area} />
                <Row label="Official website" value={property.officialWebsite} href />
                <Row label="Booking page" value={property.bookingUrl} href />
                <Row label="Map" value={property.mapsUrl} href />
                <Row label="Amenities" value={property.amenities?.join(", ") || null} />
              </dl>
              <div className="mt-4">
                <p className="text-caption text-subtle">Description</p>
                <p className="mt-0.5 max-w-prose text-small leading-relaxed whitespace-pre-line">{property.description ?? <span className="text-subtle">Not given</span>}</p>
              </div>
              <div className="mt-4">
                <p className="text-caption text-subtle">Local character</p>
                <p className="mt-0.5 max-w-prose text-small leading-relaxed whitespace-pre-line">{property.localCharacter ?? <span className="text-subtle">Not given</span>}</p>
              </div>
            </section>

            <EditControls
              propertyId={property.id}
              values={{
                address: property.address,
                area: property.area,
                mapsUrl: property.mapsUrl,
                officialWebsite: property.officialWebsite,
                bookingUrl: property.bookingUrl,
                description: property.description,
                localCharacter: property.localCharacter,
              }}
            />

            <section className="mt-6 rounded-xl border border-border p-5" aria-labelledby="trail">
              <h2 id="trail" className="font-display text-h4">Audit trail</h2>
              {checks.length > 0 ? (
                <p className="mt-2 text-small text-muted">
                  Verified: {checks.map((c) => c.field).join(", ")}.
                </p>
              ) : null}
              {trail.length === 0 ? (
                <p className="mt-2 text-small text-muted">No recorded actions. Rows appear here as the request is submitted, reviewed and published.</p>
              ) : null}
              <ol className="mt-3 space-y-2">
                {trail.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap gap-x-3 text-small">
                    <span className="font-mono text-caption text-subtle" data-numeric>{entry.at.toISOString().replace("T", " ").slice(0, 16)}</span>
                    <span>{entry.action.replace("partner_property.", "")}</span>
                    <span className="text-muted">{entry.actorId ? `by ${entry.actorId.slice(0, 8)}` : "by the partner"}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside>
            <ReviewControls propertyId={property.id} status={status} />
            <section className="mt-6 rounded-xl border border-border p-5" aria-labelledby="refs">
              <h2 id="refs" className="font-display text-h4">Referral activity</h2>
              {referrals.length === 0 ? (
                <p className="mt-2 text-small text-muted">No referral activity yet.</p>
              ) : (
                <dl className="mt-2 space-y-1.5">
                  {referrals.map((r) => (
                    <div key={r.eventType} className="flex justify-between text-small">
                      <dt className="text-muted">{EVENT_LABEL[r.eventType] ?? r.eventType}</dt>
                      <dd className="font-mono" data-numeric>{r.clicks}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-2 text-caption text-subtle">Outbound clicks. A click is not a booking and carries no amount.</p>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
