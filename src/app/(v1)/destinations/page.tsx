import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { WorldMap } from "@/components/destinations/WorldMap";
import { Footer } from "@/components/layout/Footer";
import { buildDestinationKeywords } from "@/lib/destinations/keywords";
import { destinationLocationLine } from "@/lib/destinations/location";
import { allCoverage } from "@/lib/global/coverage";
import { DepthBadge } from "@/components/ui/DepthBadge";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { buildDestinationMarkers, groupByCountry, listDestinations, listRegionNames } from "@/lib/destinations";
import { allDestinationCounts } from "@/lib/discovery";
import { getPlaces } from "@/lib/destinations/content";
import { focalClassFor } from "@/lib/media/focal";

/**
 * Global exploration — the way into TerraStory.
 *
 * A map and a list, both complete, neither required. The map is the faster
 * way to see where in the world these places are; the list is the way that
 * works on a phone, from a keyboard, and for anyone who would rather read
 * than aim. Forcing a visitor through a map to reach a page is a discovery
 * pattern that excludes people, so both routes carry every destination.
 *
 * force-dynamic is not needed: destination metadata is build-time data, so
 * this page prerenders like every other.
 */
/* Counted from the registry, never typed: the description is only ever as
   wrong as the registry is. */
export const metadata: Metadata = {
  title: "Explore destinations",
  description: `${listDestinations().length} Indian destinations across ${listRegionNames().length} states and union territories, each opening into its places, stories, culture, history and archive — and each stating how much has actually been verified.`,
};

export default async function DestinationsPage() {
  const countries = groupByCountry();
  /* One source for coordinates and status: the canonical registry. */
  const markers = buildDestinationMarkers((id) => getPublishedKnowledge(id));
  /*
   * "Documented" means a visitor opening this destination finds something —
   * which is what the sentence under the list actually promises. The older
   * marker flag meant "has a reviewed-evidence block", true of three
   * destinations, and stating THAT number next to cards reading "31 visitable
   * records" told the reader the site could not count.
   */

  /*
   * Counts are resolved HERE, on the server, at build time. The page ships
   * the resulting numbers and nothing else — no corpus reaches the browser,
   * which is the constraint this view has always been under.
   */
  const counts = await allDestinationCounts();
  const byId = new Map(counts.map((entry) => [entry.id, entry]));

  /* Keywords come from the interest coverage, which is a different shape from
     the summary counts above — so it is fetched rather than derived from them. */
  const coverage = await allCoverage();
  const keywordsById = buildDestinationKeywords(coverage);
  const documentedCount = coverage.filter((entry) => !entry.empty).length;
  const comparable = counts.filter((entry) => !entry.empty);
  /* One photograph per card: the destination's own first catalogued place
     that has one. A destination without any keeps a neutral panel rather
     than another destination's picture. */
  const heroByDestination = new Map(
    await Promise.all(
      listDestinations().map(async (destination) => {
        const places = await getPlaces(destination.id);
        return [destination.id, places.find((place) => place.image)] as const;
      }),
    ),
  );



  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          TerraStory
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Explore {markers.length} Indian destinations
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          Each destination opens into its places, history, stories, culture, food,
          festivals and crafts — every fact traced to its source. Pick one below,
          or let your interests choose.
        </p>

        <p className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/discover"
            prefetch={false}
            className="focus-visible:ring-primary inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            Find my destination
          </Link>
          <Link
            href="/destinations/compare"
            prefetch={false}
            className="focus-visible:ring-primary inline-flex min-h-11 items-center rounded-full border border-border px-5 text-small font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
          >
            Compare destinations
          </Link>
        </p>

        {/*
          CARDS FIRST, MAP SECOND.
          The page opened on a world map with a legend of data-model tiers
          ("Deep archive", "Tourism capsule") and put the list of destinations
          below it. A first-time visitor could not tell this was the list of
          eighteen Indian destinations. The cards now lead — photograph, name,
          state, what the place is known for, what you can do there — and the
          map follows as a way to pick by geography.
        */}
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="All destinations">
          {countries
            .flatMap((group) => group.destinations)
            .map((destination) => {
              const entry = byId.get(destination.id);
              const keywords = keywordsById.get(destination.id);
              const hero = heroByDestination.get(destination.id);
              const empty = !entry || entry.empty;
              return (
                <li key={destination.id}>
                  <Link
                    href={`/destinations/${destination.id}`}
                    className="tile group flex h-full flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {hero?.image ? (
                      <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                        <Image
                          src={hero.image}
                          alt={hero.imageAlt ?? `${hero.name}, ${destination.name}`}
                          fill
                          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
                          className={`media-zoom object-cover group-hover:scale-[1.04] ${focalClassFor(hero.image)}`}
                        />
                      </span>
                    ) : (
                      <span className="block aspect-16/10 bg-surface-muted" aria-hidden />
                    )}
                    <span className="flex flex-1 flex-col p-4">
                      <span className="font-display text-h4">{destination.name}</span>
                      <span className="mt-0.5 block text-caption text-muted">
                        {destinationLocationLine(destination.name, destination.region?.name, destination.country.name)}
                      </span>
                      {/* Three words, derived from the interests this destination's
                          own records carry — never typed. */}
                      {keywords.length > 0 ? (
                        <span className="mt-2 block text-caption text-foreground/80">
                          {keywords.join(" · ")}
                        </span>
                      ) : null}
                      <span className="mt-2 block text-caption text-subtle">
                        {empty
                          ? "Being catalogued — explore what is here so far"
                          : entry.experiences > 0
                            ? `${entry.experiences} ${entry.experiences === 1 ? "place" : "places"} to explore · ${entry.sectionCount} ${entry.sectionCount === 1 ? "section" : "sections"}`
                            : `${entry.approvedClaims} verified ${entry.approvedClaims === 1 ? "fact" : "facts"}, no visitable record yet`}
                      </span>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-small font-medium text-primary">
                        Explore {destination.name}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>

        <section className="mt-16" aria-labelledby="where-heading">
          <h2 id="where-heading" className="font-display text-h2">Where they are</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            {documentedCount} of {markers.length} carry places you can explore today. Pick a
            marker to open a destination.
          </p>
          <div className="mt-6">
            <WorldMap destinations={markers} documentedCount={documentedCount} />
          </div>
        </section>

        {/*
          A comparison, not a ranking.

          Every column is a count of something this archive holds, so the table
          says how much has been CATALOGUED — never which destination is
          better, prettier or more worth visiting. The depth badge travels with
          each row so a researched destination is never read as though it had a
          deep archive behind it. Destinations with nothing are left out
          entirely rather than shown as a row of zeroes.
        */}
        {comparable.length > 1 ? (
          <section className="mt-16" aria-labelledby="compare-heading">
            <h2 id="compare-heading" className="font-display text-h2">
              How much is known, side by side
            </h2>
            <p className="mt-2 max-w-2xl text-body text-muted">
              Counts of what has been catalogued and reviewed — not a ranking.
              A destination with fewer records is not a lesser place; it is a
              place this archive has covered less.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left text-small">
                <caption className="sr-only">
                  Catalogued coverage by destination: visitable records, mapped
                  records, links to history and stories, approved facts and
                  timeline entries.
                </caption>
                <thead>
                  <tr className="border-b border-border text-caption text-subtle">
                    <th scope="col" className="py-2 pr-4 font-medium">Destination</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Coverage</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Visitable records</th>
                    <th scope="col" className="py-2 pr-4 font-medium">With coordinates</th>
                    <th scope="col" className="py-2 pr-4 font-medium">History links</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Story links</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Approved facts</th>
                    <th scope="col" className="py-2 font-medium">Timeline entries</th>
                  </tr>
                </thead>
                <tbody>
                  {comparable.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/60">
                      <th scope="row" className="py-3 pr-4 font-medium">
                        <Link href={`/destinations/${entry.id}`} className="hover:text-primary">
                          {entry.name}
                        </Link>
                        <span className="block text-caption font-normal text-subtle">
                          {entry.country}
                        </span>
                      </th>
                      <td className="py-3 pr-4">
                        <DepthBadge depth={entry.depth} />
                      </td>
                      <td className="py-3 pr-4" data-numeric>
                        {entry.experiences > 0 ? entry.experiences : "—"}
                      </td>
                      <td className="py-3 pr-4" data-numeric>
                        {entry.mapped > 0 ? entry.mapped : "—"}
                      </td>
                      <td className="py-3 pr-4" data-numeric>
                        {entry.historyEdges > 0 ? entry.historyEdges : "—"}
                      </td>
                      <td className="py-3 pr-4" data-numeric>
                        {entry.storyEdges > 0 ? entry.storyEdges : "—"}
                      </td>
                      <td className="py-3 pr-4" data-numeric>
                        {entry.approvedClaims > 0 ? entry.approvedClaims : "—"}
                      </td>
                      <td className="py-3" data-numeric>
                        {entry.timelineEntries > 0 ? entry.timelineEntries : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-caption text-subtle">
              An em dash means the archive holds none of that kind of record for
              that destination. {counts.length - comparable.length} registered
              destinations are not listed here because they hold nothing at all.
            </p>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
