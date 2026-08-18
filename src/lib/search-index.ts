import { archiveItems } from "@/data/archive";
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

/** Static destinations, shown before the visitor types anything. */
const DESTINATIONS: SearchItem[] = [
  { label: "Explore monasteries", sublabel: "Search, filter, map", href: "/monasteries", group: "Go to", icon: "compass" },
  { label: "Stories of Sikkim", sublabel: "The cultural archive, searchable", href: "/stories", group: "Go to", icon: "book" },
  { label: "The Story of Sikkim", sublabel: "The interactive historical timeline", href: "/history", group: "Go to", icon: "scroll" },
  { label: "Digital Heritage Archive", sublabel: "Search the catalogued collection", href: "/archive", group: "Go to", icon: "image" },
  { label: "Contribute to the archive", sublabel: "Submit a photograph, document or practice", href: "/archive/contribute", group: "Go to", icon: "compass" },
  { label: "Explore Sikkim", sublabel: "Every sourced coordinate on one map", href: "/explore", group: "Go to", icon: "compass" },
  { label: "Book a stay", sublabel: "Directory of registered properties", href: "/hotels", group: "Go to", icon: "compass" },
  { label: "Plan a heritage journey", sublabel: "Day-by-day itinerary", href: "/planner", group: "Go to", icon: "compass" },
];

export function buildSearchIndex(): SearchItem[] {
  return [
    ...monasteries.map((monastery) => ({
      label: monastery.name,
      sublabel: `${monastery.tradition} · ${monastery.district} · est. ${monastery.establishedYear}`,
      href: `/monasteries/${monastery.slug}`,
      group: "Monasteries" as const,
      icon: "landmark" as const,
    })),
    /* Stories were missing from this index, which is why searching a story
       title used to surface a monastery instead — the single most confusing
       thing about the old search. */
    ...stories.map((story) => ({
      label: story.title,
      sublabel: `${story.category} · ${story.communities.join(", ")}`,
      href: `/stories/${story.slug}`,
      group: "Stories" as const,
      icon: "book" as const,
    })),
    ...historyTimeline.map((event) => ({
      label: event.title,
      sublabel: `${event.yearLabel} · ${event.era}`,
      href: `/history/${event.slug}`,
      group: "History" as const,
      icon: "scroll" as const,
    })),
    ...archiveItems.map((item) => ({
      label: item.title,
      sublabel: [item.category, item.community, item.location].filter(Boolean).join(" · "),
      href: `/archive/${item.id}`,
      group: "Archive" as const,
      icon: "image" as const,
    })),
    ...places.map((place) => ({
      label: place.name,
      sublabel: `${place.category} · ${place.district} district`,
      href: `/explore?place=${place.slug}`,
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
}
