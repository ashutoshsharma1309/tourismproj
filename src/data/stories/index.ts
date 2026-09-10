import { SOURCES } from "@/data/sources";

import { communityStories } from "./communities";
import { festivalStories } from "./festivals";
import { folkArtStories } from "./folk-arts";
import { foodStories } from "./food";
import { historyStories } from "./history";
import { journeyStories } from "./journeys";
import { landscapeStories } from "./landscape";
import { monasteryStories } from "./monastery-heritage";
import { COMMUNITIES, STORY_CATEGORY_ORDER } from "./types";
import type { ClaimType, Community, Story, StoryCategory } from "./types";

export { CLAIM_DESCRIPTION, CLAIM_LABEL, COMMUNITIES, STORY_CATEGORY_ORDER } from "./types";
export type {
  ClaimType,
  Community,
  Story,
  StoryCategory,
  StorySource,
  VerificationStatus,
} from "./types";
export { SOURCES };

/**
 * Stories of Sikkim — the assembled archive.
 *
 * Ordering is by category, following STORY_CATEGORY_ORDER, so the reading
 * order a visitor meets is the one an editor chose rather than the order the
 * files happen to import in.
 */

const ALL: Story[] = [
  ...historyStories,
  ...monasteryStories,
  ...festivalStories,
  ...folkArtStories,
  ...communityStories,
  ...foodStories,
  ...landscapeStories,
  ...journeyStories,
];

/* Cross-links are declared on one side and completed on the other, so a story
   that names a companion is always named back by it. Without this, "related
   stories" quietly becomes a one-way street and half the archive is unreachable
   from the other half. */
function withSymmetricLinks(stories: Story[]): Story[] {
  const bySlug = new Map(stories.map((s) => [s.slug, s]));
  const links = new Map<string, Set<string>>(stories.map((s) => [s.slug, new Set(s.relatedStories)]));

  for (const story of stories) {
    for (const other of story.relatedStories) {
      if (!bySlug.has(other)) continue;
      links.get(other)!.add(story.slug);
    }
  }

  return stories.map((story) => ({
    ...story,
    /* Drop any slug that does not resolve — a dangling link renders nothing. */
    relatedStories: [...links.get(story.slug)!].filter((slug) => slug !== story.slug && bySlug.has(slug)),
  }));
}

const ORDER = new Map(STORY_CATEGORY_ORDER.map((category, index) => [category, index]));

export const stories: Story[] = withSymmetricLinks(ALL).sort(
  (a, b) => (ORDER.get(a.category) ?? 99) - (ORDER.get(b.category) ?? 99),
);

/** Categories actually present in the archive, in editorial order. */
export const STORY_CATEGORIES: StoryCategory[] = STORY_CATEGORY_ORDER.filter((category) =>
  stories.some((story) => story.category === category),
);

/** Communities actually represented, in the order declared. */
export const STORY_COMMUNITIES: Community[] = COMMUNITIES.filter((community) =>
  stories.some((story) => story.communities.includes(community)),
);

/** Claim types actually present. */
export const STORY_CLAIM_TYPES: ClaimType[] = (
  ["documented history", "oral tradition", "legend", "travel story"] as ClaimType[]
).filter((claim) => stories.some((story) => story.claimType === claim));

export function getStoryBySlug(slug: string): Story | undefined {
  return stories.find((story) => story.slug === slug);
}

export function getStoriesForMonastery(monasterySlug: string): Story[] {
  return stories.filter((story) => story.relatedMonasteries.includes(monasterySlug));
}

export function getStoriesForPlace(placeSlug: string): Story[] {
  return stories.filter((story) => story.relatedPlaces.includes(placeSlug));
}

export function getStoriesInCategory(category: StoryCategory): Story[] {
  return stories.filter((story) => story.category === category);
}

/** Previous and next in reading order — the archive is browsable end to end. */
export function getStoryNeighbours(slug: string): { previous?: Story; next?: Story } {
  const index = stories.findIndex((story) => story.slug === slug);
  if (index === -1) return {};
  return {
    previous: index > 0 ? stories[index - 1] : undefined,
    next: index < stories.length - 1 ? stories[index + 1] : undefined,
  };
}

/**
 * Related stories for the detail page: the declared links first, then others
 * from the same category, so a story is never a dead end even if its author
 * declared no companions.
 */
export function getRelatedStories(story: Story, limit = 3): Story[] {
  const declared = story.relatedStories
    .map((slug) => getStoryBySlug(slug))
    .filter((s): s is Story => s !== undefined);

  if (declared.length >= limit) return declared.slice(0, limit);

  const sameCategory = stories.filter(
    (s) => s.category === story.category && s.slug !== story.slug && !story.relatedStories.includes(s.slug),
  );
  return [...declared, ...sameCategory].slice(0, limit);
}

/** One searchable blob per story, built once. */
const HAYSTACK = new Map(
  stories.map((story) => [
    story.slug,
    [
      story.title,
      story.summary,
      story.category,
      story.claimType,
      ...story.communities,
      ...story.tags,
      ...story.keyFacts,
      ...story.content,
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);

/** Free-text search across title, summary, category, community, tags and body. */
export function searchStories(query: string, pool: Story[] = stories): Story[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return pool;
  const terms = needle.split(/\s+/);
  return pool.filter((story) => {
    const hay = HAYSTACK.get(story.slug) ?? "";
    return terms.every((term) => hay.includes(term));
  });
}

/** Counts for the archive header — computed, never hand-written. */
export const STORY_STATS = {
  stories: stories.length,
  categories: STORY_CATEGORIES.length,
  communities: STORY_COMMUNITIES.length,
  sources: new Set(stories.flatMap((story) => story.sources.map((source) => source.url))).size,
  governmentSourced: stories.filter((story) =>
    story.sources.some((source) => source.type === "government"),
  ).length,
} as const;
