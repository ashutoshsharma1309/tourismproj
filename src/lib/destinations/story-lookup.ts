import { getStories } from "@/lib/destinations/content";
import type { Story } from "@/data/stories/types";

/**
 * Resolving one story, and the things around it, for ANY destination.
 *
 * WHY THIS EXISTS
 * ---------------
 * `stories/[slug]` generated its static params from the destination's own
 * corpus — correctly — and then looked the story up with `getStoryBySlug`,
 * which reads Sikkim's module and nothing else. So every one of the 178 new
 * stories was prerendered, written to disk, and served as a 404: the page had
 * been built for one destination and gated for fifteen.
 *
 * The Sikkim helpers are not replaced. For Sikkim this returns exactly what
 * they returned, because Sikkim's stories carry cross-links the capsule
 * stories do not have. For the other fourteen the same questions are answered
 * from that destination's own corpus, and cannot reach outside it — every
 * lookup here starts from `getStories(destinationId)`.
 */

export interface StoryContext {
  story: Story | undefined;
  related: Story[];
  previous: Story | undefined;
  next: Story | undefined;
}

const MAX_RELATED = 3;

export async function storyContext(
  destinationId: string,
  slug: string,
): Promise<StoryContext> {
  const stories = (await getStories(destinationId)) as Story[];
  const index = stories.findIndex((entry) => entry.slug === slug);
  const story = index >= 0 ? stories[index] : undefined;
  if (!story) return { story: undefined, related: [], previous: undefined, next: undefined };

  /* Named relations first — a story that says what it relates to is more
     reliable than a shelf match — then the same shelf to fill. */
  const bySlug = new Map(stories.map((entry) => [entry.slug, entry]));
  const named = (story.relatedStories ?? [])
    .map((other) => bySlug.get(other))
    .filter((other): other is Story => Boolean(other));

  const sameShelf = stories.filter(
    (other) =>
      other.slug !== story.slug &&
      other.category === story.category &&
      !named.some((entry) => entry.slug === other.slug),
  );

  return {
    story,
    related: [...named, ...sameShelf].slice(0, MAX_RELATED),
    /* Reading order within the destination, so "next" never leaves it. */
    previous: index > 0 ? stories[index - 1] : undefined,
    next: index < stories.length - 1 ? stories[index + 1] : undefined,
  };
}

/** A story's places, resolved against the destination the story belongs to. */
export async function storyPlaces(destinationId: string, slugs: readonly string[]) {
  if (slugs.length === 0) return [];
  const { getPlaces } = await import("@/lib/destinations/content");
  const places = await getPlaces(destinationId);
  return slugs
    .map((slug) => places.find((place) => place.slug === slug))
    .filter((place): place is NonNullable<typeof place> => Boolean(place));
}
