import { ArrowRight } from "lucide-react";
import { focalClassFor } from "@/lib/media/focal";
import Image from "next/image";
import Link from "next/link";

import { getHistory, getPlaces, getStories } from "@/lib/destinations/content";

/**
 * Places, stories and dated events, on the destination's own landing page.
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase B tripled what every destination holds — Paris went from six places to
 * thirteen, and gained twelve dated events and seven stories — and none of it
 * reached the destination's landing page. All of it lived on `/discover`. So a
 * visitor who opened Paris met a heading, a row of interest chips, a
 * single-item "Explore" grid and a list of other destinations, and had to
 * guess that the archive was one click further in.
 *
 * The hub now shows a sample of each kind and links to the rest.
 *
 * ONE COMPONENT, FIFTEEN DESTINATIONS
 * -----------------------------------
 * `getPlaces`, `getStories` and `getHistory` return the same shapes for
 * Sikkim's curated corpus and for a capsule's projection of it — that
 * projection is what `capsule.ts` exists to do. So this renders Sikkim's 53
 * places and Paris's 13 through identical code, and a destination that holds
 * none of a kind simply does not get that section.
 *
 * WHERE A RECORD LINKS
 * --------------------
 * A capsule record carries `detailHref` — an anchor on its discovery page,
 * because a capsule entry does not deserve a route of its own. A curated
 * record does not, and has a real page at the canonical route.
 *
 * So the record decides, and the component is not told. An earlier draft took
 * a `hasPlacePages` prop from the `places` capability, which is TRUE for a
 * capsule — a capsule has place records, it just has no place pages. The prop
 * was wrong and only harmless because `detailHref` always won before it was
 * consulted. A parameter that is wrong but unreachable is a bug waiting for
 * someone to reach it.
 */

/** How many of each kind the landing page samples. The rest are one click on. */
const SAMPLE = 6;

interface Record {
  slug: string;
  detailHref?: string;
}

const hrefFor = (record: Record, destinationId: string, section: string) =>
  record.detailHref ??
  `/destinations/${destinationId}/${section}/${record.slug}`;

export async function DestinationHighlights({
  destinationId,
}: {
  destinationId: string;
}) {
  const [places, stories, history] = await Promise.all([
    getPlaces(destinationId),
    getStories(destinationId),
    getHistory(destinationId),
  ]);

  if (places.length === 0 && stories.length === 0 && history.length === 0)
    return null;

  const discover = `/destinations/${destinationId}/discover`;

  /*
   * A HISTORY EVENT'S PHOTOGRAPH IS THE PLACE IT HAPPENED AT.
   *
   * No capsule event carries an image of its own — nothing in the archive
   * photographs "AD 711" — so the cards were six blocks of text, which is
   * the thing a reader skips. Every event does name the places it concerns
   * (`relatedPlaces`), and those places DO carry verified, credited
   * photographs. So the card shows the first related place that has one,
   * and says so in the caption: the photograph is of the site, not of the
   * event. An event naming no photographed place gets no image, rather than
   * a stock one — an honest absence over a misleading presence.
   */
  const placeBySlug = new Map(places.map((place) => [place.slug, place]));
  const photographFor = (event: { relatedPlaces?: string[] }) => {
    for (const slug of event.relatedPlaces ?? []) {
      const place = placeBySlug.get(slug);
      if (place?.image) return place;
    }
    return null;
  };

  return (
    <>
      {places.length > 0 ? (
        <section className="mt-14" aria-labelledby="featured-places">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id="featured-places"
              className="font-display text-h2 text-balance-heading"
            >
              Places
            </h2>
            <Link
              href={discover}
              className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              {places.length === SAMPLE
                ? "See them in context"
                : `All ${places.length} records`}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-body text-muted">
            {places.length} catalogued{" "}
            {places.length === 1 ? "record" : "records"} with sources.{" "}
            {places.filter((place) => place.coordinates).length} of them publish
            a coordinate.
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {places.slice(0, SAMPLE).map((place) => (
              <li key={place.slug}>
                <Link
                  href={hrefFor(place, destinationId, "places")}
                  className="tile group flex h-full flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {/* A record with no photograph says so rather than borrowing one. */}
                  {place.image ? (
                    <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                      <Image
                        src={place.image}
                        alt={place.imageAlt ?? place.name}
                        fill
                        sizes="(min-width: 1024px) 22rem, 92vw"
                        className={`media-zoom object-cover group-hover:scale-[1.04] ${focalClassFor(place.image)}`}
                      />
                    </span>
                  ) : null}
                  <span className="flex flex-1 flex-col p-4">
                    <span className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                      {place.category}
                    </span>
                    <span className="mt-1 font-display text-h4">
                      {place.name}
                    </span>
                    {place.description ? (
                      <span className="mt-2 line-clamp-3 text-body text-muted">
                        {place.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="mt-14" aria-labelledby="historical-snapshot">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id="historical-snapshot"
              className="font-display text-h2 text-balance-heading"
            >
              Historical snapshot
            </h2>
            <Link
              href={discover}
              className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              All {history.length} dated{" "}
              {history.length === 1 ? "event" : "events"}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-body text-muted">
            Dated moments, each traced to a named source. Where the evidence
            jumps, the gap is left as a gap.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.slice(0, SAMPLE).map((event) => {
              const photo = photographFor(event as { relatedPlaces?: string[] });
              return (
                <li key={event.slug}>
                  <Link
                    href={hrefFor(event, destinationId, "history")}
                    className="tile group flex h-full flex-col overflow-hidden hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {photo?.image ? (
                      <span className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-muted">
                        <Image
                          src={photo.image}
                          alt={photo.imageAlt ?? photo.name}
                          fill
                          sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                          className={`media-zoom object-cover group-hover:scale-[1.04] ${focalClassFor(photo.image)}`}
                        />
                      </span>
                    ) : null}
                    <span className="flex flex-1 flex-col p-4">
                      <span
                        className="font-mono text-eyebrow tracking-widest text-primary uppercase"
                        data-numeric
                      >
                        {event.yearLabel}
                      </span>
                      <span className="mt-1 font-display text-h4">
                        {event.title}
                      </span>
                      <span className="mt-2 line-clamp-3 text-body text-muted">
                        {event.shortDescription}
                      </span>
                      {photo ? (
                        <span className="mt-3 text-caption text-subtle">
                          Photograph: {photo.name}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {stories.length > 0 ? (
        <section className="mt-14" aria-labelledby="destination-stories">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id="destination-stories"
              className="font-display text-h2 text-balance-heading"
            >
              Stories
            </h2>
            <Link
              href={discover}
              className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              All {stories.length}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-body text-muted">
            Each one states how it should be read — a documented account is
            never presented as an oral tradition.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.slice(0, SAMPLE).map((story) => (
              <li key={story.slug}>
                <Link
                  href={hrefFor(story, destinationId, "stories")}
                  className="tile flex h-full flex-col p-4 hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {story.claimType ? (
                    <span className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                      {story.claimType}
                    </span>
                  ) : null}
                  <span className="mt-1 font-display text-h4">
                    {story.title}
                  </span>
                  {story.summary ? (
                    <span className="mt-2 line-clamp-3 text-body text-muted">
                      {story.summary}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
