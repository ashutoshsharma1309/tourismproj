import { getCapsuleCulture } from "@/lib/destinations/content";
import storySearch from "@/data/generated/stories/search.json";
import type { CapsuleCultureKind } from "@/types/capsule";

/**
 * A destination's culture, arranged into the shelves its own records support.
 *
 * WHY SHELVES ARE DERIVED AND NOT DECLARED
 * ----------------------------------------
 * The benchmark's Culture page has nine shelves — Food, Festivals, Traditions,
 * Music & dance, Crafts, Textiles, Communities, Heritage, Daily life — and
 * they are Sikkim's own vocabulary: "Communities" is a shelf there because
 * Lepcha, Bhutia and Nepali weaving are subjects there. Copying that list onto
 * Paris would reproduce the "Monasteries for Paris" defect one floor down.
 *
 * So a shelf exists when a destination has records for it, and its ORDER is
 * the destination's own too: Kyoto leads on crafts, Jaipur on festivals,
 * Rome on food, because that is what each holds most of. Nothing is ranked by
 * a table written here.
 *
 * WHY THE STORY LINK MATTERS
 * --------------------------
 * These records and the story articles were built a phase apart and never
 * joined, so a card about Kintsugi sat one sentence deep while a 600-word
 * sourced article about Kintsugi sat at a URL nobody could reach from it.
 * The join is by id — `${kind}-${record.id}` is exactly how the story slug
 * was minted — so it cannot drift and cannot cross destinations.
 */

export interface CultureEntry {
  id: string;
  kind: CapsuleCultureKind;
  title: string;
  /** A verbatim span from the cited article. Never written here. */
  summary: string;
  image: string | null;
  imageAlt: string;
  /** When the subject has an article, where it is. */
  storyHref: string | null;
  readingMinutes: number | null;
  /** Festivals sometimes state a season; nothing infers one. */
  season: string | null;
  /** Places in this destination the record is documented as belonging to. */
  placeIds: string[];
}

export interface CultureShelf {
  kind: CapsuleCultureKind;
  label: string;
  /** What this shelf holds, counted — never an adjective. */
  coverage: string;
  entries: CultureEntry[];
}

const LABEL: Record<CapsuleCultureKind, string> = {
  food: "Food",
  festival: "Festivals",
  craft: "Crafts",
};

const CULTURE_KINDS: CapsuleCultureKind[] = ["food", "festival", "craft"];

const storyBySubject = new Map(
  storySearch.map((story) => [`${story.destinationId}:${story.slug}`, story]),
);

export async function cultureShelves(destinationId: string): Promise<CultureShelf[]> {
  const records = await getCapsuleCulture(destinationId);
  if (records.length === 0) return [];

  const shelves = CULTURE_KINDS.map((kind): CultureShelf => {
    const entries = records
      .filter((record) => record.kind === kind)
      .map((record): CultureEntry => {
        /*
         * The runtime record's id is ALREADY `${kind}-${subject}` —
         * "food-kaiseki", not "kaiseki" — and the story slug was minted from
         * the same pair. Prefixing it again produced "food-food-kaiseki" and
         * joined nothing: every one of the 196 records reported no article
         * while 178 articles sat there waiting.
         */
        const slug = record.id;
        const story = storyBySubject.get(`${destinationId}:${slug}`);
        return {
          id: record.id,
          kind,
          title: record.name,
          summary: record.summary,
          image: record.image ?? null,
          imageAlt: record.imageAlt ?? record.name,
          storyHref: story ? `/destinations/${destinationId}/stories/${slug}` : null,
          readingMinutes: null,
          season: record.season ?? null,
          placeIds: record.placeIds ?? [],
        };
      });

    const withArticle = entries.filter((entry) => entry.storyHref).length;
    return {
      kind,
      label: LABEL[kind],
      /*
       * Stated, not adjectival. The benchmark says "Textiles is the thinnest
       * shelf" and that honesty is most of why the page is trusted; this says
       * the same thing in numbers the reader can check against the cards.
       */
      coverage:
        entries.length === 0
          ? "Nothing documented yet."
          : `${entries.length} documented · ${withArticle} with an article`,
      entries,
    };
  }).filter((shelf) => shelf.entries.length > 0);

  /* The destination's own emphasis: the shelf it holds most of leads. */
  return shelves.sort((a, b) => b.entries.length - a.entries.length);
}
