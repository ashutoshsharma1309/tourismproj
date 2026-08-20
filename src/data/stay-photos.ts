import { depictsPlace, photographedInSikkim, placeGallery } from "@/data/galleries";
import type { GalleryPhoto } from "@/data/galleries";
import { curatedStays } from "@/data/curated-stays";
import type { CuratedStay } from "@/data/curated-stays";
import { places } from "@/data/places";

/**
 * A photograph for a stay card.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is NOT a photograph of the hotel, and nothing here re-opens that finding.
 * No openly licensed photograph of any of the 22 state-graded properties
 * exists: Commons was searched for every one, OpenStreetMap carries no image
 * tags for them, and of their official websites only three resolve to a real
 * property page. A stock hotel interior would be exactly the invention this
 * directory was stripped back to remove.
 *
 * What this resolves is a photograph of a catalogued place in the same
 * district, drawn from the evidenced Commons galleries the rest of the archive
 * already uses. The distinction is the whole point, and the card is required to
 * print it: "Tsomgo Lake, Gangtok district" is a claim the archive can source,
 * "this is the May Fair Resort" is not. CuratedStays renders the place name,
 * the photographer and the licence under every frame.
 *
 * WHY THE DISTRICT AND NOT THE LOCALITY
 * -------------------------------------
 * The locality is the more precise answer and it was the first thing tried.
 * It does not survive contact with the data: twelve of the 22 properties are in
 * Gangtok town, and `place/gangtok` holds two qualifying photographs, so the
 * page rendered the same frame nine times. Repetition on that scale reads as a
 * broken template, not as a town.
 *
 * The district pools 27 photographs across 8 catalogued places for Gangtok, 19
 * across 6 for Gyalshing, and so on — enough for every card to differ. Since
 * each frame is captioned with the place it actually shows, widening the pool
 * costs no accuracy: a Nathu La photograph labelled "Nathu La, Gangtok
 * district" claims nothing about the hotel beside it.
 */

/**
 * Locality keywords, mapped to the district whose pool to draw from.
 *
 * The register's `district` field is authoritative and this is only a
 * cross-check for the handful of addresses that name a town in a different
 * district from the one filed against them. Spelling is the register's own,
 * which is not always the archive's — it writes "Ravongla" where the place
 * slug is `ravangla`, and "Sikkiim" at least once.
 */
const LOCALITY_DISTRICT: Array<[RegExp, string]> = [
  [/\bpelling\b|\bgyalshing\b|\bgeyzing\b|\byuksom\b/i, "Gyalshing"],
  [/\bravongla\b|\bravangla\b|\brabong\b|\bkewzing\b|\bnamchi\b|\bjorethang\b/i, "Namchi"],
  [/\bmangan\b|\blachen\b|\blachung\b|\bchungthang\b|\bdzongu\b/i, "Mangan"],
  [/\bsoreng\b|\bbaiguney\b|\brinchenpong\b/i, "Soreng"],
  [/\brongli\b|\baritar\b|\bdzuluk\b|\bpakyong\b/i, "Pakyong"],
  [/\bgangtok\b|\btadong\b|\branipool\b|\bsichey\b|\bsyari\b|\bsamdur\b|\btathanchen\b|\brumtek\b/i, "Gangtok"],
];

export interface StayPhoto extends GalleryPhoto {
  /** The place the photograph shows. The caption's subject — never the hotel. */
  placeName: string;
  placeSlug: string;
  placeDistrict: string;
}

/** Every qualifying photograph in a district, tagged with the place it shows. */
function districtPool(district: string): StayPhoto[] {
  const pool: StayPhoto[] = [];
  for (const place of places) {
    if (place.district !== district) continue;
    for (const photo of placeGallery(place.slug)) {
      /*
       * The same two filters the home page rail uses. `depictsPlace` drops the
       * wildlife macros — a butterfly photographed inside a sanctuary is a real
       * photograph of a butterfly and no help at all in picturing a district —
       * and `photographedInSikkim` drops frames whose own caption puts the
       * camera in West Bengal.
       */
      if (!depictsPlace(photo) || !photographedInSikkim(photo)) continue;
      pool.push({
        ...photo,
        placeSlug: place.slug,
        placeName: place.name,
        placeDistrict: place.district,
      });
    }
  }
  return pool;
}

function districtOf(stay: CuratedStay): string {
  const haystack = `${stay.address ?? ""} ${stay.name}`;
  for (const [pattern, district] of LOCALITY_DISTRICT) {
    if (pattern.test(haystack)) return district;
  }
  return stay.district;
}

/**
 * slug → photograph, assigned once for the whole set.
 *
 * DEALT ROUND-ROBIN, NOT HASHED PER PROPERTY
 * ------------------------------------------
 * Hashing each slug independently is simpler and was the first attempt, but
 * modulo collisions do not care that the pool is large: with 27 photographs and
 * 12 Gangtok properties it still dealt Tsomgo Lake to three different hotels.
 * Three cards showing one photograph on the same screen reads as a bug in the
 * page, not as a coincidence.
 *
 * Dealing them in order guarantees distinct frames while the pool outlasts the
 * properties, which it does in every district — Gangtok 27 against 12, Soreng 3
 * against 2, and so on. Both sides are sorted, so the assignment is stable
 * across renders and machines: a card that changed its picture between two page
 * loads would look broken, and would make the credit under it a moving target.
 */
const ASSIGNED = new Map<string, StayPhoto>();

function assign(): void {
  const byDistrict = new Map<string, CuratedStay[]>();
  for (const stay of [...curatedStays].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const district = districtOf(stay);
    const list = byDistrict.get(district) ?? [];
    list.push(stay);
    byDistrict.set(district, list);
  }

  for (const [district, stays] of byDistrict) {
    const pool = districtPool(district);
    if (pool.length === 0) continue;
    stays.forEach((stay, index) => {
      const photo = pool[index % pool.length];
      if (photo) ASSIGNED.set(stay.slug, photo);
    });
  }
}

assign();

/**
 * The photograph for one property, or undefined when its district has no
 * qualifying frame at all. Undefined is a normal answer — the card falls back
 * to its monogram rather than borrowing a photograph of somewhere else.
 */
export function stayPhoto(stay: CuratedStay): StayPhoto | undefined {
  return ASSIGNED.get(stay.slug);
}

/** How many of the graded properties resolve to a photograph. */
export function countStaysWithPhoto(stays: CuratedStay[]): number {
  return stays.filter((stay) => stayPhoto(stay) !== undefined).length;
}
