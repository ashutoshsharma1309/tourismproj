/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { TSDBreakdown } from "@/components/bookings/TSDBreakdown";
import { CuratedStays } from "@/components/stays/CuratedStays";
import { REGISTER_STATS } from "@/data/hotels";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import {
  STAYS_BY_DISTRICT,
  CURATED_STATS,
  PUBLIC_STATS,
  STAR_GRADES,
} from "@/data/curated-stays";

const CAPABILITY = "stays" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "stays",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "Stays",
  description:
    "A directory of registered Sikkim properties, plus the state's Tourism Sustainability Development levy explained.",
};

export default async function StaysPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);


  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Stays"
        />
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Where to stay
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          State-graded stays across Sikkim
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          The {PUBLIC_STATS.total} state-graded properties that can be shown in
          their own photographs, across {PUBLIC_STATS.districts} districts. The
          grade is the Tourism &amp; Civil Aviation Department&apos;s — this
          page ranks nothing itself.
        </p>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          Every photograph here is of the hotel beside it, published by that
          hotel and served from its own site rather than copied here. That is
          the whole entry requirement for this page: the department grades{" "}
          {CURATED_STATS.total} properties, and the {PUBLIC_STATS.hidden} whose
          photographs could not be found or licensed are not listed as cards —
          a directory of apologies is worse than a shorter directory. Their
          register entries remain published at their own pages, with the reason
          stated. No tariff and no guest rating appears anywhere, because none
          could be verified.
        </p>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          Every property listed carries the register&apos;s own telephone
          number, a Google Maps destination, and — for{" "}
          {PUBLIC_STATS.withWebsite} of them — an official website that was
          fetched and confirmed to answer. Read from{" "}
          <a
            href={REGISTER_STATS.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            the department&apos;s register
          </a>{" "}
          on {REGISTER_STATS.retrievedAt}. The full register of{" "}
          {REGISTER_STATS.published.toLocaleString()} licensed properties sits
          behind this page as its reference layer.
        </p>

        {/*
          The levy panel sits above the grid, not beside it.

          It was a sticky right rail against a column of 22 cards, and it is
          about 400px tall — so for the whole scroll below it the page was a
          340px empty gutter running down the right of every row, while the
          cards were squeezed into three narrow columns in the remaining 772px.
          Moving it up gives the grid the full container and puts the levy where
          it is actually read: before the properties, since it is a cost that
          applies whichever one you choose.
        */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <p className="rounded-xl border border-dashed p-4 text-caption leading-relaxed text-muted lg:order-2">
            Rates, availability and guest reviews return when a licensed Places
            or booking integration is connected. Until then this page shows only
            what can be stated without inventing it.
          </p>
          <div className="lg:order-1">
            <TSDBreakdown travellers={2} />
          </div>
        </div>

        <div className="mt-10">
          <div>
            {/*
              The 22 the state grades, not the 905 it licenses.
              The register is an administrative list; scrolling it is not
              discovering somewhere to stay. The grading is the one editorial
              judgement in this data that the project did not make itself,
              which makes it the honest basis for a curated page. The full
              register stays in the data layer and is linked below.
            */}
            <CuratedStays districts={STAYS_BY_DISTRICT} grades={STAR_GRADES} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
