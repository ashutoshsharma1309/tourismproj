import type { Provenance } from "@/data/sources";

/**
 * Domain model for Ney Heritage.
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
   SIKKIM DOMAIN — Ney Heritage
   Shapes mirror the Supabase tables in /supabase; the landing page reads
   `tourism_stats` live and falls back to constants when no client exists.
   ========================================================================= */

/** Sikkim's six districts (post-2021 names). */
export type SikkimDistrict =
  | "Gangtok"
  | "Mangan"
  | "Namchi"
  | "Gyalshing"
  | "Pakyong"
  | "Soreng";

export type MonasteryTradition = "Nyingma" | "Kagyu" | "Karma Kagyu" | "Zurmang Kagyu";

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

/** 360 tour availability. Never assumed — see src/data/monasteries.ts. */
export type TourAvailability =
  | { available: false }
  | { available: true; provider: string; sourceUrl: string; verifiedAt: string; scenes: TourScene[] };

export interface TourHotspot {
  pitch: number;
  yaw: number;
  title: string;
  description: string;
}

export interface TourScene {
  id: string;
  title: string;
  /** Equirectangular (2:1) image genuinely captured at this site. */
  image: string;
  hotspots: TourHotspot[];
}

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
  /** Whole-trip budget per person, INR. */
  budget: number;
  /** Days, 3–14. */
  duration: number;
  travelStyle: PlannerStyle;
  startDate?: string;
  specialRequests?: string;
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
}

export interface GeneratedItinerary {
  name: string;
  days: number;
  nights: number;
  travelStyle: PlannerStyle;
  interests: PlannerInterest[];
  dayPlans: ItineraryDayPlan[];
  cost: ItineraryCostBreakdown;
}

