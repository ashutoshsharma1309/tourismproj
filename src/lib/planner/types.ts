import type { Coordinates } from "@/types";

/**
 * The journey planner's domain model.
 *
 * WHAT THIS PLANNER IS, AND WHAT IT IS NOT
 * ----------------------------------------
 * Sikkim already has a routed planner (`/destinations/sikkim/planner`) built on
 * a hand-authored road-corridor graph. It states real travel legs because a
 * person encoded which valleys connect to which. Nothing else in the registry
 * has that graph, and inventing one would produce confident fiction — see
 * docs/trip-planner-generalization-notes.md §5.
 *
 * This is the other half of that document's §4.4: the NON-ROUTED planner.
 * It groups verified experiences into themed days by administrative area and
 * orders them by verified coordinates. It never states a travel time, never
 * estimates a duration, and never converts a straight-line distance into one.
 *
 * Both planners coexist deliberately. This one generalizes; that one is more
 * precise where it applies.
 *
 * EVERY FIELD HERE IS CARRIED, NOT COMPOSED
 * -----------------------------------------
 * `summary` is the source record's own sentence, verbatim. No field on an
 * Experience is prose this planner wrote about a place. The only sentences the
 * planner authors are its own REASONS for selecting something, and those
 * describe the planner's logic, never the destination.
 */

/**
 * A traveller interest.
 *
 * These are not a fixed menu shown to everyone: `availableInterests()` derives
 * which of them a destination can actually satisfy from its own content, so a
 * destination with no catalogued museum never offers "Museums".
 */
export type JourneyInterest =
  | "history"
  | "heritage"
  | "culture"
  | "architecture"
  | "sacred"
  | "museums"
  | "nature"
  | "food"
  | "art"
  | "local";

export const INTEREST_LABEL: Record<JourneyInterest, string> = {
  history: "History",
  heritage: "Heritage",
  culture: "Culture",
  architecture: "Architecture",
  sacred: "Religious heritage",
  museums: "Museums",
  nature: "Nature",
  food: "Food",
  art: "Art",
  local: "Local life",
};

export const ALL_INTERESTS: JourneyInterest[] = Object.keys(INTEREST_LABEL) as JourneyInterest[];

/** How much a traveller wants to see in one day. Three understandable options. */
export type JourneyPace = "relaxed" | "balanced" | "intensive";

/**
 * Experiences per day, by pace.
 *
 * These are the planner's own stated policy, not a measurement of how long
 * anything takes. Visit durations are not published for these records, so the
 * planner budgets in WHOLE EXPERIENCES rather than pretending to schedule
 * hours — Objective 10's requirement, and the honest reading of the data.
 */
export const PACE_CAPACITY: Record<JourneyPace, number> = {
  relaxed: 2,
  balanced: 3,
  intensive: 5,
};

export const PACE_LABEL: Record<JourneyPace, string> = {
  relaxed: "Relaxed",
  balanced: "Balanced",
  intensive: "Intensive",
};

export const PACE_NOTE: Record<JourneyPace, string> = {
  relaxed: "Two places a day, with room to stay longer at each.",
  balanced: "Three places a day.",
  intensive: "Up to five places a day, covering more ground.",
};

/**
 * What kind of record an experience came from.
 *
 * `culture` is a dish, a festival or a craft — what a destination *does*, as
 * opposed to what a visitor stands in front of. It was added because the
 * capsule destinations carry these records and nothing downstream read them:
 * Delhi catalogues eight foods, six festivals and four crafts, all sourced
 * and all with vendored photographs, and offered the traveller no Food
 * interest because only places, stories and history reached the candidate
 * pool. Including them states what the archive already holds.
 */
export type ExperienceKind = "site" | "place" | "culture";

/** A pointer back to the record that supports a fact. Never synthesized. */
export interface ExperienceReference {
  slug: string;
  title: string;
  href: string;
}

/** A source the underlying record cites. */
export interface ExperienceEvidence {
  label: string;
  href: string;
}

/**
 * A practical note — permits, elevation.
 *
 * ONLY populated from a field the record actually publishes. The planner never
 * derives opening hours, ticket prices, travel times or closing days. Where
 * nothing is published, the list is empty and the UI says so explicitly.
 */
export interface PracticalNote {
  label: string;
  value: string;
}

/**
 * Why an experience carries an interest.
 *
 * PHASE 14, OBJECTIVE 3. Before this existed, a card said "Matches the nature
 * interest you chose" and stopped. A traveller looking at a MONASTERY under
 * "Nature" has no way to tell whether that is a real classification or a
 * guess — and the answer is neither obvious nor guessable: it is there
 * because the archive shelves three sacred-landscape stories against it.
 *
 * The basis is recorded WHERE THE INTEREST IS ASSIGNED, and `interests` is
 * derived from this list rather than assembled separately, so an explanation
 * cannot drift from the classification it explains.
 */
export type InterestBasisKind =
  /** The record's own type or category says so — a monastery, a lake. */
  | "record"
  /** History events name this record. */
  | "history"
  /** Stories shelved under a category name this record. */
  | "stories";

export interface InterestBasis {
  interest: JourneyInterest;
  kind: InterestBasisKind;
  /** A sentence stating the evidence, e.g. "3 stories shelved under …". */
  detail: string;
  /** The records that provide it, where they can be linked. */
  refs: ExperienceReference[];
}

/** A candidate the planner may place in a day. */
export interface Experience {
  /** Stable and content-addressed: "site:rumtek". Safe in a URL. */
  id: string;
  destinationId: string;
  title: string;
  kind: ExperienceKind;
  /** "Karma Kagyu monastery", "Lake" — the record's own classification. */
  typeLabel: string;
  /** The administrative area used for day grouping. Null when unpublished. */
  area: string | null;
  /** Present ONLY where the source publishes a coordinate. */
  coordinates?: Coordinates;
  /** The record's own sourced sentence, verbatim. */
  summary: string;
  href: string;
  image: string | null;
  imageAlt: string;
  /** Derived from `interestBasis` — never assembled separately. */
  interests: JourneyInterest[];
  /** Why each interest applies. One entry per (interest, evidence) pair. */
  interestBasis: InterestBasis[];
  /** History events whose own `relatedPlaces`/`relatedMonasteries` name this. */
  historyRefs: ExperienceReference[];
  /** Stories whose own `relatedMonasteries` name this. */
  storyRefs: ExperienceReference[];
  evidence: ExperienceEvidence[];
  practical: PracticalNote[];
}

/** The traveller's inputs. Destination comes from the route, never asked for. */
export interface JourneyInput {
  destinationId: string;
  /** Whole days, 1-7. 7 means "7 or more". */
  days: number;
  interests: JourneyInterest[];
  pace: JourneyPace;
  /** Experience ids the traveller removed. */
  removed: string[];
  /**
   * Experience ids the traveller added from discovery.
   *
   * A pin does not bypass the planner — it enters the same ranking, but
   * ahead of everything else, so the day containing it is always selected.
   * The planner still decides which day, in what order and beside what.
   * `removed` wins over `pinned`: an explicit removal is the more recent,
   * more specific instruction.
   */
  pinned: string[];
}

/** Why one experience earned its place. Deterministic, and shown to the user. */
export interface SelectionReason {
  /** A short sentence describing the PLANNER's logic. */
  text: string;
  kind: "interest" | "history" | "culture" | "geography" | "evidence" | "coverage" | "pinned";
}

export interface ScoredExperience {
  experience: Experience;
  score: number;
  /** Every component, so the score can be shown and audited. */
  breakdown: ScoreBreakdown;
  reasons: SelectionReason[];
}

export interface ScoreBreakdown {
  interestMatch: number;
  historicalRelevance: number;
  culturalRelevance: number;
  heritageRelevance: number;
  evidenceStrength: number;
  total: number;
}

export interface ItineraryStop {
  experience: Experience;
  reasons: SelectionReason[];
  /**
   * Straight-line distance from the previous stop, in km. Present only when
   * BOTH stops publish a coordinate. Never converted into a travel time.
   */
  straightLineFromPreviousKm?: number;
}

export interface ItineraryDay {
  day: number;
  /** Named after what is in it — never invented marketing copy. */
  title: string;
  /** The administrative area this day sits in, when the stops share one. */
  area: string | null;
  stops: ItineraryStop[];
}

/** Why the planner could not fill the requested trip. */
export interface CoverageGap {
  requestedDays: number;
  plannedDays: number;
  /** Experiences that matched but did not fit the requested pace/duration. */
  unusedCount: number;
  message: string;
}

export interface Itinerary {
  destinationId: string;
  input: JourneyInput;
  days: ItineraryDay[];
  /** Set when the destination cannot honestly fill the requested duration. */
  gap: CoverageGap | null;
  /** Candidates that matched the interests but were not placed. */
  alsoAvailable: Experience[];
  /** Total experiences placed. */
  stopCount: number;
  /** True when at least one placed stop has a verified coordinate. */
  usedCoordinates: boolean;
}
