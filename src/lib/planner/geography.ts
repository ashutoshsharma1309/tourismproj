import { distanceKm } from "@/lib/geo";
import type { Coordinates } from "@/types";
import type { Experience } from "./types";

/**
 * Geographic coherence, from published coordinates only.
 *
 * WHAT THIS REFUSES TO DO
 * -----------------------
 * It produces no travel time, and nothing here may be converted into one.
 * Every number this module returns is a **straight-line distance between two
 * coordinates a source published**, and the UI labels it as such. Sikkim's
 * road distance is routinely two to three times the straight line — a hairpin
 * road up a valley wall is 4 km of air and 40 minutes of driving — so
 * "12 km away" would read as twenty minutes and be wrong by an hour. The
 * routed planner at `/destinations/[id]/planner` is the only thing in this
 * project allowed to speak about travel legs, because a person encoded that
 * road graph by hand.
 *
 * WHAT AN EXPERIENCE WITHOUT A COORDINATE GETS
 * --------------------------------------------
 * Nothing invented. It is never given a position from its district, its
 * neighbours or its name. It sorts last within its day and every distance
 * involving it is `undefined`, which the UI renders as "no published
 * coordinate" rather than a blank. Dubdi is the live case: its Wikipedia
 * coordinate conflicts with its known location, so the archive deliberately
 * publishes none.
 */

export function hasCoordinates(experience: Experience): boolean {
  return experience.coordinates !== undefined;
}

/**
 * Group by administrative area, preserving the order experiences arrive in.
 *
 * The area comes from the record's own district field. Experiences with no
 * published area share the `null` group, which the itinerary treats as one
 * more chunk — never merged into a real district it might not belong to.
 */
export function groupByArea(experiences: Experience[]): Map<string | null, Experience[]> {
  const groups = new Map<string | null, Experience[]>();
  for (const experience of experiences) {
    const key = experience.area ?? null;
    const existing = groups.get(key);
    if (existing) existing.push(experience);
    else groups.set(key, [experience]);
  }
  return groups;
}

/**
 * Straight-line kilometres between two experiences, to one decimal.
 *
 * `undefined` — not 0, and not a guess — whenever either side lacks a
 * published coordinate. A caller that wants to print a number has to handle
 * the absent case, which is the point.
 */
export function straightLineBetween(a: Experience, b: Experience): number | undefined {
  const from = a.coordinates;
  const to = b.coordinates;
  if (!from || !to) return undefined;
  return Math.round(distanceKm(from, to) * 10) / 10;
}

/**
 * The widest straight-line gap inside a set — how spread out a day is.
 *
 * Used to tell the reader that a day sits within a few kilometres, or does
 * not. `undefined` when fewer than two stops publish coordinates.
 */
export function spreadKm(experiences: Experience[]): number | undefined {
  const points = experiences
    .map((experience) => experience.coordinates)
    .filter((point): point is Coordinates => point !== undefined);
  if (points.length < 2) return undefined;

  let widest = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      widest = Math.max(widest, distanceKm(points[i]!, points[j]!));
    }
  }
  return Math.round(widest * 10) / 10;
}

/**
 * Order a day's stops so it does not double back.
 *
 * Nearest-neighbour from the first mapped experience in the list — which, by
 * the time the itinerary calls this, is the day's highest-ranked stop. Simple,
 * robust, and reproducible: no randomness, no restarts, and ties broken on id
 * so the same set always yields the same walk.
 *
 * Nearest-neighbour is not the optimal tour, and it is not claimed to be. It
 * removes the obvious zig-zag, which is the whole requirement; solving TSP
 * exactly for three to five stops would be precision the underlying straight-
 * line model does not have.
 */
export function orderByProximity(experiences: Experience[]): Experience[] {
  const mapped = experiences.filter(hasCoordinates);
  const unmapped = experiences.filter((experience) => !hasCoordinates(experience));

  const ordered: Experience[] = [];
  const remaining = [...mapped];

  let current = remaining.shift();
  while (current) {
    ordered.push(current);
    const from = current.coordinates!;

    let bestIndex = -1;
    let bestKm = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]!;
      const km = distanceKm(from, candidate.coordinates!);
      const best = bestIndex >= 0 ? remaining[bestIndex]! : undefined;
      if (km < bestKm || (km === bestKm && best && candidate.id.localeCompare(best.id) < 0)) {
        bestKm = km;
        bestIndex = index;
      }
    }

    current = bestIndex >= 0 ? remaining.splice(bestIndex, 1)[0] : undefined;
  }

  return [...ordered, ...unmapped];
}
