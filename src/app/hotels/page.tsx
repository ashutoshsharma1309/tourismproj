import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { TSDBreakdown } from "@/components/bookings/TSDBreakdown";
import { CuratedStays } from "@/components/stays/CuratedStays";
import { REGISTER_STATS } from "@/data/hotels";
import { STAY_IMAGE_STATS } from "@/data/stay-images";
import {
  STAYS_BY_DISTRICT,
  CURATED_STATS,
  STAR_GRADES,
} from "@/data/curated-stays";

export const metadata: Metadata = {
  title: "Stays",
  description:
    "A directory of registered Sikkim properties, plus the state's Tourism Sustainability Development levy explained.",
};

export default function StaysPage() {

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Where to stay
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          State-graded stays across Sikkim
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          The {CURATED_STATS.total} properties the Tourism &amp; Civil Aviation
          Department awards a star grade, across{" "}
          {CURATED_STATS.districts} districts. The grade is the state&apos;s
          own — this page ranks nothing itself.
        </p>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          {STAY_IMAGE_STATS.properties} of the {CURATED_STATS.total} are shown
          in their own photographs, published by the hotels themselves and
          displayed from their sites rather than copied here. The other{" "}
          {CURATED_STATS.total - STAY_IMAGE_STATS.properties} have none that
          could be verified, so their cards carry a freely licensed photograph
          of a catalogued place in the same district, captioned with what it
          actually depicts — never with the hotel beside it. No tariff and no
          guest rating appears anywhere, because none could be verified.
        </p>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          Every property carries the register&apos;s own telephone number —{" "}
          {CURATED_STATS.withPhone} of {CURATED_STATS.total} have one — and a
          Google Maps destination. {CURATED_STATS.withWebsite} have an official
          website that was fetched and confirmed to answer; the rest were
          searched for and either do not exist or no longer resolve. Read from{" "}
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
