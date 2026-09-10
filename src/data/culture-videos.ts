import generated from "@/data/generated/culture-videos.json";
import type { StoryCategory } from "@/data/stories/types";

/**
 * Verified video about Sikkim's culture, food and traditions.
 *
 * WHAT "VERIFIED" MEANS HERE
 * --------------------------
 * The same gate the monastery videos pass, in src/data/videos.ts. Every record
 * was fetched from YouTube's own oEmbed endpoint: the title and channel below
 * are copied verbatim from that response rather than from a search result, so
 * a record cannot describe a video that does not exist or has been renamed. A
 * 401 or 403 from oEmbed means the upload is private or embedding-restricted,
 * and those were dropped rather than worked around — two were, including the
 * one institutional handloom film found, which is why textiles is thin.
 *
 * Relevance was judged on the real title, not on the word "Sikkim" appearing
 * somewhere. Of 109 candidates checked, 75 were rejected: duplicates of a
 * subject already covered, Shorts and sub-minute clips, material about
 * Darjeeling or Nepal, political content, and two embedding refusals.
 *
 * Playback is YouTube's own iframe on youtube-nocookie.com, and nothing loads
 * from YouTube until a visitor presses play. Nothing is downloaded, re-encoded
 * or re-hosted: the rights holder keeps their video, their analytics and their
 * controls, and the visitor never leaves Sikkim Darshan to watch.
 */

export type CultureCategory =
  | "food"
  | "festivals"
  | "traditions"
  | "music-dance"
  | "crafts"
  | "textiles"
  | "communities"
  | "heritage"
  | "daily-life";

export interface CultureVideo {
  id: string;
  category: CultureCategory;
  videoId: string;
  provider: "youtube";
  /** Verbatim from the oEmbed response. */
  title: string;
  /** Verbatim from the oEmbed response. */
  channel: string;
  channelUrl: string;
  thumbnail: string;
  sourceUrl: string;
  embedUrl: string;
  quality: string;
  /** What the film actually shows, written after checking it. */
  topic: string;
  /** True for a government, public-broadcaster or institute channel. */
  institutional: boolean;
  usageNote: string;
  verifiedAt: string;
  oembedStatus: number;
}

export const cultureVideos = generated.videos as CultureVideo[];

export interface CultureCategoryMeta {
  id: CultureCategory;
  label: string;
  /** One line, shown under the heading. No claim beyond what the films show. */
  blurb: string;
  /** Story categories that belong with this shelf, for the related links. */
  storyCategories: StoryCategory[];
}

/**
 * The shelves, in the order the page reads.
 *
 * Food leads because it is the subject a visitor is most likely to have
 * arrived wanting, and the daily-life shelf closes because it is the one that
 * makes the rest specific rather than ceremonial.
 */
export const CULTURE_CATEGORIES: CultureCategoryMeta[] = [
  {
    id: "food",
    label: "Food",
    blurb:
      "Sikkim's fermented staples — gundruk, kinema, churpi, sisnu — and the kitchens they are cooked in.",
    storyCategories: ["Food & Flavours", "Markets & Community Life"],
  },
  {
    id: "festivals",
    label: "Festivals",
    blurb: "Losar, Pang Lhabsol, Saga Dawa and the masked dances the calendar is built around.",
    storyCategories: ["Festivals"],
  },
  {
    id: "traditions",
    label: "Traditions",
    blurb: "Marriage rite, ritual custom and the observances that mark a Sikkimese year.",
    storyCategories: ["Folklore & Oral Tradition", "Traditional Knowledge"],
  },
  {
    id: "music-dance",
    label: "Music & dance",
    blurb: "Folk dance of the Lepcha, Bhutia and Nepali communities, and the instruments that carry it.",
    storyCategories: ["Folk Music & Dance"],
  },
  {
    id: "crafts",
    label: "Crafts",
    blurb: "Thangka painting, woodcarving and the workshops where the skills are still taught.",
    storyCategories: ["Art & Craft", "Architecture"],
  },
  {
    id: "textiles",
    label: "Textiles",
    blurb: "Lepcha weaving, the handloom, and the bakhu, hanju and pangden still worn.",
    storyCategories: ["Art & Craft"],
  },
  {
    id: "communities",
    label: "Communities",
    blurb: "The Lepcha, Bhutia and Limboo, filmed in their own villages.",
    storyCategories: [
      "Lepcha Heritage",
      "Bhutia Heritage",
      "Nepali Heritage",
      "Languages & Script",
    ],
  },
  {
    id: "heritage",
    label: "Heritage",
    blurb: "The monasteries, sites and history the rest of this archive catalogues, on film.",
    storyCategories: ["Monastery Heritage", "Sikkim History", "Heritage Preservation"],
  },
  {
    id: "daily-life",
    label: "Daily life",
    blurb: "Farming, markets, games and the ordinary weeks between the festivals.",
    storyCategories: ["Nature & Culture", "Sacred Landscapes", "Heritage Trails"],
  },
];

export function videosInCategory(category: CultureCategory): CultureVideo[] {
  return cultureVideos.filter((video) => video.category === category);
}

/** Shelves that actually hold a film. A category never renders empty. */
export const CULTURE_SHELVES = CULTURE_CATEGORIES.map((meta) => ({
  ...meta,
  videos: videosInCategory(meta.id),
})).filter((shelf) => shelf.videos.length > 0);

export const CULTURE_STATS = {
  total: cultureVideos.length,
  categories: CULTURE_SHELVES.length,
  institutional: cultureVideos.filter((video) => video.institutional).length,
  hd: cultureVideos.filter((video) => video.quality === "hd").length,
  verifiedAt: generated.generatedAt.slice(0, 10),
} as const;
