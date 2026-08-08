/**
 * Domain model for Yatra AI.
 *
 * These types are the contract between the UI and the data layer. Phase 1 fills
 * them from `src/data`; later phases will fill the same shapes from the API or
 * database without touching component code.
 */

export type DestinationCategory =
  | "Heritage"
  | "Beach"
  | "Mountains"
  | "Adventure"
  | "Food"
  | "Culture"
  | "Nature"
  | "Spiritual";

export type AttractionCategory =
  | "Monument"
  | "Museum"
  | "Market"
  | "Temple"
  | "Park"
  | "Viewpoint"
  | "Neighbourhood"
  | "Beach";

export type ExperienceCategory =
  | "Food"
  | "Culture"
  | "Heritage"
  | "Shopping"
  | "Adventure"
  | "Nature"
  | "Nightlife";

export type AccommodationTier = "budget" | "3-star" | "4-star" | "5-star";

export type TravelStyle = "relaxed" | "balanced" | "fast-paced" | "luxury" | "budget";

export type Interest =
  | "History"
  | "Food"
  | "Culture"
  | "Nature"
  | "Shopping"
  | "Architecture"
  | "Adventure"
  | "Nightlife"
  | "Photography";

/** Crowd pressure is displayed in Phase 1 and predicted by a model in Phase 4. */
export type CrowdLevel = "low" | "moderate" | "high";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  state: string;
  country: string;
  /** One line, used on cards and in search results. */
  tagline: string;
  /** Two to three sentences, used on the detail page. */
  description: string;
  image: string;
  /** Extra photography for the detail-page gallery. */
  gallery: string[];
  rating: number;
  reviewCount: number;
  categories: DestinationCategory[];
  coordinates: Coordinates;
  /** Indicative per-person daily spend in INR, mid-tier. */
  averageDailyCost: number;
  bestSeason: string;
  idealDays: number;
  featured: boolean;
  popularityRank: number;
}

export interface Attraction {
  id: string;
  slug: string;
  destinationSlug: string;
  name: string;
  category: AttractionCategory;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  /** Typical visit length in minutes. */
  durationMinutes: number;
  /** Entry fee per person in INR. 0 means free. */
  entryFee: number;
  coordinates: Coordinates;
  crowdLevel: CrowdLevel;
  bestTimeToVisit: string;
}

export interface Hotel {
  id: string;
  slug: string;
  destinationSlug: string;
  name: string;
  tier: AccommodationTier;
  area: string;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  /** Per night, per room, in INR. */
  pricePerNight: number;
  amenities: string[];
  distanceFromCentreKm: number;
}

export interface Experience {
  id: string;
  slug: string;
  destinationSlug: string;
  title: string;
  category: ExperienceCategory;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  durationMinutes: number;
  /** Per person, in INR. */
  price: number;
  host: string;
}

export interface ItineraryItem {
  id: string;
  /** 24-hour clock, e.g. "09:30". Rendered on the timetable rail. */
  time: string;
  title: string;
  /** What kind of stop this is — shown as a badge. */
  category: AttractionCategory | ExperienceCategory | "Travel" | "Meal" | "Rest";
  description: string;
  durationMinutes: number;
  /** Estimated cost for the whole party, in INR. */
  cost: number;
  attractionSlug?: string;
  crowdLevel?: CrowdLevel;
}

export interface ItineraryDay {
  day: number;
  /** Short editorial title, e.g. "Old Delhi, on foot". */
  title: string;
  summary: string;
  items: ItineraryItem[];
}

export interface CostBreakdown {
  stay: number;
  activities: number;
  food: number;
  transport: number;
}

export interface Trip {
  id: string;
  destinationSlug: string;
  destinationName: string;
  startDate: string;
  endDate: string;
  days: number;
  travellers: number;
  accommodationTier: AccommodationTier;
  travelStyle: TravelStyle;
  interests: Interest[];
  /** Total for the whole party, in INR. */
  estimatedCost: number;
  costBreakdown: CostBreakdown;
  itinerary: ItineraryDay[];
  coverImage: string;
}

/** Everything the planner collects before a trip is generated. */
export interface TripDraft {
  destinationSlug: string | null;
  startDate: string;
  days: number;
  travellers: number;
  accommodationTier: AccommodationTier;
  travelStyle: TravelStyle;
  budgetPerPerson: number;
  interests: Interest[];
}
