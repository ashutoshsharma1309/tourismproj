import { listDestinations } from "@/lib/destinations/registry";
import { resolveDestinationOrNull } from "@/lib/destinations/resolve";
import { CAPABILITY_SECTION } from "@/lib/destinations/sections";
import type { DestinationCapability } from "@/types/destination";

/**
 * The sections each destination actually has, for the navigation bar.
 *
 * WHY THIS EXISTS
 * ---------------
 * The primary navigation was a list of thirteen hard-coded links, twelve of
 * which pointed at `/destinations/sikkim/...`. They were rendered on every
 * page of the product, so a visitor reading about Paris was offered
 * "Monasteries", "Stays", "Trade" and "Permits" — four Sikkim routes — and a
 * header that said Sikkim Darshan above them. Phase 16 recorded that as the
 * first thing to fix after the freeze and it was still there in Phase 19.
 *
 * The fix is not a shorter list, it is a list that knows where the visitor is.
 * The sections a destination has are already derived from its content by
 * `resolveCapabilities`, and the route each capability owns is already stated
 * once in `CAPABILITY_SECTION`. This joins the two and hands the result to the
 * navbar, so no component decides what a destination offers and no link is
 * ever offered to a page that does not exist.
 *
 * WHAT IT COSTS
 * -------------
 * The map is built on the server and serialised into the navbar's props, so it
 * reaches the client once per page. Measured at roughly 2.5 KB across fifteen
 * destinations — Sikkim carries most of it, and the twelve capsules carry four
 * entries each. That is the price of navigation that is correct on fourteen
 * destinations instead of one, and it buys back more than it costs: the twelve
 * Sikkim links are no longer rendered on the other fourteen destinations'
 * pages.
 */

/**
 * What each section is called in navigation.
 *
 * These are the visitor-facing names, and they are deliberately the same words
 * the destination hub's "Explore" grid uses. A capability with no entry here
 * gets no navigation link, the same way a capability with no entry in
 * `CAPABILITY_SECTION` gets no route.
 */
const SECTION_LABEL: Partial<Record<DestinationCapability, string>> = {
  /* "Experiences", not "Discover": the product's own /discover is already in
     the bar, and two adjacent links both reading "Discover" — one global, one
     scoped — is the kind of thing that makes a nav feel unfinished. This is
     also the word the hub's Explore grid uses for the same route. */
  experiences: "Experiences",
  sites: "Monasteries",
  storyPages: "Stories",
  historyPages: "History",
  culture: "Culture",
  archive: "Archive",
  map: "Map",
  stays: "Stays",
  trade: "Trade",
  permits: "Permits",
  responsible: "Responsible",
  preservation: "Preserve",
  tripPlanner: "Planner",
};

/** The order sections appear in, which is the order a visitor meets them. */
const SECTION_ORDER: DestinationCapability[] = [
  "experiences",
  "sites",
  "storyPages",
  "historyPages",
  "culture",
  "archive",
  "map",
  "stays",
  "tripPlanner",
  "trade",
  "permits",
  "responsible",
  "preservation",
];

export interface DestinationNavSection {
  label: string;
  href: string;
}

export type DestinationNavMap = Record<string, DestinationNavSection[]>;

/**
 * Every destination's sections, keyed by id.
 *
 * A destination with no sections is present with an empty array rather than
 * absent — the navbar needs to tell "this destination has nothing to list"
 * apart from "this is not a destination", and rendering nothing is the correct
 * answer to the first.
 */
export async function destinationNavMap(): Promise<DestinationNavMap> {
  const entries = await Promise.all(
    listDestinations().map(async (destination) => {
      const resolved = await resolveDestinationOrNull(destination.id);
      const held = resolved?.capabilities;
      const sections: DestinationNavSection[] = [];
      for (const capability of SECTION_ORDER) {
        if (!held?.[capability]) continue;
        const label = SECTION_LABEL[capability];
        const [segment] = CAPABILITY_SECTION[capability] ?? [];
        if (!label || !segment) continue;
        sections.push({ label, href: `/destinations/${destination.id}/${segment}` });
      }
      return [destination.id, sections] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export { destinationIdFromPath } from "@/lib/destinations/nav-path";
