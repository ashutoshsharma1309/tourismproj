import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { TSDBreakdown } from "@/components/bookings/TSDBreakdown";
import { StaysExplorer } from "@/components/stays/StaysExplorer";
import { hotels, REGISTER_STATS, STAY_SOURCES } from "@/data/hotels";

export const metadata: Metadata = {
  title: "Stays",
  description:
    "A directory of registered Sikkim properties, plus the state's Tourism Sustainability Development levy explained.",
};

export default function StaysPage() {
  const districts = [...new Set(hotels.map((h) => h.district))].sort();

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Where to stay
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Registered stays across Sikkim
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          Every property here is on the Government of Sikkim&apos;s own register
          of licensed hotels — {REGISTER_STATS.published.toLocaleString()} of the{" "}
          {REGISTER_STATS.reportedTotal?.toLocaleString()} entries the department
          publishes, each with its registration number.
        </p>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          No tariff, guest rating or review is shown: Sikkim Darshan holds no
          licensed feed for them. Nor is a star grade invented — the register
          records a category for only {REGISTER_STATS.withCategory} of these
          properties, and the rest are shown without one. Read from{" "}
          <a
            href={REGISTER_STATS.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            the department&apos;s register
          </a>{" "}
          on {REGISTER_STATS.retrievedAt}.
        </p>
        <p className="mt-3 max-w-2xl text-small leading-relaxed text-muted">
          {REGISTER_STATS.located} of them could be matched to a mapped location
          in{" "}
          <a
            href={STAY_SOURCES.osm.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            OpenStreetMap
          </a>{" "}
          ({STAY_SOURCES.osm.licence}), which is where their coordinates,
          approximate distances, {REGISTER_STATS.withWebsite} websites and{" "}
          {REGISTER_STATS.withPhone} telephone numbers come from. A match counts
          only when the district agrees too — six were rejected because it did
          not. The rest carry what the register alone publishes.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            {/*
              One searchable list, not twelve-per-district with a link out.
              The register holds 905 properties; the district sections showed 70
              of them, so 835 registered hotels could not be reached from this
              site at all. Grouping by district survives as a filter, which is
              what the grouping was actually for.
            */}
            <StaysExplorer
              rows={hotels.map((hotel) => ({
                slug: hotel.slug,
                name: hotel.name,
                district: hotel.district,
                address: hotel.address,
                category: hotel.category,
                registrationNo: hotel.registrationNo,
                mapsUrl: hotel.googleMapsUrl,
                located: hotel.osm !== null,
                confidence: hotel.osm?.confidence ?? null,
                website: hotel.osm?.website ?? null,
                phone: hotel.osm?.phone ?? null,
                distances: hotel.osm?.distancesKm ?? null,
              }))}
              districts={districts}
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TSDBreakdown travellers={2} />
            <p className="mt-4 rounded-xl border border-dashed p-4 text-caption leading-relaxed text-muted">
              Rates, availability and guest reviews return when a licensed
              Places or booking integration is connected. Until then this page
              shows only what can be stated without inventing it.
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
