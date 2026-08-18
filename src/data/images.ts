/**
 * Photography registry.
 *
 * These are freely licensed Wikimedia Commons files, VENDORED into public/images
 * by scripts/vendor-images.mjs rather than hotlinked at runtime.
 *
 * Why local: upload.wikimedia.org rate-limits hotlinking. Serving these through
 * the Next image optimizer meant a cold first visit fired ~30 upstream fetches
 * at once, Wikimedia answered a share of them with 429, and those photographs
 * rendered broken. They only appeared once a later reload found them in
 * .next/cache/images — the "works after refresh" bug. Local files remove the
 * runtime dependency: no rate limit, no upstream latency, no cold-cache stall.
 *
 * The licence obligation is unchanged. Each file's Commons source URL and File:
 * page are recorded in src/data/generated/image-credits.json, and the credit is
 * rendered next to the photograph.
 *
 * To add or refresh an image: add its Commons URL to scripts/vendor-images.mjs's
 * registry input, run `npm run images:vendor`, then reference the key here.
 */

import generatedCredits from "@/data/generated/image-credits.json";

const IMAGES: Record<string, string> = {
  "hero/buddha-park": "/images/hero/buddha-park.jpg",
  "hero/kanchenjunga": "/images/hero/kanchenjunga.jpg",
  "hero/gurudongmar": "/images/hero/gurudongmar.jpg",
  "hero/yumthang": "/images/hero/yumthang.jpg",

  "mon/rumtek": "/images/mon/rumtek.jpg",
  "mon/pemayangtse": "/images/mon/pemayangtse.jpg",
  "mon/tashiding": "/images/mon/tashiding.jpg",
  "mon/enchey": "/images/mon/enchey.jpg",
  "mon/phodong": "/images/mon/phodong.jpg",
  "mon/ralang": "/images/mon/ralang.jpg",
  "mon/dubdi": "/images/mon/dubdi.jpg",
  "mon/sanga-choeling": "/images/mon/sanga-choeling.jpg",
  "mon/lingdum": "/images/mon/lingdum.jpg",
  "mon/phensang": "/images/mon/phensang.jpg",
  "mon/lachen": "/images/mon/lachen.jpg",
  "mon/lachung": "/images/mon/lachung.jpg",
  "mon/rinchenpong": "/images/mon/rinchenpong.jpg",
  "mon/tsuklakhang": "/images/mon/tsuklakhang.jpg",
  "mon/kewzing": "/images/mon/kewzing.jpg",

  "place/tsomgo": "/images/place/tsomgo.jpg",
  "place/nathula": "/images/place/nathula.jpg",
  "place/khecheopalri": "/images/place/khecheopalri.jpg",

  /* Regional Vajrayana subjects photographed elsewhere in the Himalaya. Used to
     illustrate thematic stories (cham, thangka, canon), never to depict a named
     Sikkim site — the alt text states where each was taken. */
  "int/thiksey": "/images/int/thiksey.jpg",
  "arch/manuscript": "/images/arch/manuscript.jpg",
  "arch/thangka": "/images/arch/thangka.jpg",
  "arch/prayer-wheel": "/images/arch/prayer-wheel.jpg",
  "arch/canon": "/images/arch/canon.jpg",
  "fest/cham": "/images/fest/cham.jpg",
  "fest/hemis": "/images/fest/hemis.jpg",
};

/**
 * Designed fallback for an unknown key — a drawn ridgeline, not a photograph.
 * The previous fallback was a topographic map of RAJASTHAN, which would have
 * misrepresented an unrelated state as Sikkim heritage the moment any key
 * missed. A drawing that says "not available" cannot be mistaken for evidence.
 */
export const IMAGE_FALLBACK = "/images/placeholder.svg";

/** Resolve an image key to a URL served from this origin. */
export function img(key: string): string {
  return IMAGES[key] ?? IMAGE_FALLBACK;
}

/** Every key in the registry — used by the asset audit. */
export const IMAGE_KEYS = Object.keys(IMAGES);

/**
 * Licence and authorship for a registry photograph.
 *
 * This existed as a file on disk long before anything read it. Every photograph
 * above is a Commons file under CC BY or CC BY-SA, both of which are satisfied
 * by naming the author and the licence — not by linking the file page alone.
 * 23 of 70 story pages were rendering one of these photographs with no credit
 * line at all, because the only credit resolver on the site read
 * story-images.json and these keys are not in it.
 *
 * `npm run images:credits` (scripts/enrich-image-credits.mjs) fills the licence
 * fields in from Commons' own extmetadata.
 */
interface RegistryCredit {
  key: string;
  localPath: string;
  sourceUrl: string;
  commonsFilePage: string;
  license?: string | null;
  licenseUrl?: string | null;
  attribution?: string | null;
}

const CREDITS = generatedCredits as RegistryCredit[];
const CREDIT_BY_KEY = new Map(CREDITS.map((entry) => [entry.key, entry]));

/**
 * Commons stores authorship as free HTML, and two patterns in it read as
 * gibberish once the tags are stripped: the upload wizard's boilerplate for a
 * file whose author was inferred, and a duplicated "Unknown author". Both are
 * tidied for display; the raw value stays in the JSON.
 */
function tidyAttribution(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const assumed = raw.match(/No machine-readable author provided\.\s*(.+?)\s+assumed/i);
  if (assumed?.[1]) return assumed[1];
  const deduped = raw.replace(/^(Unknown author)(\s+\1)+$/i, "$1");
  return deduped.trim() || null;
}

export interface RegistryImageCredit {
  file: string;
  url: string;
  descriptionUrl: string;
  license: string;
  attribution: string;
  licenseUrl: string | null;
}

/**
 * The credit for a registry key, or undefined when the key is unknown.
 *
 * Returns undefined rather than a partial credit when Commons recorded no
 * licence: a credit line that names an author but no licence would misstate
 * the terms the photograph is offered under.
 */
export function imageCredit(key: string): RegistryImageCredit | undefined {
  const entry = CREDIT_BY_KEY.get(key);
  if (!entry || !entry.license) return undefined;
  return {
    file: decodeURIComponent(entry.commonsFilePage.split("/wiki/")[1] ?? ""),
    url: entry.localPath,
    descriptionUrl: entry.commonsFilePage,
    license: entry.license,
    attribution: tidyAttribution(entry.attribution) ?? "Author not recorded on Commons",
    licenseUrl: entry.licenseUrl ?? null,
  };
}
