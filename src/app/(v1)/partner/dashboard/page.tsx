import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(v1)/login/actions";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import {
  agreementsForPartner,
  partnerById,
  propertiesForPartner,
  referralSummaryForPartner,
} from "@/db/queries/partners";
import { currentUser, partnerFor } from "@/lib/auth/session";
import { getDestination } from "@/lib/destinations/registry";
import { formatINR } from "@/lib/money";
import { PROPERTY_STATUS_LABEL, PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  OFFICIAL_WEBSITE: "Official website",
  BOOKING_LINK: "Booking page",
  CALL: "Telephone",
  MAPS: "Map",
};

/**
 * A partner's own view: profile, verification status, listing status,
 * referral activity and commercial terms. Every row comes from queries
 * scoped by the partner id the session resolved to — never from a
 * parameter — and every number is a count of real events or plainly absent.
 */
export default async function PartnerDashboardPage() {
  const session = await currentUser();
  if (!session) redirect("/login?next=/partner/dashboard");

  const partnerSession = await partnerFor(session);
  if (!partnerSession) {
    return (
      <>
        <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
          <h1 className="font-display text-h1 text-balance-heading">No partnership request yet</h1>
          <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
            No partnership request is linked to <strong className="font-medium text-foreground">{session.email}</strong>.
            If you applied from a different address, sign in with that one; otherwise, list your property to begin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/partner/apply" className={buttonClasses({ variant: "primary", size: "md" })}>
              List your property
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <form action={signOut}>
              <button type="submit" className={buttonClasses({ variant: "secondary", size: "md" })}>Sign out</button>
            </form>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const [partner, properties, agreements, referrals] = await Promise.all([
    partnerById(partnerSession.partnerId),
    propertiesForPartner(partnerSession.partnerId),
    agreementsForPartner(partnerSession.partnerId),
    referralSummaryForPartner(partnerSession.partnerId),
  ]);
  if (!partner) redirect("/partner/apply");

  const activeAgreements = agreements.filter((a) => a.status === "ACTIVE");

  return (
    <>
      <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">Partner dashboard</p>
            <h1 className="mt-3 font-display text-h1 text-balance-heading">{partner.organizationName}</h1>
            <p className="mt-2 text-body text-muted">
              {partner.contactName} · {partner.email}{partner.phone ? ` · ${partner.phone}` : ""}
            </p>
          </div>
          <form action={signOut}>
            <button type="submit" className={buttonClasses({ variant: "secondary", size: "sm" })}>Sign out</button>
          </form>
        </div>

        {/* ---------------------------------------------------- properties */}
        <section className="mt-10" aria-labelledby="properties">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="properties" className="font-display text-h2">Your properties</h2>
            <Link href="/partner/apply" className="text-small font-medium text-primary hover:underline">
              Add another property
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {properties.map((property) => {
              const status = property.status as PropertyStatus;
              const destination = getDestination(property.destinationId);
              const clicks = referrals.filter((r) => r.propertyId === property.id);
              return (
                <li key={property.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-h3">{property.name}</h3>
                    <Badge tone={PROPERTY_STATUS_TONE[status]}>{PROPERTY_STATUS_LABEL[status].label}</Badge>
                  </div>
                  <p className="mt-1 text-caption text-muted">
                    {ACCOMMODATION_LABEL[property.type]} · {destination?.name ?? property.destinationId}
                    {property.area ? ` · ${property.area}` : ""}
                  </p>
                  <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
                    {PROPERTY_STATUS_LABEL[status].detail}
                  </p>
                  {property.reviewNote ? (
                    <p className="mt-2 rounded-lg border border-border bg-surface-muted/40 p-3 text-small leading-relaxed">
                      <span className="font-medium">Reviewer&rsquo;s note:</span> {property.reviewNote}
                    </p>
                  ) : null}
                  {status === "PUBLISHED" ? (
                    <Link
                      href={`/destinations/${property.destinationId}/partner-stays/${property.id}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
                    >
                      See it as travellers do
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  ) : null}

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-caption text-subtle">Referral activity</p>
                    {clicks.length === 0 ? (
                      <p className="mt-1 text-small text-muted">No referral activity yet.</p>
                    ) : (
                      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                        {clicks.map((row) => (
                          <div key={row.eventType}>
                            <dt className="text-caption text-subtle">{EVENT_LABEL[row.eventType] ?? row.eventType}</dt>
                            <dd className="font-mono text-body" data-numeric>
                              {row.clicks} {row.clicks === 1 ? "click" : "clicks"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className="mt-2 text-caption text-subtle">
                      Outbound clicks to your channels, counted from real events. A click is not a booking.
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------------------------------------------- agreements */}
        <section className="mt-10" aria-labelledby="terms">
          <h2 id="terms" className="font-display text-h2">Commercial terms</h2>
          {activeAgreements.length === 0 ? (
            <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
              No commercial agreement is in place. Being listed costs nothing; commission or referral
              fees apply only under terms you sign. We will propose terms once the property is published.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activeAgreements.map((a) => (
                <li key={a.id} className="rounded-xl border border-border bg-surface p-4 text-body">
                  <p className="font-medium">{a.type.replace(/_/g, " ").toLowerCase()}</p>
                  <p className="mt-1 text-small text-muted">
                    {a.commissionBps !== null ? `${a.commissionBps / 100}% commission` : ""}
                    {a.feePaise !== null ? `${formatINR(a.feePaise)} per qualifying referral` : ""}
                    {a.validUntil ? ` · valid until ${a.validUntil.toISOString().slice(0, 10)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10" aria-labelledby="what-next">
          <h2 id="what-next" className="font-display text-h3">What happens next</h2>
          <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">
            A reviewer verifies the property against public records and your official channels, then
            approves and publishes it. Travellers exploring your destination reach your own website,
            booking page or telephone from the page; TerraStory counts the click and takes nothing
            in between.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
