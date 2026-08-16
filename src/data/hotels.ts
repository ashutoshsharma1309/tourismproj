import { googleMapsSearchUrl } from "@/data/monasteries";
import type { Provenance } from "@/data/sources";
import type { AccommodationTier, SikkimDistrict } from "@/types";

/**
 * Registered stays — DIRECTORY ONLY (§17, §64).
 *
 * These are real, named Sikkim properties, but this project has no licensed
 * feed for their tariffs, ratings, review counts, room inventories or precise
 * coordinates. Everything that was previously shown for them — prices, star
 * ratings, review counts, guest reviews, room types, amenity lists, gallery
 * photographs of unrelated hotels abroad — was invented and has been removed.
 *
 * What remains is what can be stated honestly: the property exists, it is in
 * this district, and here is a Google Maps search that resolves to it.
 * Restoring commercial detail requires a licensed Places/booking integration.
 */

export interface StayDirectoryEntry {
  slug: string;
  name: string;
  district: SikkimDistrict;
  /** Star tier as commonly advertised — indicative only, not an audited grade. */
  tier: AccommodationTier;
  googleMapsUrl: string;
  provenance: Provenance;
}

const UNVERIFIED: Provenance = {
  sourceId: "internal",
  verifiedAt: "2026-08-14",
  confidence: "unverified",
  caveat:
    "Property name and district only. Tariffs, ratings and availability are not sourced and are deliberately not shown.",
};

const DIRECTORY: Array<[string, string, SikkimDistrict, AccommodationTier]> = [
  ["mayfair-spa-resort", "Mayfair Spa Resort & Casino", "Gangtok", "5-star"],
  ["elgin-nor-khill", "The Elgin Nor-Khill", "Gangtok", "5-star"],
  ["denzong-regency", "Denzong Regency", "Gangtok", "4-star"],
  ["lemon-tree-gangtok", "Lemon Tree Hotel Gangtok", "Gangtok", "4-star"],
  ["summit-golden-crescent", "Summit Golden Crescent Resort", "Gangtok", "3-star"],
  ["hotel-tashi-delek", "Hotel Tashi Delek", "Gangtok", "3-star"],
  ["udaan-woodberry", "Udaan Woodberry Hotel & Spa", "Gangtok", "3-star"],
  ["hotel-sonam-delek", "Hotel Sonam Delek", "Gangtok", "budget"],
  ["mintokling-guest-house", "Mintokling Guest House", "Gangtok", "budget"],
  ["zostel-gangtok", "Zostel Gangtok", "Gangtok", "budget"],
  ["elgin-mount-pandim", "The Elgin Mount Pandim", "Gyalshing", "4-star"],
  ["summit-newa-regency", "Summit Newa Regency & Spa", "Gyalshing", "3-star"],
  ["hotel-garuda-pelling", "Hotel Garuda", "Gyalshing", "budget"],
  ["norbu-ghang-resort", "Norbu Ghang Resort", "Gyalshing", "3-star"],
  ["mount-narsing-resort", "Mount Narsing Village Resort", "Namchi", "budget"],
  ["summit-sobralia", "Summit Sobralia Resort & Spa", "Namchi", "4-star"],
  ["yarlam-resort", "Yarlam Resort", "Mangan", "4-star"],
  ["summit-alpine-lachung", "Summit Alpine Resort", "Mangan", "3-star"],
  ["apple-orchard-lachen", "The Apple Orchard Resort", "Mangan", "3-star"],
  ["bamboo-retreat-rumtek", "Bamboo Retreat", "Gangtok", "3-star"],
];

export const hotels: StayDirectoryEntry[] = DIRECTORY.map(([slug, name, district, tier]) => ({
  slug,
  name,
  district,
  tier,
  googleMapsUrl: googleMapsSearchUrl(name, district),
  provenance: UNVERIFIED,
}));

export function getHotelBySlug(slug: string): StayDirectoryEntry | undefined {
  return hotels.find((hotel) => hotel.slug === slug);
}
