import Link from "next/link";

import { getHistory, getStories } from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";

/**
 * The homepage below the fold: stories and a timeline drawn from every
 * destination, not from one.
 *
 * WHY THIS REPLACED NINE SECTIONS
 * -------------------------------
 * Measured before this component existed: **71% of the landing page's text was
 * Sikkim**, eleven of its fourteen headings named Sikkim, and Sikkim had
 * twenty-five links against one each for the other five destinations that
 * appeared at all. The hero said TerraStory and everything under it was a
 * regional archive — monasteries, the Sikkim heritage map, Sikkim's stories,
 * Sikkim's culture films, Sikkim's planner, Sikkim's preservation report.
 *
 * Nothing was deleted from the product. Every one of those sections still
 * exists on Sikkim's own pages, where it belongs and where it is now reachable
 * from a hub that finally shows what it holds.
 *
 * WHAT REPLACED THEM
 * ------------------
 * The same ideas, sourced across the whole archive:
 *
 *   - **Stories** — one per destination, from as many destinations as have
 *     them, so the section demonstrates range rather than depth in one place.
 *   - **A heritage timeline** spanning 179 BC to the present across six
 *     countries, which is the clearest single demonstration that this product
 *     is about how places came to be rather than a list of them.
 *
 * SELECTION IS DERIVED, NOT CURATED
 * ---------------------------------
 * Destinations are taken in registry order and each contributes its first
 * record. No destination is promoted, none is a favourite, and a destination
 * that holds nothing of a kind simply does not appear in that section. The
 * alternative — a hand-picked list — is the kind of editorial choice this
 * project has avoided everywhere else.
 */

/**
 * Where a record's page is.
 *
 * A capsule record carries `detailHref` (an anchor on its discovery page); a
 * curated one does not and has a real route. The two corpora have different
 * TypeScript types, so the property is read defensively rather than by
 * widening either type to accommodate the other.
 */
const linkFor = (record: { slug: string }, destinationId: string, section: string) =>
  (record as { detailHref?: string }).detailHref ??
  `/destinations/${destinationId}/${section}/${record.slug}`;

/** How many destinations contribute a story. The timeline takes them all. */
const STORY_SLOTS = 6;

export async function GlobalStories() {
  const destinations = listDestinations();

  /* One story and one dated event per destination, gathered in registry order. */
  const gathered = await Promise.all(
    destinations.map(async (destination) => {
      const [stories, history] = await Promise.all([
        getStories(destination.id),
        getHistory(destination.id),
      ]);
      return { destination, story: stories[0], events: history };
    }),
  );

  const stories = gathered
    .filter((entry) => entry.story)
    .slice(0, STORY_SLOTS);

  /*
   * The timeline takes each destination's OLDEST dated event, then sorts what
   * it collected. Taking the first of each keeps one destination from filling
   * the section, and sorting afterwards is what produces the span — Rome's
   * republic beside Sikkim's coronation beside the Brooklyn Bridge.
   */
  const yearOf = (label: string) => {
    const bc = /(\d{1,4})\s*BC/i.exec(label);
    if (bc) return -Number(bc[1]);
    const ad = /AD\s*(\d{1,4})/i.exec(label);
    if (ad) return Number(ad[1]);
    const century = /(\d{1,2})(?:st|nd|rd|th)\s+century/i.exec(label);
    if (century) return (Number(century[1]) - 1) * 100 + 50;
    const year = /(\d{3,4})/.exec(label);
    return year ? Number(year[1]) : Number.MAX_SAFE_INTEGER;
  };

  const ordered = gathered
    .flatMap((entry) =>
      entry.events.length > 0
        ? [{ destination: entry.destination, event: entry.events[0]! }]
        : [],
    )
    .map((entry) => ({ ...entry, year: yearOf(entry.event.yearLabel ?? "") }))
    .filter((entry) => entry.year !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.year - b.year);

  /*
   * ONE MOMENT FROM EACH DESTINATION, SORTED.
   *
   * Two earlier attempts were both worse. Taking the first eight of the sorted
   * list announced "528 BC to 1147" — the eight oldest, which undersells an
   * archive that runs to the present. Sampling eight at even intervals fixed
   * the span and produced "across 2 countries", because the oldest records
   * cluster in two of them.
   *
   * Every destination contributing exactly one row is both the fullest span
   * and the fullest spread, and it is a rule a reader can see: fifteen
   * destinations, fifteen dated moments, oldest first.
   */
  const timeline = ordered;

  return (
    <>
      {/* ------------------------------------------------------- Stories */}
      {stories.length > 0 ? (
        <section
          id="stories"
          aria-labelledby="global-stories"
          className="scroll-mt-20 border-y border-border bg-surface-muted/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              Stories behind the places
            </p>
            <h2 id="global-stories" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
              A place is what happened there
            </h2>
            <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
              Each of these is quoted from a named source and says how it should
              be read — a documented account is never dressed up as a legend.
              One from each of {stories.length} destinations.
            </p>

            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {stories.map(({ destination, story }) => (
                <li key={destination.id}>
                  <Link
                    href={linkFor(story!, destination.id, "stories")}
                    className="tile flex h-full flex-col p-5 hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-eyebrow tracking-widest uppercase">
                      <span className="text-primary">{destination.name}</span>
                      {story!.claimType ? (
                        <>
                          <span aria-hidden className="text-subtle">·</span>
                          <span className="text-subtle">{story!.claimType}</span>
                        </>
                      ) : null}
                    </span>
                    <span className="mt-2 font-display text-h4">{story!.title}</span>
                    {story!.summary ? (
                      <span className="mt-2 line-clamp-4 text-body leading-relaxed text-muted">
                        {story!.summary}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ Timeline */}
      {timeline.length > 1 ? (
        <section aria-labelledby="global-timeline" className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Heritage across time
          </p>
          <h2 id="global-timeline" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            {timeline[0]!.event.yearLabel} to {timeline[timeline.length - 1]!.event.yearLabel},
            across {new Set(timeline.map((entry) => entry.destination.country.name)).size} countries
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            TerraStory does not just show you where a place is. Every dated
            moment below is traced to a named source, and where the evidence
            jumps, the gap is left as a gap.
          </p>

          <ol className="mt-10 space-y-0">
            {timeline.map(({ destination, event }) => (
              <li
                key={`${destination.id}-${event.slug}`}
                className="grid gap-x-6 gap-y-1 border-t border-border py-5 sm:grid-cols-[8rem_1fr]"
              >
                <p
                  className="font-mono text-eyebrow tracking-widest text-primary uppercase"
                  data-numeric
                >
                  {event.yearLabel}
                </p>
                <div>
                  <Link
                    href={linkFor(event, destination.id, "history")}
                    className="font-display text-h4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-caption text-subtle">
                    {destination.name} · {destination.country.name}
                  </p>
                  <p className="mt-2 max-w-2xl text-body leading-relaxed text-muted">
                    {event.shortDescription}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
