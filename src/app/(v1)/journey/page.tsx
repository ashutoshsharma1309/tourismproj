import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { JourneySummary } from "@/components/journey-select/JourneySummary";
import { SITE } from "@/lib/constants";
import { coverageDimensions } from "@/lib/destinations/earned-depth";
import { listDestinations } from "@/lib/destinations/registry";

/**
 * The journey: where the visitor is, and what they have covered.
 *
 * WHY THIS PAGE IS STATIC AND THE JOURNEY IS NOT
 * ----------------------------------------------
 * The journey lives in the browser, so the page cannot be rendered per
 * visitor. What it CAN do is ship every destination's real counts, and let a
 * small client component pick out the chosen ones. That keeps the page static,
 * keeps the counts honest — they come from the archive at build time, not from
 * anything the browser could have invented — and means the summary never shows
 * a number nobody counted.
 */
export const metadata: Metadata = {
  title: `Your journey · ${SITE.name}`,
  description:
    "The destinations you chose, how far through them you are, and what each one holds.",
};

export default async function JourneyPage() {
  const destinations = listDestinations();

  const coverage = Object.fromEntries(
    await Promise.all(
      destinations.map(async (destination) => {
        const dimensions = await coverageDimensions(destination.id);
        return [
          destination.id,
          {
            name: destination.name,
            country: destination.country.name,
            region: destination.region?.name ?? destination.country.name,
            places: dimensions.places,
            stories: dimensions.stories,
            history: dimensions.history,
          },
        ] as const;
      }),
    ),
  );

  return (
    <>
      <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
        <JourneySummary coverage={coverage} />
      </main>
      <Footer />
    </>
  );
}
