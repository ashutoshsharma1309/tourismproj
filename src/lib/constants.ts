import type {
  AccommodationTier,
  DestinationCategory,
  Interest,
  TravelStyle,
} from "@/types";

export const SITE = {
  name: "Yatra AI",
  tagline: "Travel smarter. Experience more.",
  description:
    "Plan a trip across India in minutes. Yatra AI turns your dates, budget and interests into a day-by-day itinerary you can actually follow.",
} as const;

export const NAV_LINKS = [
  { href: "/destinations", label: "Destinations" },
  { href: "/planner", label: "Plan a trip" },
  { href: "/explore", label: "Explore in 3D" },
] as const;

export const DESTINATION_CATEGORIES: readonly DestinationCategory[] = [
  "Heritage",
  "Beach",
  "Mountains",
  "Adventure",
  "Food",
  "Culture",
  "Nature",
  "Spiritual",
];

export const INTERESTS: readonly Interest[] = [
  "History",
  "Food",
  "Culture",
  "Nature",
  "Shopping",
  "Architecture",
  "Adventure",
  "Nightlife",
  "Photography",
];

interface OptionMeta<T> {
  value: T;
  label: string;
  description: string;
}

export const ACCOMMODATION_TIERS: readonly OptionMeta<AccommodationTier>[] = [
  {
    value: "budget",
    label: "Budget",
    description: "Hostels and guesthouses, ₹800–2,000 a night",
  },
  {
    value: "3-star",
    label: "3 Star",
    description: "Clean, central, no frills, ₹2,500–4,500 a night",
  },
  {
    value: "4-star",
    label: "4 Star",
    description: "Full service with a pool, ₹5,000–9,000 a night",
  },
  {
    value: "5-star",
    label: "5 Star",
    description: "Heritage and luxury properties, ₹12,000+ a night",
  },
];

export const TRAVEL_STYLES: readonly OptionMeta<TravelStyle>[] = [
  {
    value: "relaxed",
    label: "Relaxed",
    description: "Two stops a day, long lunches, no alarms",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Three or four stops with breathing room between them",
  },
  {
    value: "fast-paced",
    label: "Fast-paced",
    description: "Early starts and five or more stops a day",
  },
  {
    value: "luxury",
    label: "Luxury",
    description: "Private transport, premium stays, skip-the-line entry",
  },
  {
    value: "budget",
    label: "Budget",
    description: "Public transport, street food, free-entry sights first",
  },
];

/** Planner budget slider, per person for the whole trip. */
export const BUDGET_RANGE = {
  min: 5_000,
  max: 200_000,
  step: 2_500,
  default: 30_000,
} as const;

export const TRIP_LENGTH_RANGE = {
  min: 1,
  max: 21,
  default: 4,
} as const;

export const TRAVELLERS_RANGE = {
  min: 1,
  max: 12,
  default: 2,
} as const;
