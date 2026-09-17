/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import {
  ExternalLink,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CapsuleStayDetail } from "@/components/stays/CapsuleStayDetail";
import { ReferralLink } from "@/components/partners/ReferralLink";
import credits from "@/data/generated/image-credits.json";
import { getCapsule, getCapsuleStays, getPlaces } from "@/lib/destinations/content";
import { getDestination } from "@/lib/destinations/registry";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import {
  CURATED_PROVENANCE,
  DISTRICT_META,
  curatedStays,
  getCuratedStay,
} from "@/data/curated-stays";
import { places } from "@/data/places";
import { stayImages } from "@/data/stay-images";
import { StayGallery } from "@/components/stays/StayGallery";
import { distanceKm } from "@/lib/geo";
import { SITE_URL } from "@/lib/constants";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

/**
 * A single graded stay.
 *
 * WHAT THIS PAGE WILL NOT DO
 * --------------------------
 * It will not describe the hotel. Nobody involved in this project has stayed
 * in any of these twenty-two properties, no licensed description exists to
 * quote, and an invented paragraph about "warm Sikkimese hospitality" would be
 * exactly the fabrication the rest of the archive is built to avoid. What the
 * page shows instead is everything the state register actually records, the
 * geography around the property, and the routes by which a visitor can reach
 * the hotel and ask it themselves.
 *
 * Where a photograph of the property could not be licensed, the frame says so
 * in words rather than borrowing a picture of somewhere else.
 */

const CAPABILITY = "stays" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  const items = curatedStays.map((stay) => ({ slug: stay.slug }));
  /*
   * Two corpora, two param lists. The register slugs belong to Sikkim — the
   * only destination with the `stays` capability, which is what `ids` holds.
   * Every OTHER destination gets a page per capsule stay, from its own
   * capsule, so a Delhi URL can never render a Sikkim hotel (the leak the
   * places route once had) and a capsule stay is never a 404.
   */
  const register = ids.flatMap((destinationId) =>
    items.map((item) => ({ destinationId, ...item })),
  );
  const capsule = await Promise.all(
    listDestinations()
      .filter((d) => d.id !== "sikkim")
      .map(async (d) => (await getCapsuleStays(d.id)).map((stay) => ({ destinationId: d.id, slug: stay.id }))),
  );
  return [...register, ...capsule.flat()];
}

/** The capsule branch of this route, shared by metadata and the page. */
async function capsuleStayFor(destinationId: string, slug: string) {
  if (destinationId === "sikkim") return null;
  const destination = getDestination(destinationId);
  if (!destination) return null;
  const stay = (await getCapsuleStays(destinationId)).find((s) => s.id === slug);
  if (!stay) return null;
  return { destination, stay };
}

interface PageProps {
  params: Promise<{ destinationId: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destinationId, slug } = await params;
  const capsule = await capsuleStayFor(destinationId, slug);
  if (capsule) {
    const summary = capsule.stay.summary.length > 155 ? `${capsule.stay.summary.slice(0, 152).trimEnd()}…` : capsule.stay.summary;
    return {
      title: `${capsule.stay.name} — ${capsule.stay.category}, ${capsule.destination.name}`,
      description: summary,
      alternates: { canonical: `${SITE_URL}/destinations/${destinationId}/stays/${slug}` },
    };
  }
  const stay = getCuratedStay(slug);
  if (!stay) return { title: "Stay not found" };

  return {
    title: `${stay.name} — ${stay.starCategory}, ${stay.district}`,
    description: `${stay.name} is graded ${stay.starCategory} by the Sikkim Tourism & Civil Aviation Department and listed in ${stay.district} district. Registration, contact and location as the state register records them.`,
    alternates: { canonical: `${SITE_URL}/destinations/${destinationId}/stays/${stay.slug}` },
  };
}

export default async function StayPage({ params }: PageProps) {
  const { destinationId, slug } = await params;

  const capsule = await capsuleStayFor(destinationId, slug);
  if (capsule) {
    const { destination, stay } = capsule;
    const placeRecords = await getPlaces(destinationId);
    /* Nearest catalogued places by straight line from the published
       coordinate. No coordinate, no list — a "nearby" computed from the city
       centre would be a claim about a location the source did not make. */
    const nearby = stay.coordinates
      ? placeRecords
          .filter((place) => place.coordinates)
          .map((place) => ({
            slug: place.slug,
            name: place.name,
            category: place.category,
            image: place.image,
            km: distanceKm(stay.coordinates!, place.coordinates!),
            href: (place as { detailHref?: string }).detailHref ?? `/destinations/${destinationId}/discover#place-${place.slug}`,
          }))
          .sort((a, b) => a.km - b.km)
          .slice(0, 4)
      : [];
    const record = await getCapsule(destinationId);
    const sources = (record?.sources ?? [])
      .filter((source) => stay.sourceIds.includes(source.id))
      .map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url }));
    const credit = stay.image
      ? ((credits as { localPath: string; attribution?: string; license?: string; licenseUrl?: string; commonsFilePage?: string }[]).find((c) => c.localPath === stay.image) ?? null)
      : null;
    return (
      <>
        <CapsuleStayDetail
          destinationId={destinationId}
          destinationName={destination.name}
          stay={stay}
          nearby={nearby}
          sources={sources}
          credit={credit}
        />
        <Footer />
      </>
    );
  }
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);
  const stay = getCuratedStay(slug);
  if (!stay) notFound();

  /* The property's own photographs, or none. A picture of somewhere else in
     the same district was shown here until it became clear that a caption
     saying "not this property" does not stop a photograph reading as one —
     and that the same photograph was illustrating up to three hotels. */
  const gallery = stayImages(stay.slug);
  const meta = DISTRICT_META.find((district) => district.name === stay.district);

  /*
   * Nearby tourism.
   *
   * Measured only where the property has verified coordinates — a distance
   * computed from a name search would be a made-up number. Without them the
   * page falls back to naming what is in the same district, which is true
   * without pretending to a precision the data does not have.
   */
  const hasPoint = stay.latitude !== null && stay.longitude !== null;
  const nearby = hasPoint
    ? places
        .map((place) => ({
          place,
          km: distanceKm(
            { lat: stay.latitude as number, lng: stay.longitude as number },
            place.coordinates,
          ),
        }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 4)
    : places
        .filter((place) => place.district === stay.district)
        .slice(0, 4)
        .map((place) => ({ place, km: null }));

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Stays"
          sectionHref={destinationPath(destinationId, "hotels")}
          current={stay.name}
        />

        {/*
          The hero renders only where the property has verified photographs of
          itself. Where it has none there is no frame, no placeholder and no
          apology: the page simply leads with the name and what the register
          records, which is real information and stands on its own. An empty
          picture frame on a tourism page reads as a broken product; a register
          entry without a picture reads as a register entry.
        */}
        <div className={gallery.length > 0 ? "mt-5" : ""}>
          {gallery.length > 0 ? (
            <StayGallery images={gallery} propertyName={stay.name} />
          ) : null}
        </div>

        {/* -------------------------------------------------------- identity */}
        <header className="mt-8">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            {gallery.length > 0 ? "State-graded stay" : "State register entry"}
          </p>
          <h1 className="mt-3 font-display text-h1 text-balance-heading">{stay.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge tone="jade">{stay.starCategory}</Badge>
            <span className="flex items-center gap-1.5 text-small text-muted">
              <MapPin className="size-4 text-primary" aria-hidden />
              {stay.district} district{meta ? ` · formerly ${meta.formerName}` : ""}
            </span>
          </div>
          {stay.address ? (
            <p className="mt-3 max-w-2xl text-body leading-relaxed text-muted">{stay.address}</p>
          ) : null}
        </header>

        {/* --------------------------------------------------------- actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Each action is a ReferralLink: the traveller reaches the
              property's own channel and TerraStory counts that it sent them. */}
          {stay.phone ? (
            <ReferralLink
              href={`tel:${dialable(stay.phone)}`}
              destinationId={destinationId}
              stayRef={`${destinationId}/${stay.slug}`}
              eventType="CALL"
              newTab={false}
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              <Phone className="size-4" aria-hidden />
              Call to book
            </ReferralLink>
          ) : null}
          <ReferralLink
            href={stay.mapsUrl}
            destinationId={destinationId}
            stayRef={`${destinationId}/${stay.slug}`}
            eventType="MAPS"
            className={buttonClasses({ variant: "secondary", size: "md" })}
          >
            <MapPin className="size-4" aria-hidden />
            {stay.mapsIsExact ? "Open location in Maps" : "Find on Google Maps"}
          </ReferralLink>
          {stay.officialWebsite ? (
            <ReferralLink
              href={stay.officialWebsite}
              destinationId={destinationId}
              stayRef={`${destinationId}/${stay.slug}`}
              eventType="OFFICIAL_WEBSITE"
              className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              Official website
              <ExternalLink className="size-3.5" aria-hidden />
            </ReferralLink>
          ) : null}
        </div>

        {/*
          Booking. Calling is the route that could be verified; an online one
          could not. Saying that plainly is more useful than a button that
          drops the visitor on a search page and calls itself "Book now".
        */}
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          {stay.phone
            ? "The number is the one on the state register. No online booking route could be verified for this property — no licensed rates feed is connected and no property page could be confirmed on a booking platform — so calling the hotel is the route this page offers."
            : "The register records no telephone number for this property. Use the map to locate it, or the official website where one exists."}
        </p>
        <p className="mt-2 text-caption text-subtle">
          Do you own or run this property?{" "}
          <Link href="/partner" className="font-medium text-primary hover:underline">Partner with TerraStory</Link>.
        </p>

        {/* -------------------------------------------------------- register */}
        <section className="mt-10" aria-labelledby="register">
          <h2 id="register" className="font-display text-h3">
            What the register records
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Property reference" value={stay.propertyId} />
            <Field label="State grade" value={stay.starCategory} />
            <Field label="District" value={stay.district} />
            <Field label="Registration number" value={stay.registrationNo} />
            <Field label="Registration valid to" value={stay.validUpto} />
            <Field label="Telephone" value={stay.phone} />
            <Field
              label="Location"
              value={
                hasPoint
                  ? `${stay.latitude?.toFixed(4)}, ${stay.longitude?.toFixed(4)} (${stay.locationConfidence} confidence)`
                  : "Not held — the Maps link searches by name and locality"
              }
            />
          </dl>
          {stay.websiteNote ? (
            <p className="mt-4 text-small leading-relaxed text-muted">{stay.websiteNote}</p>
          ) : null}
        </section>

        {/* ---------------------------------------------------------- nearby */}
        <section className="mt-10" aria-labelledby="nearby">
          <h2 id="nearby" className="font-display text-h3">
            {hasPoint ? "Nearest catalogued places" : `Catalogued places in ${stay.district}`}
          </h2>
          <p className="mt-1.5 text-small text-muted">
            {hasPoint
              ? "Straight-line distance from the property's verified coordinates, not road distance."
              : "The property has no verified coordinates, so these are places in the same district rather than measured neighbours."}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {nearby.map(({ place, km }) => (
              <li key={place.slug}>
                <Link
                  href={`/destinations/${destinationId}/explore?place=${place.slug}`}
                  className="group flex h-full gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {/* No verified photograph means no photograph — see
                      resolveImage in src/data/places.ts. */}
                  <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {place.image ? (
                      <Image
                        src={place.image}
                        alt={place.imageAlt}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <MapPin className="size-5 text-subtle" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold group-hover:text-primary">
                      {place.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-caption text-subtle">
                      {place.category}
                      {km !== null ? ` · ${km < 1 ? "under 1" : Math.round(km)} km away` : ""}
                    </span>
                    {place.permitNote ? (
                      <span className="mt-1 block text-caption text-muted">Permit required</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------------- sources */}
        <section className="mt-10 rounded-xl border bg-surface-muted/40 p-5" aria-labelledby="sources">
          <h2 id="sources" className="flex items-center gap-2 font-display text-h4">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
            Where this comes from
          </h2>
          <p className="mt-2 text-small leading-relaxed text-muted">
            Every field above is read from the Sikkim Tourism &amp; Civil Aviation
            Department&apos;s register of graded hotels. Nothing on this page is a
            rating, a review, a tariff or an estimate — none of those could be
            verified, so none are shown.
          </p>
          <p className="mt-3 font-mono text-caption text-subtle">
            <a
              href={CURATED_PROVENANCE.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              sikkimtourism.gov.in — registered establishments
            </a>{" "}
            · last verified {CURATED_PROVENANCE.verifiedAt} · cross-check:{" "}
            {stay.verificationStatus === "cross-verified"
              ? "location confirmed against OpenStreetMap"
              : "register entry only"}
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="font-mono text-caption tracking-wide text-subtle uppercase">{label}</dt>
      <dd className="mt-1 text-body">{value ?? "Not recorded"}</dd>
    </div>
  );
}

/** Mirrors the dial-string rule on the directory — see CuratedStays. */
function dialable(raw: string): string {
  const first = (raw.split(/[/,;]/)[0] ?? raw).replace(/[^\d+]/g, "");
  if (first.startsWith("+")) return first;
  if (first.startsWith("0") && first.length >= 10) return `+91${first.slice(1)}`;
  if (first.length === 10) return `+91${first}`;
  return first;
}
