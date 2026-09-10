import focal from "@/data/generated/image-focal.json";

/**
 * Where a photograph should be cropped from, as a CSS `object-position`.
 *
 * See `scripts/media/build-image-focal.mjs` for how the manifest is derived
 * and why it is derived rather than hand-placed. This is the read side, and
 * it exists so that no component works out a crop for itself — a hero and a
 * card showing the same photograph must not disagree about where its subject
 * is.
 *
 * SERVER ONLY. The manifest covers 414 photographs; importing it into a
 * client component would ship all of them to the browser to position one
 * image. This repository has shipped a whole dictionary set and a whole
 * search corpus to the client by exactly that route, twice.
 */
const MANIFEST = focal as Record<
  string,
  { w: number; h: number; y: number } | undefined
>;

/** The browser's own default, for anything not in the manifest. */
const CENTRE = "50% 50%";

/**
 * Whether a photograph can fill a wide frame without losing its subject.
 *
 * A destination hero is 16:9 on a desktop. Paris's most prominent record is
 * the Eiffel Tower, whose photograph is 1920 x 3198 — a 0.6 ratio. NO crop
 * origin rescues that: three fifths of the image is outside the frame
 * whatever you do with it, so the page opened on a tower with no top. The
 * answer is not a cleverer crop, it is not choosing a portrait photograph for
 * a landscape hole.
 */
export function suitsWideFrame(src: string | null | undefined): boolean {
  if (!src) return false;
  const entry = MANIFEST[src];
  /* Unmeasured photographs are allowed through: refusing them would empty
     the hero on any destination the manifest has not caught up with. */
  return entry ? entry.w / entry.h >= 1.2 : true;
}

export function objectPositionFor(src: string | null | undefined): string {
  if (!src) return CENTRE;
  const entry = MANIFEST[src];
  return entry ? `50% ${entry.y}%` : CENTRE;
}

/**
 * The same thing as a class name, for pages that render many photographs.
 *
 * An inline `style` attribute costs its full text on every image, twice —
 * once in the document and once in the flight payload. /discover renders one
 * card per matching record, and that attribute alone pushed the page through
 * its payload ceiling.
 *
 * Two things make the class version much cheaper. It is a few characters of
 * markup rather than thirty. And 299 of the 408 photographs sit at the
 * browser's own default, so they get NO attribute at all instead of one that
 * restates what would have happened anyway.
 *
 * The classes are defined in globals.css.
 */
export function focalClassFor(src: string | null | undefined): string {
  if (!src) return "";
  const entry = MANIFEST[src];
  if (!entry || entry.y === 50) return "";
  return `fy-${entry.y}`;
}
