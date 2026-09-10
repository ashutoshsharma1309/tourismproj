import { buildCandidates } from "./candidates";
import { groupByArea, orderByProximity, straightLineBetween } from "./geography";
import { rank } from "./scoring";
import { PACE_CAPACITY } from "./types";
import type {
  CoverageGap,
  Experience,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  JourneyInput,
} from "./types";

/**
 * Turning ranked experiences into days.
 *
 * THE SHAPE OF THE ALGORITHM
 * --------------------------
 *   1. Build candidates from the destination's knowledge graph.
 *   2. Drop anything the traveller removed.
 *   3. Rank everything by the transparent formula in scoring.ts.
 *   4. Group by administrative area.
 *   5. Cut each area into day-sized chunks of `capacity` experiences. A chunk
 *      therefore never spans two areas — that is what keeps a day inside one
 *      region.
 *   6. Take the best `days` chunks: most interest matches first, then full
 *      chunks, then by total score.
 *   7. Order each day's stops by nearest neighbour on verified coordinates.
 *
 * Steps 5-6 are what make the trip geographically coherent without any travel
 * data. An earlier version filled a flat queue area by area, which let a day
 * straddle a district boundary whenever an area ran out mid-day — producing a
 * day that ran Gangtok -> Gyalshing with a 29 km jump inside it. Chunking
 * first makes that impossible by construction rather than by care.
 *
 * A day may be SHORTER than the pace capacity when an area's remainder is
 * small. That is preferred over mixing districts: a short coherent day is
 * honest, a full incoherent one is not.
 *
 * HONESTY RULES ENCODED HERE
 * --------------------------
 * - A day is never emitted empty. If the verified corpus runs out on day 3 of
 *   a requested 5, the itinerary HAS three days and reports the gap.
 * - Nothing is duplicated to pad a day.
 * - No travel time, visit duration or schedule is produced anywhere.
 * - The function is pure with respect to its input: same JourneyInput, same
 *   Itinerary, every time. There is no clock and no randomness in this path.
 */

/** Requested days are clamped to what the UI offers. */
export const MIN_DAYS = 1;
export const MAX_DAYS = 7;

export function clampDays(days: number): number {
  if (!Number.isFinite(days)) return 3;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.trunc(days)));
}

export async function buildItinerary(input: JourneyInput): Promise<Itinerary> {
  const days = clampDays(input.days);
  const capacity = PACE_CAPACITY[input.pace];

  const all = await buildCandidates(input.destinationId);
  const removed = new Set(input.removed);
  const available = all.filter((e) => !removed.has(e.id));

  const ranked = rank(available, input.interests, input.pinned);

  const byId = new Map(ranked.map((s) => [s.experience.id, s]));

  /*
   * Cut each area into day-sized chunks. Chunking BEFORE choosing which days
   * to keep is what guarantees a day never spans two areas.
   *
   * The whole ranked corpus is chunked, not just the top `wanted`: taking a
   * fixed slice first would cut an area off mid-chunk and manufacture exactly
   * the short, straddling days this is meant to prevent.
   */
  const matchesInterest = (experience: Experience) =>
    input.interests.length === 0 ||
    input.interests.some((interest) => experience.interests.includes(interest));

  /* A pinned experience must reach the plan, so the chunk holding it is
     selected before anything else. The planner still chooses which day it
     lands on and what sits beside it. */
  const pinnedSet = new Set(input.pinned);

  const areas = groupByArea(ranked.map((s) => s.experience));
  const chunks: {
    area: string | null;
    experiences: Experience[];
    score: number;
    matched: number;
    pinned: number;
  }[] = [];
  for (const [area, group] of areas) {
    /* Within an area, keep the global ranking — which puts interest matches
       first — so an area's FIRST chunk is its most relevant day. */
    const ordered = group.map((e) => byId.get(e.id)!);
    for (let i = 0; i < ordered.length; i += capacity) {
      const slice = ordered.slice(i, i + capacity);
      chunks.push({
        area,
        experiences: slice.map((s) => s.experience),
        score: slice.reduce((n, s) => n + s.score, 0),
        matched: slice.filter((s) => matchesInterest(s.experience)).length,
        pinned: slice.filter((s) => pinnedSet.has(s.experience.id)).length,
      });
    }
  }

  /*
   * Most interest matches first, then full days, then total score. Preferring
   * full chunks stops a one-stop remainder from displacing a complete day
   * somewhere else, and the id tie-break keeps the whole thing deterministic.
   */
  chunks.sort((a, b) => {
    /* Anything the traveller added from discovery is not negotiable. */
    if (b.pinned !== a.pinned) return b.pinned - a.pinned;
    /* How many of the day's stops actually match what the traveller asked
       for comes first: a full day of things they did not ask for is not a
       better day than a shorter one that answers the question. */
    if (b.matched !== a.matched) return b.matched - a.matched;
    const aFull = a.experiences.length === capacity ? 1 : 0;
    const bFull = b.experiences.length === capacity ? 1 : 0;
    if (aFull !== bFull) return bFull - aFull;
    if (b.score !== a.score) return b.score - a.score;
    return a.experiences[0]!.id.localeCompare(b.experiences[0]!.id);
  });

  const plannedDays: ItineraryDay[] = [];

  for (let day = 1; day <= days && chunks.length > 0; day += 1) {
    const chunk = chunks.shift()!;
    const ordered = orderByProximity(chunk.experiences);
    const stops: ItineraryStop[] = ordered.map((experience, index) => {
      const previous = index > 0 ? ordered[index - 1] : undefined;
      const scored = byId.get(experience.id);
      return {
        experience,
        reasons: scored?.reasons ?? [],
        straightLineFromPreviousKm: previous
          ? straightLineBetween(previous, experience)
          : undefined,
      };
    });

    plannedDays.push({
      day,
      title: dayTitle(ordered),
      area: sharedArea(ordered),
      stops,
    });
  }

  const placed = new Set(plannedDays.flatMap((d) => d.stops.map((s) => s.experience.id)));
  const alsoAvailable = ranked
    .filter((s) => !placed.has(s.experience.id))
    .map((s) => s.experience);

  const gap = buildGap(days, plannedDays.length, alsoAvailable.length);

  return {
    destinationId: input.destinationId,
    input: { ...input, days },
    days: plannedDays,
    gap,
    alsoAvailable,
    stopCount: placed.size,
    usedCoordinates: plannedDays.some((d) => d.stops.some((s) => s.experience.coordinates)),
  };
}

/**
 * A day is named after what is in it.
 *
 * No invented marketing copy: the title states the area and the kind of thing
 * the day holds, both taken from the records themselves.
 */
function dayTitle(experiences: Experience[]): string {
  const area = sharedArea(experiences);
  const kinds = new Set(experiences.map((e) => e.typeLabel));
  const allSacred = experiences.every((e) => e.interests.includes("sacred"));
  const allNature = experiences.every((e) => e.interests.includes("nature"));

  /*
   * THE KIND COMES FROM THE RECORDS, NEVER FROM THIS FILE.
   *
   * This used to read `allSacred ? "Monasteries and sacred sites"`, which is
   * Sikkim's vocabulary written into a function every destination runs. A day
   * of Varanasi ghats was titled "Monasteries and sacred sites"; so was a day
   * of Kyoto shrines and a day of Paris cathedrals — the one word in the
   * title that named a kind of place was the one word not taken from any
   * record. The docstring above already forbade it.
   *
   * Now: one kind of place names the day by that kind ("Ghats", "Shrines",
   * "Monasteries" — whichever the records actually say). Several sacred kinds
   * get the destination-neutral "Sacred sites", which claims nothing beyond
   * the interest each record already carries.
   */
  const theme =
    kinds.size === 1
      ? `${[...kinds][0]}s`
      : allSacred
        ? "Sacred sites"
        : allNature
          ? "Landscape and nature"
          : "Heritage and landscape";

  return area ? `${theme} — ${area}` : theme;
}

/** The area shared by every experience in a day, or null when they differ. */
function sharedArea(experiences: Experience[]): string | null {
  const areas = new Set(experiences.map((e) => e.area).filter(Boolean) as string[]);
  return areas.size === 1 ? [...areas][0]! : null;
}

/**
 * Report a shortfall rather than padding the trip.
 *
 * Objective 20: a destination that cannot fill five days says so and shows
 * what it does have. It never invents a sixth attraction.
 */
function buildGap(
  requestedDays: number,
  plannedDays: number,
  unusedCount: number,
): CoverageGap | null {
  if (plannedDays >= requestedDays) return null;

  const message =
    plannedDays === 0
      ? "No verified experiences are currently catalogued for this destination, so no itinerary can be built."
      : `Only ${plannedDays} ${plannedDays === 1 ? "day" : "days"} of verified experiences ${
          plannedDays === 1 ? "is" : "are"
        } currently available for this destination.`;

  return { requestedDays, plannedDays, unusedCount, message };
}
