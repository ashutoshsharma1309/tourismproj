import { archiveItems } from "@/data/archive";
import { getDestination } from "@/lib/destinations/registry";
import { capsuleSearchGroups } from "@/lib/search-capsules";
import { CATEGORY_LABEL, getPublishedKnowledge, publishedDestinationIds } from "@/data/published-knowledge";
import { historyTimeline } from "@/data/history";
import { hotels } from "@/data/hotels";
import { monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { stories } from "@/data/stories";

/**
 * The ⌘K search index, built on the server.
 *
 * This used to be built inside the palette itself, which is a client component
 * mounted in the root layout. That meant `archiveItems`, `historyTimeline`,
 * `hotels`, `monasteries`, `places` and `stories` were all statically imported
 * into the client graph of *every* route — the full 70-story prose corpus and
 * the 77-item archive catalogue were in the JavaScript for /hotels, /planner
 * and /preservation, pages that show none of it. Two chunks totalling ~130 KB
 * gzipped rode along on every page load.
 *
 * The palette only ever reads four short strings per record. Building the index
 * here and passing it as a prop keeps the corpora on the server: what crosses
 * to the browser is the label, the sublabel, the href and the group.
 *
 * The icon travels as a name rather than a component, because a React component
 * is not serialisable across the server/client boundary. The palette maps the
 * name back to a Lucide icon.
 */

export type SearchIcon =
  | "landmark"
  | "book"
  | "scroll"
  | "image"
  | "mountain"
  | "bed"
  | "compass";

export type SearchGroup =
  | "Monasteries"
  | "Stories"
  | "History"
  | "Archive"
  | "Places"
  | "Stays"
  | "Go to";

export interface SearchItem {
  label: string;
  sublabel: string;
  href: string;
  group: SearchGroup;
  icon: SearchIcon;
}

/**
 * The index, grouped by the destination that owns each set of entries.
 *
 * PHASE 6. The index used to be one flat array of Sikkim content, which was
 * correct while Sikkim was the only destination and silently wrong the moment
 * it stopped being: a visitor exploring Kyoto searching "monastery" would
 * have been shown Rumtek as though it belonged there.
 *
 * Ownership is carried on the GROUP rather than repeated on every entry. The
 * palette's index is serialised into the HTML of every page — around 1,140
 * records, the single largest thing on a page — and stamping a
 * `destinationId` onto each one would have added roughly 25 KB to every
 * navigation to express a fact that is constant across a whole group. This
 * shape costs a few dozen bytes and says the same thing.
 *
 * `destinationId: null` means genuinely global: navigation entries that
 * belong to no destination.
 */
export interface SearchGroupIndex {
  destinationId: string | null;
  /**
   * The owning destination's display name.
   *
   * PHASE 14, OBJECTIVE 19: a global result has to say where it comes from,
   * or a Kyoto claim surfaced while reading about Sikkim reads as Sikkim's.
   * The name sits on the GROUP for the same reason the id does — fifteen
   * strings for the whole index instead of one per record.
   */
  destinationName: string | null;
  items: SearchItem[];
}

export type SearchIndex = SearchGroupIndex[];

/** How a search is scoped. */
export type SearchScope =
  /** Only this destination's content, plus global navigation. */
  | { kind: "destination"; destinationId: string }
  /** Every published destination. */
  | { kind: "global" };

/**
 * Resolve an index against a scope.
 *
 * Destination scope admits the named destination and the global navigation
 * entries, and nothing else — which is the whole isolation guarantee, in one
 * filter, testable on its own.
 */
export function itemsInScope(index: SearchIndex, scope: SearchScope): SearchItem[] {
  if (scope.kind === "global") return index.flatMap((g) => g.items);
  return index
    .filter((g) => g.destinationId === scope.destinationId || g.destinationId === null)
    .flatMap((g) => g.items);
}

/** Which destination owns a given result, for attribution in global search. */
export function ownerOf(index: SearchIndex, item: SearchItem): string | null {
  return index.find((g) => g.items.includes(item))?.destinationId ?? null;
}

/** The owning destination's display name, for attribution in global search. */
export function ownerNameOf(index: SearchIndex, item: SearchItem): string | null {
  return index.find((g) => g.items.includes(item))?.destinationName ?? null;
}

/** The destination whose curated modules are indexed above. */
const SIKKIM_ID = "sikkim";

/** Static destinations, shown before the visitor types anything. */
const DESTINATIONS: SearchItem[] = [
  /*
   * The "Go to" shortcuts were seven Sikkim routes with global-sounding
   * labels — "Digital Heritage Archive", "Book a stay", "Explore monasteries"
   * — offered in the palette on every page of a fifteen-destination product.
   * The product's own routes lead now; Sikkim's remain, and say whose they are.
   */
  { label: "All destinations", sublabel: "Fifteen, across six countries", href: "/destinations", group: "Go to", icon: "compass" },
  { label: "Discover by interest", sublabel: "Architecture, food, faith, nature…", href: "/discover", group: "Go to", icon: "compass" },
  { label: "Every story", sublabel: "The cultural archive, searchable", href: "/stories", group: "Go to", icon: "book" },
  { label: "One chronology", sublabel: "Every destination's history, dated", href: "/history", group: "Go to", icon: "scroll" },
  { label: "Plan a journey", sublabel: "Days, pace and interests", href: "/plan", group: "Go to", icon: "compass" },
  { label: "Compare destinations", sublabel: "What is known, side by side", href: "/destinations/compare", group: "Go to", icon: "compass" },
  { label: "Sikkim: monasteries", sublabel: "Search, filter, map", href: "/destinations/sikkim/monasteries", group: "Go to", icon: "compass" },
  { label: "Sikkim: stories", sublabel: "Seventy narratives from the archive", href: "/destinations/sikkim/stories", group: "Go to", icon: "book" },
  { label: "Sikkim: history", sublabel: "The interactive historical timeline", href: "/destinations/sikkim/history", group: "Go to", icon: "scroll" },
  { label: "Sikkim: archive", sublabel: "Search the catalogued collection", href: "/destinations/sikkim/archive", group: "Go to", icon: "image" },
  { label: "Sikkim: contribute to the archive", sublabel: "Submit a photograph, document or practice", href: "/destinations/sikkim/archive/contribute", group: "Go to", icon: "compass" },
  { label: "Sikkim: map", sublabel: "Every sourced coordinate on one map", href: "/destinations/sikkim/explore", group: "Go to", icon: "compass" },
  { label: "Sikkim: registered stays", sublabel: "Directory of registered properties", href: "/destinations/sikkim/hotels", group: "Go to", icon: "compass" },
  /* The page, not its 1,858 records. The stays below already put 905 entries
     into the HTML of every route that mounts the palette; adding the agency
     register would treble that for a directory that has its own search. */
  { label: "Sikkim: the tourism trade", sublabel: "Registered hotels and travel agencies, searchable", href: "/destinations/sikkim/industry", group: "Go to", icon: "compass" },
  { label: "Sikkim: plan a heritage journey", sublabel: "Day-by-day itinerary", href: "/destinations/sikkim/planner", group: "Go to", icon: "compass" },
];

/**
 * Build the full index, grouped by owning destination.
 *
 * Sikkim's entries come from its curated modules. Other destinations
 * contribute their PUBLISHED knowledge only — reviewer-approved claims, never
 * raw research — so a destination appears in search exactly when it has
 * content a person approved.
 */
export function buildSearchIndex(): SearchIndex {
  const sikkim: SearchItem[] = [
    ...monasteries.map((monastery) => ({
      label: monastery.name,
      sublabel: `${monastery.tradition} · ${monastery.district} · est. ${monastery.establishedYear}`,
      href: `/destinations/sikkim/monasteries/${monastery.slug}`,
      group: "Monasteries" as const,
      icon: "landmark" as const,
    })),
    /* Stories were missing from this index, which is why searching a story
       title used to surface a monastery instead — the single most confusing
       thing about the old search. */
    ...stories.map((story) => ({
      label: story.title,
      sublabel: `${story.category} · ${story.communities.join(", ")}`,
      href: `/destinations/sikkim/stories/${story.slug}`,
      group: "Stories" as const,
      icon: "book" as const,
    })),
    ...historyTimeline.map((event) => ({
      label: event.title,
      sublabel: `${event.yearLabel} · ${event.era}`,
      href: `/destinations/sikkim/history/${event.slug}`,
      group: "History" as const,
      icon: "scroll" as const,
    })),
    ...archiveItems.map((item) => ({
      label: item.title,
      sublabel: [item.category, item.community, item.location].filter(Boolean).join(" · "),
      href: `/destinations/sikkim/archive/${item.id}`,
      group: "Archive" as const,
      icon: "image" as const,
    })),
    ...places.map((place) => ({
      label: place.name,
      sublabel: `${place.category} · ${place.district} district`,
      href: `/destinations/sikkim/explore?place=${place.slug}`,
      group: "Places" as const,
      icon: "mountain" as const,
    })),
    ...hotels.map((hotel) => ({
      label: hotel.name,
      sublabel: `${hotel.district} district · registered stay`,
      href: hotel.googleMapsUrl,
      group: "Stays" as const,
      icon: "bed" as const,
    })),
    ...DESTINATIONS,
  ];

  /*
   * Sikkim's entries come from its curated modules above; other destinations
   * contribute their published knowledge. The exclusion names Sikkim directly
   * rather than going through DEFAULT_DESTINATION_ID: this is a statement
   * about which destination owns the curated corpus, not a fallback for an
   * unresolved destination.
   */
  const published: SearchGroupIndex[] = publishedDestinationIds()
    .filter((id) => id !== SIKKIM_ID)
    .map((id) => {
      const knowledge = getPublishedKnowledge(id);
      const items: SearchItem[] = (knowledge?.categories ?? []).flatMap((c) =>
        c.claims.map((claim) => ({
          /* The claim itself is the searchable text; the destination page is
             where it lives. Claim ids are internal and never surfaced. */
          label: claim.statement.length > 90 ? `${claim.statement.slice(0, 87)}…` : claim.statement,
          sublabel: `${CATEGORY_LABEL[c.category] ?? c.category} · ${id}`,
          href: `/destinations/${id}`,
          group: "Places" as const,
          icon: "compass" as const,
        })),
      );
      return { destinationId: id, destinationName: getDestination(id)?.name ?? id, items };
    })
    .filter((g) => g.items.length > 0);

  /* PHASE 18 — a capsule destination owns its group like any other. */
  const capsules: SearchGroupIndex[] = capsuleSearchGroups();

  return [
    /* Navigation belongs to no destination. */
    { destinationId: null, destinationName: null, items: DESTINATIONS },
    { destinationId: SIKKIM_ID, destinationName: getDestination(SIKKIM_ID)?.name ?? "Sikkim", items: sikkim },
    ...published,
    ...capsules,
  ];
}

/** Flat view, for callers that do not scope. Prefer itemsInScope(). */
export function flatSearchIndex(): SearchItem[] {
  return buildSearchIndex().flatMap((g) => g.items);
}

/* =========================================================================
   PAYLOAD — Phase 15
   ========================================================================= */

/**
 * The seed index: navigation entries only.
 *
 * WHY THIS EXISTS
 * ---------------
 * The full index is around 1,140 records, and the root layout used to
 * serialise ALL of it into every page — measured at **301 KB of script per
 * document**, on a `/destinations` page whose entire HTML was 371 KB. Every
 * navigation paid for a corpus the visitor had not asked for and, on most
 * visits, never opened.
 *
 * So the layout now inlines only this: the handful of "Go to" entries that
 * belong to no destination. The palette opens instantly with them and fetches
 * the rest — once, from a statically generated endpoint the browser can cache
 * — the first time it is opened.
 *
 * The isolation guarantee is untouched: `destinationId: null` is admitted by
 * every scope, and the fetched groups carry the same ownership they always
 * did.
 */
export function navigationIndex(): SearchIndex {
  return [{ destinationId: null, destinationName: null, items: DESTINATIONS }];
}

/**
 * The rest of the index — everything the seed does not carry.
 *
 * Served from `/api/search-index`, generated at build time. Splitting it this
 * way means the seed and the fetched payload never contain the same record
 * twice.
 */
export function deferredSearchIndex(): SearchIndex {
  return buildSearchIndex().filter((group) => group.destinationId !== null);
}
