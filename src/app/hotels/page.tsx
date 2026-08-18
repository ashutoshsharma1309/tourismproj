import { ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { Footer } from "@/components/layout/Footer";
import { TSDBreakdown } from "@/components/bookings/TSDBreakdown";
import { Badge } from "@/components/ui/Badge";
import { representativePhoto } from "@/data/galleries";
import { hotels, REGISTER_STATS } from "@/data/hotels";

export const metadata: Metadata = {
  title: "Stays",
  description:
    "A directory of registered Sikkim properties, plus the state's Tourism Sustainability Development levy explained.",
};

/**
 * A district's own photograph, for the section header.
 *
 * This page deliberately shows NO photograph of any property — there is no
 * licensed feed for them, and a stock hotel picture would be exactly the kind
 * of invention this directory was stripped back to remove. A picture of the
 * town the property stands in is a different claim, and the caption makes that
 * claim explicitly rather than leaving the reader to assume it.
 */
function districtPhoto(district: string) {
  return representativePhoto("place", district.toLowerCase());
}

/** The register runs to 675 properties in Gangtok alone, so each district
    shows a sample and links out to the department's own list. */
const PER_DISTRICT = 12;

export default function StaysPage() {
  const districts = [...new Set(hotels.map((h) => h.district))].sort();
  const districtCount = (d: string) => hotels.filter((h) => h.district === d).length;

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

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            {districts.map((district) => {
              const photo = districtPhoto(district);
              return (
              <section key={district} className="mb-10">
                {photo ? (
                  <figure className="mb-4">
                    <div className="relative h-44 overflow-hidden rounded-xl border bg-surface-muted md:h-56">
                      <Image
                        src={photo.localPath}
                        alt={photo.caption ?? `${district}, Sikkim`}
                        fill
                        sizes="(min-width: 1024px) 42rem, 100vw"
                        className="object-cover"
                      />
                      <div className="gradient-overlay absolute inset-0" aria-hidden />
                      <h2 className="absolute bottom-4 left-5 font-display text-h3 text-foreground-inverse text-glow">
                        {district} district
                      </h2>
                    </div>
                    <figcaption className="mt-2 text-caption text-subtle">
                      {district}, Sikkim — not a photograph of any property listed
                      below. © {photo.attribution} · {photo.license} ·{" "}
                      <a
                        href={photo.descriptionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-dotted underline-offset-2 hover:no-underline"
                      >
                        Commons
                      </a>
                    </figcaption>
                  </figure>
                ) : (
                  <h2 className="font-display text-h3">{district} district</h2>
                )}
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {hotels
                    .filter((hotel) => hotel.district === district)
                    .slice(0, PER_DISTRICT)
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
                            {/* Only 22 of 905 register entries carry a star
                                category. A badge on the rest would put a grade
                                back where the state records none. */}
                            {hotel.category ? (
                              <Badge tone="neutral">{hotel.category}</Badge>
                            ) : null}
                          </span>
                          {hotel.address ? (
                            <span className="text-caption leading-relaxed text-muted">
                              {hotel.address}
                            </span>
                          ) : null}
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-subtle">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="size-3.5" aria-hidden />
                              {hotel.district}
                            </span>
                            {hotel.registrationNo ? <span>Reg. {hotel.registrationNo}</span> : null}
                          </span>
                          <span className="mt-auto flex items-center gap-1.5 pt-2 text-small font-medium text-primary">
                            Open in Google Maps
                            <ExternalLink className="size-3.5" aria-hidden />
                          </span>
                        </a>
                      </li>
                    ))}
                </ul>
                {districtCount(district) > PER_DISTRICT ? (
                  <p className="mt-3 text-caption text-subtle">
                    Showing {PER_DISTRICT} of {districtCount(district)} registered
                    properties in {district} district.{" "}
                    <a
                      href={REGISTER_STATS.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      The full register is published by the department
                    </a>
                    .
                  </p>
                ) : null}
              </section>
              );
            })}
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
