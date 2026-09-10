import type { DestinationCoverage } from "@/lib/global/coverage";

/**
 * The three words that characterise a destination.
 *
 * WHY THESE ARE DERIVED AND NOT WRITTEN
 * -------------------------------------
 * The obvious way to label Varanasi "culture, religious, heritage" is to type
 * it into the registry. That is fifteen editorial judgements nobody sourced,
 * and the first one that goes stale — a destination gains a food archive and
 * still says "heritage, history, architecture" — teaches a reader the labels
 * are decoration.
 *
 * WHY RANKING BY COUNT WAS NOT ENOUGH
 * -----------------------------------
 * The first version ranked each destination's interests by how many of its
 * records carried them. That is honest and it is useless: almost every
 * catalogued place is a building, so "architecture" led NINE of the fifteen
 * cards, and Paris, Rome and New York all read "architecture, food, art" —
 * three cities, one description, which is the decoration problem arriving by
 * a different road.
 *
 * So an interest is ranked by how much MORE of this destination's record it
 * accounts for than it accounts for across the whole archive. Museums are
 * 6% of everything catalogued and 19% of Paris, so Paris leads on museums;
 * architecture is everywhere, so it leads almost nowhere. The word a card
 * shows is the word that distinguishes the place, not the word that is
 * merely true of it.
 */

/** How many words a card shows. Three reads as a description; five as a tag cloud. */
const KEYWORD_COUNT = 3;

/**
 * A handful of interests are too generic to characterise anything — every
 * destination in the archive "has history". Distinctiveness demotes them on
 * its own most of the time, but not when a thin archive happens to be mostly
 * history, so they stay eligible only as filler.
 */
const GENERIC = new Set(["history", "heritage", "culture"]);

/**
 * An interest needs a second record before its share means anything. One
 * record in a small archive can outrank the whole global average by itself,
 * which would put a word on a card on the strength of a single entry.
 */
const MIN_RECORDS = 2;

export interface DestinationKeywords {
  get(destinationId: string): string[];
}

/**
 * Built from the WHOLE set, because distinctiveness is not a property of one
 * destination — it only exists relative to the others.
 */
export function buildDestinationKeywords(
  all: readonly DestinationCoverage[],
): DestinationKeywords {
  const archiveTotals = new Map<string, number>();
  let archiveGrand = 0;
  for (const coverage of all) {
    for (const interest of coverage.interests) {
      archiveTotals.set(
        interest.interest,
        (archiveTotals.get(interest.interest) ?? 0) + interest.experiences,
      );
      archiveGrand += interest.experiences;
    }
  }

  const byId = new Map<string, string[]>();
  for (const coverage of all) {
    const total = coverage.interests.reduce((n, i) => n + i.experiences, 0);
    if (total === 0 || archiveGrand === 0) {
      byId.set(coverage.destination.id, []);
      continue;
    }

    const ranked = coverage.interests
      .filter((i) => i.covered && i.experiences >= MIN_RECORDS)
      .map((i) => {
        const here = i.experiences / total;
        const everywhere = (archiveTotals.get(i.interest) ?? 0) / archiveGrand;
        return {
          label: i.label.toLowerCase(),
          /* Undefined only if the interest appears nowhere, which cannot
             happen for one this destination carries. */
          lift: everywhere > 0 ? here / everywhere : 0,
        };
      })
      .sort((a, b) => b.lift - a.lift);

    const specific = ranked.filter((entry) => !GENERIC.has(entry.label));
    const generic = ranked.filter((entry) => GENERIC.has(entry.label));
    byId.set(
      coverage.destination.id,
      [...specific, ...generic].slice(0, KEYWORD_COUNT).map((entry) => entry.label),
    );
  }

  return { get: (id) => byId.get(id) ?? [] };
}
