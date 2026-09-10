import type { Metadata } from "next";
import Link from "next/link";

import { WorldMap } from "@/components/destinations/WorldMap";
import { Footer } from "@/components/layout/Footer";
import { buildDestinationKeywords } from "@/lib/destinations/keywords";
import { destinationLocationLine } from "@/lib/destinations/location";
import { allCoverage } from "@/lib/global/coverage";
import { DepthBadge } from "@/components/ui/DepthBadge";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { buildDestinationMarkers, groupByCountry } from "@/lib/destinations";
import { allDestinationCounts } from "@/lib/discovery";

/**
 * Global exploration — the way into TerraStory.
 *
 * A map and a list, both complete, neither required. The map is the faster
 * way to see where in the world these places are; the list is the way that
 * works on a phone, from a keyboard, and for anyone who would rather read
 * than aim. Forcing a visitor through a map to reach a page is a discovery
 * pattern that excludes people, so both routes carry all fifteen.
 *
 * force-dynamic is not needed: destination metadata is build-time data, so
 * this page prerenders like every other.
 */
export const metadata: Metadata = {
  title: "Explore destinations",
  description:
    "Fifteen destinations across six countries, each opening into its places, stories, culture, history and archive — and each stating how much has actually been verified.",
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



  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          TerraStory
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Explore a place through what is known about it
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          Not a directory of descriptions. Each destination opens into its history,
          heritage and culture — and every fact names the source it came from.
          Where nothing has been verified yet, the page says so.
        </p>

        {/* PHASE 15 — the interest-first door, offered before the map. */}
        <p className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/discover"
            prefetch={false}
            className="focus-visible:ring-primary inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            Start from what you want to experience
          </Link>
          <Link
            href="/destinations/compare"
            prefetch={false}
            className="focus-visible:ring-primary inline-flex items-center rounded-full border border-border px-5 py-2.5 text-small font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
          >
            Compare coverage
          </Link>
        </p>

        <WorldMap destinations={markers} documentedCount={documentedCount} />

        {/*
          The list is not a fallback for the map. It is the equal path, and it
          is the one that works without a pointer.
        */}
        <h2 className="mt-16 font-display text-h2">All destinations</h2>
        <p className="mt-2 max-w-2xl text-body text-muted">
          {documentedCount} of {markers.length} carry catalogued records you can
          explore. Any destination still empty is registered and says so.
        </p>

        {/*
          Country navigation, from the registry's own codes.

          These are in-page jumps rather than a query filter, and that is a
          deliberate trade: reading `searchParams` here would make this page
          server-rendered on every request, and it is the global entry —
          three QA suites assert it is prerendered, and it was measured at a
          16 ms TTFB static. With fifteen destinations across a handful of
          countries, jumping to a section shows the same thing a filter would
          and costs nothing.
        */}
        <nav aria-label="Jump to a country" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {countries.map((group) => (
              <li key={group.code}>
                <a
                  href={`#country-${group.code}`}
                  className="focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-small font-medium transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                >
                  {group.country}
                  <span className="text-caption text-subtle">{group.destinations.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {countries.map((group) => (
          <section key={group.code} id={`country-${group.code}`} className="mt-10 scroll-mt-24">
            <h3 className="font-display text-h3">{group.country}</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.destinations.map((destination) => {
                const marker = markers.find((m) => m.id === destination.id);
                return (
                  <li key={destination.id}>
                    <Link
                      href={`/destinations/${destination.id}`}
                      className="focus-visible:ring-primary block h-full rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">{destination.name}</span>
                        <DepthBadge depth={marker?.depth ?? destination.depth} />
                      </span>
                      <span className="mt-1 block text-caption text-muted">
                        {destinationLocationLine(
                          destination.name,
                          destination.region?.name,
                          destination.country.name,
                        )}
                      </span>

                      {/* Three words, derived from the interests this
                          destination's own records carry — never typed. */}
                      {/* One text line, not three pills. Forty-five styled
                          chips cost ~9 KB of duplicated class strings across
                          the document and its flight payload, which broke this
                          page's payload ceiling. The words are the content;
                          the pills were decoration. */}
                      {(() => {
                        const keywords = keywordsById.get(destination.id);
                        if (keywords.length === 0) return null;
                        return (
                          <span className="mt-2 block text-caption text-foreground/80">
                            {keywords.join(", ")}
                          </span>
                        );
                      })()}
                      {/* What a visitor can actually do here — or nothing, said plainly. */}
                      <span className="mt-2 block text-caption text-subtle">
                        {(() => {
                          const entry = byId.get(destination.id);
                          if (!entry || entry.empty) return "Research not yet available";
                          if (entry.experiences > 0) {
                            return `${entry.experiences} visitable record${entry.experiences === 1 ? "" : "s"} · ${entry.sectionCount} section${entry.sectionCount === 1 ? "" : "s"}`;
                          }
                          return `${entry.approvedClaims} verified fact${entry.approvedClaims === 1 ? "" : "s"}, no visitable record yet`;
                        })()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
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
