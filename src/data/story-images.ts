import generated from "@/data/generated/story-images.json";

/**
 * Photography for the Stories of Sikkim archive.
 *
 * Every entry is resolved by `npm run agent:research` from a curated Wikimedia
 * Commons file: the agent reads the licence and author out of Commons' own
 * metadata and HEAD-verifies the URL, so no photograph reaches a page without
 * an attribution line. Editing this file by hand is the wrong move — edit the
 * curated list in scripts/sikkim-cultural-research.mjs and re-run the agent.
 */

export interface ImageCredit {
  /** Commons file name, e.g. "File:Sel Roti.jpg". */
  file: string;
  url: string;
  /** Commons file page — where the full licence text lives. */
  descriptionUrl: string;
  license: string;
  attribution: string;
  /**
   * When the research agent last confirmed this credit. Absent for credits that
   * come from the Phase 1 registry (src/data/images.ts), which is enriched from
   * Commons in a separate pass and records no per-file resolution date.
   */
  resolvedAt?: string;
}

interface GeneratedImage extends ImageCredit {
  key: string;
  width: number;
  height: number;
  httpStatus?: number;
  licenseUrl?: string | null;
  credit?: string | null;
  /** Path under public/ once `npm run images:vendor` has localised the file. */
  localPath?: string;
}

const IMAGES = generated.images as Record<string, GeneratedImage>;

/** Resolve a story image key. Returns undefined rather than a wrong picture. */
export function storyImage(key: string): ImageCredit | undefined {
  const entry = IMAGES[key];
  if (!entry) return undefined;
  return {
    file: entry.file,
    // Serve the vendored copy. Hotlinking upload.wikimedia.org gets rate-limited
    // (HTTP 429) once a page requests more than a handful at once, which left
    // photographs broken on a first visit and "fixed" only by a reload. Falls
    // back to the Commons URL until `npm run images:vendor` has localised it.
    url: entry.localPath ?? entry.url,
    descriptionUrl: entry.descriptionUrl,
    license: entry.license,
    attribution: entry.attribution,
    resolvedAt: entry.resolvedAt,
  };
}

export const STORY_IMAGE_KEYS = Object.keys(IMAGES);
