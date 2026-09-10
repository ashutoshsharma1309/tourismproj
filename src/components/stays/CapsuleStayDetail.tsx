import { ArrowRight, Globe, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { objectPositionFor } from "@/lib/media/focal";
import type { CapsuleStay } from "@/types/capsule";

export interface NearbyPlace {
  slug: string;
  name: string;
  category: string;
  km: number;
  image?: string | null;
  href: string;
}

export interface StaySource {
  id: string;
  title: string;
  publisher?: string;
  url: string;
}

export interface StayImageCredit {
  attribution?: string;
  license?: string;
  licenseUrl?: string;
  commonsFilePage?: string;
}

/**
 * A documented stay in a capsule destination.
 *
 * WHAT THIS PAGE IS
 * -----------------
 * The record, laid out. Every line on it is a fact the capsule holds about
 * this property — the source's own description, its published coordinate,
 * its official site and telephone number where a source publishes them, and
 * the catalogued places nearest to it by straight-line distance. Nothing is
 * priced, rated, or bookable, because no licensed feed publishes any of that
 * and a guess about a real business is worse than a gap.
 *
 * WHAT IT IS NOT
 * --------------
 * Sikkim's stay page, which reads the state hospitality register and carries
 * a registration number, a grade and a department contact. A capsule stay has
 * none of those; this component renders what it has and says what it lacks.
 */
export function CapsuleStayDetail({
  destinationId,
  destinationName,
  stay,
  nearby,
  sources,
  credit,
}: {
  destinationId: string;
  destinationName: string;
  stay: CapsuleStay;
  nearby: NearbyPlace[];
  sources: StaySource[];
  credit: StayImageCredit | null;
}) {
  const mapsUrl = stay.coordinates
    ? `https://www.google.com/maps?q=${stay.coordinates.lat},${stay.coordinates.lng}`
    : null;
  const telHref = stay.phone ? `tel:${stay.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
      <DestinationBreadcrumb
        destinationId={destinationId}
        destinationName={destinationName}
        section="Stays"
        sectionHref={`/destinations/${destinationId}#stays`}
        current={stay.name}
      />

      {/* ------------------------------------------------------------ hero */}
      {stay.image ? (
        <figure className="mt-6 overflow-hidden rounded-2xl bg-surface-muted">
          <div className="relative aspect-video w-full">
            <Image
              src={stay.image}
              alt={stay.imageAlt ?? `${stay.name}, ${destinationName}`}
              fill
              priority
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="object-cover"
              style={{ objectPosition: objectPositionFor(stay.image) }}
            />
          </div>
          {credit ? (
            <figcaption className="px-4 py-2 text-caption text-subtle">
              Photograph{credit.attribution ? `: ${credit.attribution}` : ""}
              {credit.license ? (
                <>
                  {" · "}
                  {credit.licenseUrl ? (
                    <a href={credit.licenseUrl} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                      {credit.license}
                    </a>
                  ) : (
                    credit.license
                  )}
                </>
              ) : null}
              {credit.commonsFilePage ? (
                <>
                  {" · "}
                  <a href={credit.commonsFilePage} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                    Wikimedia Commons
                  </a>
                </>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ) : (
        <p className="mt-6 rounded-xl border border-border bg-surface-muted/40 p-4 text-caption text-subtle">
          No freely licensed photograph of this property is published, so none is shown.
        </p>
      )}

      {/* -------------------------------------------------------- identity */}
      <header className="mt-8">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          {stay.category} · {destinationName}
        </p>
        <h1 className="mt-2 font-display text-h1 text-balance-heading">{stay.name}</h1>
        {stay.openedYear || stay.buildingYear ? (
          <p className="mt-2 font-mono text-caption text-subtle" data-numeric>
            {[
              stay.openedYear ? `Opened ${stay.openedYear}` : null,
              stay.buildingYear ? `Building dates from ${stay.buildingYear}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <p className="mt-5 max-w-prose text-body-lg leading-relaxed text-muted">{stay.summary}</p>
      </header>

      {/* --------------------------------------------- location + contact */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2" aria-labelledby="stay-contact">
        <h2 id="stay-contact" className="sr-only">
          Location and contact
        </h2>
        <div className="rounded-xl border border-border p-5">
          <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">Where</p>
          {stay.address ? <p className="mt-2 text-body">{stay.address}</p> : null}
          {stay.coordinates ? (
            <p className="mt-2 text-caption text-subtle" data-numeric>
              {stay.coordinates.lat.toFixed(5)}, {stay.coordinates.lng.toFixed(5)} — the coordinate the
              source publishes
            </p>
          ) : (
            <p className="mt-2 text-caption text-subtle">No coordinate is published for this property.</p>
          )}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonClasses({ size: "sm" }), "mt-4")}
            >
              <MapPin className="size-4" aria-hidden />
              Open in Google Maps
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">Contact</p>
          {stay.website || stay.phone || stay.email ? (
            <ul className="mt-2 space-y-2 text-body">
              {stay.website ? (
                <li>
                  <a
                    href={stay.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    <Globe className="size-4" aria-hidden />
                    Official website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
              {stay.phone && telHref ? (
                <li>
                  <a href={telHref} className="inline-flex items-center gap-2 hover:text-primary">
                    <Phone className="size-4" aria-hidden />
                    <span data-numeric>{stay.phone}</span>
                  </a>
                </li>
              ) : null}
              {stay.email ? (
                <li>
                  <a href={`mailto:${stay.email}`} className="inline-flex items-center gap-2 break-all hover:text-primary">
                    <Mail className="size-4" aria-hidden />
                    {stay.email}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-caption text-subtle">
              No website or telephone number is published for this property in the sources this
              archive cites. None is guessed.
            </p>
          )}
          <p className="mt-4 text-caption text-subtle">
            Not priced, rated or bookable here: this product holds no licensed feed for any of that.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- nearby */}
      {nearby.length > 0 ? (
        <section className="mt-12" aria-labelledby="stay-nearby">
          <h2 id="stay-nearby" className="font-display text-h3">
            Catalogued places nearby
          </h2>
          <p className="mt-2 text-caption text-muted">
            Straight-line distance from the property&rsquo;s published coordinate — not a road
            distance or a travel time.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {nearby.map((place) => (
              <li key={place.slug}>
                <Link
                  href={place.href}
                  prefetch={false}
                  className="tile group flex items-center gap-4 p-3 hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                    {place.image ? (
                      <Image src={place.image} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-eyebrow tracking-widest text-subtle uppercase">
                      {place.category}
                    </span>
                    <span className="block truncate font-display text-h4 group-hover:text-primary">
                      {place.name}
                    </span>
                    <span className="block text-caption text-subtle" data-numeric>
                      {place.km < 1 ? `${Math.round(place.km * 1000)} m` : `${place.km.toFixed(1)} km`} in a
                      straight line
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-subtle group-hover:text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- sources */}
      <section
        className="mt-12 rounded-xl border border-border bg-surface-muted/40 p-5"
        aria-labelledby="stay-sources"
      >
        <h2 id="stay-sources" className="font-display text-h4">
          Sources
        </h2>
        <p className="mt-1 text-caption text-muted">
          The description above is quoted from the source below. The coordinate, website and
          telephone number are the structured claims Wikidata publishes for this property, each
          checked before publication; the photograph&rsquo;s licence is stated in its caption.
        </p>
        {sources.length > 0 ? (
          <ul className="mt-3 space-y-1.5 text-small">
            {sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {source.title}
                </a>
                {source.publisher ? <span className="text-subtle"> — {source.publisher}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
