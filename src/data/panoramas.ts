/**
 * Verified panoramic captures.
 *
 * The search behind this file is recorded in reports/monastery-360-discovery.json
 * and reports/monastery-panorama-discovery.json. Its result was almost entirely
 * negative, and that negative is the honest answer:
 *
 *   - Wikimedia Commons holds no equirectangular 360° sphere of any catalogued
 *     Sikkim monastery. Commons has no "360° panoramas of Sikkim" category at
 *     all, though it has them for neighbouring states.
 *   - Google Street View availability cannot be established without a Maps
 *     Platform key, and the only sanctioned check is the Street View metadata
 *     endpoint. Scraping the Maps site instead would breach its terms. With no
 *     key configured, this build records "not checked" rather than guessing.
 *   - Filtering Commons by aspect ratio alone produces nonsense: the widest
 *     "panoramas" near Enchey turned out to be a close-up of a lily and a snow
 *     leopard. Every candidate here was opened and looked at before it shipped.
 *
 * Exactly one genuine panoramic capture survived that process. It is published
 * as what it is — a wide stitched photograph you can pan through — and never
 * described as a 360° sphere, because it is not one. An honest 180° is worth
 * more than a fabricated 360°.
 */

import type { Provenance } from "@/data/sources";

/**
 * How the viewer must treat the image.
 *
 * `flat-panorama`   a wide stitched photograph. Panned and zoomed in two
 *                   dimensions. No projection is claimed, because the source
 *                   does not publish one and inventing a field of view would be
 *                   inventing a fact.
 * `equirectangular` a true 2:1 sphere, rendered by Pannellum with full look-
 *                   around. Reserved for sources that state the projection.
 * `street-view`     Google's own interactive panorama, embedded through the
 *                   Maps Embed API. Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
export type PanoramaProjection = "flat-panorama" | "equirectangular" | "street-view";

export interface PanoramaRecord {
  monasteryId: string;
  provider: string;
  projection: PanoramaProjection;
  /** The full-resolution original; unused for street-view. */
  imageUrl?: string;
  /**
   * Renditions the viewer actually loads, vendored into public/panoramas by
   * `npm run panoramas:vendor`.
   *
   * These were remote Commons URLs until testing showed two ways that fails:
   * Commons only serves thumbnail widths it has already generated (1280 and
   * 1920 exist for this file; 1600, 2000, 2048 and 2560 all answer 400), and it
   * rate-limits repeat fetches with 429. Serving from this origin is permitted
   * by CC BY-SA 4.0 so long as attribution travels with the image, which the
   * viewer renders beneath every panorama.
   */
  previewUrl?: string;
  viewerUrl?: string;
  /** Google panorama id, for street-view records only. */
  panoramaId?: string;
  width?: number;
  height?: number;
  /** Where in the monastery the camera stood — shown to the visitor. */
  vantage: string;
  latitude: number | null;
  longitude: number | null;
  /** Metres between the capture point and the monastery's own coordinate. */
  distanceMetres: number | null;
  sourceUrl: string;
  author: string;
  licence: string;
  licenceUrl: string;
  capturedAt: string | null;
  /** What was actually seen when a person opened the image. */
  visualCheck: string;
  provenance: Provenance;
}

export const panoramas: PanoramaRecord[] = [
  {
    monasteryId: "rumtek",
    provider: "Wikimedia Commons",
    projection: "flat-panorama",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/72/Rumtek_Monastery_03.jpg",
    previewUrl: "/panoramas/rumtek-courtyard-1280.jpg",
    viewerUrl: "/panoramas/rumtek-courtyard-1920.jpg",
    width: 5386,
    height: 2737,
    vantage: "The main courtyard, facing the Dharma Chakra Centre's principal temple",
    latitude: 27.2886,
    longitude: 88.5614,
    distanceMetres: 1,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Rumtek_Monastery_03.jpg",
    author: "Bernard Gagnon",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    capturedAt: "2018-05-17",
    visualCheck:
      "Opened and inspected: the four-storey main temple facade with its gilded roof ornaments, the colonnaded galleries on both sides, the prayer-wheel and dharmachakra frieze, monks crossing a rain-wet flagstone courtyard, and incense smoke rising in front of the doors. Unambiguously Rumtek.",
    provenance: {
      sourceId: "wikimedia-commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Rumtek_Monastery_03.jpg",
      verifiedAt: "2026-08-17",
      confidence: "high",
      caveat:
        "A wide stitched photograph, not a full 360° sphere. The source publishes no horizontal field of view, so none is claimed and the viewer pans within the frame rather than around a sphere.",
    },
  },
];

export function getPanorama(monasterySlug: string): PanoramaRecord | undefined {
  return panoramas.find((p) => p.monasteryId === monasterySlug);
}

/**
 * Whether a projection earns the words "360°".
 *
 * Every badge, column heading and coverage row that wants to say "360°" has to
 * ask this first. A `flat-panorama` is a wide photograph you pan within;
 * calling it a 360° tour is the same class of claim as the European panoramas
 * this project deleted, just with better sourcing.
 */
export function isFullSphere(projection: PanoramaProjection): boolean {
  return projection === "equirectangular" || projection === "street-view";
}

/**
 * The same panorama must never stand in for two different monasteries. The
 * previous build of this project reused two European panoramas across five
 * Sikkim sites; the data-quality agent fails the build if that returns.
 */
export function duplicatePanoramas(): { key: string; monasteries: string[] }[] {
  const byKey = new Map<string, string[]>();
  for (const p of panoramas) {
    const key = p.imageUrl ?? p.panoramaId ?? "";
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), p.monasteryId]);
  }
  return [...byKey.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, monasteries]) => ({ key, monasteries }));
}
