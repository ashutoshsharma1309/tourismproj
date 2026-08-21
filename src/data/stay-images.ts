import generated from "@/data/generated/stay-images.json";

/**
 * Photographs of the graded properties themselves.
 *
 * WHERE THESE COME FROM, AND WHY THEY ARE NOT COPIED HERE
 * ------------------------------------------------------
 * All but one are the hotel's own published photographs, served from the
 * hotel's own website or its operator's CDN. Nine of the twenty-two graded
 * properties now have them. They are shown from there — the
 * visitor's browser fetches them from the property, and no copy is stored or
 * cached by this project. That is deliberate: these are the operators'
 * copyrighted promotional images and no licence was granted for them, so this
 * archive displays them the way it displays video, by pointing at the source
 * rather than by taking a copy. Every one names the property it came from and
 * links to the page it is published on.
 *
 * The exception is the Mayfair photograph, which is on Wikimedia Commons under
 * CC BY-SA 4.0 and could legitimately be republished. It is the ONLY freely
 * licensed photograph of any of the twenty-two that exists.
 *
 * WHAT WAS THROWN OUT
 * -------------------
 * Far more than was kept, and for reasons worth recording:
 *
 *   - Six images for Sobralia Residency depict "Banari Regency by Summit", a
 *     differently named hotel half a kilometre away. Same operator, same
 *     village, unproven rebrand — so they are not published against Sobralia.
 *   - Lemon Tree reuses photographs across its chain. Two images on the
 *     Gangtok page carry alt text reading "restaurant near banjara hills" —
 *     Banjara Hills is in Hyderabad. Only the image whose own filename names
 *     Gangtok survived.
 *   - The one Commons photograph of Nor-Khill is a view of the Kangchenjunga
 *     massif taken FROM the hotel, showing no part of it. That is precisely
 *     the failure src/data/gallery-rejections.ts exists to catch.
 *   - Fifty-three Commons files named for Ravangla are photographs of the
 *     town, not of Hotel Ravongla Star.
 *   - A generic Sikkim landscape on the Gangtok Drift site, and assorted
 *     TripAdvisor and award badges.
 *   - Rabdentse Ruins, Sanghak Choeling, River Rimbi and a bird sanctuary,
 *     which Club Mahindra publishes in Chumbi Mountain Retreat's own CDN
 *     folder. They are nearby attractions the resort promotes, not the resort.
 *   - The WordPress demo photography still sitting on Simala Retreat's site,
 *     including a frame whose alt text reads "hotel carmelina" — a different
 *     hotel entirely, shipped with the theme.
 *   - A CC BY-SA 4.0 Commons panorama by Bernard Gagnon taken FROM Nor-Khill.
 *     It is freely licensed and could be republished, and it is still not a
 *     photograph of the hotel: the hotel is where the camera stood.
 *   - All twenty of Nor-Khill's, which are real photographs of the right
 *     hotel but cannot be shown. Elgin's server returns 200 to a bare request
 *     and 403 to one carrying a Referer, which is hotlink protection: a
 *     browser on this site gets a broken frame every time. Displaying them
 *     would require taking a copy, which is the thing not being done. Its card
 *     falls back to the district photograph and its page links to Elgin's own
 *     gallery instead.
 *
 * WHAT A SECOND SWEEP FOUND
 * -------------------------
 * Four more properties, after the first pass concluded there were none. Three
 * needed a real browser rather than a fetch — Denzong Regency and Chumbi
 * Mountain Retreat both hide their galleries behind JavaScript and a
 * Cloudflare interstitial, and neither appears in the raw HTML at all. The
 * fourth, The Retreat, surfaced only by following two rebrands: The Retreat by
 * Zuri became Club Mahindra Baiguney and is now Simala Retreat, whose contact
 * block gives "Baiguney Village, P.O. Pipaley, Soreng District – 737121" —
 * an exact match for the register. That chain is inferential, so its frames are
 * marked "likely" rather than "confirmed".
 *
 * The Planters Home is the strongest identification in the whole set: its
 * images carry a burned-in caption reading "Hotel The Planter's Home / A Unit
 * of Hotel Sonam Delek", several adding "MANGAN North Sikkim". That is
 * pictorial proof rather than a folder name.
 *
 * Thirteen of the twenty-two still have no photograph, and the page says so
 * rather than showing a picture of somewhere else. Their sites are variously
 * parked, dark, behind a bot check, serving an "Account Suspended" page, or
 * absent altogether — and one, Nor-Khill, has twenty good photographs of
 * itself that cannot be used at all.
 */

export interface StayImage {
  id: string;
  url: string;
  /** Where it is published — the operator, or Wikimedia Commons. */
  source: string;
  sourceUrl: string;
  /** Set only where a licence was actually granted. */
  license: string | null;
  attribution: string;
  width: number | null;
  height: number | null;
  /**
   * "confirmed" means the file sits in the property's own namespaced folder or
   * names it; "likely" means the match is strong but inferred. Nothing marked
   * "unconfirmed" is published.
   */
  depictsProperty: "confirmed" | "likely";
  /** True only for the freely licensed Commons file. */
  rehostable: boolean;
  alt: string | null;
  note: string | null;
  retrievedAt: string;
}

const IMAGES = generated.images as Record<string, StayImage[]>;

export function stayImages(slug: string): StayImage[] {
  return IMAGES[slug] ?? [];
}

export const STAY_IMAGE_STATS = {
  properties: Object.keys(IMAGES).length,
  images: Object.values(IMAGES).flat().length,
  withThreeOrMore: Object.values(IMAGES).filter((list) => list.length >= 3).length,
  verifiedAt: generated.generatedAt.slice(0, 10),
} as const;
