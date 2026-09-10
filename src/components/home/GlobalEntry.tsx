import { ArrowRight } from "lucide-react";
import { focalClassFor } from "@/lib/media/focal";
import Link from "next/link";

import { SelectDestination } from "@/components/journey-select/SelectDestination";

import Image from "next/image";

import { DepthBadge } from "@/components/ui/DepthBadge";
import { getPlaces } from "@/lib/destinations/content";
import { groupByCountry } from "@/lib/destinations/registry";
import { buildDestinationKeywords } from "@/lib/destinations/keywords";
import { destinationLocationLine } from "@/lib/destinations/location";
import { allCoverage, globallyCoveredInterests } from "@/lib/global/coverage";
import { INTEREST_LABEL } from "@/lib/planner/types";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * The three things a first-time visitor needs, immediately below the hero.
 *
 * WHY THIS EXISTS
 * ---------------
 * The landing page's hero has said "TerraStory" since Phase 21, and then
 * everything below it was Sikkim: monasteries, the Sikkim heritage map, Sikkim
 * stories, Sikkim's planner. A visitor who read the hero and scrolled learned
 * that this was a Sikkim site after all, and the fifteen destinations were
 * reachable only by noticing a navigation item.
 *
 * So the page now answers, in order, the three questions it was making people
 * hunt for:
 *
 *   1. What can I explore?      — the interests, which are the door you can
 *                                 walk through without knowing a place name.
 *   2. Where can I go?          — all fifteen destinations, grouped by country,
 *                                 with what is actually known about each.
 *   3. What does this do?       — the four stages, each naming its real route.
 *
 * Sikkim's own sections follow immediately after, introduced as the flagship
 * archive. Nothing was removed from them.
 *
 * EVERY FIGURE HERE IS COUNTED
 * ----------------------------
 * The interests come from `globallyCoveredInterests`, which offers one only
 * where a registered destination can actually satisfy it — so no chip leads to
 * an empty page. The destination rows read their depth and their covered
 * interests from the same coverage the /destinations page uses. Nothing on
 * this page is a number somebody typed.
 */
export async function GlobalEntry() {
  const coverage = await allCoverage();
  const interests = globallyCoveredInterests(coverage);

  /*
   * One photograph per destination, for the tiles.
   *
   * The grid was fifteen text boxes — accurate, and the least persuasive way
   * to present fifteen places a traveller might go. Each tile now opens on the
   * first catalogued record of that destination that has a photograph, so the
   * image is always one the destination owns and a destination without any
   * keeps a text tile rather than borrowing one.
   *
   * Loaded at build time; the page is static, so this costs nothing per
   * request and the images themselves are lazy.
   */
  const heroByDestination = new Map(
    await Promise.all(
      coverage.map(async ({ destination }) => {
        const places = await getPlaces(destination.id);
        const hero = places.find((place) => place.image);
        return [destination.id, hero] as const;
      }),
    ),
  );
  const byId = new Map(coverage.map((entry) => [entry.destination.id, entry]));
  /* Built once from the whole set — a destination's characterising words only
     exist relative to the others. */
  const keywordsById = buildDestinationKeywords(coverage);
  const countries = groupByCountry();

  /*
   * Two different facts, and conflating them was a bug in the first draft of
   * this component: it said "15 of them carrying catalogued records today",
   * which counted `!empty` — and `empty` means "neither places NOR knowledge".
   * Jaipur and Kyoto hold reviewed knowledge and no visitable record at all,
   * so the sentence claimed catalogued places for two destinations that have
   * none. Count the thing the sentence names.
   */
  const withPlaces = coverage.filter(
    (entry) => entry.totals.experiences > 0,
  ).length;
  const knowledgeOnly = coverage.filter((entry) => entry.knowledgeOnly).length;

  return (
    <>
      {/* ------------------------------------------------ Where can I go? */}
      <section
        id="destinations"
        aria-labelledby="destinations-heading"
        className="scroll-mt-20 border-y border-border bg-surface-muted/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Browse destinations
          </p>
          <h2
            id="destinations-heading"
            className="mt-3 max-w-3xl font-display text-h1 text-balance-heading"
          >
            Where will your story begin?
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            {coverage.length} destinations across {countries.length} countries.{" "}
            {withPlaces} carry catalogued places you can visit.
            {knowledgeOnly > 0
              ? ` ${knowledgeOnly} hold reviewed knowledge without a visitable record yet, and say so.`
              : ""}{" "}
            Each card names what the destination is known for and how deeply it
            has been catalogued, so you know what you are opening before you
            click. A shorter archive is not a lesser place — only a less
            documented one.
          </p>

          {/*
            ONE GRID, NOT ONE PER COUNTRY.
            Grouping each country under its own heading gave every country its
            own row, and ten of the fifteen destinations are in India — so
            France, Italy, Japan, Türkiye and the United States each rendered a
            single card in a three-column grid with two-thirds of the row
            empty. Harmless while the cards were text; conspicuous now that
            each one carries a photograph.

            The destinations stay in country order and every card names its own
            country, so nothing is lost but the gaps.
          */}
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries
              .flatMap(({ destinations }) => destinations)
              .map((destination) => {
                const entry = byId.get(destination.id);
                const covered = entry?.covered.length ?? 0;
                const keywords = keywordsById.get(destination.id);
                const hero = heroByDestination.get(destination.id);
                return (
                  /*
                     `scroll-mt-24` clears the 64px fixed header. Anything that
                     scrolls an element into view — a keyboard user tabbing to a
                     control below the fold, an in-page anchor, an automated
                     click — otherwise parks it underneath the header, where it
                     cannot be read or clicked.
                  */
                  /*
                     The <li> is a flex column so the tile and its selection
                     control stack instead of overlapping. Grid items stretch
                     by default, and the tile's `h-full` made the LINK fill the
                     whole cell — including the strip the button sits in — so
                     the card's own image was swallowing clicks meant for the
                     button underneath it.
                  */
                  <li
                    key={destination.id}
                    className="flex scroll-mt-24 flex-col"
                  >
                    <Link
                      href={`/destinations/${destination.id}`}
                      className="tile group flex flex-1 flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {hero?.image ? (
                        <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                          <Image
                            src={hero.image}
                            alt={
                              hero.imageAlt ??
                              `${hero.name}, ${destination.name}`
                            }
                            fill
                            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                            className={`media-zoom object-cover group-hover:scale-[1.04] ${focalClassFor(hero.image)}`}
                          />
                        </span>
                      ) : null}
                      <span className="flex flex-1 flex-col p-4">
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-display text-h4">
                            {destination.name}
                          </span>
                          <DepthBadge
                            depth={entry?.depth ?? destination.depth}
                          />
                        </span>
                        <span className="mt-1 text-caption text-subtle">
                          {destinationLocationLine(
                            destination.name,
                            destination.region?.name,
                            destination.country.name,
                          )}
                        </span>

                        {/*
                          What this place is FOR, in three words — and they are
                          derived from the interests its own catalogued records
                          carry, not typed into the registry. Fifteen
                          hand-written labels would be fifteen unsourced
                          editorial judgements, and the first one to go stale
                          teaches a reader the labels are decoration.
                        */}
                        {keywords.length > 0 ? (
                          <span className="mt-2 block text-caption text-foreground/80">
                            {keywords.join(", ")}
                          </span>
                        ) : null}
                        {/*
                            The one line under each name is counted, not
                            described: how many interests this destination can
                            actually answer. A destination with none says so
                            rather than showing an empty row.
                          */}
                        <span className="mt-3 text-caption text-muted">
                          {covered > 0
                            ? `${covered} ${covered === 1 ? "interest" : "interests"} covered`
                            : entry?.knowledgeOnly
                              ? "Verified knowledge, no catalogued place yet"
                              : "Nothing catalogued yet"}
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

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/destinations"
              className={cn(buttonClasses({ size: "lg" }))}
            >
              Open the destination map
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/destinations/compare"
              prefetch={false}
              className={cn(buttonClasses({ variant: "outline", size: "lg" }))}
            >
              Compare what is known
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------- What do you want to see? */}
      <section
        id="interests"
        aria-labelledby="interests-heading"
        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 md:py-24"
      >
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Start from an interest
        </p>
        <h2
          id="interests-heading"
          className="mt-3 max-w-3xl font-display text-h1 text-balance-heading"
        >
          What do you want to experience?
        </h2>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          Pick one and TerraStory shows which destinations have verified
          coverage of it, what that coverage consists of, and where it runs out.
          Only interests a registered destination can actually satisfy are
          listed — {interests.length} of {Object.keys(INTEREST_LABEL).length}{" "}
          today.
        </p>

        <ul className="mt-8 flex flex-wrap gap-2.5">
          {interests.map((interest) => (
            <li key={interest}>
              <Link
                href={`/discover?interests=${interest}`}
                prefetch={false}
                className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2.5 text-body font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {INTEREST_LABEL[interest]}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6">
          <Link
            href="/discover"
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:underline"
          >
            Or combine several interests
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </section>

      {/* ------------------------------------------------- How this works */}
      <section
        aria-labelledby="how-heading"
        className="mx-auto max-w-6xl px-6 py-20 md:py-24"
      >
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          How TerraStory works
        </p>
        <h2
          id="how-heading"
          className="mt-3 max-w-3xl font-display text-h1 text-balance-heading"
        >
          Four stages, and you can enter at any of them
        </h2>

        {/*
          Not a marketing "how it works" block: each step is a route that
          exists, named, so the list doubles as a table of contents for the
          product. The examples are Sikkim's because Sikkim is the deepest
          archive and therefore the clearest illustration — the same four
          stages run for every destination that has the records.
        */}
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "Discover",
              question: "What interests you?",
              body: "Choose an interest and see which destinations can answer it, with the evidence counted.",
              href: "/discover",
              action: "Start from an interest",
            },
            {
              step: "Explore",
              question: "Where can you experience it?",
              body: "Open a destination and see its places, grouped by the interests its own records carry.",
              href: "/destinations",
              action: "Browse destinations",
            },
            {
              step: "Understand",
              question: "Why does this place matter?",
              body: "Every record links to its stories, its dated events and the sources behind both.",
              href: "/destinations/sikkim/discover",
              action: "See it in the deep archive",
            },
            {
              step: "Plan",
              question: "How would you travel it?",
              body: "Add what interested you to a journey. The plan says why each stop is there — and what it cannot tell you.",
              href: "/destinations/sikkim/plan",
              action: "Plan a journey",
            },
          ].map((stage, index) => (
            <li key={stage.step} className="tile flex flex-col p-5">
              <span
                className="font-mono text-eyebrow tracking-widest text-primary uppercase"
                data-numeric
              >
                Step {index + 1}
              </span>
              <h3 className="mt-2 font-display text-h3">{stage.step}</h3>
              <p className="mt-1 text-body font-medium text-foreground">
                {stage.question}
              </p>
              <p className="mt-2 flex-1 text-body text-muted">{stage.body}</p>
              <Link
                href={stage.href}
                prefetch={false}
                className="mt-4 inline-flex min-h-6 items-center gap-1.5 py-1 text-small font-medium text-primary hover:underline"
              >
                {stage.action}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
