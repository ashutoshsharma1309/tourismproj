import { CalendarRange, Route, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { ItineraryMap } from "@/components/planner/ItineraryExtras";
import { Badge } from "@/components/ui/Badge";
import { representativePhoto } from "@/data/galleries";
import { generateItinerary } from "@/lib/generate-itinerary";
import { formatPrice, formatPriceCompact } from "@/lib/format";
import type { PlannerInterest, PlannerStyle } from "@/types";

export const metadata: Metadata = {
  title: "Your Itinerary",
  description: "Day-by-day Sikkim itinerary with hotels, route map and full cost breakdown.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_INTERESTS: PlannerInterest[] = [
  "Monasteries",
  "Trekking",
  "Lakes",
  "Culture",
  "Food",
  "Adventure",
];
const VALID_STYLES: PlannerStyle[] = ["Solo", "Couple", "Family", "Group", "Luxury", "Budget"];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ItineraryResultPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const interests = first(params.interests)
    .split(",")
    .filter((value): value is PlannerInterest =>
      (VALID_INTERESTS as string[]).includes(value),
    );
  const styleParam = first(params.style);
  const style: PlannerStyle = (VALID_STYLES as string[]).includes(styleParam)
    ? (styleParam as PlannerStyle)
    : "Couple";
  const budget = Number(first(params.budget)) || 35_000;
  const duration = Number(first(params.duration)) || 7;

  const itinerary = generateItinerary({
    interests,
    budget,
    duration,
    travelStyle: style,
  });

  /* Collapse consecutive days in the same base into route stops. */
  const stops: Array<{ location: string; coordinates: { lat: number; lng: number }; days: string }> =
    [];
  for (const day of itinerary.dayPlans) {
    const last = stops[stops.length - 1];
    if (last && last.location === day.location) {
      last.days = `${last.days.split("–")[0]}–Day ${day.day}`;
    } else {
      stops.push({
        location: day.location,
        coordinates: day.coordinates,
        days: `Day ${day.day}`,
      });
    }
  }

  const summary = [
    { icon: CalendarRange, label: `${itinerary.days} days, ${itinerary.nights} nights` },
    { icon: Users, label: itinerary.travelStyle },
    { icon: Wallet, label: `${formatPriceCompact(budget)} budget/person` },
    { icon: Route, label: stops.map((stop) => stop.location).join(" → ") },
  ];

  const cost = itinerary.cost;

  /* A route reads as a list of place names until you see the places. Each base
     the itinerary sleeps in is also a mapped place in this archive, so its own
     photography is already here — no separate stock imagery needed. */
  const routePhotos = stops
    .map((stop) => ({ stop, photo: representativePhoto("place", stop.location.toLowerCase()) }))
    .filter((entry): entry is { stop: (typeof stops)[number]; photo: NonNullable<typeof entry.photo> } =>
      entry.photo !== undefined,
    );

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Your itinerary
        </p>
        <h1 className="mt-3 font-display text-h1">{itinerary.name}</h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {summary.map((item) => (
            <p key={item.label} className="flex items-center gap-2 text-small text-muted">
              <item.icon className="size-4 text-primary" aria-hidden />
              {item.label}
            </p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {itinerary.interests.map((interest) => (
            <Badge key={interest} tone="jade">
              {interest}
            </Badge>
          ))}
        </div>

        {routePhotos.length > 0 ? (
          <section className="mt-8" aria-label="The bases on this route">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {routePhotos.map(({ stop, photo }) => (
                <li key={stop.location}>
                  <figure>
                    <div className="relative h-40 overflow-hidden rounded-xl border bg-surface-muted">
                      <Image
                        src={photo.localPath}
                        alt={photo.caption ?? `${stop.location}, Sikkim`}
                        fill
                        sizes="(min-width: 1024px) 18rem, (min-width: 640px) 45vw, 92vw"
                        className="object-cover"
                      />
                      <div className="gradient-overlay absolute inset-0" aria-hidden />
                      <figcaption className="absolute inset-x-0 bottom-0 p-3">
                        <span className="block font-display text-h4 text-foreground-inverse text-glow">
                          {stop.location}
                        </span>
                        <span className="font-mono text-caption text-foreground-inverse/80">
                          {stop.days}
                        </span>
                      </figcaption>
                    </div>
                    <p className="mt-1.5 text-caption text-subtle">
                      © {photo.attribution} · {photo.license}
                    </p>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* Day by day */}
          <section aria-label="Day-by-day itinerary" className="min-w-0">
            <ol className="relative flex flex-col gap-4 border-l-2 border-primary-soft pl-6">
              {itinerary.dayPlans.map((day) => (
                <li key={day.day} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-5 -left-[31px] flex size-4 items-center justify-center rounded-full border-2 border-primary bg-surface"
                  />
                  <details
                    className="group rounded-xl border bg-surface open:shadow-card"
                    open={day.day === 1}
                  >
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                      <span>
                        <span className="font-mono text-caption text-primary">
                          DAY {day.day}
                        </span>
                        <span className="mt-0.5 block font-display text-h4">{day.title}</span>
                      </span>
                      <span className="text-caption whitespace-nowrap text-subtle">
                        {day.location}
                      </span>
                    </summary>
                    <div className="border-t px-5 pt-4 pb-5">
                      <dl className="flex flex-col gap-2.5 text-small">
                        {[
                          ["Morning", day.morning],
                          ["Afternoon", day.afternoon],
                          ["Evening", day.evening],
                        ].map(([slot, activity]) => (
                          <div key={slot} className="flex gap-3">
                            <dt className="w-20 shrink-0 font-medium text-subtle">{slot}</dt>
                            <dd className="text-muted">{activity}</dd>
                          </div>
                        ))}</dl>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </section>

          {/* Cost + map rail */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border bg-surface p-5">
              <h2 className="text-h4 font-semibold">Cost per person</h2>
              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-small text-muted">TSD entry fee (statutory)</span>
                  <span data-numeric className="font-display text-price text-primary">
                    {formatPrice(cost.tsd)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-caption leading-relaxed text-subtle">
                Accommodation, transport and activity costs are not estimated —
                Ney Heritage has no licensed rates feed, and a guessed total
                would be worse than none. The ₹50 per-person TSD entry fee is
                statutory and is quoted exactly.
              </p>
            </div>

            <div>
              <h2 className="text-h4 font-semibold">Route</h2>
              <div className="mt-3">
                <ItineraryMap stops={stops} />
              </div>
            </div>

            <Link
              href="/planner"
              className="text-center text-small font-medium text-primary hover:underline"
            >
              Adjust preferences and regenerate
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
