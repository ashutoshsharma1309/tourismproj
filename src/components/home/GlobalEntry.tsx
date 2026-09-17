import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SelectDestination } from "@/components/journey-select/SelectDestination";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getPlaces } from "@/lib/destinations/content";
import { buildDestinationKeywords } from "@/lib/destinations/keywords";
import { destinationLocationLine } from "@/lib/destinations/location";
import { groupByCountry, listRegionNames } from "@/lib/destinations/registry";
import { allCoverage, globallyCoveredInterests } from "@/lib/global/coverage";
import { focalClassFor } from "@/lib/media/focal";
import { INTEREST_LABEL } from "@/lib/planner/types";
import type { DataDepth } from "@/types/destination";

/**
 * The two doors a first-time visitor walks through: every destination, then
 * the interests.
 *
 * WHY THIS EXISTS
 * ---------------
 * The landing page's hero has said "TerraStory" since Phase 21, and then
 * everything below it was Sikkim. A visitor who read the hero and scrolled
 * learned that this was a Sikkim site after all. So the page answers, in
 * order, the questions a newcomer actually has: where can I go, and what do I
 * want to see. The four-stage "how this works" block that used to close this
 * component now opens the page, as `HowItWorks`, where it is read before the
 * choosing rather than after.
 *
 * EVERY FIGURE HERE IS COUNTED
 * ----------------------------
 * The interests come from `globallyCoveredInterests`, which offers one only
 * where a registered destination can actually satisfy it — so no chip leads to
 * an empty page. The destination cards read their depth, their photograph and
 * their characterising words from the same coverage the /destinations page
 * uses. Nothing on this page is a number somebody typed.
 */

/**
 * Depth, in a traveller's words.
 *
 * The badge vocabulary — "Deep archive", "Curated", "Tourism capsule" — is
 * the archive's own grading, and it is the right vocabulary on /destinations
 * and on a hub, where it is explained. On a homepage card it read as jargon:
 * a first-time-user audit found nobody knew what "Curated" promised. The same
 * five levels, said plainly, keyed on the type so a new level cannot ship
 * without a line here.
 */
const DEPTH_IN_PLAIN_WORDS: Record<DataDepth, string> = {
  deep: "Deeply catalogued",
  curated: "Reviewed knowledge",
  researched: "Researched and reviewed",
  capsule: "Growing archive",
  planned: "Not yet available",
};

export async function GlobalEntry({
  /** Rendered between the destinations and the interests — the journey tray,
      which belongs directly under the cards it summarises. */
  between,
}: {
  between?: ReactNode;
}) {
  const coverage = await allCoverage();
  const interests = globallyCoveredInterests(coverage);

  /*
   * One photograph and one identity line per destination.
   *
   * The card opens on the first catalogued record of that destination that
   * has a photograph, so the image is always one the destination owns, and
   * the line under the name names that record and counts the rest — "Hawa
   * Mahal and 11 more catalogued places". Derived from the records, so it
   * cannot go stale and cannot be an unsourced judgement.
   */
  const placesByDestination = new Map(
    await Promise.all(
      coverage.map(async ({ destination }) => {
        const places = await getPlaces(destination.id);
        return [destination.id, places] as const;
      }),
    ),
  );
  const byId = new Map(coverage.map((entry) => [entry.destination.id, entry]));
  /* Built once from the whole set — a destination's characterising words only
     exist relative to the others. */
  const keywordsById = buildDestinationKeywords(coverage);
  const countries = groupByCountry();

  return (
    <>
      {/* ------------------------------------------------ Where can I go? */}
      <section
        id="destinations"
        aria-labelledby="destinations-heading"
        className="scroll-mt-20 border-y border-border bg-surface-muted/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2
            id="destinations-heading"
            className="max-w-3xl font-display text-h1 text-balance-heading"
          >
            Explore {coverage.length} Indian destinations
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            Across {listRegionNames().length} states and union territories. Each
            card says what the place is known for and how much of it has been
            catalogued — a shorter archive is not a lesser place, only a less
            documented one.
          </p>

          {/*
            ONE GRID, NOT ONE PER COUNTRY. Every destination is in India, which
            makes a per-country heading a heading over the whole grid — so
            there is none, and every card names its own state instead.
          */}
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries
              .flatMap(({ destinations }) => destinations)
              .map((destination) => {
                const entry = byId.get(destination.id);
                const keywords = keywordsById.get(destination.id);
                const places = placesByDestination.get(destination.id) ?? [];
                const hero = places.find((place) => place.image);
                const depth = entry?.depth ?? destination.depth;
                const identity = hero
                  ? places.length > 1
                    ? `${hero.name} and ${places.length - 1} more catalogued ${places.length === 2 ? "place" : "places"}`
                    : hero.name
                  : entry?.knowledgeOnly
                    ? "Reviewed knowledge, no catalogued place yet"
                    : "Nothing catalogued yet";
                return (
                  /*
                     `scroll-mt-24` clears the 64px fixed header. The <li> is
                     a flex column so the tile and its selection control stack
                     instead of overlapping — grid items stretch by default,
                     and a tile that fills the cell swallows clicks meant for
                     the button underneath it.
                  */
                  <li key={destination.id} className="flex scroll-mt-24 flex-col">
                    <Link
                      href={`/destinations/${destination.id}`}
                      className="tile group flex flex-1 flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {hero?.image ? (
                        <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                          <Image
                            src={hero.image}
                            alt={hero.imageAlt ?? `${hero.name}, ${destination.name}`}
                            fill
                            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                            className={`media-zoom object-cover group-hover:scale-[1.04] ${focalClassFor(hero.image)}`}
                          />
                        </span>
                      ) : null}
                      <span className="flex flex-1 flex-col p-4">
                        <span className="font-display text-h4">{destination.name}</span>
                        <span className="mt-0.5 text-caption text-subtle">
                          {destinationLocationLine(
                            destination.name,
                            destination.region?.name,
                            destination.country.name,
                          )}
                        </span>
                        <span className="mt-2 block text-small text-foreground/85">{identity}</span>

                        {/*
                          What this place is FOR, in three words — derived
                          from the interests its own catalogued records carry,
                          not typed into the registry.
                        */}
                        {keywords.length > 0 ? (
                          <span className="mt-1 block text-caption text-muted">
                            {keywords.join(" · ")}
                          </span>
                        ) : null}

                        <span className="mt-3 flex flex-1 flex-wrap items-end justify-between gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1.5 text-small font-medium text-primary">
                            Explore {destination.name}
                            <ArrowRight className="size-3.5" aria-hidden />
                          </span>
                          <span className="text-caption text-subtle">
                            {DEPTH_IN_PLAIN_WORDS[depth]}
                          </span>
                        </span>
                      </span>
                    </Link>

                    {/*
                      The selection control sits BESIDE the tile, not on it.
                      The tile means "open this destination" and has meant that
                      since Phase 2; making it toggle a journey instead would
                      break the obvious action for every visitor who is not
                      building one. Its own control, its own label, its own tab
                      stop.
                    */}
                    <div className="mt-2">
                      <SelectDestination
                        destinationId={destination.id}
                        destinationName={destination.name}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/destinations" className={cn(buttonClasses({ size: "lg" }))}>
              See them all on the map
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/destinations/compare"
              prefetch={false}
              className={cn(buttonClasses({ variant: "outline", size: "lg" }))}
            >
              Compare destinations
            </Link>
          </div>
        </div>
      </section>

      {between}

      {/* ---------------------------------------- What do you want to see? */}
      <section
        id="interests"
        aria-labelledby="interests-heading"
        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 md:py-20"
      >
        <h2
          id="interests-heading"
          className="max-w-3xl font-display text-h1 text-balance-heading"
        >
          What do you want to experience?
        </h2>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          We&apos;ll use your interests to find destinations that match what you
          want to experience. Only interests a destination can actually satisfy
          are listed — {interests.length} of {Object.keys(INTEREST_LABEL).length}{" "}
          today.
        </p>

        <ul className="mt-8 flex flex-wrap gap-2.5">
          {interests.map((interest) => (
            <li key={interest}>
              <Link
                href={`/discover?interests=${interest}`}
                prefetch={false}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 py-2.5 text-body font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {INTEREST_LABEL[interest]}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Link
            href="/discover"
            prefetch={false}
            className={cn(buttonClasses({ size: "lg" }))}
          >
            Find destinations for me
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
