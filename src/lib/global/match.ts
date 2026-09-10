import type { DestinationCoverage } from "@/lib/global/coverage";
import { INTEREST_LABEL } from "@/lib/planner/types";
import type { JourneyInterest } from "@/lib/planner/types";
import type { DataDepth } from "@/types/destination";

/**
 * Interest-first destination matching.
 *
 * WHAT IS BEING RANKED, STATED PLAINLY
 * ------------------------------------
 * Verified COVERAGE of what the visitor asked for. Not beauty, not
 * popularity, not "best destination". A destination scores highly here
 * because this archive holds a lot about it in the categories selected —
 * which is a measurement of the archive, and is exactly what the UI says
 * beside the list.
 *
 * THE FORMULA, IN FULL
 * --------------------
 *   MATCH BREADTH      45   selected interests covered / selected interests
 *   EXPERIENCE DEPTH   25   min(matched records / 20, 1)
 *   KNOWLEDGE DEPTH    20   min(matched claims / 20, 1)
 *   RESEARCH DEPTH     10   deep 1.0 · curated 0.75 · researched 0.5 ·
 *                          capsule 0.25 · planned 0
 *
 * Breadth dominates deliberately: a destination that covers both interests a
 * visitor chose is a better answer to their question than one that covers a
 * single interest very deeply. Ties break on name, ascending — never on
 * registry order, which would quietly privilege whichever destination was
 * added first.
 *
 * A destination covering NONE of the selected interests is not ranked low; it
 * is excluded. Showing it would be a false match, and a filter that returns
 * everything is not a filter.
 *
 * With no interests selected the score is the same arithmetic over ALL
 * interests, which reads as "how much is known about this destination overall"
 * — and that is what the page says.
 */

export const MATCH_WEIGHTS = {
  breadth: 45,
  experienceDepth: 25,
  knowledgeDepth: 20,
  researchDepth: 10,
} as const;

/** Counts at which a depth factor is fully earned. */
export const SATURATION = { experiences: 20, claims: 20 } as const;

const DEPTH_FACTOR: Record<DataDepth, number> = {
  deep: 1,
  curated: 0.75,
  researched: 0.5,
  /* PHASE 17. A capsule is a handful of sourced entries, so it earns less of
     the depth component than a researched destination with a pipeline behind
     it — and more than nothing, because it IS reviewed content. */
  capsule: 0.25,
  planned: 0,
};

export interface MatchComponent {
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface DestinationMatch {
  coverage: DestinationCoverage;
  score: number;
  components: MatchComponent[];
  /** Interests the visitor selected that this destination covers. */
  matched: JourneyInterest[];
  /** One line per matched interest, naming what was counted. */
  reasons: string[];
  /** Records and claims counted across the matched interests. */
  matchedExperiences: number;
  matchedClaims: number;
}

const round = (value: number) => Math.round(value);

export function scoreDestination(
  coverage: DestinationCoverage,
  interests: JourneyInterest[],
): DestinationMatch {
  const considered = interests.length > 0 ? interests : coverage.interests.map((entry) => entry.interest);

  const rows = coverage.interests.filter((entry) => considered.includes(entry.interest));
  const matchedRows = rows.filter((entry) => entry.covered);
  const matched = matchedRows.map((entry) => entry.interest);

  const matchedExperiences = matchedRows.reduce((total, entry) => total + entry.experiences, 0);
  const matchedClaims = matchedRows.reduce((total, entry) => total + entry.claims, 0);

  const breadth = considered.length === 0 ? 0 : matched.length / considered.length;
  const components: MatchComponent[] = [
    {
      label: "Interests covered",
      points: round(MATCH_WEIGHTS.breadth * breadth),
      max: MATCH_WEIGHTS.breadth,
      detail:
        interests.length > 0
          ? `${matched.length} of the ${interests.length} you selected`
          : `${matched.length} of ${considered.length} interests have any coverage`,
    },
    {
      label: "Catalogued records",
      points: round(MATCH_WEIGHTS.experienceDepth * Math.min(matchedExperiences / SATURATION.experiences, 1)),
      max: MATCH_WEIGHTS.experienceDepth,
      detail:
        matchedExperiences > 0
          ? `${matchedExperiences} records carry those interests`
          : "No catalogued record carries them yet",
    },
    {
      label: "Approved knowledge",
      points: round(MATCH_WEIGHTS.knowledgeDepth * Math.min(matchedClaims / SATURATION.claims, 1)),
      max: MATCH_WEIGHTS.knowledgeDepth,
      detail:
        matchedClaims > 0
          ? `${matchedClaims} reviewer-approved claims sit in those categories`
          : "No approved claim sits in those categories",
    },
    {
      label: "Research depth",
      points: round(MATCH_WEIGHTS.researchDepth * DEPTH_FACTOR[coverage.depth]),
      max: MATCH_WEIGHTS.researchDepth,
      detail: `Coverage is graded ${coverage.depth === "planned" ? "not yet available" : coverage.depth}`,
    },
  ];

  const reasons = matchedRows.map((entry) => `${INTEREST_LABEL[entry.interest]} — ${entry.basis}`);

  return {
    coverage,
    score: components.reduce((total, component) => total + component.points, 0),
    components,
    matched,
    reasons,
    matchedExperiences,
    matchedClaims,
  };
}

/**
 * Rank destinations for a set of interests.
 *
 * Deterministic: score descending, then destination name ascending. Anything
 * covering none of the selected interests is dropped rather than ranked last.
 */
export function matchDestinations(
  coverage: DestinationCoverage[],
  interests: JourneyInterest[],
): DestinationMatch[] {
  return coverage
    .map((entry) => scoreDestination(entry, interests))
    .filter((match) => match.matched.length > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.coverage.destination.name.localeCompare(b.coverage.destination.name, "en"),
    );
}
