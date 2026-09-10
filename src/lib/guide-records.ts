import { getCapsuleStays, getHistory, getPlaces, getStories } from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";
import type { GuideRecord } from "@/lib/guide-index";

/**
 * Every destination's records, flattened for the guide to search.
 *
 * WHY THIS IS A SEPARATE, ASYNC MODULE
 * ------------------------------------
 * `buildGuideIndex()` is synchronous and imports Sikkim's data statically.
 * The other fourteen destinations live in capsules that are loaded
 * asynchronously and validated on load, so their records cannot be gathered
 * in a sync function without duplicating the loader — and a second copy of a
 * loader is how two views of the same archive start to disagree.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It does not summarise, rank or rewrite. Every blurb is the record's own
 * summary as the archive publishes it, so the guide quotes the archive rather
 * than paraphrasing it — the same rule that governs every other surface here.
 *
 * A CAP PER DESTINATION, NOT PER ARCHIVE
 * --------------------------------------
 * Sikkim holds 70 stories and 38 places; the capsules hold a dozen or so each.
 * Taking everything would let one destination dominate the search purely by
 * volume, so each contributes at most `PER_KIND` of each kind. The guide is a
 * way in, not a mirror of the archive.
 */

/** How many of each kind a single destination may contribute. */
const PER_KIND = 20;

/** One sentence, trimmed. A guide answer is a pointer, not a page. */
function blurbOf(text: string | undefined): string {
  const clean = (text ?? "").trim();
  if (clean.length <= 220) return clean;
  const cut = clean.slice(0, 220);
  const lastStop = cut.lastIndexOf(". ");
  return lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

/** Where a record lives — capsule records carry an anchor, curated ones a route. */
function hrefOf(
  record: { slug: string; detailHref?: string },
  destinationId: string,
  section: string,
) {
  return record.detailHref ?? `/destinations/${destinationId}/${section}/${record.slug}`;
}

export async function buildGuideRecords(): Promise<GuideRecord[]> {
  const gathered = await Promise.all(
    listDestinations().map(async (destination) => {
      const [places, stories, history, stays] = await Promise.all([
        getPlaces(destination.id),
        getStories(destination.id),
        getHistory(destination.id),
        /* Capsule stays only: Sikkim's register already reaches the guide as
           `GuideIndex.stays`, and listing it here too would double it. */
        destination.id === "sikkim" ? Promise.resolve([]) : getCapsuleStays(destination.id),
      ]);

      const common = { destinationId: destination.id, destinationName: destination.name };

      return [
        ...places.slice(0, PER_KIND).map((place): GuideRecord => ({
          ...common,
          kind: "place",
          name: place.name,
          blurb: blurbOf(place.description),
          href: hrefOf(place, destination.id, "places"),
          themes: [...((place as { themes?: string[] }).themes ?? [])],
        })),
        ...stories.slice(0, PER_KIND).map((story): GuideRecord => ({
          ...common,
          kind: "story",
          name: story.title,
          blurb: blurbOf(story.summary),
          href: hrefOf(story, destination.id, "stories"),
          themes: [],
        })),
        ...history.slice(0, PER_KIND).map((entry): GuideRecord => ({
          ...common,
          kind: "history",
          name: `${entry.yearLabel ? `${entry.yearLabel} — ` : ""}${entry.title}`,
          blurb: blurbOf(entry.shortDescription),
          href: hrefOf(entry, destination.id, "history"),
          themes: [],
        })),
        /*
         * Stays: name, type and the source's own sentence, linking to the
         * stay's page. The guide can then answer "what kind of accommodation
         * is documented in Kyoto" from records rather than declining — and
         * it still holds no rate, rating or availability to be asked about.
         */
        ...stays.slice(0, PER_KIND).map((stay): GuideRecord => ({
          ...common,
          kind: "stay",
          name: `${stay.name} (${stay.category})`,
          blurb: blurbOf(stay.summary),
          href: `/destinations/${destination.id}/stays/${stay.id}`,
          themes: [],
        })),
      ];
    }),
  );

  /* A record with nothing to say about it is not worth returning. */
  return gathered.flat().filter((record) => record.blurb.length > 0);
}
