/**
 * The one editorial sentence under a destination's name.
 *
 * WHAT WAS THERE BEFORE
 * ---------------------
 * The hero's identity slot rendered `DATA_DEPTH_SUMMARY`, which describes the
 * TIER, not the place: twelve of the fifteen destinations opened with the
 * identical sentence "Essential experiences — a short set of sourced
 * highlights, each quoted from a cited source, and nothing beyond them."
 * Correct, useful, and the same for Paris, Rome, Varanasi and Goa — so the
 * first thing a visitor read about a destination told them nothing about it.
 *
 * The tier sentence is not deleted; it is demoted to a coverage note, which
 * is what it always was. This takes the identity slot and answers the
 * question a visitor actually arrives with: what IS this place.
 *
 * NOTHING HERE IS WRITTEN
 * -----------------------
 * The words come from the destination's own catalogued records — its
 * characterising interests and the best-known places it holds, in the order
 * the retrieval ranked them. No editorial prose is invented, so no sentence
 * can outlive the evidence under it, and a destination that gains records
 * gains a better sentence without anyone editing a string.
 */

/** How many places the sentence can name before it stops being a sentence. */
const NAMED_PLACES = 3;

/**
 * Wikipedia disambiguates titles with a trailing comma — "Pantheon, Rome",
 * "Marine Drive, Mumbai". Left alone, three of those in one list produce a
 * sentence with seven commas and no discernible structure.
 */
function displayName(title: string): string {
  const comma = title.indexOf(",");
  return comma > 0 ? title.slice(0, comma).trim() : title.trim();
}

/** "a, b and c" — an Oxford comma here would fight the commas above. */
function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function destinationIdentity({
  keywords,
  placeTitles,
  placeCount,
}: {
  /** Characterising interests, already ranked — see keywords.ts. */
  keywords: readonly string[];
  /** Place titles in retrieval order, which ranks by prominence. */
  placeTitles: readonly string[];
  placeCount: number;
}): string | null {
  const named = [
    ...new Set(placeTitles.map(displayName).filter(Boolean)),
  ].slice(0, NAMED_PLACES);

  const subject = keywords.length > 0 ? sentenceList([...keywords]) : "";
  const lead = subject
    ? subject.charAt(0).toUpperCase() + subject.slice(1)
    : "";

  if (placeCount === 0) return lead ? `${lead}.` : null;

  const counted = `${placeCount} catalogued ${placeCount === 1 ? "place" : "places"}`;
  const places =
    named.length > 0
      ? `${counted}, among them ${sentenceList(named)}`
      : counted;

  /* Without a subject the sentence still has to start somewhere, and the
     count is the only thing left that is true. */
  return lead
    ? `${lead} — ${places}.`
    : `${places.charAt(0).toUpperCase()}${places.slice(1)}.`;
}
