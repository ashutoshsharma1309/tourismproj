import generated from "@/data/generated/registered-hotels.json";
import { googleMapsSearchUrl } from "@/data/monasteries";
import type { Provenance } from "@/data/sources";
import type { SikkimDistrict } from "@/types";

/**
 * Registered stays, from the state register.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * This file used to hold twenty properties typed in by hand, each carrying a
 * star tier and a provenance of `sourceId: "internal"` with
 * `confidence: "unverified"` — meaning the directory asserted a commercial
 * grade for every property while pointing at no source at all.
 *
 * The Tourism & Civil Aviation Department publishes the actual register of
 * hotels licensed to operate in Sikkim. Reading it changed the picture twice
 * over:
 *
 *   - It holds 907 entries, 905 of them named. The hand-typed list was 20.
 *   - It records a star category for only 22 of those 905. The hand-typed list
 *     assigned a tier to all 20 of its properties, and where both could be
 *     compared the two disagreed on twelve of fourteen.
 *
 * So the tier is gone. What ships instead is what the department actually
 * publishes: the property is on the register, here is its registration number,
 * its district, and its licence validity. A star rating the state does not
 * record is not this project's to invent — which is the same rule that removed
 * the tariffs and guest reviews from this page in the first place.
 *
 * Refresh with `npm run ingest:tourism`.
 */

export interface StayDirectoryEntry {
  slug: string;
  name: string;
  district: SikkimDistrict;
  /** Street address as the register records it. Null where it records none. */
  address: string | null;
  /**
   * Star category, only where the department records one — 22 of 905. Null is
   * the normal case and means "the register states no category", not "unrated".
   */
  category: string | null;
  /** Departmental registration number. Every entry on the register has one. */
  registrationNo: string | null;
  /** Licence validity as printed. Null where the register leaves it blank. */
  validUpto: string | null;
  googleMapsUrl: string;
  provenance: Provenance;
}

interface GeneratedHotel {
  slug: string;
  name: string;
  district: string;
  address: string | null;
  category: string | null;
  registrationNo: string | null;
  contact: string | null;
  validUpto: string | null;
}

const DISTRICTS: SikkimDistrict[] = [
  "Gangtok",
  "Mangan",
  "Namchi",
  "Gyalshing",
  "Pakyong",
  "Soreng",
];

/** The register uses the six current district names; anything else is dropped. */
function asDistrict(value: string): SikkimDistrict | null {
  return DISTRICTS.find((d) => d.toLowerCase() === value.trim().toLowerCase()) ?? null;
}

const REGISTER = generated.hotels as GeneratedHotel[];

export const hotels: StayDirectoryEntry[] = REGISTER.flatMap((entry) => {
  const district = asDistrict(entry.district);
  if (!district) return [];
  return [
    {
      slug: entry.slug,
      name: entry.name,
      district,
      address: entry.address,
      category: entry.category,
      registrationNo: entry.registrationNo,
      validUpto: entry.validUpto,
      googleMapsUrl: googleMapsSearchUrl(entry.name, district),
      provenance: {
        sourceId: "sikkim-tourism-registered-hotels",
        sourceUrl: generated.source.url,
        verifiedAt: generated.retrievedAt,
        confidence: "high",
        caveat:
          entry.category === null
            ? "On the state register of hotels. The department records no star category for this property, so none is shown."
            : "On the state register of hotels, with the star category the department records.",
      },
    },
  ];
});

/** What the department itself reported as the register's size, for the UI. */
export const REGISTER_STATS = {
  published: hotels.length,
  reportedTotal: generated.reportedTotal ?? null,
  withCategory: hotels.filter((h) => h.category !== null).length,
  retrievedAt: generated.retrievedAt,
  sourceUrl: generated.source.url,
} as const;
