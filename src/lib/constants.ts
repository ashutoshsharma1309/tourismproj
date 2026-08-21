import type { AccommodationTier } from "@/types";

export const SITE = {
  name: "Sikkim Darshan",
  /*
   * `tagline` is the hero headline, so it has to carry the proposition, not the
   * slogan. `motto` is the slogan. Keeping them separate is what lets the first
   * viewport say what the product does while the brand line still appears.
   */
  tagline: "Digitizing the Sacred Heritage of Sikkim",
  motto: "Discover. Experience. Preserve.",
  /*
   * This described the product as somewhere you could "walk centuries-old
   * monasteries in 360°". No 360° sphere of any Sikkim monastery exists in any
   * openly licensed collection — 35 sites were swept to establish that, and the
   * negative is published on /preservation. The site's own meta description was
   * the last place still making the claim, and it was the first thing a search
   * result or a shared link showed. It now describes what the archive holds.
   */
  description:
    "A sourced digital archive of Sikkim's monasteries — 15 catalogued gompas with audio guides in twelve languages, 70 cultural stories, an interactive heritage map and a trip planner. Every claim traces to a named source.",
} as const;

/**
 * The origin this deployment serves from.
 *
 * WHY THIS IS MORE CAREFUL THAN IT LOOKS
 * --------------------------------------
 * This was `process.env.NEXT_PUBLIC_SITE_URL?.replace(...) ?? "http://localhost:3000"`,
 * and it broke the production build. `??` falls back only on null or undefined,
 * and Vercel passes a declared-but-unfilled variable as an EMPTY STRING — which
 * is neither. So the empty string sailed through the fallback and reached
 * `new URL("")` in the root layout, which throws ERR_INVALID_URL while Next is
 * collecting page data. The whole deploy failed on /_not-found with no obvious
 * connection to a metadata setting.
 *
 * Three defences now, because a build must not fail over a blank env var:
 *
 *   1. Anything blank or whitespace counts as unset, not as a value.
 *   2. Vercel's own origin is used when nothing is configured, which is
 *      correct for a preview or a production deploy and is what the previous
 *      localhost fallback got wrong even when it did fire.
 *   3. The value is parsed here, once, and falls back again if it will not
 *      parse — so a typo in the dashboard degrades a canonical URL rather
 *      than taking the site down.
 */
const LOCAL_ORIGIN = "http://localhost:3000";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();

  const candidate = configured
    ? configured.replace(/\/+$/, "")
    : vercel
      ? `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
      : LOCAL_ORIGIN;

  try {
    const parsed = new URL(candidate);
    /*
     * The protocol check is not decoration. `new URL("htps:/typo")` does not
     * throw — it parses as an exotic scheme, and `.origin` on a non-special
     * scheme returns the STRING "null", which then fails to parse everywhere
     * downstream. A mistyped scheme in the dashboard would have swapped one
     * build failure for a subtler one.
     */
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return LOCAL_ORIGIN;
    return parsed.origin;
  } catch {
    return LOCAL_ORIGIN;
  }
}

export const SITE_URL = resolveSiteUrl();

export const NAV_LINKS = [
  { href: "/monasteries", label: "Monasteries" },
  { href: "/stories", label: "Stories" },
  { href: "/culture", label: "Culture" },
  { href: "/history", label: "History" },
  { href: "/archive", label: "Archive" },
  { href: "/explore", label: "Explore" },
  { href: "/hotels", label: "Stays" },
  { href: "/planner", label: "Plan" },
  { href: "/permits", label: "Permits" },
  { href: "/responsible", label: "Responsible" },
  { href: "/preservation", label: "Preserve" },
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
