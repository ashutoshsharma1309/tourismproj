import generated from "@/data/generated/archive-items.json";
import { getMonasteryBySlug } from "@/data/monasteries";
import { places } from "@/data/places";
import type { SikkimDistrict } from "@/types";
import type { VerificationStatus } from "@/data/history";

/**
 * The NEY Digital Heritage Archive.
 *
 * Every record here is produced by scripts/heritage-archive-agent.mjs, which
 * refuses to emit an item unless three things resolve: the subject's own
 * reference article, a Wikimedia Commons file, and a readable licence with an
 * author. Nothing in this file is hand-typed except the shaping below — edit
 * the curated list in the agent and re-run it, don't edit the JSON.
 *
 * Two fields carry most of the archive's honesty:
 *
 *   sikkimSubject — false when the photograph illustrates a tradition shared
 *                   across the Himalaya but was taken somewhere else. Those
 *                   items state the place of capture on the card and on the
 *                   detail page and never claim to depict a named Sikkim site.
 *   context       — the subject article's own lead, quoted rather than
 *                   paraphrased, so the archive adds no unsourced prose.
 */

export type ArchiveCategory =
  | "Monastery heritage"
  | "Historic sites"
  | "Historical photographs"
  | "Historical documents"
  | "Architecture"
  | "Sacred landscapes"
  | "Festivals"
  | "Dance"
  | "Music"
  | "Clothing"
  | "Crafts"
  | "Food heritage"
  | "Oral traditions"
  | "Community heritage"
  | "Traditional knowledge"
  /*
   * "Documents" and "Portraits" come from the history generator and were
   * missing from both this union and the display order below. Six catalogued
   * objects — the Anglo-Nepalese War, the Kingdom of Sikkim, the Sikkim
   * Expedition, and portraits of the Chogyal, Palden Thondup Namgyal and
   * Joseph Hooker — therefore had no chip in the category filter and could not
   * be reached by category at all, while their own pages went on printing the
   * category name. The archive also described itself as holding 15 categories
   * when the data holds 17.
   *
   * They are added rather than folded into "Historical documents" and
   * "Historical photographs", because merging would relabel six objects to
   * make a counting bug go away.
   */
  | "Documents"
  | "Portraits";

/** Display order — the order a visitor would want to meet the shelves in. */
export const ARCHIVE_CATEGORY_ORDER: ArchiveCategory[] = [
  "Monastery heritage",
  "Historic sites",
  "Historical photographs",
  "Portraits",
  "Historical documents",
  "Documents",
  "Architecture",
  "Sacred landscapes",
  "Festivals",
  "Dance",
  "Music",
  "Clothing",
  "Crafts",
  "Food heritage",
  "Oral traditions",
  "Community heritage",
  "Traditional knowledge",
];

export type ArchiveMediaType = "image";

export interface ArchiveItem {
  id: string;
  title: string;
  category: ArchiveCategory;
  /** Raw label as curated, e.g. "Bhutia and Lepcha". */
  community: string | null;
  /** Split for filtering. */
  communities: string[];
  location: string | null;
  district: SikkimDistrict | null;
  period: string | null;
  periodBucket: PeriodBucket;
  mediaType: ArchiveMediaType;
  mediaUrl: string;
  width: number;
  height: number;
  /** One line written for this archive, from the cited source. */
  summary: string | null;
  /** The subject article's own lead, quoted. */
  context: string;
  sourceName: string;
  sourceUrl: string;
  creator: string | null;
  credit: string | null;
  license: string;
  licenseUrl: string | null;
  commonsFile: string;
  commonsFilePage: string;
  /** False when the photograph was not taken in Sikkim. */
  sikkimSubject: boolean;
  captureNote: string | null;
  verification: VerificationStatus;
  relatedMonasteries: string[];
  relatedEvents: string[];
  relatedStories: string[];
  verifiedAt: string;
  /** Pre-computed lowercase haystack for search. */
  searchText: string;
}

interface GeneratedItem {
  id: string;
  key: string;
  title: string;
  category: string;
  community: string | null;
  location: string | null;
  period: string | null;
  mediaType: string;
  mediaUrl: string;
  width: number;
  height: number;
  note: string | null;
  context: string;
  sourceName: string;
  sourceUrl: string;
  creator: string | null;
  credit: string | null;
  license: string;
  licenseUrl: string | null;
  commonsFile: string;
  commonsFilePage: string;
  sikkimSubject: boolean;
  captureNote: string | null;
  claim: string;
  relatedMonasteries: string[];
  relatedEvents: string[];
  relatedStories: string[];
  resolvedAt: string;
}

const DISTRICTS: SikkimDistrict[] = [
  "Gangtok",
  "Mangan",
  "Namchi",
  "Gyalshing",
  "Pakyong",
  "Soreng",
];

/** Read a district out of a free-text location, or return null. No guessing. */
function districtOf(location: string | null): SikkimDistrict | null {
  if (!location) return null;
  return DISTRICTS.find((d) => location.includes(d)) ?? null;
}

/**
 * Coarse period buckets, for filtering.
 *
 * Derived from a four-digit year in the curated period label, or from an
 * explicit "Nth century". Anything with no date resolves to "Undated" — which
 * is most of the archive, because a photograph of a dish or a drum documents a
 * living practice rather than a moment.
 */
export type PeriodBucket =
  | "Before 1700"
  | "18th century"
  | "19th century"
  | "20th century"
  | "21st century"
  | "Undated";

export const PERIOD_BUCKET_ORDER: PeriodBucket[] = [
  "Before 1700",
  "18th century",
  "19th century",
  "20th century",
  "21st century",
  "Undated",
];

function bucketForYear(year: number): PeriodBucket {
  if (year < 1700) return "Before 1700";
  if (year < 1800) return "18th century";
  if (year < 1900) return "19th century";
  if (year < 2000) return "20th century";
  return "21st century";
}

function periodBucketOf(period: string | null): PeriodBucket {
  if (!period) return "Undated";
  const year = period.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (year) return bucketForYear(Number(year[1]));
  const century = period.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+century\b/i);
  if (century) {
    const n = Number(century[1]);
    if (n <= 17) return "Before 1700";
    if (n === 18) return "18th century";
    if (n === 19) return "19th century";
    if (n === 20) return "20th century";
    return "21st century";
  }
  return "Undated";
}

/**
 * "Bhutia and Lepcha" -> ["Bhutia", "Lepcha"]. Parenthetical qualifiers are
 * kept with the name they qualify: "Rai (Kirat)" stays one community.
 */
function splitCommunities(community: string | null): string[] {
  if (!community) return [];
  return community
    .split(/\s+and\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * How firmly an item stands.
 *
 * An item photographed outside Sikkim is never "verified", however good its
 * licence is — the licence proves who took the picture, not that the picture
 * shows Sikkim.
 */
function verificationOf(item: GeneratedItem): VerificationStatus {
  if (item.claim === "oral tradition") return "oral tradition";
  if (item.claim === "unverified") return "unverified";
  if (!item.sikkimSubject) return "source-backed";
  return "verified";
}

/**
 * Catalogue order.
 *
 * The generated file is in the order the agent collected things, and the first
 * six entries in it — the Tibetan canon, a manuscript leaf, a prayer wheel, a
 * thangka being painted, a Cham dancer, a festival crowd — are every one of
 * them photographed outside Sikkim. Rendered in file order, the archive of
 * Sikkim's heritage opened on six consecutive "Photographed outside Sikkim"
 * badges, which is what a visitor met before anything else on the page. 21 of
 * the 77 objects are stand-ins; showing all six of the first six was an
 * accident of collection order, not a fact about the collection.
 *
 * The stand-ins are not demoted out of sight — they are honest material and
 * they keep their badge — but they follow the objects actually photographed in
 * Sikkim. Within each group, dated material leads, oldest first, and everything
 * else falls back to the title so the order is total and stable: a catalogue
 * that reshuffles between builds is impossible to cite.
 */
function catalogueOrder(a: ArchiveItem, b: ArchiveItem): number {
  if (a.sikkimSubject !== b.sikkimSubject) return a.sikkimSubject ? -1 : 1;

  const aYear = a.period?.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1];
  const bYear = b.period?.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1];
  if (aYear && bYear && aYear !== bYear) return Number(aYear) - Number(bYear);
  if (Boolean(aYear) !== Boolean(bYear)) return aYear ? -1 : 1;

  return a.title.localeCompare(b.title);
}

export const archiveItems: ArchiveItem[] = (generated.items as GeneratedItem[]).map((item) => {
  const communities = splitCommunities(item.community);
  const monasteryNames = item.relatedMonasteries
    .map((slug) => getMonasteryBySlug(slug)?.name ?? slug)
    .join(" ");
  const shaped = {
    id: item.id,
    title: item.title,
    category: item.category as ArchiveCategory,
    community: item.community,
    communities,
    location: item.location,
    district: districtOf(item.location),
    period: item.period,
    periodBucket: periodBucketOf(item.period),
    mediaType: "image" as const,
    mediaUrl: item.mediaUrl,
    width: item.width,
    height: item.height,
    summary: item.note,
    context: item.context,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    creator: item.creator,
    credit: item.credit,
    license: item.license,
    licenseUrl: item.licenseUrl,
    commonsFile: item.commonsFile,
    commonsFilePage: item.commonsFilePage,
    sikkimSubject: item.sikkimSubject,
    captureNote: item.captureNote,
    verification: verificationOf(item),
    relatedMonasteries: item.relatedMonasteries,
    relatedEvents: item.relatedEvents,
    relatedStories: item.relatedStories,
    verifiedAt: item.resolvedAt,
  };
  return {
    ...shaped,
    searchText: [
      shaped.title,
      shaped.category,
      shaped.community,
      shaped.location,
      shaped.period,
      shaped.summary,
      shaped.context,
      monasteryNames,
      shaped.commonsFile,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}).sort(catalogueOrder);

/* ------------------------------------------------------------------ accessors */

export function getArchiveItem(id: string): ArchiveItem | undefined {
  return archiveItems.find((item) => item.id === id);
}

/**
 * Look an item up by its image key ("story/coronation-throne").
 *
 * The timeline references its illustrations by key, so an event's picture is a
 * catalogued object with a licence and an attribution rather than a loose file
 * path. If the key stops resolving, the event renders without an image instead
 * of with a broken one.
 */
export function getArchiveItemByKey(key: string): ArchiveItem | undefined {
  return getArchiveItem(key.replace(/\//g, "-"));
}

export function getArchiveForMonastery(slug: string): ArchiveItem[] {
  return archiveItems.filter((item) => item.relatedMonasteries.includes(slug));
}

export function getArchiveForEvent(eventSlug: string): ArchiveItem[] {
  return archiveItems.filter((item) => item.relatedEvents.includes(eventSlug));
}

export function getArchiveForStory(storySlug: string): ArchiveItem[] {
  return archiveItems.filter((item) => item.relatedStories.includes(storySlug));
}

export function getArchiveByCategory(category: ArchiveCategory): ArchiveItem[] {
  return archiveItems.filter((item) => item.category === category);
}

/**
 * Related items for a detail page: same category first, then anything sharing a
 * community or a district. Never the item itself.
 */
export function getRelatedArchiveItems(item: ArchiveItem, limit = 6): ArchiveItem[] {
  const scored = archiveItems
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.category === item.category) score += 3;
      if (candidate.communities.some((c) => item.communities.includes(c))) score += 2;
      if (candidate.district && candidate.district === item.district) score += 2;
      if (candidate.relatedMonasteries.some((m) => item.relatedMonasteries.includes(m))) score += 2;
      if (candidate.relatedEvents.some((e) => item.relatedEvents.includes(e))) score += 1;
      return { candidate, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.candidate);
}

/** Places catalogued with a coordinate, matched by district — for the map link. */
export function getPlaceForArchiveItem(item: ArchiveItem) {
  if (!item.district) return undefined;
  return places.find((place) => place.district === item.district);
}

/** A Maps search built from the item's own title and location. No invented pins. */
export function archiveMapUrl(item: ArchiveItem): string | null {
  if (!item.location || !item.sikkimSubject) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${item.title}, ${item.location}, Sikkim, India`,
  )}`;
}

/* --------------------------------------------------------------- facet values */

export const ARCHIVE_CATEGORIES: ArchiveCategory[] = ARCHIVE_CATEGORY_ORDER.filter((category) =>
  archiveItems.some((item) => item.category === category),
);

export const ARCHIVE_COMMUNITIES: string[] = [
  ...new Set(archiveItems.flatMap((item) => item.communities)),
].sort();

export const ARCHIVE_DISTRICTS: SikkimDistrict[] = DISTRICTS.filter((district) =>
  archiveItems.some((item) => item.district === district),
);

export const ARCHIVE_LICENCES: string[] = [
  ...new Set(archiveItems.map((item) => item.license)),
].sort();

export const ARCHIVE_PERIODS: PeriodBucket[] = PERIOD_BUCKET_ORDER.filter((bucket) =>
  archiveItems.some((item) => item.periodBucket === bucket),
);

/** Verification states actually present in the archive — no empty filters. */
export const ARCHIVE_VERIFICATIONS: VerificationStatus[] = (
  ["verified", "source-backed", "oral tradition", "community contribution", "unverified"] as const
).filter((status) => archiveItems.some((item) => item.verification === status));

/**
 * Coverage of the archive itself, computed from the records. These are the only
 * numbers the preservation dashboard is allowed to show for the archive.
 */
export const ARCHIVE_COVERAGE = {
  total: archiveItems.length,
  verified: archiveItems.filter((i) => i.verification === "verified").length,
  sourceBacked: archiveItems.filter((i) => i.verification === "source-backed").length,
  oralTradition: archiveItems.filter((i) => i.verification === "oral tradition").length,
  photographedInSikkim: archiveItems.filter((i) => i.sikkimSubject).length,
  categories: ARCHIVE_CATEGORIES.length,
  communities: ARCHIVE_COMMUNITIES.length,
  districts: ARCHIVE_DISTRICTS.length,
  withKnownCreator: archiveItems.filter((i) => i.creator !== null).length,
  licensed: archiveItems.filter((i) => Boolean(i.license)).length,
  linkedToMonastery: archiveItems.filter((i) => i.relatedMonasteries.length > 0).length,
  linkedToEvent: archiveItems.filter((i) => i.relatedEvents.length > 0).length,
} as const;

export const ARCHIVE_GENERATED_AT: string = generated.generatedAt;
