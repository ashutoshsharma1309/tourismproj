import { ArrowRight, CalendarRange, FileCheck2, Route, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { ItineraryMap } from "@/components/planner/ItineraryExtras";
import { Badge } from "@/components/ui/Badge";
import { representativePhoto } from "@/data/galleries";
import { permitsMentionedIn } from "@/data/permits";
import { generateItinerary } from "@/lib/generate-itinerary";
import { TSD_EXEMPT_UNDER_AGE, TSD_FEE_PER_PERSON } from "@/lib/booking";
import { formatPrice } from "@/lib/format";
import type { PlannerInterest, PlannerStyle } from "@/types";

export const metadata: Metadata = {
  title: "Your Itinerary",
  /*
   * Was "with hotels, route map and full cost breakdown". There are no hotels
   * in this plan — no licensed rates feed exists, so nothing is selected — and
   * the cost breakdown is one line, the statutory entry fee. Two of the three
   * things promised were not here.
   */
  description:
    "A day-by-day Sikkim route over real geography, with the permits it requires and the one fee the state publishes.",
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
  const duration = Number(first(params.duration)) || 7;

  /*
   * Headcount, counted.
   *
   * `travellers` is what the form now sends. A link made before it existed
   * carries only `style`, so the old inference — Solo means one, anything else
   * means two — is kept as the fallback for those links and nowhere else. It
   * was wrong for families and groups, which is why it is no longer how the
   * form works.
   */
  const travellersParam = Number(first(params.travellers));
  const travellers =
    Number.isFinite(travellersParam) && travellersParam > 0
      ? Math.min(20, Math.round(travellersParam))
      : style === "Solo"
        ? 1
        : 2;
  const childrenParam = Number(first(params.children));
  const childrenUnderFive =
    Number.isFinite(childrenParam) && childrenParam > 0
      ? Math.min(travellers, Math.round(childrenParam))
      : 0;
  const startDate = first(params.start);

  const itinerary = generateItinerary({
    interests,
    duration,
    travelStyle: style,
    travellers,
    childrenUnderFive,
    startDate: startDate || undefined,
  });

  /*
   * The start date, if one was given, dates the days.
   *
   * The field was collected and put in the URL from the beginning and nothing
   * ever read it — a date input that changed nothing. Day 1 is the start date,
   * and each subsequent day is one day on. Nothing else is inferred from it:
   * seasonal road closures are real in Sikkim but this project has no sourced
   * calendar for them, so it does not pretend to one.
   */
  const dayDate = (dayNumber: number): string | null => {
    if (!startDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    const date = new Date(start);
    date.setDate(start.getDate() + dayNumber - 1);
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

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
    {
      icon: Users,
      label: `${itinerary.travellers} traveller${itinerary.travellers === 1 ? "" : "s"}`,
    },
    { icon: Wallet, label: `${formatPrice(itinerary.cost.tsd)} TSD entry fee` },
    { icon: Route, label: stops.map((stop) => stop.location).join(" → ") },
  ];

  const cost = itinerary.cost;

  /* A route reads as a list of place names until you see the places. Each base
     the itinerary sleeps in is also a mapped place in this archive, so its own
     photography is already here — no separate stock imagery needed. */
  /* Read the day plans, not the sleeping bases — see permitsMentionedIn. */
  const permitsNeeded = permitsMentionedIn(
    itinerary.dayPlans.flatMap((day) => [day.title, day.morning, day.afternoon, day.evening]),
  );

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

        {/*
          An itinerary that routes through Tsomgo, Yumthang, Gurudongmar or
          Nathu La needs a Protected Area Permit arranged before departure. The
          planner used to hand over a day-by-day route with no mention of it,
          which is the one omission capable of ending the trip at a check post.
        */}
        {permitsNeeded.length > 0 ? (
          <section
            className="mt-8 rounded-xl border-l-4 border-warning bg-warning-soft p-5"
            aria-labelledby="permits-needed"
          >
            <h2
              id="permits-needed"
              className="flex items-center gap-2 font-display text-h4"
            >
              <FileCheck2 className="size-4 shrink-0" aria-hidden />
              This route needs a permit
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {permitsNeeded.map((permit) => (
                <li key={permit.slug} className="text-small leading-relaxed">
                  <strong>{permit.name}</strong> — {permit.authority}
                </li>
              ))}
            </ul>
            <Link
              href="/permits"
              className="mt-4 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              What to carry, and who issues it
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </section>
        ) : null}

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
                          {/* Real dates when a start date was given — see dayDate. */}
                          {dayDate(day.day) ? (
                            <span className="text-subtle"> · {dayDate(day.day)}</span>
                          ) : null}
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
              {/*
                "Cost per person" was the old heading, over a figure that was
                the party's total — ₹100 for two people read as ₹100 each. The
                figure is now labelled for what it is and shows its arithmetic.
              */}
              <h2 className="text-h4 font-semibold">What this trip costs</h2>
              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-small text-muted">TSD entry fee (statutory)</span>
                  <span data-numeric className="font-display text-price text-primary">
                    {formatPrice(cost.tsd)}
                  </span>
                </div>
                <p data-numeric className="mt-1 font-mono text-caption text-subtle">
                  {formatPrice(TSD_FEE_PER_PERSON)} × {cost.chargeable} traveller
                  {cost.chargeable === 1 ? "" : "s"}
                  {cost.exempt > 0
                    ? ` · ${cost.exempt} under ${TSD_EXEMPT_UNDER_AGE} exempt`
                    : ""}
                </p>
              </div>
              <p className="mt-3 text-caption leading-relaxed text-subtle">
                Collected once by your hotel at check-in and valid one month.
                Accommodation, transport and activity costs are not estimated —
                Sikkim Darshan has no licensed rates feed, and a guessed total
                would be worse than none.
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
