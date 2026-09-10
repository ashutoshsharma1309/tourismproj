import {
  getCapsuleCulture,
  getHistory,
  getPlaces,
  getStories,
} from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";
import type { Destination } from "@/types/destination";

/**
 * Content gathered across every destination, for the global index pages.
 *
 * WHY THESE EXIST
 * ---------------
 * The navigation names Stories, History and Plan, and until now all three
 * were destination-scoped: there was no answer to "show me the stories" that
 * did not first require picking a place. That is backwards for a visitor who
 * does not yet know where they want to go, and it is the reason the product
 * read as a set of fifteen archives rather than one platform.
 *
 * Nothing here is new content. Every record is the same record its
 * destination already publishes, read through the same accessors, and every
 * one carries the destination it belongs to so nothing can be shown adrift
 * from its owner.
 */

export interface OwnedRecord<T> {
  destination: Destination;
  record: T;
}

/** Where a record's own page is — capsule records carry an anchor, curated ones a route. */
export function hrefFor(
  record: { slug: string; detailHref?: string },
  destinationId: string,
  section: string,
) {
  return record.detailHref ?? `/destinations/${destinationId}/${section}/${record.slug}`;
}

/**
 * The year a period label states, for sorting.
 *
 * Era-aware, because the archive runs from 528 BC to the present and a naive
 * four-digit match puts the Roman republic after the Brooklyn Bridge.
 */
export function yearOf(label: string): number {
  const bc = /(\d{1,4})\s*(?:BC|BCE)/i.exec(label);
  if (bc) return -Number(bc[1]);
  const ad = /AD\s*(\d{1,4})/i.exec(label);
  if (ad) return Number(ad[1]);
  const century = /(\d{1,2})(?:st|nd|rd|th)\s+century/i.exec(label);
  if (century) return (Number(century[1]) - 1) * 100 + 50;
  const year = /(\d{3,4})/.exec(label);
  return year ? Number(year[1]) : Number.MAX_SAFE_INTEGER;
}

type Story = Awaited<ReturnType<typeof getStories>>[number];
type HistoryEntry = Awaited<ReturnType<typeof getHistory>>[number];
type Place = Awaited<ReturnType<typeof getPlaces>>[number];

/** Every story in the product, with the destination that owns it. */
export async function allStories(): Promise<OwnedRecord<Story>[]> {
  const gathered = await Promise.all(
    listDestinations().map(async (destination) => {
      const stories = await getStories(destination.id);
      return stories.map((record) => ({ destination, record }));
    }),
  );
  return gathered.flat();
}

/** Every dated event in the product, oldest first. */
export async function allHistory(): Promise<(OwnedRecord<HistoryEntry> & { year: number })[]> {
  const gathered = await Promise.all(
    listDestinations().map(async (destination) => {
      const entries = await getHistory(destination.id);
      return entries.map((record) => ({
        destination,
        record,
        year: yearOf(record.yearLabel ?? ""),
      }));
    }),
  );
  return gathered
    .flat()
    .filter((entry) => entry.year !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.year - b.year);
}

/** One photograph per destination, taken from its own first illustrated record. */
export async function heroImages(): Promise<Map<string, Place | undefined>> {
  const entries = await Promise.all(
    listDestinations().map(async (destination) => {
      const places = await getPlaces(destination.id);
      return [destination.id, places.find((place) => place.image)] as const;
    }),
  );
  return new Map(entries);
}

type CultureEntry = Awaited<ReturnType<typeof getCapsuleCulture>>[number];

/**
 * Every food, festival or craft record in the product, with its owner.
 *
 * `kind` is passed through rather than filtered here, because the homepage
 * wants food and the destination pages want all three, and a function that
 * returns "the food ones" would need a sibling for each of the others.
 */
export async function allCulture(
  kind?: CultureEntry["kind"],
): Promise<OwnedRecord<CultureEntry>[]> {
  const gathered = await Promise.all(
    listDestinations().map(async (destination) => {
      const entries = await getCapsuleCulture(destination.id);
      return entries
        .filter((record) => (kind ? record.kind === kind : true))
        .map((record) => ({ destination, record }));
    }),
  );
  return gathered.flat();
}
