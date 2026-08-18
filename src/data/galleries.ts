import generated from "@/data/generated/site-galleries.json";
import { isRejected } from "@/data/gallery-rejections";

/**
 * Photographic galleries for monasteries and places.
 *
 * Written by `npm run agent:gallery` (scripts/heritage-gallery-agent.mjs) from
 * Wikimedia Commons, and vendored into public/images/gallery. Hand-editing this
 * resolver's data is the wrong move — the agent records the evidence that a
 * photograph actually depicts its subject, and an entry typed in by hand would
 * carry none.
 *
 * Every photograph here has a licence and a named author, because the agent
 * drops any candidate missing either. That is what lets the UI print a credit
 * under each frame instead of a bare picture with no provenance.
 */

export type GalleryEvidence = "category" | "named" | "geo";
export type GalleryAssessment = "featured" | "quality" | "valued";

export interface GalleryPhoto {
  /** Commons file name, e.g. "File:Rumtek Monastery 04.jpg". */
  file: string;
  /** Path under public/ — served from this origin, never hotlinked. */
  localPath: string;
  /** Commons file page, where the full licence text lives. */
  descriptionUrl: string;
  width: number;
  height: number;
  license: string;
  licenseUrl: string | null;
  attribution: string;
  credit: string | null;
  /** Commons' own description, trimmed. Null when the file carried none. */
  caption: string | null;
  /** Commons peer assessment, where the file has earned one. */
  assessment: GalleryAssessment | null;
  /** Why we believe this photograph shows this subject. */
  evidence: GalleryEvidence;
  /** Metres from the subject's verified coordinate, for geo-evidenced files. */
  distanceM: number | null;
  resolvedAt: string;
}

interface Gallery {
  key: string;
  scope: "monastery" | "place";
  slug: string;
  subject: string;
  photos: GalleryPhoto[];
}

const RAW_GALLERIES = generated.galleries as unknown as Record<string, Gallery>;

/**
 * The published galleries, with every rejected photograph removed.
 *
 * See src/data/gallery-rejections.ts for what was rejected and why. Filtering
 * here rather than editing the generated JSON means re-running the gallery
 * agent cannot quietly reinstate a French wind farm as Soreng, Sikkim.
 */
const GALLERIES: Record<string, Gallery> = Object.fromEntries(
  Object.entries(RAW_GALLERIES).map(([key, gallery]) => [
    key,
    { ...gallery, photos: gallery.photos.filter((photo) => !isRejected(key, photo.file)) },
  ]),
);

/**
 * Whether a frame actually shows the place, as opposed to something that
 * happened to be standing in it.
 *
 * A macro of a butterfly's wing taken two metres from the Chungthang
 * coordinate is a photograph of a butterfly. It belongs in a gallery — a
 * wildlife sanctuary's fauna is part of what it is — but it must never be the
 * one frame chosen to represent a town on /hotels or in an itinerary.
 */
const SPECIMEN = /\b(close wing|open wing|nectaring|basking|puddling|pudding|wing position|butterfly|moth|caterpillar|sunbird|laughingthrush|thrush|orchid|beetle|spider|specimen|sub-species|subspecies)\b/i;

export function depictsPlace(photo: GalleryPhoto): boolean {
  return !SPECIMEN.test(`${photo.file} ${photo.caption ?? ""}`);
}

/**
 * The single frame that best represents a subject — for the district headers on
 * /hotels and the route strip in a generated itinerary.
 *
 * Both of those took `gallery[0]`, which is why Mangan district was illustrated
 * by manganese bacteria in Scotland. Preferring a frame that depicts the place,
 * and falling back to the first available only when nothing does, keeps a
 * specimen macro out of the lead slot without discarding it from the gallery.
 */
export function representativePhoto(
  scope: "monastery" | "place",
  slug: string,
): GalleryPhoto | undefined {
  const photos = gallery(scope, slug);
  return photos.find(depictsPlace) ?? photos[0];
}

/**
 * The gallery for a monastery. Returns an empty array rather than a fallback:
 * a site with no qualifying photograph shows no gallery at all.
 */
export function monasteryGallery(slug: string): GalleryPhoto[] {
  return GALLERIES[`monastery/${slug}`]?.photos ?? [];
}

export function placeGallery(slug: string): GalleryPhoto[] {
  return GALLERIES[`place/${slug}`]?.photos ?? [];
}

export function gallery(scope: "monastery" | "place", slug: string): GalleryPhoto[] {
  return GALLERIES[`${scope}/${slug}`]?.photos ?? [];
}

/**
 * Everything the agent collected, best-assessed first — the pool the home page
 * mosaic draws from. Commons-assessed frames (Featured, Quality, Valued) come
 * first because those have been judged by photographers, not by this project.
 */
const ASSESSMENT_RANK: Record<string, number> = { featured: 3, quality: 2, valued: 1 };

export function allGalleryPhotos(): Array<GalleryPhoto & { subject: string; scope: string; slug: string }> {
  return Object.values(GALLERIES)
    .flatMap((g) =>
      g.photos.map((photo) => ({
        ...photo,
        subject: g.subject,
        scope: g.scope,
        slug: g.slug,
      })),
    )
    .sort(
      (a, b) =>
        (ASSESSMENT_RANK[b.assessment ?? ""] ?? 0) - (ASSESSMENT_RANK[a.assessment ?? ""] ?? 0),
    );
}

/**
 * A spread of the best photography across DIFFERENT subjects.
 *
 * Sorting the whole pool by assessment alone returns eight frames of whichever
 * monastery a prolific Commons photographer visited. Round-robin over subjects
 * keeps a showcase looking like Sikkim rather than like one courtyard.
 */
export function showcasePhotos(
  limit: number,
  filter?: (photo: GalleryPhoto & { scope: string; slug: string }) => boolean,
): Array<GalleryPhoto & { subject: string; scope: string; slug: string }> {
  const bySubject = new Map<string, Array<GalleryPhoto & { subject: string; scope: string; slug: string }>>();
  for (const photo of allGalleryPhotos()) {
    if (filter && !filter(photo)) continue;
    const list = bySubject.get(photo.subject) ?? [];
    list.push(photo);
    bySubject.set(photo.subject, list);
  }

  const queues = [...bySubject.values()];
  const out: Array<GalleryPhoto & { subject: string; scope: string; slug: string }> = [];
  for (let round = 0; out.length < limit; round++) {
    const before = out.length;
    for (const queue of queues) {
      if (out.length >= limit) break;
      const photo = queue[round];
      if (photo) out.push(photo);
    }
    if (out.length === before) break; // every queue exhausted
  }
  return out;
}

/** How many photographs the archive holds — used by the counters. */
export const GALLERY_PHOTO_COUNT = Object.values(GALLERIES).reduce(
  (n, g) => n + g.photos.length,
  0,
);

export const GALLERY_GENERATED_AT = generated.generatedAt;
