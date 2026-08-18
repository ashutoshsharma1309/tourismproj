import { img, imageCredit } from "@/data/images";
import { SOURCES } from "@/data/sources";
import type { SourceType } from "@/data/sources";
import { storyImage } from "@/data/story-images";
import type { ImageCredit } from "@/data/story-images";

/**
 * Stories of Sikkim — the shape of a story.
 *
 * Two rules govern this file, and they are the reason the archive exists:
 *
 *   1. Every story carries its own sources. Not a vague "further reading"
 *      list — named publications with URLs and the date each was read.
 *   2. Every story says how it should be read. A monastery's founding legend
 *      and a gazetted festival date are both worth telling and are not the
 *      same kind of claim, so `claimType` is rendered on the card, in the
 *      header and beside the text. Nothing is quietly upgraded to fact.
 */

/** The shelves of the archive. Add one only when there is content to fill it. */
export type StoryCategory =
  | "Sikkim History"
  | "Monastery Heritage"
  | "Festivals"
  | "Folk Music & Dance"
  | "Lepcha Heritage"
  | "Bhutia Heritage"
  | "Nepali Heritage"
  | "Folklore & Oral Tradition"
  | "Food & Flavours"
  | "Architecture"
  | "Traditional Knowledge"
  | "Languages & Script"
  | "Art & Craft"
  | "Sacred Landscapes"
  | "Nature & Culture"
  | "Heritage Trails"
  | "Markets & Community Life"
  | "Responsible Tourism"
  | "Heritage Preservation";

/** Display order — roughly the order a visitor would want to meet them in. */
export const STORY_CATEGORY_ORDER: StoryCategory[] = [
  "Sikkim History",
  "Monastery Heritage",
  "Festivals",
  "Folk Music & Dance",
  "Lepcha Heritage",
  "Bhutia Heritage",
  "Nepali Heritage",
  "Folklore & Oral Tradition",
  "Food & Flavours",
  "Architecture",
  "Traditional Knowledge",
  "Languages & Script",
  "Art & Craft",
  "Sacred Landscapes",
  "Nature & Culture",
  "Heritage Trails",
  "Markets & Community Life",
  "Responsible Tourism",
  "Heritage Preservation",
];

/**
 * How a claim should be read. Rendered next to the text, never hidden.
 *
 * documented history — recorded by a government, institutional or reference source.
 * oral tradition     — transmitted by a community and attested as such.
 * legend             — a culturally significant narrative whose historical status is not established.
 * travel story       — a present-tense account of visiting, not a historical claim.
 */
export type ClaimType =
  | "documented history"
  | "oral tradition"
  | "legend"
  | "travel story";

export const CLAIM_LABEL: Record<ClaimType, string> = {
  "documented history": "Historical record",
  "oral tradition": "Oral tradition",
  legend: "Legend",
  "travel story": "Travel story",
};

export const CLAIM_DESCRIPTION: Record<ClaimType, string> = {
  "documented history":
    "Drawn from government, institutional or reference sources, each cited at the foot of the story.",
  "oral tradition":
    "Preserved and transmitted by a community. Recorded here as the tradition holds it — the practice is documented, the narrative is not offered as settled history.",
  legend:
    "A narrative of real cultural weight whose historical status is not established. Retold as it is told, not asserted as fact.",
  "travel story":
    "A present-tense account of what a visitor encounters, not a historical claim.",
};

/**
 * Communities represented. Sikkim's own tourism portal frames the state's
 * culture as a blend of Lepcha, Bhutia and Nepali; the Nepali grouping is
 * itself many communities, and the ones with their own state-recognised
 * festivals are named separately here so a Limbu or Rai reader can find
 * themselves in the archive rather than under an umbrella.
 */
export type Community =
  | "Lepcha"
  | "Bhutia"
  | "Nepali"
  | "Limbu"
  | "Rai"
  | "Tamang"
  | "Gurung"
  | "Newar"
  | "Magar"
  | "Sherpa"
  | "Shared";

export const COMMUNITIES: Community[] = [
  "Lepcha",
  "Bhutia",
  "Nepali",
  "Limbu",
  "Rai",
  "Tamang",
  "Gurung",
  "Newar",
  "Magar",
  "Sherpa",
  "Shared",
];

/** A named source with the date it was last read. */
export interface StorySource {
  /** Key into the central registry in src/data/sources.ts, when it has one. */
  sourceId?: string;
  name: string;
  url: string;
  type: SourceType;
  retrievedAt: string;
  /** What specifically this source backs, when a story cites several. */
  covers?: string;
}

/**
 * verified            — every factual claim traced to a government, institutional or reference source.
 * community-attested  — the practice is documented; the narrative is the community's own.
 */
export type VerificationStatus = "verified" | "community-attested";

export interface Story {
  slug: string;
  title: string;
  category: StoryCategory;
  claimType: ClaimType;
  communities: Community[];
  /** Two or three sentences for the card and the top of the page. */
  summary: string;
  /** Body paragraphs, 400–800 words. */
  content: string[];
  /** Three to five concise points a visitor can carry away. */
  keyFacts: string[];
  heroImage: string;
  heroAlt: string;
  /** Attribution for the hero photograph. Absent only for legacy imagery. */
  imageCredit?: ImageCredit;
  /**
   * Set when the photograph shows the setting rather than the subject — some
   * observances have no openly licensed photograph anywhere, and saying so is
   * better than implying the picture shows the festival.
   */
  imageNote?: string;
  relatedMonasteries: string[];
  relatedPlaces: string[];
  /** Slugs of other stories. Cross-links are completed both ways at build. */
  relatedStories: string[];
  sources: StorySource[];
  verificationStatus: VerificationStatus;
  lastVerified: string;
  readingMinutes: number;
  /** Free-text search terms beyond the title and body. */
  tags: string[];
}

/** What an author writes. Everything derivable is derived. */
export interface StoryDraft
  extends Omit<
    Story,
    "readingMinutes" | "heroImage" | "imageCredit" | "relatedPlaces" | "relatedStories" | "tags"
  > {
  /** Key into src/data/generated/story-images.json … */
  imageKey?: string;
  /** … or, for imagery already in the Phase 1 map, a key into src/data/images.ts. */
  legacyImageKey?: string;
  relatedPlaces?: string[];
  relatedStories?: string[];
  tags?: string[];
}

/** ~200 words a minute, floored at two — nothing here is a one-minute read. */
function readingMinutes(content: string[], summary: string): number {
  const words = [...content, summary].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 200));
}

/**
 * Build a story from a draft: resolve its photograph and credit, compute the
 * reading time, and normalise its sources against the central registry so a
 * source's name and type cannot drift from the registry entry it points at.
 */
export function defineStory(draft: StoryDraft): Story {
  const researched = draft.imageKey ? storyImage(draft.imageKey) : undefined;
  if (draft.imageKey && !researched) {
    throw new Error(
      `Story "${draft.slug}" names image key "${draft.imageKey}", which the research agent has not resolved. Run: npm run agent:research`,
    );
  }

  /* A story illustrated from the Phase 1 registry (`legacyImageKey`) has a
     credit too — it is in image-credits.json, keyed by that same key. Reading
     only story-images.json left 23 of 70 stories rendering a CC BY-SA
     photograph with no attribution line, which the licence does not permit. */
  const credit = researched ?? (draft.legacyImageKey ? imageCredit(draft.legacyImageKey) : undefined);

  const sources = draft.sources.map((source) => {
    const registered = source.sourceId ? SOURCES[source.sourceId] : undefined;
    return registered
      ? { ...source, name: source.name || registered.name, type: registered.type }
      : source;
  });

  return {
    ...draft,
    heroImage: credit?.url ?? img(draft.legacyImageKey ?? ""),
    imageCredit: credit,
    relatedPlaces: draft.relatedPlaces ?? [],
    relatedStories: draft.relatedStories ?? [],
    tags: draft.tags ?? [],
    sources,
    readingMinutes: readingMinutes(draft.content, draft.summary),
  };
}

/* ------------------------------------------------------------------ helpers
   Source constructors. Every story cites through one of these, so a URL
   typed once is typed once.
   ------------------------------------------------------------------------ */

const WIKI = "https://en.wikipedia.org/wiki/";

/** A Wikipedia article. Tertiary — never the sole source for a contested claim. */
export function wiki(article: string, covers?: string): StorySource {
  return {
    sourceId: "wikipedia",
    name: `Wikipedia — ${article.replace(/_/g, " ")}`,
    url: `${WIKI}${article}`,
    type: "encyclopedia",
    retrievedAt: "2026-08-17",
    ...(covers ? { covers } : {}),
  };
}

/** The Government of Sikkim's own festivals page. */
export function govFestivals(covers: string): StorySource {
  return {
    sourceId: "sikkim-gov-festivals",
    name: "Government of Sikkim — Festivals in Sikkim",
    url: "https://www.sikkim.gov.in/KnowSikkim/about-sikkim/festivals-in-sikkim",
    type: "government",
    retrievedAt: "2026-08-17",
    covers,
  };
}

/** A page of the official Sikkim Tourism portal. */
export function govTourism(
  page: "dances" | "cuisine" | "about" | "conduct",
  covers: string,
): StorySource {
  const map = {
    dances: {
      sourceId: "sikkim-tourism-dances",
      name: "Sikkim Tourism — Folk dances of Sikkim",
      url: "https://sikkimtourism.gov.in/about/dances",
    },
    cuisine: {
      sourceId: "sikkim-tourism-cuisine",
      name: "Sikkim Tourism — Cuisine of Sikkim",
      url: "https://sikkimtourism.gov.in/about/cuisine",
    },
    about: {
      sourceId: "sikkim-tourism-about",
      name: "Sikkim Tourism — About Sikkim: people, culture and languages",
      url: "https://sikkimtourism.gov.in/about/sikkim",
    },
    conduct: {
      sourceId: "sikkim-tourism-conduct",
      name: "Sikkim Tourism — Do's and Don'ts",
      url: "https://sikkimtourism.gov.in/do-and-do-not",
    },
  } as const;
  return { ...map[page], type: "government", retrievedAt: "2026-08-17", covers };
}

/** The Ministry of Tourism's Utsav portal. */
export function govUtsav(slug: string, covers: string): StorySource {
  return {
    sourceId: "utsav-gov-in",
    name: "Utsav — Ministry of Tourism, Government of India",
    url: `https://utsav.gov.in/view-event/${slug}`,
    type: "government",
    retrievedAt: "2026-08-17",
    covers,
  };
}
