import { ArrowRight, Globe, Mail, MapPin, Phone } from "lucide-react";
import { focalClassFor } from "@/lib/media/focal";
import Image from "next/image";
import Link from "next/link";

import { ReferralLink } from "@/components/partners/ReferralLink";
import { getCapsuleStays } from "@/lib/destinations/content";
import { translator, type LanguageCode } from "@/lib/i18n";

/**
 * Places to stay that have a published record.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not a booking directory, and the difference is the entire design.
 * There is no rate, no telephone number, no availability, no rating and no
 * "book now" — not because they were left for later, but because no source
 * behind this product publishes them. Inventing a phone number for a real
 * hotel sends a real person to a wrong number, which is the worst thing this
 * codebase could do; inventing a rate misleads someone about money. The
 * schema (`CapsuleStay`) cannot express any of them, so no future edit can
 * quietly add one.
 *
 * What it is: the properties Wikipedia documents — what they are, when they
 * opened, where they stand — found by reading Category:Hotels in <place>
 * rather than by guessing hotel names.
 *
 * SOME DESTINATIONS SHOW NOTHING HERE
 * -----------------------------------
 * Varanasi and Agra have no documented hotel articles at all. They
 * render no section, which is the honest result. The alternative — filling
 * the grid — is the failure this whole product is built to avoid.
 *
 * SIKKIM DOES NOT USE THIS COMPONENT. Its stays come from the state's
 * licensed-operator register, carry a licence status and a grade, and have
 * their own surfaces.
 */
/** Stays shown before the rest opens on request. */
const PREVIEW = 4;

export async function DestinationStays({
  destinationId,
  destinationName,
  language,
}: {
  destinationId: string;
  destinationName: string;
  language: LanguageCode;
}) {
  const stays = await getCapsuleStays(destinationId);
  if (stays.length === 0) return null;

  const t = translator(language);

  return (
    <section id="stays" className="mt-14 scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-h3">{t("section.stays")}</h2>
        <p className="text-caption text-subtle" data-numeric>
          {stays.length}
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Where you can stay while exploring {destinationName} — verified records
        only. A website or telephone number appears only where a source
        publishes one, and nothing here is priced, rated or bookable.
      </p>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Twelve is the published ceiling for a curated stays section — an
            editorial selection, not a directory. The pipeline selects ≤ 12;
            the slice is the guarantee at the surface. The first four are in
            view; the rest open in place below. */}
        {stays.slice(0, PREVIEW).map((stay) => (
          <li key={stay.id} className="tile flex flex-col overflow-hidden">
            {stay.image ? (
              <div className="relative aspect-16/10 bg-surface-muted">
                <Image
                  src={stay.image}
                  alt={stay.imageAlt ?? `${stay.name}, ${destinationName}`}
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                  className={`object-cover ${focalClassFor(stay.image)}`}
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col p-4">
              {/* The record's own classification — "Ryokan", "Heritage hotel",
                  or the pipeline's neutral "Documented stay" where the source
                  states no finer type. Never a tier this product invented. */}
              <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                {stay.category}
              </p>
              <h3 className="mt-1 font-display text-h4">
                <Link
                  href={`/destinations/${destinationId}/stays/${stay.id}`}
                  prefetch={false}
                  className="hover:text-primary"
                >
                  {stay.name}
                </Link>
              </h3>
              {/*
                Two dates, never merged. A converted palace opened as a hotel
                long after its building went up, and labelling the building's
                date "Opened" is a false claim in a true-sounding format.
              */}
              {stay.openedYear || stay.buildingYear ? (
                <p
                  className="mt-1 font-mono text-eyebrow tracking-widest text-primary uppercase"
                  data-numeric
                >
                  {[
                    stay.openedYear
                      ? `${t("label.opened")} ${stay.openedYear}`
                      : null,
                    stay.buildingYear
                      ? `${t("label.built")} ${stay.buildingYear}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-2 text-body leading-relaxed text-muted">
                {stay.summary}
              </p>

              {/*
                Contact details ONLY where a source published them: 27 of 62
                stays have a website, 2 have a telephone number. The rest show
                nothing — not a placeholder, not a "contact the property"
                link standing in for a number nobody has.
              */}
              {/*
                Actions exist only for facts the record holds. A coordinate
                the source published becomes an "Open in Google Maps" link to
                THAT point — a deterministic URL to a verified location, not a
                geocode of the hotel's name. No coordinate, no map link; no
                published number, no Call.
              */}
              <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-caption">
                <Link
                  href={`/destinations/${destinationId}/stays/${stay.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Details
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                {stay.coordinates ? (
                  <ReferralLink
                    href={`https://www.google.com/maps?q=${stay.coordinates.lat},${stay.coordinates.lng}`}
                    destinationId={destinationId}
                    stayRef={`${destinationId}/${stay.id}`}
                    eventType="MAPS"
                    className="inline-flex items-center gap-1 text-muted hover:text-primary"
                  >
                    <MapPin className="size-3.5" aria-hidden />
                    Open in Google Maps
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ReferralLink>
                ) : null}
                {stay.website ? (
                  <ReferralLink
                    href={stay.website}
                    destinationId={destinationId}
                    stayRef={`${destinationId}/${stay.id}`}
                    eventType="OFFICIAL_WEBSITE"
                    className="inline-flex items-center gap-1 text-muted hover:text-primary"
                  >
                    <Globe className="size-3.5" aria-hidden />
                    Official website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ReferralLink>
                ) : null}
                {stay.phone ? (
                  <ReferralLink
                    href={`tel:${stay.phone.replace(/[^\d+]/g, "")}`}
                    destinationId={destinationId}
                    stayRef={`${destinationId}/${stay.id}`}
                    eventType="CALL"
                    newTab={false}
                    className="inline-flex items-center gap-1 text-muted hover:text-primary"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    <span data-numeric>{stay.phone}</span>
                  </ReferralLink>
                ) : null}
                {stay.email ? (
                  <a href={`mailto:${stay.email}`} className="inline-flex items-center gap-1 text-muted hover:text-primary">
                    <Mail className="size-3.5" aria-hidden />
                    Email
                  </a>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {stays.length > PREVIEW ? (
        <details className="group mt-4">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-border px-4 text-small font-medium text-primary transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show {Math.min(stays.length, 12) - PREVIEW} more stays</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stays.slice(PREVIEW, 12).map((stay) => (
          <li key={stay.id} className="tile flex flex-col overflow-hidden">
            {stay.image ? (
              <div className="relative aspect-16/10 bg-surface-muted">
                <Image
                  src={stay.image}
                  alt={stay.imageAlt ?? `${stay.name}, ${destinationName}`}
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                  className={`object-cover ${focalClassFor(stay.image)}`}
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col p-4">
              {/* The record's own classification — "Ryokan", "Heritage hotel",
                  or the pipeline's neutral "Documented stay" where the source
                  states no finer type. Never a tier this product invented. */}
              <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                {stay.category}
              </p>
              <h3 className="mt-1 font-display text-h4">
                <Link
                  href={`/destinations/${destinationId}/stays/${stay.id}`}
                  prefetch={false}
                  className="hover:text-primary"
                >
                  {stay.name}
                </Link>
              </h3>
              {/*
                Two dates, never merged. A converted palace opened as a hotel
                long after its building went up, and labelling the building's
                date "Opened" is a false claim in a true-sounding format.
              */}
              {stay.openedYear || stay.buildingYear ? (
                <p
                  className="mt-1 font-mono text-eyebrow tracking-widest text-primary uppercase"
                  data-numeric
                >
                  {[
                    stay.openedYear
                      ? `${t("label.opened")} ${stay.openedYear}`
                      : null,
                    stay.buildingYear
                      ? `${t("label.built")} ${stay.buildingYear}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-2 text-body leading-relaxed text-muted">
                {stay.summary}
              </p>

              {/*
                Contact details ONLY where a source published them: 27 of 62
                stays have a website, 2 have a telephone number. The rest show
                nothing — not a placeholder, not a "contact the property"
                link standing in for a number nobody has.
              */}
              {/*
                Actions exist only for facts the record holds. A coordinate
                the source published becomes an "Open in Google Maps" link to
                THAT point — a deterministic URL to a verified location, not a
                geocode of the hotel's name. No coordinate, no map link; no
                published number, no Call.
              */}
              <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-caption">
                <Link
                  href={`/destinations/${destinationId}/stays/${stay.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Details
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                {stay.coordinates ? (
                  <ReferralLink
                    href={`https://www.google.com/maps?q=${stay.coordinates.lat},${stay.coordinates.lng}`}
                    destinationId={destinationId}
                    stayRef={`${destinationId}/${stay.id}`}
                    eventType="MAPS"
                    className="inline-flex items-center gap-1 text-muted hover:text-primary"
                  >
                    <MapPin className="size-3.5" aria-hidden />
                    Open in Google Maps
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ReferralLink>
                ) : null}
                {stay.website ? (
                  <ReferralLink
                    href={stay.website}
                    destinationId={destinationId}
                    stayRef={`${destinationId}/${stay.id}`}
                    eventType="OFFICIAL_WEBSITE"
                    className="inline-flex items-center gap-1 text-muted hover:text-primary"
                  >
                    <Globe className="size-3.5" aria-hidden />
                    Official website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ReferralLink>
                ) : null}
                {stay.phone ? (
                  <ReferralLink
                    href={`tel:${stay.phone.replace(/[^\d+]/g, "")}`}
                    destinationId={destinationId}
                    stayRef={`${destinationId}/${stay.id}`}
                    eventType="CALL"
                    newTab={false}
                    className="inline-flex items-center gap-1 text-muted hover:text-primary"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    <span data-numeric>{stay.phone}</span>
                  </ReferralLink>
                ) : null}
                {stay.email ? (
                  <a href={`mailto:${stay.email}`} className="inline-flex items-center gap-1 text-muted hover:text-primary">
                    <Mail className="size-3.5" aria-hidden />
                    Email
                  </a>
                ) : null}
              </p>
            </div>
          </li>
        ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
