import type {
  Experience,
  JourneyInterest,
  ScoreBreakdown,
  ScoredExperience,
  SelectionReason,
} from "./types";
import { INTEREST_LABEL } from "./types";

/**
 * The ranking model.
 *
 * DESIGN CONSTRAINT: every number here must be explainable to the person
 * reading the itinerary. There is no learned model, no opaque weighting and
 * no hidden normalization. The formula is:
 *
 *   score = interestMatch        (0-50)
 *         + historicalRelevance  (0-20)
 *         + culturalRelevance    (0-20)
 *         + heritageRelevance    (0-5)
 *         + evidenceStrength     (0-5)
 *
 * The ranges are the model. Interest match dominates deliberately — the
 * traveller's stated interest should outrank the archive's internal density,
 * or selecting "Nature" would still return the most-written-about monastery.
 *
 * WHY RELEVANCE IS COUNTED, NOT ASSERTED
 * --------------------------------------
 * `historicalRelevance` is how many history events name this site in their own
 * `relatedPlaces` / `relatedMonasteries`. `culturalRelevance` is how many
 * stories name it. Both are edges an editor authored on the OTHER record, so a
 * site cannot inflate its own importance, and the planner is not judging
 * significance — it is reading how much of the archive points at a thing.
 *
 * WHY EVIDENCE IS A TIE-BREAK, NOT A GATE (Objective 18)
 * ------------------------------------------------------
 * Evidence contributes at most 5 points: enough to order two otherwise-equal
 * candidates, never enough to promote a poorly-matched one. Destination depth
 * is deliberately NOT an input — "deep" describes a destination's corpus, not
 * whether one individual record is well supported, and using it would rank
 * every Sikkim record above every Kyoto record regardless of the evidence on
 * either.
 */

/** Points for each interest the traveller selected that this experience serves. */
const INTEREST_POINTS = 25;
const INTEREST_MAX = 50;

/** Points per history event that names this experience. */
const HISTORY_POINTS = 5;
const HISTORY_MAX = 20;

/** Points per story that names this experience. */
const CULTURE_POINTS = 4;
const CULTURE_MAX = 20;

/** A catalogued heritage/sacred site is a heritage experience by definition. */
const HERITAGE_POINTS = 5;

/** Having a citable source at all. */
const EVIDENCE_POINTS = 3;
/** Publishing a verified coordinate — it can be placed geographically. */
const COORDINATE_POINTS = 2;

const clamp = (n: number, max: number) => Math.min(n, max);

export function scoreExperience(
  experience: Experience,
  interests: JourneyInterest[],
): ScoreBreakdown {
  const matched = interests.filter((i) => experience.interests.includes(i));

  /*
   * With no interests selected, interest match is neutral rather than zero:
   * otherwise every candidate ties at 0 and the ranking collapses into the
   * alphabetical candidate order.
   */
  const interestMatch =
    interests.length === 0
      ? INTEREST_POINTS
      : clamp(matched.length * INTEREST_POINTS, INTEREST_MAX);

  const historicalRelevance = clamp(experience.historyRefs.length * HISTORY_POINTS, HISTORY_MAX);
  const culturalRelevance = clamp(experience.storyRefs.length * CULTURE_POINTS, CULTURE_MAX);
  const heritageRelevance =
    experience.interests.includes("heritage") || experience.interests.includes("sacred")
      ? HERITAGE_POINTS
      : 0;
  const evidenceStrength =
    (experience.evidence.length > 0 ? EVIDENCE_POINTS : 0) +
    (experience.coordinates ? COORDINATE_POINTS : 0);

  return {
    interestMatch,
    historicalRelevance,
    culturalRelevance,
    heritageRelevance,
    evidenceStrength,
    total:
      interestMatch +
      historicalRelevance +
      culturalRelevance +
      heritageRelevance +
      evidenceStrength,
  };
}

/**
 * The sentences shown under a recommendation.
 *
 * Each one describes what THE PLANNER did, and each is derived from a value
 * that is present on the record. None of them describes the destination — the
 * record's own sourced summary does that, verbatim, elsewhere on the card.
 *
 * Nothing here may say "AI selected this": there is no model in this path.
 */
export function explain(
  experience: Experience,
  interests: JourneyInterest[],
  breakdown: ScoreBreakdown,
): SelectionReason[] {
  const reasons: SelectionReason[] = [];
  const matched = interests.filter((i) => experience.interests.includes(i));

  /*
   * One reason per matched interest, each naming the evidence that earned it.
   *
   * PHASE 14: this used to read "Matches the nature interest you chose." and
   * stop, which is the least useful half of the sentence — a traveller
   * looking at a monastery filed under Nature cannot tell whether that is a
   * real classification. The basis comes from `experience.interestBasis`,
   * the same list `experience.interests` is derived from, so the explanation
   * and the classification cannot disagree.
   */
  for (const interest of matched) {
    const basis = experience.interestBasis
      .filter((entry) => entry.interest === interest)
      .sort((a, b) => b.refs.length - a.refs.length)[0];
    reasons.push({
      kind: "interest",
      text: basis
        ? `Matches ${INTEREST_LABEL[interest]} — ${basis.detail}.`
        : `Matches the ${INTEREST_LABEL[interest].toLowerCase()} interest you chose.`,
    });
  }

  if (experience.historyRefs.length > 0) {
    const n = experience.historyRefs.length;
    reasons.push({
      kind: "history",
      text:
        n === 1
          ? `Named in the historical record “${experience.historyRefs[0]!.title}”.`
          : `Named in ${n} events in this destination's history.`,
    });
  }

  if (experience.storyRefs.length > 0) {
    const n = experience.storyRefs.length;
    reasons.push({
      kind: "culture",
      text:
        n === 1
          ? `Connected to the story “${experience.storyRefs[0]!.title}”.`
          : `Connected to ${n} stories in the archive.`,
    });
  }

  if (matched.length === 0 && interests.length > 0 && breakdown.total > 0) {
    reasons.push({
      kind: "coverage",
      text: "Included to fill the day — it did not match your interests directly.",
    });
  }

  return reasons;
}

/**
 * Rank candidates.
 *
 * TWO KEYS, IN THIS ORDER — and the first one is not negotiable:
 *
 *   1. **Does it match a chosen interest at all?** Everything that does
 *      outranks everything that does not.
 *   2. Then the score above. Then the id, so the same input gives the same
 *      order every time.
 *
 * Key 1 exists because points alone did not deliver what "prioritize
 * experiences matching the traveller's interests" means. Measured on Sikkim:
 * asking for **Nature** returned Pemayangtse, Tashiding and Dubdi as the
 * first three stops — three monasteries. They match no nature interest, but
 * they are the most written-about records in the archive, so 20 points of
 * historical relevance plus 20 of cultural relevance plus 5 of heritage put
 * them level with a lake that matched. An additive model lets density
 * outvote the traveller.
 *
 * A hard partition fixes that without discarding anything: unmatched records
 * still appear, still ranked among themselves, and still fill a day when the
 * matching ones run out — labelled, by `explain()`, as exactly that.
 */
export function rank(
  candidates: Experience[],
  interests: JourneyInterest[],
  pinned: string[] = [],
): ScoredExperience[] {
  const matches = (experience: Experience) =>
    interests.length === 0 || interests.some((i) => experience.interests.includes(i));
  const pinnedSet = new Set(pinned);

  return candidates
    .map((experience) => {
      const breakdown = scoreExperience(experience, interests);
      const reasons = explain(experience, interests, breakdown);
      /* A pinned experience says so first: the traveller put it there, and
         the planner should not take credit for the choice. */
      if (pinnedSet.has(experience.id)) {
        reasons.unshift({
          kind: "pinned",
          text: "You added this from discovery, so the plan is built around it.",
        });
      }
      return { experience, score: breakdown.total, breakdown, reasons };
    })
    .sort((a, b) => {
      const aPin = pinnedSet.has(a.experience.id) ? 1 : 0;
      const bPin = pinnedSet.has(b.experience.id) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const aMatch = matches(a.experience) ? 1 : 0;
      const bMatch = matches(b.experience) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      if (b.score !== a.score) return b.score - a.score;
      return a.experience.id.localeCompare(b.experience.id);
    });
}

