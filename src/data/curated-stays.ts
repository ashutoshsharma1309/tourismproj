import generated from "@/data/generated/curated-stays.json";
import type { Provenance } from "@/data/sources";
import { mapsQuery } from "@/data/stay-maps";
import { hasVerifiedImage } from "@/data/stay-images";
import { VERIFIED_WEBSITES, WEBSITE_NOTES } from "@/data/stay-websites";

/**
 * The state-graded stays — what the public Stays page shows.
 *
 * The register behind this holds 905 licensed properties and remains in
 * src/data/hotels.ts as the reference layer. It is an administrative list, and
 * a visitor scrolling 905 rows is not discovering anywhere to stay. The state
 * itself grades exactly 22 of them, and that grading is the only editorial
 * judgement in the dataset that did not come from this project — which makes it
 * the honest basis for a curated page.
 *
 * Nothing is invented to fill the shape. A property carries a photograph, a
 * rating or a booking link only if one could be verified, and none could be for
 * these 22: Wikimedia Commons holds no photographs of them, OpenStreetMap
 * carries no image tags, and MakeMyTrip refuses connections outright so no
 * property page can be confirmed. What they do carry is the register's own
 * telephone number — 21 of 22 — which is a real way to reach a hotel.
 */

export type StarGrade =
  | "5-Star(Deluxe)"
  | "5-Star"
  | "4-Star"
  | "3-Star"
  | "2-Star";

export interface CuratedStay {
  /**
   * Stable identity, e.g. SKM-EAST-001.
   *
   * Assigned deterministically by district then slug, so regenerating the
   * register does not shuffle ids. Nothing in this project should relate a
   * photograph, a coordinate or a booking route to a property by array
   * position — that is how seventeen hotels ended up illustrated by pictures
   * of places they have nothing to do with, three of them by the same stupa.
   * Keyed relationships only.
   */
  propertyId: string;
  slug: string;
  name: string;
  starCategory: StarGrade;
  /** Sort key: 0 is the highest grade. */
  rank: number;
  district: string;
  address: string | null;
  registrationNo: string | null;
  phone: string | null;
  validUpto: string | null;
  latitude: number | null;
  longitude: number | null;
  locationConfidence: "high" | "medium" | null;
  officialWebsite: string | null;
  websiteNote: string | null;
  mapsUrl: string;
  /** True when the Maps link is a coordinate; false when it is a name search. */
  mapsIsExact: boolean;
  images: never[];
  rating: null;
  ratingSource: null;
  sources: string[];
  verificationStatus: "cross-verified" | "register-only";
}

/**
 * The register data, with the verified-website overlay applied.
 *
 * Three of the stored website URLs were broken — one 404, one redirecting to
 * the wrong page, one whose TLS certificate no browser will accept — and seven
 * more properties had a working official site that had never been found. See
 * src/data/stay-websites.ts for what was checked and what failed.
 */
export const curatedStays: CuratedStay[] = (generated.properties as CuratedStay[]).map((stay) =>
  stay.slug in VERIFIED_WEBSITES
    ? {
        ...stay,
        officialWebsite: VERIFIED_WEBSITES[stay.slug] ?? null,
        websiteNote: WEBSITE_NOTES[stay.slug] ?? stay.websiteNote,
      }
    : stay,
);

/** Grades in the order the department lists them, highest first. */
export const STAR_GRADES: StarGrade[] = [
  "5-Star(Deluxe)",
  "5-Star",
  "4-Star",
  "3-Star",
  "2-Star",
];

/**
 * Districts, in the order a visitor orients by.
 *
 * The register writes the district names Sikkim actually uses today. In 2021
 * the state reorganised: East became Gangtok district, West was split into
 * Gyalshing and the new Soreng, North became Mangan and South became Namchi.
 * Almost every guidebook, and every visitor who has read one, still thinks in
 * the four cardinal names — so both are shown. The current name is what the
 * register says and what a permit or an address will use; the former name is
 * what makes the map legible to someone who has not been here.
 *
 * Nothing is invented: this is the 2021 notification's own mapping, and the
 * headquarters is the district's namesake town.
 */
export interface DistrictMeta {
  /** As the register writes it. */
  name: string;
  /** The pre-2021 name a visitor is likely to recognise. */
  formerName: string;
  region: "East" | "West" | "North" | "South";
}

export const DISTRICT_META: DistrictMeta[] = [
  { name: "Gangtok", formerName: "East Sikkim", region: "East" },
  { name: "Gyalshing", formerName: "West Sikkim", region: "West" },
  { name: "Soreng", formerName: "West Sikkim", region: "West" },
  { name: "Mangan", formerName: "North Sikkim", region: "North" },
  { name: "Namchi", formerName: "South Sikkim", region: "South" },
];

/**
 * Districts that actually hold a graded property, in cardinal order.
 *
 * Driven off the data rather than off the list above, so a district with no
 * graded stay never renders an empty section, and a district that appears in
 * the register but not in DISTRICT_META is still shown rather than silently
 * dropped.
 */
export interface DistrictGroup extends DistrictMeta {
  slug: string;
  stays: CuratedStay[];
}

/**
 * The properties the public Stays page shows.
 *
 * WHY THIS IS A FILTER AND NOT A DELETION
 * ---------------------------------------
 * A tourist-facing directory card that says "Photograph unavailable" is a
 * confession, not a product. It tells a visitor the archive could not do its
 * job, and repeated thirteen times down a page it is the loudest thing on the
 * screen. So the public page now shows a property only if a photograph of that
 * property has been verified.
 *
 * Nothing is deleted to achieve that. The 905-property government register
 * stays whole in src/data/hotels.ts, all 22 state-graded properties stay whole
 * in `curatedStays` above, and every hidden property keeps its page at
 * /stays/[slug] — reachable by anyone with the link, and still in the sitemap,
 * because the register entry is public information worth publishing. What
 * changes is only which cards a visitor browsing districts is shown.
 *
 * The gate is `hasVerifiedImage`, which reads the image's own `verified` flag
 * rather than inferring anything from array length or position.
 */
export const publicStays: CuratedStay[] = curatedStays
  .filter((stay) => hasVerifiedImage(stay.slug))
  .map((stay) =>
    /* A property with verified coordinates keeps its pin; only name searches
       are sharpened. See src/data/stay-maps.ts. */
    stay.mapsIsExact
      ? stay
      : {
          ...stay,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            mapsQuery(stay.slug, stay.name, stay.district),
          )}`,
        },
  );

export const HIDDEN_STAYS: CuratedStay[] = curatedStays.filter(
  (stay) => !hasVerifiedImage(stay.slug),
);

export const STAYS_BY_DISTRICT: DistrictGroup[] = (() => {
  const present = [...new Set(publicStays.map((s) => s.district))];
  const ordered = [
    ...DISTRICT_META.filter((d) => present.includes(d.name)),
    ...present
      .filter((name) => !DISTRICT_META.some((d) => d.name === name))
      .map((name) => ({ name, formerName: name, region: "East" as const })),
  ];
  return ordered.map((district) => ({
    ...district,
    slug: district.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    stays: publicStays
      .filter((s) => s.district === district.name)
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
  }));
  /* A district with nothing to show is not rendered as an empty shelf. */
})().filter((group) => group.stays.length > 0);

export const CURATED_DISTRICTS = [...new Set(curatedStays.map((s) => s.district))].sort();

export function getCuratedStay(slug: string): CuratedStay | undefined {
  return curatedStays.find((s) => s.slug === slug);
}

export const PUBLIC_STATS = {
  total: publicStays.length,
  districts: [...new Set(publicStays.map((s) => s.district))].length,
  withPhone: publicStays.filter((s) => s.phone).length,
  withWebsite: publicStays.filter((s) => s.officialWebsite).length,
  hidden: HIDDEN_STAYS.length,
} as const;

export const CURATED_STATS = {
  total: curatedStays.length,
  withPhone: curatedStays.filter((s) => s.phone).length,
  withWebsite: curatedStays.filter((s) => s.officialWebsite).length,
  withCoordinates: curatedStays.filter((s) => s.latitude !== null).length,
  crossVerified: curatedStays.filter((s) => s.verificationStatus === "cross-verified").length,
  districts: CURATED_DISTRICTS.length,
  generatedAt: generated.generatedAt.slice(0, 10),
} as const;

export const CURATED_PROVENANCE: Provenance = {
  sourceId: "sikkim-tourism-registered-hotels",
  sourceUrl: "https://sikkimtourism.gov.in/registered-establishments/hotels",
  verifiedAt: generated.generatedAt.slice(0, 10),
  confidence: "high",
};
