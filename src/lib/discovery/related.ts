import { straightLineBetween } from "@/lib/planner/geography";
import type { Experience } from "@/lib/planner/types";

/**
 * Related experiences — deterministic, and explainable in one sentence.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not similarity. There is no embedding, no cosine distance, no
 * "people also viewed" and no learned model. Every relationship below is an
 * edge somebody authored in the data or a distance between two published
 * coordinates, and each carries the sentence that states which.
 *
 * A vague similarity score would be easy and would look impressive. It would
 * also be unexplainable, which in a product whose entire claim is "you can
 * check this" is worse than having no feature at all.
 *
 * THE RULES, STRONGEST FIRST
 * --------------------------
 *   1. Shares a dated historical event
 *   2. Appears in the same story
 *   3. Within 15 km, both coordinates published
 *   4. Same district
 *
 * A pair is reported under the strongest rule that applies, once. Ordering is
 * rule strength, then how many edges are shared, then distance where it is
 * known, then id — so the same data always produces the same list.
 */

export type RelationKind = "event" | "story" | "proximity" | "area";

export interface RelatedExperience {
  experience: Experience;
  kind: RelationKind;
  /** The sentence shown to the reader. Always states the evidence. */
  reason: string;
  /** Straight-line km, only when both records publish a coordinate. */
  straightLineKm?: number;
  /** How many edges of this kind are shared. */
  shared: number;
}

/** Records within this straight-line distance count as geographically related. */
export const PROXIMITY_KM = 15;

const RULE_ORDER: Record<RelationKind, number> = {
  event: 0,
  story: 1,
  proximity: 2,
  area: 3,
};

function sharedRefs<T extends { slug: string; title: string }>(a: T[], b: T[]): T[] {
  const bySlug = new Set(b.map((ref) => ref.slug));
  return a.filter((ref) => bySlug.has(ref.slug));
}

export function relatedExperiences(
  subject: Experience,
  all: Experience[],
  limit = 6,
): RelatedExperience[] {
  const candidates = all.filter((experience) => experience.id !== subject.id);
  const related: RelatedExperience[] = [];

  for (const candidate of candidates) {
    const events = sharedRefs(subject.historyRefs, candidate.historyRefs);
    if (events.length > 0) {
      related.push({
        experience: candidate,
        kind: "event",
        shared: events.length,
        straightLineKm: straightLineBetween(subject, candidate),
        reason:
          events.length === 1
            ? `Both are named in the historical event “${events[0]!.title}”`
            : `Both are named in ${events.length} of the same historical events`,
      });
      continue;
    }

    const stories = sharedRefs(subject.storyRefs, candidate.storyRefs);
    if (stories.length > 0) {
      related.push({
        experience: candidate,
        kind: "story",
        shared: stories.length,
        straightLineKm: straightLineBetween(subject, candidate),
        reason:
          stories.length === 1
            ? `Both appear in the story “${stories[0]!.title}”`
            : `Both appear in ${stories.length} of the same stories`,
      });
      continue;
    }

    /* Proximity is only offered when BOTH records publish a coordinate.
       A missing coordinate produces no relationship at all — never an
       assumed one from the district. */
    const km = straightLineBetween(subject, candidate);
    if (km !== undefined && km <= PROXIMITY_KM) {
      related.push({
        experience: candidate,
        kind: "proximity",
        shared: 0,
        straightLineKm: km,
        reason: `${km} km away in a straight line, measured between published coordinates`,
      });
      continue;
    }

    if (subject.area && candidate.area && subject.area === candidate.area) {
      related.push({
        experience: candidate,
        kind: "area",
        shared: 0,
        straightLineKm: km,
        reason: `Both are catalogued in ${subject.area}`,
      });
    }
  }

  return related
    .sort((a, b) => {
      if (RULE_ORDER[a.kind] !== RULE_ORDER[b.kind]) return RULE_ORDER[a.kind] - RULE_ORDER[b.kind];
      if (b.shared !== a.shared) return b.shared - a.shared;
      const aKm = a.straightLineKm ?? Number.POSITIVE_INFINITY;
      const bKm = b.straightLineKm ?? Number.POSITIVE_INFINITY;
      if (aKm !== bKm) return aKm - bKm;
      return a.experience.id.localeCompare(b.experience.id);
    })
    .slice(0, limit);
}

/**
 * Nearby experiences, by published coordinate only.
 *
 * Returns [] for a record with no coordinate — Dubdi's is withheld by the
 * archive as disputed, and the correct answer for it is "we cannot say",
 * not a list ordered by a guess.
 */
export function nearbyExperiences(
  subject: Experience,
  all: Experience[],
  limit = 5,
): { experience: Experience; straightLineKm: number }[] {
  if (subject.coordinates === undefined) return [];
  return all
    .filter((experience) => experience.id !== subject.id)
    .map((experience) => ({ experience, straightLineKm: straightLineBetween(subject, experience) }))
    .filter((entry): entry is { experience: Experience; straightLineKm: number } =>
      entry.straightLineKm !== undefined,
    )
    .sort(
      (a, b) =>
        a.straightLineKm - b.straightLineKm ||
        a.experience.id.localeCompare(b.experience.id),
    )
    .slice(0, limit);
}
