import type { DestinationCoverage } from "@/lib/global/coverage";
import type { ThemePresence } from "@/lib/global/themes";
import { INTEREST_LABEL, type Experience, type JourneyInterest } from "@/lib/planner/types";

/**
 * The personalization engine: deterministic, explainable, and bounded by
 * what the traveller actually said or did.
 *
 * THREE SIGNALS, NOTHING ELSE
 * ---------------------------
 *   1. Explicit interests — chosen by the traveller (user_interests).
 *   2. Travel history     — destinations explored and places viewed.
 *   3. Context            — the destination being explored right now.
 *
 * Destination knowledge comes from the same coverage the /discover page
 * ranks with (lib/global/coverage.ts): each interest a destination covers is
 * counted from its own records, and each theme from its own claims. Nothing
 * here reads popularity, visitor counts, or anyone else's history.
 *
 * WHAT A REASON MAY SAY
 * ---------------------
 * Every recommendation carries reasons built only from stored signals:
 * "Matches your interest in architecture" when architecture was chosen;
 * "You explored Jaipur and Agra, both strong in history" when both were
 * explored and both rank history among their strongest interests. A
 * recommendation with no such reason is not returned. The engine never says
 * a traveller "loves" anything, and never names an interest they neither
 * chose nor demonstrated.
 */

export interface ExploredDestination {
  destinationId: string;
  interactions: number;
  lastExploredAt: Date;
}

export interface ViewedEntity {
  destinationId: string;
  entityId: string;
}

export interface Signals {
  interests: JourneyInterest[];
  explored: ExploredDestination[];
  viewed: ViewedEntity[];
}

export interface Knowledge {
  coverage: DestinationCoverage[];
  themes: Map<string, ThemePresence[]>;
}

export interface DemonstratedInterest {
  interest: JourneyInterest;
  label: string;
  /** Names of explored destinations that rank this interest among their strongest. */
  fromDestinations: string[];
  /** Names of viewed places that carry this interest. */
  fromPlaces: string[];
}

export interface Recommendation {
  destinationId: string;
  name: string;
  score: number;
  matched: JourneyInterest[];
  reasons: string[];
}

export interface PlaceRecommendation {
  experience: Pick<Experience, "id" | "title" | "href" | "image" | "imageAlt" | "typeLabel" | "area">;
  matched: JourneyInterest[];
  reason: string;
}

/** Interests a destination is strongest in: most documented experiences, top three. */
const TOP_INTERESTS = 3;
/** A demonstrated interest needs at least this many independent observations. */
const MIN_EVIDENCE = 2;

const label = (interest: JourneyInterest) => INTEREST_LABEL[interest];

/** A theme name inside a sentence: "royal and palace heritage", but "Buddhist heritage". */
const PROPER_ADJECTIVE = /^(Buddhist|Mughal|Hindu|Sikh|Jain|Islamic|Christian|Rajput|Portuguese|British)\b/;
function inSentence(text: string): string {
  return PROPER_ADJECTIVE.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function strongestInterests(entry: DestinationCoverage): JourneyInterest[] {
  return entry.interests
    .filter((row) => row.covered && row.experiences > 0)
    .sort((a, b) => b.experiences - a.experiences || a.interest.localeCompare(b.interest))
    .slice(0, TOP_INTERESTS)
    .map((row) => row.interest);
}

/**
 * Interests the traveller has shown through meaningful activity. An interest
 * qualifies only with two independent observations — two explored
 * destinations strongest in it, or two viewed places that carry it — so one
 * visit never becomes a claim about what someone likes.
 */
export function demonstratedInterests(signals: Signals, knowledge: Knowledge): DemonstratedInterest[] {
  const byId = new Map(knowledge.coverage.map((entry) => [entry.destination.id, entry]));
  const fromDestinations = new Map<JourneyInterest, string[]>();
  const fromPlaces = new Map<JourneyInterest, string[]>();

  for (const explored of signals.explored) {
    const entry = byId.get(explored.destinationId);
    if (!entry) continue;
    for (const interest of strongestInterests(entry)) {
      const list = fromDestinations.get(interest) ?? [];
      list.push(entry.destination.name);
      fromDestinations.set(interest, list);
    }
  }

  for (const viewed of signals.viewed) {
    const entry = byId.get(viewed.destinationId);
    /* Destination-scoped lookup: an entity id is only ever resolved inside
       the destination it was recorded under. */
    const experience = entry?.experiences.find((candidate) => candidate.id === viewed.entityId);
    if (!experience) continue;
    for (const interest of experience.interests) {
      const list = fromPlaces.get(interest) ?? [];
      if (!list.includes(experience.title)) list.push(experience.title);
      fromPlaces.set(interest, list);
    }
  }

  const interests = new Set<JourneyInterest>([...fromDestinations.keys(), ...fromPlaces.keys()]);
  return [...interests]
    .map((interest) => ({
      interest,
      label: label(interest),
      fromDestinations: fromDestinations.get(interest) ?? [],
      fromPlaces: fromPlaces.get(interest) ?? [],
    }))
    .filter((row) => row.fromDestinations.length >= MIN_EVIDENCE || row.fromPlaces.length >= MIN_EVIDENCE)
    .sort(
      (a, b) =>
        Math.max(b.fromDestinations.length, b.fromPlaces.length) - Math.max(a.fromDestinations.length, a.fromPlaces.length) ||
        a.interest.localeCompare(b.interest),
    );
}

function demonstratedReason(row: DemonstratedInterest): string {
  if (row.fromDestinations.length >= MIN_EVIDENCE) {
    return `You explored ${listJoin(row.fromDestinations.slice(0, 3))}, destinations strong in ${row.label.toLowerCase()}.`;
  }
  return `You viewed ${listJoin(row.fromPlaces.slice(0, 2))}, which share ${row.label.toLowerCase()}.`;
}

/**
 * Destinations to explore next, among those not explored yet, each with the
 * reasons it is shown. Empty when the traveller has given no signal at all —
 * the caller shows "Choose your interests", never a popular list.
 */
export function recommendDestinations(signals: Signals, knowledge: Knowledge, limit = 4): Recommendation[] {
  const explored = new Set(signals.explored.map((row) => row.destinationId));
  const exploredCoverage = knowledge.coverage.filter((entry) => explored.has(entry.destination.id));
  const demonstrated = demonstratedInterests(signals, knowledge);
  const demonstratedById = new Map(demonstrated.map((row) => [row.interest, row]));
  const explicit = new Set(signals.interests);

  const out: Recommendation[] = [];
  for (const entry of knowledge.coverage) {
    if (explored.has(entry.destination.id) || entry.empty) continue;

    const explicitMatched = entry.covered.filter((interest) => explicit.has(interest));
    const demoMatched = entry.covered.filter((interest) => demonstratedById.has(interest) && !explicit.has(interest));

    /* Shared theme with a destination the traveller explored, from both
       destinations' own claims and records. */
    const here = knowledge.themes.get(entry.destination.id) ?? [];
    let sharedTheme: { theme: string; with: string } | null = null;
    for (const presence of here) {
      const other = exploredCoverage.find((candidate) =>
        (knowledge.themes.get(candidate.destination.id) ?? []).some((row) => row.theme.id === presence.theme.id),
      );
      if (other) {
        sharedTheme = { theme: presence.theme.label, with: other.destination.name };
        break;
      }
    }

    if (explicitMatched.length === 0 && demoMatched.length === 0 && !sharedTheme) continue;

    /* Depth of what matched, so a destination with fourteen documented places
       for an interest outranks one with a single record. Saturates at 20. */
    const depth = [...explicitMatched, ...demoMatched].reduce((sum, interest) => {
      const row = entry.interests.find((candidate) => candidate.interest === interest);
      return sum + Math.min(row?.experiences ?? 0, 20) / 20;
    }, 0);
    const score = explicitMatched.length * 3 + demoMatched.length * 2 + (sharedTheme ? 1.5 : 0) + depth * 0.5;

    const reasons: string[] = [];
    if (explicitMatched.length > 0) {
      const strongest = explicitMatched
        .map((interest) => entry.interests.find((row) => row.interest === interest))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((a, b) => b.experiences - a.experiences)[0];
      const count = strongest && strongest.experiences > 0
        ? ` — ${strongest.experiences} documented ${strongest.experiences === 1 ? "place" : "places"} for ${strongest.label.toLowerCase()}`
        : "";
      reasons.push(`Based on your interest in ${listJoin(explicitMatched.map((i) => label(i).toLowerCase()))}${count}.`);
    }
    for (const interest of demoMatched.slice(0, 1)) {
      const row = demonstratedById.get(interest);
      if (row) reasons.push(demonstratedReason(row));
    }
    if (sharedTheme) {
      reasons.push(`Shares ${inSentence(sharedTheme.theme)} with ${sharedTheme.with}, which you explored.`);
    }

    out.push({
      destinationId: entry.destination.id,
      name: entry.destination.name,
      score: Math.round(score * 100) / 100,
      matched: [...explicitMatched, ...demoMatched],
      reasons,
    });
  }

  return out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}

/**
 * Places inside ONE destination that match the traveller's interests, not
 * yet viewed. The candidate set is that destination's own experiences, so a
 * place from another destination can never appear, whatever its keywords.
 */
export function recommendPlaces(
  destinationId: string,
  signals: Signals,
  knowledge: Knowledge,
  limit = 4,
): PlaceRecommendation[] {
  const entry = knowledge.coverage.find((candidate) => candidate.destination.id === destinationId);
  if (!entry) return [];
  const explicit = new Set(signals.interests);
  const demonstrated = new Map(demonstratedInterests(signals, knowledge).map((row) => [row.interest, row]));
  const viewed = new Set(
    signals.viewed.filter((row) => row.destinationId === destinationId).map((row) => row.entityId),
  );

  const scored = entry.experiences
    .filter((experience) => experience.destinationId === destinationId && !viewed.has(experience.id))
    .map((experience) => {
      const explicitMatched = experience.interests.filter((interest) => explicit.has(interest));
      const demoMatched = experience.interests.filter((interest) => demonstrated.has(interest) && !explicit.has(interest));
      return { experience, explicitMatched, demoMatched, score: explicitMatched.length * 2 + demoMatched.length };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.experience.title.localeCompare(b.experience.title))
    .slice(0, limit);

  return scored.map(({ experience, explicitMatched, demoMatched }) => ({
    experience: {
      id: experience.id,
      title: experience.title,
      href: experience.href,
      image: experience.image,
      imageAlt: experience.imageAlt,
      typeLabel: experience.typeLabel,
      area: experience.area,
    },
    matched: [...explicitMatched, ...demoMatched],
    reason:
      explicitMatched.length > 0
        ? `Based on your interest in ${listJoin(explicitMatched.map((i) => label(i).toLowerCase()))}.`
        : `Because you often explore ${listJoin(demoMatched.map((i) => label(i).toLowerCase()))}.`,
  }));
}
