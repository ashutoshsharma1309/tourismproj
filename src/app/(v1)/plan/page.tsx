import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { DepthBadge } from "@/components/ui/DepthBadge";
import { SITE } from "@/lib/constants";
import { coverageDimensions, earnedDepth } from "@/lib/destinations/earned-depth";
import { heroImages } from "@/lib/global-index";
import { listDestinations } from "@/lib/destinations/registry";

/**
 * Where a journey starts: pick the destination, then plan inside it.
 *
 * WHY THE PLANNER IS NOT GLOBAL
 * -----------------------------
 * A plan is an ordered list of stops with travel between them, and this
 * product has no travel-time data between cities in different countries — nor
 * any licensed feed that could supply it. A "plan a trip across fifteen
 * destinations" screen would therefore have to invent the one thing that makes
 * it a plan.
 *
 * So this page does the honest half: it shows what each destination can
 * actually plan with, and hands over to that destination's own planner, which
 * orders real records by a documented formula and states its reasoning.
 */
export const metadata: Metadata = {
  title: `Plan a journey · ${SITE.name}`,
  description:
    "Choose a destination and build an itinerary from catalogued records, with the reasoning for every stop stated.",
};

export default async function PlanPage() {
  const destinations = listDestinations();
  const images = await heroImages();

  const rows = await Promise.all(
    destinations.map(async (destination) => ({
      destination,
      depth: (await earnedDepth(destination.id, destination.depth)).depth,
      coverage: await coverageDimensions(destination.id),
      hero: images.get(destination.id),
    })),
  );

  /* A destination with nothing to visit cannot be planned, and says so rather
     than offering a planner that would open empty. */
  const plannable = rows.filter((row) => row.coverage.places > 0);
  const notYet = rows.filter((row) => row.coverage.places === 0);

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-6 pt-28 pb-20">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Turn discovery into a journey
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          A plan that tells you why each stop is on it
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          Choose where you are going. The planner offers only that
          destination&apos;s own records, orders them by a documented formula,
          and states the evidence behind every stop — and states, just as
          plainly, what it cannot tell you.
        </p>
        <p className="mt-4 max-w-2xl text-body text-muted">
          Nothing is priced, timed or booked. There is no licensed rates feed
          behind this product, and a guessed total would be worse than none.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plannable.map(({ destination, depth, coverage, hero }) => (
            <li key={destination.id}>
              <Link
                href={`/destinations/${destination.id}/plan`}
                prefetch={false}
                className="tile group flex h-full flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {hero?.image ? (
                  <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                    <Image
                      src={hero.image}
                      alt={hero.imageAlt ?? `${hero.name}, ${destination.name}`}
                      fill
                      sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                      className="media-zoom object-cover group-hover:scale-[1.04]"
                    />
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col p-4">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-display text-h4">{destination.name}</span>
                    <DepthBadge depth={depth} />
                  </span>
                  <span className="mt-1 text-caption text-subtle">
                    {destination.country.name}
                  </span>
                  <span className="mt-3 text-caption text-muted" data-numeric>
                    {coverage.places} places · {coverage.history} dated events
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-small font-medium text-primary">
                    Plan a journey
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {notYet.length > 0 ? (
          <section className="mt-12 rounded-xl border border-border bg-surface-muted/40 p-5">
            <h2 className="font-display text-h4">Not yet plannable</h2>
            <p className="mt-2 max-w-2xl text-body text-muted">
              {notYet.map((row) => row.destination.name).join(", ")}{" "}
              {notYet.length === 1 ? "holds" : "hold"} reviewed knowledge but no
              catalogued place to visit yet, so there is nothing for a planner
              to order. More verified knowledge is being added.
            </p>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
