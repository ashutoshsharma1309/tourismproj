import { getMonasteryBySlug } from "@/data/monasteries";
import { permitDestinations, permitForPlace, type PermitDestination } from "@/data/permits";
import { getPlaceBySlug } from "@/data/places";
import {
  BASES,
  planRoute,
  type BaseKey,
  type DaySlot,
  type PlannedDay,
  type RoutePlan,
  type StopHold,
  type StopKind,
} from "@/lib/generate-itinerary";
import { distanceKm, formatDistanceKm } from "@/lib/geo";
import type { Coordinates, PlannerPreferences, SikkimDistrict } from "@/types";

/**
 * Resolving a route into an itinerary.
 *
 * `src/lib/generate-itinerary.ts` decides the shape of the trip and names its
 * days only by slug. This file is where those slugs become something a reader
 * can act on — and the rule it exists to enforce is that every sentence about a
 * destination is the archive's own sentence about it.
 *
 * There is no prose in this file describing a single place in Sikkim. `why` is
 * `place.description` or `monastery.description` verbatim, each of which cites
 * the article it was taken from. Day titles are the names of the sites in the
 * day. Where the archive holds nothing — opening hours, road times, tariffs —
 * the itinerary says so instead of filling the gap.
 *
 * ON DISTANCES
 * ------------
 * `distanceKm` is a great-circle distance and is labelled as one everywhere it
 * appears. Sikkim's road distance between two points can be several times the
 * straight line, so a straight line must never be printed as, or converted
 * into, a driving time. No travel duration is stated anywhere in this
 * itinerary. What the plan does state is its own decision: that a change of
 * base gets a whole day.
 *
 * It is also lives here as a check, not just a label — see MAX_DAY_SPREAD_KM.
 */

/**
 * How far apart two sites in one day may be, in a straight line, before the
 * day is refused.
 *
 * The clusters in the route planner are grouped by hand, and hand-grouping is
 * exactly the step that produced Gangtok → North → South in a day. This
 * re-checks each finished day against the coordinates the archive actually
 * publishes, so a mistyped cluster shows up as a missing stop rather than as an
 * itinerary nobody can drive.
 */
const MAX_DAY_SPREAD_KM = 45;

export type { DaySlot, StopHold };

export interface ResolvedStop {
  slot: DaySlot;
  kind: StopKind;
  slug: string;
  name: string;
  district: SikkimDistrict;
  /** "Lake", "Nyingma monastery" — what kind of thing this is. */
  label: string;
  /** The record's own sourced description. Never rewritten here. */
  why: string;
  hold: StopHold;
  href: string;
  coordinates?: Coordinates;
  elevation?: number;
  permitNote?: string;
  /** Only where an hours report exists at all, and it is marked as a report. */
  hoursNote?: string;
}

export interface ResolvedTravel {
  slot: DaySlot;
  from: string;
  to: string;
  via: { name: string; href: string }[];
  /** Great-circle km between the two bases. Never a road distance. */
  straightLine: string;
}

export interface ResolvedSlot {
  slot: DaySlot;
  stop?: ResolvedStop;
  travel?: ResolvedTravel;
  /** Shown when the plan schedules nothing — an empty slot, said out loud. */
  note?: string;
}

export interface ResolvedDay {
  day: number;
  title: string;
  base: BaseKey;
  location: string;
  district?: SikkimDistrict;
  coordinates?: Coordinates;
  isTravelDay: boolean;
  slots: ResolvedSlot[];
  permits: PermitDestination[];
  advisories: string[];
}

export interface Itinerary extends RoutePlan {
  itineraryDays: ResolvedDay[];
  permitDestinations: PermitDestination[];
  /** One entry per unbroken run in a base, in travel order. */
  routeStops: {
    key: string;
    base: BaseKey;
    location: string;
    slug: string;
    coordinates?: Coordinates;
    dayLabel: string;
  }[];
}

/* ========================================================================== */

function labelForPlace(slug: string): string | undefined {
  return getPlaceBySlug(slug)?.category;
}

function resolveStop(
  ref: { kind: StopKind; slug: string; slot: DaySlot; hold: StopHold },
): ResolvedStop | undefined {
  if (ref.kind === "monastery") {
    const monastery = getMonasteryBySlug(ref.slug);
    if (!monastery) return undefined;
    /*
     * Hours are shown only where a report exists, and are labelled as a report
     * with its caveat. The tourism portal publishes no monastery hours at all;
     * the alternative to saying so is inventing one.
     */
    const hours =
      monastery.visitingHours.status === "reported"
        ? `Reported hours: ${monastery.visitingHours.summary}. ${
            monastery.visitingHours.provenance.caveat ?? ""
          }`.trim()
        : undefined;
    return {
      slot: ref.slot,
      kind: ref.kind,
      slug: ref.slug,
      name: monastery.name,
      district: monastery.district,
      label: `${monastery.tradition} monastery`,
      why: monastery.description,
      hold: ref.hold,
      href: `/monasteries/${monastery.slug}`,
      ...(monastery.coordinates ? { coordinates: monastery.coordinates } : {}),
      ...(hours ? { hoursNote: hours } : {}),
    };
  }
  const place = getPlaceBySlug(ref.slug);
  if (!place) return undefined;
  return {
    slot: ref.slot,
    kind: ref.kind,
    slug: ref.slug,
    name: place.name,
    district: place.district,
    label: labelForPlace(ref.slug) ?? "Place",
    why: place.description,
    hold: ref.hold,
    href: `/places/${place.slug}`,
    coordinates: place.coordinates,
    ...(place.elevation ? { elevation: place.elevation } : {}),
    ...(place.permitNote ? { permitNote: place.permitNote } : {}),
  };
}

/** Straight-line spread of the day's stops, using published coordinates only. */
function withinOneDay(stops: ResolvedStop[]): boolean {
  const points = stops.map((stop) => stop.coordinates).filter((c): c is Coordinates => !!c);
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (distanceKm(points[i]!, points[j]!) > MAX_DAY_SPREAD_KM) return false;
    }
  }
  return true;
}

function permitsForDay(day: PlannedDay, stops: ResolvedStop[]): PermitDestination[] {
  const found = new Map<string, PermitDestination>();
  for (const slug of day.permits) {
    const permit = permitDestinations.find((entry) => entry.slug === slug);
    if (permit) found.set(permit.slug, permit);
  }
  /* Matched from the record's own name as well, so a permit the catalogue
     forgot to declare is still caught by the department's own list. */
  for (const stop of stops) {
    const permit = permitForPlace(stop.name);
    if (permit) found.set(permit.slug, permit);
  }
  return [...found.values()];
}

/**
 * The advisories a day earns.
 *
 * Every one is an instruction to check, never a statement about conditions.
 * This archive holds no road-status feed, no closure calendar and no weather
 * data, so it cannot say a pass is open, shut, snowbound or clear.
 */
function advisoriesFor(
  day: PlannedDay,
  stops: ResolvedStop[],
  permits: PermitDestination[],
  isTravelDay: boolean,
): string[] {
  const notes: string[] = [];
  if (permits.length > 0) {
    notes.push(
      "This day enters a protected area. Check current local conditions and permit requirements before you travel, and arrange the permit in advance.",
    );
  }
  const highest = stops.reduce((max, stop) => Math.max(max, stop.elevation ?? 0), 0);
  if (highest >= 3000) {
    notes.push(
      `The day reaches ${highest.toLocaleString("en-IN")} m. High-altitude roads and lakes in Sikkim are seasonal — check current local conditions before setting out.`,
    );
  }
  if (isTravelDay && (day.base === "lachen" || day.base === "lachung")) {
    notes.push(
      "North Sikkim is a long mountain drive and this plan gives it the whole day. Confirm the road and your permit locally before you leave.",
    );
  }
  return notes;
}

function titleFor(
  day: PlannedDay,
  stops: ResolvedStop[],
  travel: ResolvedTravel | undefined,
  location: string,
): string {
  if (day.kind === "arrival") return `Arrive in ${location}`;
  if (travel) return `${travel.from} → ${travel.to}`;
  const named = stops.map((stop) => stop.name);
  if (named.length === 0) return `A day in ${location}`;
  if (named.length === 1) return named[0]!;
  return `${named[0]} and ${named[1]}`;
}

/* ========================================================================== */

export function buildItinerary(prefs: PlannerPreferences): Itinerary {
  const plan = planRoute(prefs);

  const resolvedDays: ResolvedDay[] = plan.dayPlans.map((day) => {
    const basePlace = getPlaceBySlug(BASES[day.base].placeSlug);
    const location = BASES[day.base].name;

    let stops = day.stops
      .map((stop) => resolveStop(stop))
      .filter((stop): stop is ResolvedStop => stop !== undefined);

    /* The coordinate check. Dropping the last stop rather than the first keeps
       the day's anchor and loses the outlier. */
    while (stops.length > 1 && !withinOneDay(stops)) stops = stops.slice(0, -1);

    let travel: ResolvedTravel | undefined;
    if (day.travel) {
      const from = getPlaceBySlug(BASES[day.travel.from].placeSlug);
      const to = getPlaceBySlug(BASES[day.travel.to].placeSlug);
      travel = {
        slot: day.travel.slot,
        from: BASES[day.travel.from].name,
        to: BASES[day.travel.to].name,
        via: day.travel.via
          .map((slug) => getPlaceBySlug(slug))
          .filter((place) => place !== undefined)
          .map((place) => ({ name: place.name, href: `/places/${place.slug}` })),
        straightLine:
          from && to ? formatDistanceKm(distanceKm(from.coordinates, to.coordinates)) : "—",
      };
    }

    const permits = permitsForDay(day, stops);
    const isTravelDay = travel !== undefined;

    const slots: ResolvedSlot[] = (["Morning", "Afternoon", "Evening"] as DaySlot[]).map(
      (slot) => {
        if (travel && travel.slot === slot) return { slot, travel };
        const stop = stops.find((entry) => entry.slot === slot);
        if (stop) return { slot, stop };
        if (day.kind === "arrival" && slot === "Morning") {
          return { slot, note: `Arrival and check-in. Nothing is scheduled before you reach ${location}.` };
        }
        if (isTravelDay) {
          return { slot, note: `On the road. Nothing scheduled beyond the drive.` };
        }
        return { slot, note: `Nothing scheduled — time free in ${location}.` };
      },
    );

    return {
      day: day.day,
      title: titleFor(day, stops, travel, location),
      base: day.base,
      location,
      ...(basePlace ? { district: basePlace.district, coordinates: basePlace.coordinates } : {}),
      isTravelDay,
      slots,
      permits,
      advisories: advisoriesFor(day, stops, permits, isTravelDay),
    };
  });

  const permitMap = new Map<string, PermitDestination>();
  for (const day of resolvedDays) {
    for (const permit of day.permits) permitMap.set(permit.slug, permit);
  }

  const routeStops = plan.stops.map((run, index) => {
    const place = getPlaceBySlug(BASES[run.base].placeSlug);
    return {
      key: `${run.base}-${index}`,
      base: run.base,
      location: run.location,
      slug: BASES[run.base].placeSlug,
      ...(place ? { coordinates: place.coordinates } : {}),
      dayLabel:
        run.fromDay === run.toDay ? `Day ${run.fromDay}` : `Day ${run.fromDay}–${run.toDay}`,
    };
  });

  return {
    ...plan,
    itineraryDays: resolvedDays,
    permitDestinations: [...permitMap.values()],
    routeStops,
  };
}
