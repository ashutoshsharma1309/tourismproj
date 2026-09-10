import type { PanoramaProjection } from "@/data/panoramas";
import type { Provenance } from "@/data/sources";

/**
 * Domain model for Sikkim Darshan.
 *
 * Only shapes with verified data behind them remain. Types for hotel tariffs,
 * room inventories, guest reviews, bookings and the TSD ledger were removed
 * with the fabricated data they described.
 */

export type AccommodationTier = "budget" | "3-star" | "4-star" | "5-star";

export interface Coordinates {
  lat: number;
  lng: number;
}

/* =========================================================================
   SIKKIM DOMAIN — Sikkim Darshan
   Shapes mirror the Supabase tables in /supabase; the landing page reads
   `tourism_stats` live and falls back to constants when no client exists.
   ========================================================================= */

/**
 * Sikkim's six districts (post-2021 names).
 *
 * PHASE 2 — this is now a TUPLE, and the union is derived from it.
 *
 * The union used to be hand-written here, and the *list* of districts was
 * then re-typed by hand in four other places: MonasteriesExplorer's filter,
 * capacity.ts, archive.ts and hotels.ts each declared their own
 * `SikkimDistrict[]`. Four copies of one fact is four chances to drift, and
 * adding a district meant finding all of them.
 *
 * Exporting the tuple makes the vocabulary quotable: every consumer imports
 * SIKKIM_DISTRICTS instead of retyping it, and `SikkimDistrict` stays exactly
 * the union it always was, so no existing code has to change.
 *
 * This is also the seam to the destination model. Sikkim's Destination record
 * (@/data/destinations/sikkim) builds its `divisions` from this tuple, so the
 * generic architecture and the Sikkim domain type cannot disagree about which
 * districts exist. A second destination declares its own divisions the same
 * way, in its own record, with its own vocabulary — Kyoto's are wards, not
 * districts, and nothing here forces it to pretend otherwise.
 */
export const SIKKIM_DISTRICTS = [
  "Gangtok",
  "Mangan",
  "Namchi",
  "Gyalshing",
  "Pakyong",
  "Soreng",
] as const;

export type SikkimDistrict = (typeof SIKKIM_DISTRICTS)[number];

/**
 * The lineages represented among Sikkim's catalogued gompas.
 *
 * Kept as a domain concept, not dissolved into something generic: the
 * tradition of a monastery is genuinely meaningful and is rendered as a
 * filter and a chip. Under the destination model it becomes one of Sikkim's
 * declared taxonomies rather than a constraint every destination inherits —
 * Rome has no use for "Zurmang Kagyu", and should not carry the type.
 */
export const MONASTERY_TRADITIONS = [
  "Nyingma",
  "Kagyu",
  "Karma Kagyu",
  "Zurmang Kagyu",
] as const;

export type MonasteryTradition = (typeof MONASTERY_TRADITIONS)[number];

export interface Monastery {
  id: string;
  slug: string;
  name: string;
  district: SikkimDistrict;
  tradition: MonasteryTradition;
  establishedYear: number;
  description: string;
  image: string;
}

/* =========================================================================
   PHASE 2 — hotels & booking
   ========================================================================= */

/* =========================================================================
   PHASE 2 — monastery experience
   ========================================================================= */

/**
 * Immersive capture availability. Never assumed, and never hand-set on a
 * record: `src/data/monasteries.ts` derives this from `src/data/panoramas.ts`,
 * so publishing a capture is a one-record change and the coverage dashboard
 * cannot drift from what a visitor is actually shown.
 *
 * The projection travels with the flag on purpose. A record being available
 * does not license the word "360°" — only an `equirectangular` or
 * `street-view` capture does, and a `flat-panorama` must be called a panorama.
 */
export type TourAvailability =
  | { available: false }
  | {
      available: true;
      projection: PanoramaProjection;
      provider: string;
      sourceUrl: string;
      verifiedAt: string;
    };

/** Audio guide availability, per language. */
export type AudioAvailability =
  | { available: false }
  | { available: true; languages: string[]; transcriptUrl?: string };

/** A monastery record. Only fields backed by a cited source are present. */
/**
 * Visiting hours. Sikkim Tourism publishes none, and aggregator reports
 * contradict each other, so the model distinguishes an official schedule from
 * an unverified report and can also say plainly that nothing is known.
 */
export type VisitingHours =
  | { status: "official"; summary: string; provenance: Provenance }
  | { status: "reported"; summary: string; provenance: Provenance }
  | { status: "unpublished"; provenance: Provenance };

export interface MonasteryDetails {
  id: string;
  slug: string;
  name: string;
  district: SikkimDistrict;
  tradition: MonasteryTradition;
  establishedYear: number;
  description: string;
  image: string;
  imageSource: string;
  /** Paragraphs. */
  history: string[];
  significance: string;
  architecture: string;
  /** Absent when no authoritative coordinate exists — the site is then unplotted. */
  coordinates?: Coordinates;
  googleMapsUrl: string;
  provenance: Provenance;
  tour: TourAvailability;
  audio: AudioAvailability;
  visitingHours: VisitingHours;
}

/* =========================================================================
   PHASE 2 — trip planner
   ========================================================================= */

export type PlannerInterest =
  | "Monasteries"
  | "Trekking"
  | "Lakes"
  | "Culture"
  | "Food"
  | "Adventure";

export type PlannerStyle = "Solo" | "Couple" | "Family" | "Group" | "Luxury" | "Budget";

export interface PlannerPreferences {
  interests: PlannerInterest[];
  /** Days, 3–14. */
  duration: number;
  travelStyle: PlannerStyle;
  /**
   * How many people are going. Counted, not inferred.
   *
   * This used to be read off `travelStyle`: Solo meant one person and every
   * other style meant exactly two, so a family of five was quoted the entry fee
   * for two. The fee is statutory and printed to the rupee, which makes an
   * inferred headcount worse than no figure at all.
   */
  travellers: number;
  /**
   * Of those travellers, how many are under 5 — the age at which the state
   * exempts a visitor from the TSD fee. See TSD_EXEMPT_UNDER_AGE.
   */
  childrenUnderFive?: number;
  /** ISO date. Used to date the days; it does not change the route. */
  startDate?: string;
}

export interface ItineraryDayPlan {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  location: string;
  coordinates: Coordinates;
}

export interface ItineraryCostBreakdown {
  /** The statutory TSD entry fee — the only cost this project can state exactly. */
  tsd: number;
  /** Travellers the fee is charged for: everyone aged 5 and over. */
  chargeable: number;
  /** Travellers exempted because they are under 5. */
  exempt: number;
}

export interface GeneratedItinerary {
  name: string;
  days: number;
  nights: number;
  travelStyle: PlannerStyle;
  travellers: number;
  interests: PlannerInterest[];
  dayPlans: ItineraryDayPlan[];
  cost: ItineraryCostBreakdown;
  /** The bases, in order, with how many nights each — the route in one line. */
  stops: { location: string; days: number }[];
}

