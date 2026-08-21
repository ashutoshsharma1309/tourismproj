import {
  ArrowLeft,
  ExternalLink,
  ImageOff,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { stayPhoto } from "@/data/stay-photos";
import { distanceKm } from "@/lib/geo";
import { SITE_URL } from "@/lib/constants";

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

export const dynamicParams = false;

export function generateStaticParams() {
  return curatedStays.map((stay) => ({ slug: stay.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const stay = getCuratedStay(slug);
  if (!stay) return { title: "Stay not found" };

  return {
    title: `${stay.name} — ${stay.starCategory}, ${stay.district}`,
    description: `${stay.name} is graded ${stay.starCategory} by the Sikkim Tourism & Civil Aviation Department and listed in ${stay.district} district. Registration, contact and location as the state register records them.`,
    alternates: { canonical: `${SITE_URL}/stays/${stay.slug}` },
  };
}

export default async function StayPage({ params }: PageProps) {
  const { slug } = await params;
  const stay = getCuratedStay(slug);
  if (!stay) notFound();

  /* The property's own photographs where any exist; otherwise the district
     stand-in, which is captioned as not being this hotel. */
  const gallery = stayImages(stay.slug);
  const photo = gallery.length === 0 ? stayPhoto(stay) : undefined;
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
        <Link
          href="/hotels"
          className="inline-flex items-center gap-1.5 rounded-full py-1 text-small font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All stays
        </Link>

        {/* ---------------------------------------------------------- hero */}
        <div className="mt-5">
          {gallery.length > 0 ? (
            <StayGallery images={gallery} propertyName={stay.name} />
          ) : photo ? (
            <figure>
              <div className="relative h-56 overflow-hidden rounded-2xl border bg-surface-muted sm:h-72 md:h-80">
                <Image
                  src={photo.localPath}
                  alt={`${photo.placeName}, ${photo.placeDistrict} district — not a photograph of ${stay.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 64rem, 100vw"
                  className="object-cover"
                />
                <div className="gradient-overlay absolute inset-0" aria-hidden />
                <p className="absolute inset-x-0 bottom-0 px-4 pb-3 font-mono text-caption text-foreground-inverse/90">
                  {photo.placeName} · not this property
                </p>
              </div>
              <figcaption className="mt-2 text-caption leading-relaxed text-subtle">
                This photograph shows {photo.placeName} in {photo.placeDistrict}{" "}
                district, not {stay.name}. No openly licensed photograph of the
                property itself could be found. © {photo.attribution} ·{" "}
                <a
                  href={photo.descriptionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:no-underline"
                >
                  {photo.license}
                </a>
              </figcaption>
            </figure>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed bg-surface-muted/40 px-6 text-center sm:h-72">
              <ImageOff className="size-6 text-subtle" aria-hidden />
              <p className="mt-3 font-display text-h4">No photograph available</p>
              <p className="mt-1.5 max-w-md text-small leading-relaxed text-muted">
                No openly licensed photograph of this property exists, and a
                picture of somewhere else would tell you nothing true about it.
              </p>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- identity */}
        <header className="mt-8">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            State-graded stay
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
          {stay.phone ? (
            <a
              href={`tel:${dialable(stay.phone)}`}
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              <Phone className="size-4" aria-hidden />
              Call to book
            </a>
          ) : null}
          <a
            href={stay.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "secondary", size: "md" })}
          >
            <MapPin className="size-4" aria-hidden />
            {stay.mapsIsExact ? "Open location in Maps" : "Find on Google Maps"}
          </a>
          {stay.officialWebsite ? (
            <a
              href={stay.officialWebsite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              Official website
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
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

        {/* -------------------------------------------------------- register */}
        <section className="mt-10" aria-labelledby="register">
          <h2 id="register" className="font-display text-h3">
            What the register records
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
                  href={`/explore?place=${place.slug}`}
                  className="group flex h-full gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                    <Image
                      src={place.image}
                      alt={place.imageAlt}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
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
