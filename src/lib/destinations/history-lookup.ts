import { getHistory, getPlaces, getStories } from "@/lib/destinations/content";
import type { HistoryEvent } from "@/data/history";
import type { Story } from "@/data/stories/types";

/**
 * Resolving one event, and the things around it, for ANY destination.
 *
 * The same defect the stories route had, in the same shape: static params
 * were generated from the destination's own corpus and the page then looked
 * the event up with `getHistoryEvent`, which reads Sikkim's module and
 * nothing else. Every one of the 127 enriched events prerendered as a 404.
 *
 * Sikkim's helpers are untouched — its events carry archive keys, monastery
 * links and map queries that the capsule events do not have. This answers the
 * same questions from whichever corpus the destination actually holds, and
 * every lookup starts from that destination's own data.
 */

/*
 * Typed as Sikkim's HistoryEvent because that is the contract the capsule
 * events are emitted to, and because this route only ever renders events that
 * carry `description` — `generateStaticParams` filters on exactly that. An
 * event without prose never reaches here, which is why the narrower shape
 * the data technically allows is not the shape this boundary promises.
 */
type AnyEvent = HistoryEvent;

export async function historyContext(destinationId: string, slug: string) {
  const events = (await getHistory(destinationId)) as AnyEvent[];
  const index = events.findIndex((event) => event.slug === slug);
  const event = index >= 0 ? events[index] : undefined;
  if (!event) return { event: undefined, previous: undefined, next: undefined, places: [], stories: [] };

  /*
   * Neighbours are the ADJACENT EVENTS IN TIME within this destination, which
   * is what a timeline's "previous" and "next" mean. They can never leave the
   * destination, because this list is the destination's.
   */
  const previous = index > 0 ? events[index - 1] : undefined;
  const next = index < events.length - 1 ? events[index + 1] : undefined;

  const allPlaces = await getPlaces(destinationId);
  const places = (event.relatedPlaces ?? [])
    .map((id) => allPlaces.find((place) => place.slug === id))
    .filter((place): place is NonNullable<typeof place> => Boolean(place));

  /*
   * Only stories that carry a full record. A destination whose stories are
   * still the thin capsule shape has nothing for a story card to render, and
   * the card's contract is the long-form Story — so those are dropped here
   * rather than rendered as a card with a title and four empty fields.
   */
  const allStories = await getStories(destinationId);
  const stories = (event.relatedStories ?? [])
    .map((id) => allStories.find((story) => story.slug === id))
    .filter((story): story is Story => Boolean(story) && "content" in (story as object));

  return { event, previous, next, places, stories };
}
