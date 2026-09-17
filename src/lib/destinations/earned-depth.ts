import { getHistory, getPlaces, getSites, getStories } from "@/lib/destinations/content";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { DATA_DEPTH_ORDER } from "@/types/destination";
import type { DataDepth } from "@/types/destination";

/**
 * What a destination's coverage actually earns.
 *
 * WHY THIS EXISTS
 * ---------------
 * `depth` was a field somebody typed. Sikkim said `deep` because a human wrote
 * `deep`, and the twelve capsules said `capsule` for the same reason. That is
 * fine right up until the data moves underneath the label — a destination that
 * gains fifty places keeps saying "capsule", and one whose records are removed
 * goes on claiming a depth it no longer has.
 *
 * So the status is computed from the records themselves, against thresholds
 * written down here rather than argued case by case.
 *
 * WHAT THIS IS NOT
 * ----------------
 * **It is not a quality score and must never be presented as one.** It answers
 * "how much of this destination has been catalogued?", not "how good is this
 * place?". A destination with fewer records is not a lesser place; it is one
 * less of which has been catalogued, and every surface that shows a depth says
 * some version of that sentence.
 *
 * There is deliberately no numeric total and no ordering of destinations by
 * coverage. The dimensions are reported separately so a reader sees WHICH kind
 * of material exists, and the reasons say what a higher tier would require.
 */

/**
 * The thresholds, stated once.
 *
 * Chosen from the reference implementation rather than from ambition: Sikkim
 * holds 38 places, 26 dated events and 70 stories, and it is the only archive
 * in this project that has been through human curation end to end. `deep`
 * therefore asks for a substantial fraction of that ON ALL THREE AXES, because
 * depth is breadth of kind, not a big number in one column — a destination
 * with 40 places and no stories has a catalogue, not an archive.
 */
export const DEPTH_THRESHOLDS = {
  deep: { places: 25, history: 15, stories: 25 },
  /** Human-reviewed research knowledge, in quantity. */
  curated: { approvedClaims: 20 },
  /** Any published, reviewer-approved research at all. */
  researched: { approvedClaims: 1 },
  /** Enough catalogued records to explore. */
  capsule: { places: 3 },
} as const;

export interface CoverageDimensions {
  places: number;
  history: number;
  stories: number;
  approvedClaims: number;
}

export interface EarnedDepth {
  /** What the coverage earns. */
  depth: DataDepth;
  /** What the registry record claims. */
  declared: DataDepth;
  /** True when the two disagree — always worth surfacing, never hidden. */
  drift: boolean;
  dimensions: CoverageDimensions;
  /** Why it is not the next tier up. Empty at `deep`. */
  reasons: string[];
}

/** Count what a destination actually holds. */
export async function coverageDimensions(destinationId: string): Promise<CoverageDimensions> {
  const [places, sites, stories, history] = await Promise.all([
    getPlaces(destinationId),
    getSites(destinationId),
    getStories(destinationId),
    getHistory(destinationId),
  ]);
  return {
    /* Sites and places are both visitable records; a destination that keeps
       its monasteries in one list and its places in another holds both. */
    places: places.length + sites.length,
    history: history.length,
    stories: stories.length,
    approvedClaims: getPublishedKnowledge(destinationId)?.depth.metrics.approvedClaims ?? 0,
  };
}

/**
 * Grade the coverage.
 *
 * Order matters: the highest tier a destination qualifies for wins, and a
 * destination can qualify through either route — a catalogued archive or
 * reviewed research — because those are two different ways of knowing a place
 * and the model should not pretend one is the other.
 */
export function gradeCoverage(
  dimensions: CoverageDimensions,
  declared: DataDepth,
): EarnedDepth {
  const { deep, curated, researched, capsule } = DEPTH_THRESHOLDS;
  const reasons: string[] = [];

  /*
   * TWO ROUTES, AND THE HIGHER ONE WINS.
   *
   * A catalogued archive and reviewed research are different ways of knowing a
   * place, and a destination can hold both — Jaipur holds catalogued places
   * AND reviewer-approved claims. An if/else chain graded it by
   * whichever branch happened to come first, which quietly discarded the
   * research and called it a capsule. Take the better of the two.
   */
  const byRecords: DataDepth =
    dimensions.places >= deep.places &&
    dimensions.history >= deep.history &&
    dimensions.stories >= deep.stories
      ? "deep"
      : dimensions.places >= capsule.places
        ? "capsule"
        : "planned";

  const byResearch: DataDepth =
    dimensions.approvedClaims >= curated.approvedClaims
      ? "curated"
      : dimensions.approvedClaims >= researched.approvedClaims
        ? "researched"
        : "planned";

  const depth: DataDepth =
    DATA_DEPTH_ORDER[byRecords] >= DATA_DEPTH_ORDER[byResearch] ? byRecords : byResearch;

  /* What the next tier would need. Stated as a shortfall, never as a score. */
  if (depth !== "deep") {
    if (dimensions.places < deep.places) {
      reasons.push(`${dimensions.places} catalogued records (a deep archive holds ${deep.places})`);
    }
    if (dimensions.history < deep.history) {
      reasons.push(`${dimensions.history} dated events (a deep archive holds ${deep.history})`);
    }
    if (dimensions.stories < deep.stories) {
      reasons.push(`${dimensions.stories} stories (a deep archive holds ${deep.stories})`);
    }
  }

  return {
    depth,
    declared,
    drift: DATA_DEPTH_ORDER[depth] !== DATA_DEPTH_ORDER[declared],
    dimensions,
    reasons,
  };
}

/** Count and grade in one call. */
export async function earnedDepth(
  destinationId: string,
  declared: DataDepth,
): Promise<EarnedDepth> {
  return gradeCoverage(await coverageDimensions(destinationId), declared);
}
