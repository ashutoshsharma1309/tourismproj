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
  tagline: "Verified tourism knowledge, one destination at a time",
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
    "Tourism knowledge you can check. Fifteen destinations, each opening into its places, history, culture and experiences, with every claim traced to a named source and every gap stated rather than filled.",
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
 * What replaced them is not fewer links, it is the right ones: the navbar now
 * appends the CURRENT destination's sections, derived from its content by
 * `destinationNavMap()`. On Sikkim that restores every link that used to be
 * here, and on Paris it lists Paris's four. Nothing lost, thirteen
 * destinations fixed.
 */
export const NAV_LINKS: NavLink[] = [
  /*
   * WHAT THE PRODUCT DOES, NAMED.
   *
   * Three links — Discover, Destinations, Compare — described the product to
   * somebody who already knew what it was. Stories, History and Plan are the
   * three things a visitor actually comes for, and all three existed only
   * inside a destination: there was no answer to "show me the stories" that
   * did not first require choosing a city. The global index pages exist now,
   * so the navigation can name them.
   *
   * "Explore" is deliberately NOT a separate entry. It would have pointed at
   * /destinations, which is already here under its own name, and a menu with
   * two words for one page teaches a visitor that the words do not mean
   * anything.
   *
   * `prefetch: false` on the routes that read searchParams: they are
   * dynamic, and Next issues then ABORTS a prefetch for them — measured as
   * two `net::ERR_ABORTED` requests on every page in the site.
   */
  { href: "/destinations", label: "Destinations" },
  { href: "/discover", label: "Discover", prefetch: false },
  { href: "/stories", label: "Stories" },
  { href: "/history", label: "History" },
  { href: "/plan", label: "Plan" },
  /*
   * Coverage comparison was reachable only from a link partway down
   * /destinations, which made the one page that answers "how much do you
   * actually know about these places?" the hardest one to find.
   */
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
