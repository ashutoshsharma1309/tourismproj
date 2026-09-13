import type { DestinationCoverage, InterestCoverage } from "@/lib/global/coverage";
import { INTEREST_LABEL } from "@/lib/planner/types";
import type { JourneyInterest } from "@/lib/planner/types";

/**
 * "Strong for" — the plain-words face of interest coverage.
 *
 * /discover used to print a coverage score ("99/100") and a depth badge next
 * to every result. A first-time visitor could not say what either meant, and
 * both were the archive grading itself rather than telling the visitor what
 * a place has. These helpers turn the same coverage rows into sentences a
 * traveller can act on — "Strong for history, heritage and food" — and into
 * the per-dimension comparison the compare page draws.
 *
 * NOTHING HERE IS A RATING. Every list is ordered by how many catalogued
 * records carry an interest, and every sentence states the count it came
 * from, so a reader can check it in the table underneath. No clock, no
 * randomness, no adjective that was not counted.
 */

/** Covered interests, most records first; claims break ties; the label breaks the rest. */
function rankedInterests(coverage: DestinationCoverage): InterestCoverage[] {
  return coverage.interests
    .filter((row) => row.covered)
    .sort(
      (a, b) =>
        b.experiences - a.experiences ||
        b.claims - a.claims ||
        a.label.localeCompare(b.label, "en"),
    );
}

/**
 * The interests a destination is strong for.
 *
 * `prefer` lists the interests the visitor selected: any of those the
 * destination covers come first and are never cut, so a visitor who picked
 * four interests sees all four it matched rather than the three with the most
 * records. The rest of the list fills up to `limit` from its other strengths.
 */
export function strongFor(
  coverage: DestinationCoverage,
  { prefer = [], limit = 3 }: { prefer?: readonly JourneyInterest[]; limit?: number } = {},
): JourneyInterest[] {
  const ranked = rankedInterests(coverage);
  const preferred = ranked.filter((row) => prefer.includes(row.interest));
  const rest = ranked.filter((row) => !prefer.includes(row.interest));
  return [...preferred, ...rest]
    .slice(0, Math.max(limit, preferred.length))
    .map((row) => row.interest);
}

/** "history, heritage and food" — a sentence list, no Oxford comma. */
export function interestList(interests: readonly JourneyInterest[]): string {
  const words = interests.map((interest) => INTEREST_LABEL[interest].toLowerCase());
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export interface ComparedCell {
  id: string;
  name: string;
  records: number;
  claims: number;
  covered: boolean;
}

export interface ComparedDimension {
  interest: JourneyInterest;
  label: string;
  /** One per compared destination, in the order they were compared. */
  cells: ComparedCell[];
  /** The most records any compared destination holds for it. */
  max: number;
  /** Ids holding `max` records — more than one means a tie. Empty when max is 0. */
  leaders: string[];
}

/**
 * One row per interest at least one of the compared destinations covers, in
 * the vocabulary's own order. An interest nobody covers is left out rather
 * than drawn as a row of empty bars.
 */
export function compareDimensions(columns: readonly DestinationCoverage[]): ComparedDimension[] {
  const interests = columns[0]?.interests.map((row) => row.interest) ?? [];
  return interests.flatMap((interest) => {
    const cells = columns.map((column): ComparedCell => {
      const row = column.interests.find((item) => item.interest === interest);
      return {
        id: column.destination.id,
        name: column.destination.name,
        records: row?.experiences ?? 0,
        claims: row?.claims ?? 0,
        covered: row?.covered ?? false,
      };
    });
    if (!cells.some((cell) => cell.covered)) return [];
    const max = Math.max(...cells.map((cell) => cell.records));
    const leaders = max > 0 ? cells.filter((cell) => cell.records === max).map((cell) => cell.id) : [];
    return [{ interest, label: INTEREST_LABEL[interest], cells, max, leaders }];
  });
}

export interface Suitability {
  id: string;
  name: string;
  /** Interests this destination holds the most records for, outright. */
  leads: JourneyInterest[];
  /** The plain sentence the compare page prints. Built from counts only. */
  sentence: string;
}

function amongWord(n: number): string {
  return n === 2 ? "the two" : n === 3 ? "the three" : `the ${n}`;
}

/**
 * "Why X may suit you", one per compared destination.
 *
 * A destination that leads outright on some interests is described by them
 * and by the count behind its biggest lead. One that leads on nothing is
 * described by what it does cover and told, in the same breath, that it
 * leads nowhere — the sentence is explainable by construction because every
 * clause is a count the table shows.
 */
export function describeSuitability(columns: readonly DestinationCoverage[]): Suitability[] {
  const dimensions = compareDimensions(columns);
  const among = amongWord(columns.length);

  return columns.map((column) => {
    const id = column.destination.id;
    const name = column.destination.name;
    const led = dimensions
      .filter((dimension) => dimension.leaders.length === 1 && dimension.leaders[0] === id)
      .sort((a, b) => b.max - a.max);
    const leads = led.map((dimension) => dimension.interest);
    const top = led[0];

    if (top) {
      const shown = leads.slice(0, 3);
      const more = leads.length - shown.length;
      const recordWord = top.max === 1 ? "record" : "records";
      return {
        id,
        name,
        leads,
        sentence: `Strongest of ${among} for ${interestList(shown)}${more > 0 ? ` and ${more} more` : ""} — ${top.max} catalogued ${INTEREST_LABEL[top.interest].toLowerCase()} ${recordWord}, the most of ${among}.`,
      };
    }

    const covered = strongFor(column, { limit: 3 });
    const total = column.totals.experiences;
    if (total === 0 && column.totals.claims > 0) {
      return {
        id,
        name,
        leads,
        sentence: `Verified history only so far — ${column.totals.claims} reviewer-approved ${column.totals.claims === 1 ? "fact" : "facts"} and no catalogued place yet.`,
      };
    }
    if (covered.length === 0 || total === 0) {
      return { id, name, leads, sentence: "Still being catalogued — nothing to compare yet." };
    }
    return {
      id,
      name,
      leads,
      sentence: `Documented for ${interestList(covered)} — ${total} catalogued ${total === 1 ? "record" : "records"} in all, without leading on any interest compared here.`,
    };
  });
}
