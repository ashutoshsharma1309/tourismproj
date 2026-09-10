/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import {
  ArrowRight,
  CalendarRange,
  Car,
  FileCheck2,
  Gauge,
  Info,
  MapPin,
  Mountain,
  Route,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { ItineraryMap } from "@/components/planner/ItineraryExtras";
import { Badge } from "@/components/ui/Badge";
import { representativePhoto } from "@/data/galleries";
import { buildItinerary, type ResolvedDay, type ResolvedSlot } from "@/app/(v1)/destinations/[destinationId]/planner/_lib/itinerary";
import { TSD_EXEMPT_UNDER_AGE, TSD_FEE_PER_PERSON } from "@/lib/booking";
import { formatPrice } from "@/lib/format";
import type { PlannerInterest, PlannerStyle } from "@/types";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

const CAPABILITY = "tripPlanner" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "Your Itinerary",
  /*
   * Was "with hotels, route map and full cost breakdown". There are no hotels
   * in this plan — no licensed rates feed exists, so nothing is selected — and
   * the cost breakdown is one line, the statutory entry fee. Two of the three
   * things promised were not here.
   */
  description:
    "A day-by-day Sikkim route built on the road structure of the state, with the permits it requires and the one fee the state publishes.",
};

interface PageProps {
  params: Promise<{ destinationId: string }>;
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

/** What "Half day" and "Short stop" mean — a plan's allocation, not a timetable. */
const HOLD_LABEL: Record<string, string> = {
  "Half day": "About half a day set aside",
  "Short stop": "A short stop in the plan",
};

/* -------------------------------------------------------------------------
   One slot of one day
   ------------------------------------------------------------------------- */

function SlotRow({ slot }: { slot: ResolvedSlot }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
      <p className="pt-0.5 font-mono text-caption tracking-wide text-subtle uppercase">
        {slot.slot}
      </p>

      {slot.travel ? (
        <div className="min-w-0 rounded-lg border border-dashed bg-surface-muted/50 p-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-h4">
            <Car className="size-4 shrink-0 text-primary" aria-hidden />
            {slot.travel.from}
            <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
            {slot.travel.to}
          </p>
          {slot.travel.via.length > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-small text-muted">
              <span className="text-subtle">Road runs through</span>
              {slot.travel.via.map((town, index) => (
                <span key={town.href}>
                  <Link href={town.href} className="text-primary hover:underline">
                    {town.name}
                  </Link>
                  {index < slot.travel!.via.length - 1 ? "," : ""}
                </span>
              ))}
            </p>
          ) : null}
          {/*
            The distance is a great-circle figure and is labelled as one. It is
            NOT converted into a driving time anywhere: mountain road distance
            in Sikkim runs to several times the straight line, and this project
            holds no routing licence. The old planner printed "Drive west along
            the Rangeet gorge (5–6 h)" — a road time nothing here could support.
          */}
          <p className="mt-2 text-small leading-relaxed text-muted">
            <span data-numeric className="font-mono text-caption text-subtle">
              Approx. {slot.travel.straightLine} in a straight line
            </span>{" "}
            — the road is longer, and no travel time is stated here. This plan
            sets the whole day aside for the drive. Check current local
            conditions before you leave.
          </p>
        </div>
      ) : slot.stop ? (
        <div className="min-w-0 rounded-lg border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Link
              href={slot.stop.href}
              className="font-display text-h4 text-foreground hover:text-primary hover:underline"
            >
              {slot.stop.name}
            </Link>
            <span className="font-mono text-caption text-subtle">
              {slot.stop.label} · {slot.stop.district}
            </span>
          </div>

          {/* The record's own sourced sentence. Nothing is written for the planner. */}
          <p className="mt-2 text-small leading-relaxed text-muted">{slot.stop.why}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden />
              {HOLD_LABEL[slot.stop.hold] ?? slot.stop.hold}
            </span>
            {slot.stop.elevation ? (
              <span data-numeric className="inline-flex items-center gap-1.5 font-mono">
                <Mountain className="size-3.5" aria-hidden />
                {slot.stop.elevation.toLocaleString("en-IN")} m
              </span>
            ) : null}
          </div>

          {slot.stop.permitNote ? (
            <p className="mt-3 flex items-start gap-2 rounded-md bg-warning-soft p-2.5 text-caption leading-relaxed text-warning">
              <FileCheck2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{slot.stop.permitNote}</span>
            </p>
          ) : null}

          {slot.stop.hoursNote ? (
            <p className="mt-2 text-caption leading-relaxed text-subtle">{slot.stop.hoursNote}</p>
          ) : null}
        </div>
      ) : (
        <p className="min-w-0 rounded-lg border border-dashed px-4 py-3 text-small text-subtle">
          {slot.note}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   One day
   ------------------------------------------------------------------------- */

function DayCard({
  day,
  date,
  destinationId,
}: {
  day: ResolvedDay;
  date: string | null;
  /* Threaded, not assumed: this card's permit link was hardcoded to Sikkim. */
  destinationId: string;
}) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute top-6 -left-[31px] flex size-4 items-center justify-center rounded-full border-2 border-primary bg-surface"
      />
      <article className="rounded-xl border bg-surface shadow-card">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b p-5">
          <div className="min-w-0">
            <p className="font-mono text-caption text-primary">
              DAY {day.day}
              {date ? <span className="text-subtle"> · {date}</span> : null}
            </p>
            <h3 className="mt-0.5 font-display text-h3 text-balance-heading">{day.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {day.isTravelDay ? <Badge tone="marigold-soft">Travel day</Badge> : null}
            <span className="inline-flex items-center gap-1.5 text-caption whitespace-nowrap text-subtle">
              <MapPin className="size-3.5" aria-hidden />
              Nights in {day.location}
            </span>
          </div>
        </header>

        <div className="flex flex-col gap-4 p-5">
          {day.slots.map((slot) => (
            <SlotRow key={slot.slot} slot={slot} />
          ))}

          {day.advisories.length > 0 ? (
            <div className="rounded-lg border-l-4 border-warning bg-warning-soft p-4">
              <ul className="flex flex-col gap-2">
                {day.advisories.map((advisory) => (
                  <li key={advisory} className="flex items-start gap-2 text-caption leading-relaxed">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>{advisory}</span>
                  </li>
                ))}
              </ul>
              {day.permits.length > 0 ? (
                <p className="mt-2 pl-5.5 text-caption leading-relaxed">
                  Permit for{" "}
                  {day.permits.map((permit) => permit.name).join(", ")} —{" "}
                  <Link href={`/destinations/${destinationId}/permits`} className="font-medium text-primary hover:underline">
                    who issues it
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </li>
  );
}

/* ------------------------------------------------------------------------- */

export default async function ItineraryResultPage({ params: routeParams, searchParams }: PageProps) {
  const { destinationId } = await routeParams;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  const params = await searchParams;

  const interests = first(params.interests)
    .split(",")
    .filter((value): value is PlannerInterest => (VALID_INTERESTS as string[]).includes(value));
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
   * means two — is kept as the fallback for those links and nowhere else.
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

  const itinerary = buildItinerary({
    interests,
    duration,
    travelStyle: style,
    travellers,
    childrenUnderFive,
    startDate: startDate || undefined,
  }, destinationId);

  /*
   * The start date, if one was given, dates the days. Nothing else is inferred
   * from it: seasonal road closures are real in Sikkim but this project has no
   * sourced calendar for them, so it does not pretend to one.
   */
  const dayDate = (dayNumber: number): string | null => {
    if (!startDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    const date = new Date(start);
    date.setDate(start.getDate() + dayNumber - 1);
    return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  const summary = [
    { icon: CalendarRange, label: `${itinerary.days} days, ${itinerary.nights} nights` },
    {
      icon: Users,
      label: `${itinerary.travellers} traveller${itinerary.travellers === 1 ? "" : "s"}`,
    },
    { icon: Gauge, label: `${itinerary.pace.label} pace` },
    { icon: Wallet, label: `${formatPrice(itinerary.cost.tsd)} TSD entry fee` },
  ];

  const cost = itinerary.cost;
  const permitsNeeded = itinerary.permitDestinations;

  /*
   * The bases, photographed. A route reads as a list of names until you see
   * the places, and every base is also a mapped place in this archive, so its
   * own credited photography is already here. Keyed by run rather than by name:
   * a North Sikkim loop returns to Gangtok, so a base can legitimately appear
   * on the route twice.
   */
  const routePhotos = itinerary.routeStops
    .map((stop) => ({ stop, photo: representativePhoto("place", stop.slug) }))
    .filter(
      (entry): entry is { stop: (typeof itinerary.routeStops)[number]; photo: NonNullable<typeof entry.photo> } =>
        entry.photo !== undefined,
    );

  const mapStops = itinerary.routeStops
    .filter((stop) => stop.coordinates !== undefined)
    .map((stop) => ({
      location: stop.location,
      coordinates: stop.coordinates!,
      days: stop.dayLabel,
    }));

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Plan"
          sectionHref={destinationPath(destinationId, "planner")}
          current="Itinerary"
        />

        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Your itinerary
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">{itinerary.name}</h1>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {summary.map((item) => (
            <p key={item.label} className="flex items-center gap-2 text-small text-muted">
              <item.icon className="size-4 text-primary" aria-hidden />
              {item.label}
            </p>
          ))}
        </div>

        {/* The route, in full, including the nights that come back through
            Gangtok. A North Sikkim loop is not a detour to be tidied away. */}
        <p className="mt-3 flex items-start gap-2 text-body-lg text-foreground">
          <Route className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
          <span>{itinerary.route}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {itinerary.interests.map((interest) => (
            <Badge key={interest} tone="jade">
              {interest}
            </Badge>
          ))}
        </div>

        {/* A link can ask for 30 days or 0. Say what was done about it. */}
        {itinerary.durationAdjusted ? (
          <p className="mt-4 rounded-lg border border-dashed p-3 text-small text-muted">
            This planner routes trips of 1 to 14 days. You asked for{" "}
            {itinerary.requestedDuration}, so the plan below is {itinerary.days}.
          </p>
        ) : null}

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
            <h2 id="permits-needed" className="flex items-center gap-2 font-display text-h4">
              <FileCheck2 className="size-4 shrink-0" aria-hidden />
              This route needs permits
            </h2>
            <p className="mt-2 text-small leading-relaxed">
              Check current local conditions and permit requirements before you
              travel — requirements differ for Indian and foreign nationals, and
              are set by the department, not by this site.
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {permitsNeeded.map((permit) => (
                <li key={permit.slug} className="text-small leading-relaxed">
                  <strong>{permit.name}</strong> — {permit.authority}
                </li>
              ))}
            </ul>
            <Link
              href={`/destinations/${destinationId}/permits`}
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
                <li key={stop.key}>
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
                          {stop.dayLabel}
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

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Day by day */}
          {/* A real heading, not an aria-label: the day cards carry h3s, and a
              trip with no permit panel had nothing between them and the h1. */}
          <section aria-labelledby="day-by-day" className="min-w-0">
            <h2 id="day-by-day" className="font-display text-h2">
              Day by day
            </h2>
            <ol className="relative mt-5 flex flex-col gap-5 border-l-2 border-primary-soft pl-6">
              {itinerary.itineraryDays.map((day) => (
                <DayCard key={day.day} day={day} date={dayDate(day.day)} destinationId={destinationId} />
              ))}
            </ol>

            {/*
              What the times in this plan are, and what they are not. The plan
              allocates half-days; it does not publish opening hours, because
              the state tourism portal publishes none and the aggregators that
              do contradict each other.
            */}
            <div className="mt-6 rounded-xl border border-dashed p-5 text-caption leading-relaxed text-subtle">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <strong className="text-muted">About the timings.</strong>{" "}
                  &ldquo;Half a day&rdquo; and &ldquo;a short stop&rdquo; are how
                  much of the day this plan sets aside — not opening times.
                  Sikkim&rsquo;s tourism portal
                  publishes no visiting hours for these sites, so none are shown
                  here. Distances are straight-line figures, never road distances
                  or driving times. Confirm opening times, road status and
                  permits locally before you travel.
                </span>
              </p>
            </div>
          </section>

          {/* Cost + map rail */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border bg-surface p-5">
              {/*
                "Cost per person" was the old heading, over a figure that was
                the party's total — ₹100 for two people read as ₹100 each.
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
                  {cost.exempt > 0 ? ` · ${cost.exempt} under ${TSD_EXEMPT_UNDER_AGE} exempt` : ""}
                </p>
              </div>
              <p className="mt-3 text-caption leading-relaxed text-subtle">
                Collected once by your hotel at check-in and valid one month.
                Accommodation, transport and activity costs are not estimated —
                TerraStory has no licensed rates feed, and a guessed total
                would be worse than none.
              </p>
            </div>

            <div className="rounded-xl border bg-surface p-5">
              <h2 className="flex items-center gap-2 text-h4 font-semibold">
                <Gauge className="size-4 text-primary" aria-hidden />
                {itinerary.pace.label} pace
              </h2>
              <p className="mt-2 text-caption leading-relaxed text-subtle">
                {itinerary.pace.note}
              </p>
            </div>

            {mapStops.length > 0 ? (
              <div>
                <h2 className="text-h4 font-semibold">Route</h2>
                <p className="mt-1 text-caption text-subtle">
                  Bases in travel order. The line joins them; it is not the road.
                </p>
                <div className="mt-3">
                  <ItineraryMap stops={mapStops} />
                </div>
              </div>
            ) : null}

            <Link
              href={`/destinations/${destinationId}/planner`}
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
