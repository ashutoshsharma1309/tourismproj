import type { AccommodationTier } from "@/types";

export const SITE = {
  name: "Ney Heritage",
  tagline: "Digitizing the Sacred Heritage of Sikkim",
  motto: "Explore. Experience. Preserve.",
  description:
    "A digital cultural heritage platform for Sikkim — walk centuries-old monasteries in 360°, read their stories, plan a heritage journey and help preserve what the mountains hold.",
} as const;

export const NAV_LINKS = [
  { href: "/monasteries", label: "Monasteries" },
  { href: "/stories", label: "Stories" },
  { href: "/#map", label: "Map" },
  { href: "/hotels", label: "Stays" },
  { href: "/planner", label: "Plan Journey" },
  { href: "/preservation", label: "Preservation" },
] as const;

/* =========================================================================
   LANDING PAGE — stats fallback, testimonials, ambience
   ========================================================================= */



/**
 * Ambient sound layers — freely licensed recordings on Wikimedia Commons,
 * muted by default. A Buddhist chant layer is intentionally absent: Commons
 * has no suitably licensed recording, and substituting unrelated audio would
 * be worse than silence.
 */
export const AMBIENT_SOUNDS = [
  {
    id: "bowl",
    name: "Singing bowl",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/70/The_sound_of_a_singing_bowl.wav",
    defaultVolume: 0.5,
  },
  {
    id: "wind",
    name: "Mountain wind",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/11/20221229_-_Abisko_Turiststation_at_night_-_Wind_and_snow.wav",
    defaultVolume: 0.3,
  },
] as const;

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
