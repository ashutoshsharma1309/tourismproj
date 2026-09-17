import { getPublishedKnowledge } from "@/data/published-knowledge";
import { getHistory, getStories } from "@/lib/destinations/content";
import { gradeCoverage } from "@/lib/destinations/earned-depth";
import type { EarnedDepth } from "@/lib/destinations/earned-depth";
import { experiencesFor } from "@/lib/discovery";
import { listDestinations } from "@/lib/destinations/registry";
import { ALL_INTERESTS, INTEREST_LABEL } from "@/lib/planner/types";
import type { Experience, JourneyInterest } from "@/lib/planner/types";
import type { DataDepth, Destination } from "@/types/destination";

/**
 * What each destination can actually offer, per interest.
 *
 * THE DISTINCTION THIS FILE EXISTS TO KEEP
 * ----------------------------------------
 * Two very different things can make a destination relevant to "History":
 *
 *   - **Experience coverage** — catalogued records you can stand in front of,
 *     carrying that interest through their own type or through the events and
 *     stories that name them. Sikkim has these.
 *   - **Knowledge coverage** — reviewer-approved claims in that category.
 *     Jaipur held these and nothing else before it gained a capsule.
 *
 * They are counted separately and rendered separately, because collapsing
 * them would let "35 approved facts about Jaipur" read as "35 things to do in
 * Jaipur". A destination with knowledge and no experiences is described as
 * exactly that: *historical knowledge available, tourism experience layer not
 * yet available*.
 *
 * COVERAGE IS NOT QUALITY. Every number here measures how much of THIS
 * ARCHIVE stands behind a destination. Sikkim has more records than Jaipur
 * because more of Sikkim has been catalogued — that is a fact about the
 * archive, not about the two places, and every surface that renders these
 * numbers says so.
 *
 * Server-only: it reaches the content accessors. Runs at build time.
 */

/**
 * Which approved-knowledge category evidences which interest.
 *
 * Deliberately partial. `nature`, `architecture`, `museums`, `food`, `art`
 * and `local` have no category in the published-knowledge model, so a
 * destination cannot match them on claims alone — it needs real records. That
 * is a limit of the data, and it is left visible rather than papered over
 * with a loose keyword rule.
 */
const KNOWLEDGE_CATEGORY_FOR: Partial<Record<JourneyInterest, string[]>> = {
  history: ["history"],
  heritage: ["heritage"],
  culture: ["culture", "festivals"],
  sacred: ["heritage"],
};

export interface InterestCoverage {
  interest: JourneyInterest;
  label: string;
  /** Catalogued records carrying this interest. */
  experiences: number;
  /** Reviewer-approved claims in the categories that evidence it. */
  claims: number;
  /** True when either count is above zero. */
  covered: boolean;
  /**
   * The sentence rendered to the visitor. States what was counted and where
   * it came from — never an adjective.
   */
  basis: string;
}

export interface DestinationCoverage {
  destination: Destination;
  /** Graded from actual coverage by `gradeCoverage`, never read from a field. */
  depth: DataDepth;
  /** The full grade: dimensions, what the registry declared, and the shortfall. */
  earnedDepth: EarnedDepth;
  interests: InterestCoverage[];
  /** Interests with any coverage at all. */
  covered: JourneyInterest[];
  totals: {
    experiences: number;
    mapped: number;
    claims: number;
    timeline: number;
    sources: number;
    historyLinks: number;
    storyLinks: number;
  };
  /** True when the destination has approved knowledge but nothing visitable. */
  knowledgeOnly: boolean;
  /** True when it has neither. */
  empty: boolean;
  /** The experience set, for callers that need the records themselves. */
  experiences: Experience[];
}

function coverageFor(
  interest: JourneyInterest,
  experiences: Experience[],
  claimsByCategory: Map<string, number>,
): InterestCoverage {
  const records = experiences.filter((experience) => experience.interests.includes(interest));
  const categories = KNOWLEDGE_CATEGORY_FOR[interest] ?? [];
  const claims = categories.reduce((total, category) => total + (claimsByCategory.get(category) ?? 0), 0);

  const parts: string[] = [];
  if (records.length > 0) {
    parts.push(`${records.length} catalogued ${records.length === 1 ? "record carries" : "records carry"} it`);
  }
  if (claims > 0) {
    parts.push(
      `${claims} reviewer-approved ${claims === 1 ? "claim sits" : "claims sit"} in ${categories
        .map((category) => `the ${category} category`)
        .join(" and ")}`,
    );
  }

  return {
    interest,
    label: INTEREST_LABEL[interest],
    experiences: records.length,
    claims,
    covered: records.length > 0 || claims > 0,
    basis: parts.length > 0 ? parts.join("; ") : "No catalogued record or approved claim carries it",
  };
}

export async function destinationCoverage(destination: Destination): Promise<DestinationCoverage> {
  /* Stories and dated events are loaded here because the grade counts them.
     Both are lazy per-destination accessors and both are already resolved for
     any destination this coverage is being computed for. */
  const [experiences, stories, history] = await Promise.all([
    experiencesFor(destination.id),
    getStories(destination.id),
    getHistory(destination.id),
  ]);
  const knowledge = getPublishedKnowledge(destination.id);
  const graded = gradeCoverage(
    {
      places: experiences.length,
      history: history.length,
      stories: stories.length,
      approvedClaims: knowledge?.depth.metrics.approvedClaims ?? 0,
    },
    destination.depth,
  );

  const claimsByCategory = new Map<string, number>();
  for (const category of knowledge?.categories ?? []) {
    claimsByCategory.set(category.category, category.claims.length);
  }

  const interests = ALL_INTERESTS.map((interest) =>
    coverageFor(interest, experiences, claimsByCategory),
  );
  const covered = interests.filter((entry) => entry.covered).map((entry) => entry.interest);

  const claims = knowledge?.depth.metrics.approvedClaims ?? 0;

  return {
    destination,
    /*
     * PHASE B — the depth a destination has EARNED from its records, not the
     * one typed into the registry.
     *
     * `knowledge?.depth.depth ?? destination.depth` read a field. That field
     * was correct only for as long as nobody changed the data underneath it:
     * Jaipur and Kyoto gained catalogued places in Phase B and would have gone
     * on reporting whatever the registry said. `gradeCoverage` counts what is
     * actually there and grades it against thresholds stated once, in
     * `earned-depth.ts`.
     *
     * It is a COVERAGE measure, never a quality one, and no surface orders
     * destinations by it.
     */
    depth: graded.depth,
    earnedDepth: graded,
    interests,
    covered,
    totals: {
      experiences: experiences.length,
      mapped: experiences.filter((experience) => experience.coordinates !== undefined).length,
      claims,
      timeline: knowledge?.timeline.length ?? 0,
      sources: knowledge?.sourcesUsed.length ?? 0,
      historyLinks: experiences.reduce((total, e) => total + e.historyRefs.length, 0),
      storyLinks: experiences.reduce((total, e) => total + e.storyRefs.length, 0),
    },
    knowledgeOnly: experiences.length === 0 && claims > 0,
    empty: experiences.length === 0 && claims === 0,
    experiences,
  };
}

/** Coverage for every registered destination, in registry order. */
export async function allCoverage(): Promise<DestinationCoverage[]> {
  return Promise.all(listDestinations().map((destination) => destinationCoverage(destination)));
}

/**
 * The interests worth offering globally.
 *
 * An interest appears in the global entry only where at least one registered
 * destination can satisfy it — the same rule the destination-scoped discovery
 * page follows, applied one level up. Selecting an interest that nothing
 * covers would return an empty page and teach the visitor that the filter is
 * decorative.
 */
export function globallyCoveredInterests(coverage: DestinationCoverage[]): JourneyInterest[] {
  const present = new Set(coverage.flatMap((entry) => entry.covered));
  return ALL_INTERESTS.filter((interest) => present.has(interest));
}
