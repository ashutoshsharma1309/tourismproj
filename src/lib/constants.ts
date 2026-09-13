import type { AccommodationTier } from "@/types";

/**
 * The platform, and the archive inside it.
 *
 * PHASE 20 SPLIT THESE APART. `SITE.name` was "Sikkim Darshan", and it is the
 * string in the header, the footer, `og:site_name` and every JSON-LD block —
 * so Paris, Rome and Istanbul were all served inside chrome that named a
 * different destination and described itself as "Digitizing the Sacred
 * Heritage of Sikkim". Phase 16 logged that as the first post-freeze fix and
 * it was still open.
 *
 * The product is TerraStory. Sikkim Darshan is the name of the deep archive
 * TerraStory was built around, and it keeps that name on its own pages —
 * `SITE.archive` exists so the landing page and Sikkim's hub can say it
 * without the whole platform claiming it.
 */
export const SITE = {
  name: "TerraStory",
  /*
   * `tagline` is the hero headline, so it has to carry the proposition, not the
   * slogan. `motto` is the slogan. Keeping them separate is what lets the first
   * viewport say what the product does while the brand line still appears.
   */
  /*
   * Plain words a first-time visitor can act on. The previous line —
   * "Verified tourism knowledge, one destination at a time" — described the
   * method and never said WHERE. A newcomer could not answer "what is this?"
   * from the first viewport, which a UX audit recorded as the top finding.
   */
  tagline: "Cultural tourism and heritage discovery for India",
  motto: "Discover. Experience. Preserve.",
  /**
   * The Sikkim archive's own identity, used on the pages that ARE the Sikkim
   * archive — the landing page and Sikkim's hub. Nowhere else, because no
   * other destination is it.
   */
  archive: {
    name: "Sikkim Darshan",
    tagline: "Digitizing the Sacred Heritage of Sikkim",
  },
  /*
   * This described the product as somewhere you could "walk centuries-old
   * monasteries in 360°". No 360° sphere of any Sikkim monastery exists in any
   * openly licensed collection — 35 sites were swept to establish that, and the
   * negative is published on /preservation. The site's own meta description was
   * the last place still making the claim, and it was the first thing a search
   * result or a shared link showed. It now describes what the archive holds.
   */
  description:
    "Tourism knowledge you can check, across India. Every destination opens into its places, history, culture and experiences, with every claim traced to a named source and every gap stated rather than filled.",
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

/** A primary navigation entry. `prefetch: false` for dynamic routes. */
export interface NavLink {
  href: string;
  label: string;
  prefetch?: boolean;
}

/**
 * The links that belong to the PRODUCT rather than to a destination.
 *
 * PHASE 20 CUT THIS FROM FOURTEEN TO THREE. Twelve of the fourteen pointed at
 * `/destinations/sikkim/...` and were rendered on every page in the product,
 * so a visitor reading about Paris was offered Monasteries, Stays, Trade and
 * Permits — Sikkim's routes, under a header that also said Sikkim.
 *
 * For a while after that the navbar appended the CURRENT destination's
 * sections to these, derived from its content by `destinationNavMap()`. That
 * fixed the wrong-destination bug and created a ten-link header; the
 * sections now live on the destination hub itself and the header carries
 * only what is below.
 */
export const NAV_LINKS: NavLink[] = [
  /*
   * FOUR VERBS, NOT SIX NOUNS.
   *
   * The bar read "Destinations · Discover · Stories · History · Plan ·
   * Compare", and a first-time-user audit found that "Destinations" and
   * "Discover" were indistinguishable, and that Stories, History and Plan —
   * content categories and a secondary tool — competed as equals with the
   * one thing a newcomer has to do first, which is open a destination. On a
   * destination page five more section links were appended, for ten.
   *
   * What is here now is the visitor's own sequence: explore a place, get
   * matched to one, keep the ones you want, compare them. Stories, History
   * and Plan are still one click away — in the footer, and inside every
   * destination that has them — they just no longer share the header with
   * the primary action. The header is the same on every page; a
   * destination's own sections belong to its hub, not to the chrome.
   *
   * `prefetch: false` on the routes that read searchParams: they are
   * dynamic, and Next issues then ABORTS a prefetch for them — measured as
   * two `net::ERR_ABORTED` requests on every page in the site.
   */
  { href: "/destinations", label: "Explore" },
  { href: "/discover", label: "For you", prefetch: false },
  { href: "/journey", label: "Journey", prefetch: false },
  { href: "/destinations/compare", label: "Compare", prefetch: false },
];

/* =========================================================================
   LANDING PAGE — stats fallback, testimonials, ambience
   ========================================================================= */

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
