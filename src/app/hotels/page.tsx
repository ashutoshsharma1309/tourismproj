import { ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { TSDBreakdown } from "@/components/bookings/TSDBreakdown";
import { Badge } from "@/components/ui/Badge";
import { hotels } from "@/data/hotels";

export const metadata: Metadata = {
  title: "Stays",
  description:
    "A directory of registered Sikkim properties, plus the state's Tourism Sustainability Development levy explained.",
};

export default function StaysPage() {
  const districts = [...new Set(hotels.map((h) => h.district))].sort();

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Where to stay
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Registered stays across Sikkim
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          A directory of real, named properties. Ney Heritage does not hold a
          licensed rates or reviews feed, so no tariff, star rating or guest
          review is shown — each entry links to the property on Google Maps
          where that information is live and attributable.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            {districts.map((district) => (
              <section key={district} className="mb-10">
                <h2 className="font-display text-h3">{district} district</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {hotels
                    .filter((hotel) => hotel.district === district)
                    .map((hotel) => (
                      <li key={hotel.slug}>
                        <a
                          href={hotel.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="card-lift flex h-full flex-col gap-2 rounded-xl border bg-surface p-5 shadow-soft"
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="text-body font-semibold">{hotel.name}</span>
                            <Badge tone="neutral">{hotel.tier}</Badge>
                          </span>
                          <span className="flex items-center gap-1.5 font-mono text-caption text-subtle">
                            <MapPin className="size-3.5" aria-hidden />
                            {hotel.district}
                          </span>
                          <span className="mt-auto flex items-center gap-1.5 pt-2 text-small font-medium text-primary">
                            Open in Google Maps
                            <ExternalLink className="size-3.5" aria-hidden />
                          </span>
                        </a>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
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
