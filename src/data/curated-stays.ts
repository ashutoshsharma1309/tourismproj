import generated from "@/data/generated/curated-stays.json";
import type { Provenance } from "@/data/sources";

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

export const curatedStays = generated.properties as CuratedStay[];

/** Grades in the order the department lists them, highest first. */
export const STAR_GRADES: StarGrade[] = [
  "5-Star(Deluxe)",
  "5-Star",
  "4-Star",
  "3-Star",
  "2-Star",
];

export const CURATED_DISTRICTS = [...new Set(curatedStays.map((s) => s.district))].sort();

export function getCuratedStay(slug: string): CuratedStay | undefined {
  return curatedStays.find((s) => s.slug === slug);
}

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
