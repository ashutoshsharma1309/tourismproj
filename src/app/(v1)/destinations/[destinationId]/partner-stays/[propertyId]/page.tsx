import { ExternalLink, Globe, MapPin, Phone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import { Footer } from "@/components/layout/Footer";
import { ReferralLink } from "@/components/partners/ReferralLink";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { publishedProperty } from "@/db/queries/partners";
import { resolveDestinationOrNull } from "@/lib/destinations/resolve";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";

/**
 * One verified partner property, as a traveller sees it.
 *
 * Renders only a PUBLISHED row of the destination in the URL; any other
 * status, any other destination, or an unknown id is a 404 — the same
 * answer for "not published yet" and "does not exist", so the URL leaks
 * nothing about the review queue. Every action leads to the property's own
 * channel through a ReferralLink. There is no rate, availability or booking.
 *
 * WHY THIS ROUTE DOES NOT SET dynamicParams = false
 * Every other page under /destinations/[destinationId] refuses params it did
 * not generate. This one cannot: its property id is a database row a reviewer
 * publishes after the build, so a generated list would 404 every partner ever
 * approved. The destination segment is still refused — through the canonical
 * resolver, below — and qa:route-migration names this file as the one
 * runtime-published exception while qa:partners proves the 404s.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ destinationId: string; propertyId: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load({ destinationId, propertyId }: { destinationId: string; propertyId: string }) {
  const resolved = await resolveDestinationOrNull(destinationId);
  if (!resolved || !UUID.test(propertyId)) return null;
  const { destination } = resolved;
  const property = await publishedProperty(destinationId, propertyId);
  if (!property) return null;
  return { destination, property };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await load(await params);
  if (!data) return { title: "Stay not found" };
  return {
    title: `${data.property.name} — ${ACCOMMODATION_LABEL[data.property.type]}, ${data.destination.name}`,
    description: data.property.description?.slice(0, 155) ?? `${data.property.name}, a verified TerraStory partner in ${data.destination.name}.`,
    alternates: { canonical: `/destinations/${data.destination.id}/partner-stays/${data.property.id}` },
  };
}

export default async function PartnerStayPage({ params }: PageProps) {
  const data = await load(await params);
  if (!data) notFound();
  const { destination, property } = data;
  const ref = { destinationId: destination.id, propertyId: property.id };
  const tel = property.contactPhone ? property.contactPhone.replace(/[^\d+]/g, "") : null;

  return (
    <>
      <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destination.id}
          destinationName={destination.name}
          section="Stays"
          sectionHref={`/destinations/${destination.id}#stays`}
          current={property.name}
        />

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <ShieldCheck className="size-3" aria-hidden />
              TerraStory partner · verified
            </Badge>
            <span className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              {ACCOMMODATION_LABEL[property.type]}
            </span>
          </div>
          <h1 className="mt-3 font-display text-h1 text-balance-heading">{property.name}</h1>
          <p className="mt-3 flex items-start gap-1.5 text-body text-muted">
            <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              {property.address}
              {property.area ? ` · ${property.area}` : ""} · {destination.name}
            </span>
          </p>
        </header>

        {/* --------------------------------------------------------- actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {property.bookingUrl ? (
            <ReferralLink href={property.bookingUrl} eventType="BOOKING_LINK" {...ref} className={buttonClasses({ variant: "primary", size: "md" })}>
              <ExternalLink className="size-4" aria-hidden />
              Book on official website
            </ReferralLink>
          ) : property.officialWebsite ? (
            <ReferralLink href={property.officialWebsite} eventType="OFFICIAL_WEBSITE" {...ref} className={buttonClasses({ variant: "primary", size: "md" })}>
              <Globe className="size-4" aria-hidden />
              Book on official website
            </ReferralLink>
          ) : null}
          {tel ? (
            <ReferralLink href={`tel:${tel}`} eventType="CALL" newTab={false} {...ref} className={buttonClasses({ variant: "secondary", size: "md" })}>
              <Phone className="size-4" aria-hidden />
              Contact property
            </ReferralLink>
          ) : null}
          {property.mapsUrl ? (
            <ReferralLink href={property.mapsUrl} eventType="MAPS" {...ref} className={buttonClasses({ variant: "secondary", size: "md" })}>
              <MapPin className="size-4" aria-hidden />
              Open in Maps
            </ReferralLink>
          ) : null}
          {property.bookingUrl && property.officialWebsite ? (
            <ReferralLink href={property.officialWebsite} eventType="OFFICIAL_WEBSITE" {...ref} className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline">
              Official website
              <ExternalLink className="size-3.5" aria-hidden />
            </ReferralLink>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          You book with the property directly. TerraStory does not hold rates or availability, takes
          no payment and is not party to the booking.
        </p>

        {/* --------------------------------------------------------- content */}
        {property.description ? (
          <section className="mt-10" aria-labelledby="about">
            <h2 id="about" className="font-display text-h3">About the property</h2>
            <p className="mt-3 max-w-prose text-body leading-relaxed text-muted whitespace-pre-line">{property.description}</p>
          </section>
        ) : null}
        {property.localCharacter ? (
          <section className="mt-8" aria-labelledby="character">
            <h2 id="character" className="font-display text-h3">Its place in {destination.name}</h2>
            <p className="mt-3 max-w-prose text-body leading-relaxed text-muted whitespace-pre-line">{property.localCharacter}</p>
          </section>
        ) : null}
        {property.amenities && property.amenities.length > 0 ? (
          <section className="mt-8" aria-labelledby="amenities">
            <h2 id="amenities" className="font-display text-h3">Amenities</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {property.amenities.map((a) => (
                <li key={a} className="rounded-full border border-border px-3 py-1 text-small text-muted">{a}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10 rounded-xl border border-border bg-surface-muted/40 p-5" aria-labelledby="provenance">
          <h2 id="provenance" className="font-display text-h4">How this listing was verified</h2>
          <p className="mt-2 max-w-prose text-small leading-relaxed text-muted">
            The owner submitted these details and a TerraStory reviewer confirmed the property,
            its address and its official channels against public records before publishing.
            The description is the owner&rsquo;s own words, checked but not written by TerraStory.
            {property.publishedAt ? ` Published ${property.publishedAt.toISOString().slice(0, 10)}.` : ""}
          </p>
        </section>

        <p className="mt-10 text-small text-muted">
          Are you a property owner in {destination.name}?{" "}
          <Link href="/partner" className="font-medium text-primary hover:underline">Partner with TerraStory</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
