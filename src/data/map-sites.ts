import { mappableMonasteries, monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { getStoriesForMonastery, getStoriesForPlace } from "@/data/stories";
import type { Coordinates, SikkimDistrict } from "@/types";

/**
 * One flat, serialisable list of everything the explore map can plot.
 *
 * TWO RULES, both inherited from the data files this reads:
 *
 *   1. A site appears here only if an authoritative source publishes its
 *      coordinate. Monasteries whose published coordinates conflict with their
 *      known location are excluded upstream by `mappableMonasteries`, and stays
 *      are absent entirely because this project has no licensed coordinate feed
 *      for them.
 *   2. Every site carries the count of stories that reference it, which is what
 *      turns the map from a pin board into a way into the archive.
 */

/** Marker families. Six colours, not thirty — the legend has to be readable. */
export type SiteGroup =
  | "Monastery"
  | "Heritage"
  | "Sacred"
  | "Water"
  | "Nature"
  | "Journey"
  | "Town";

export const SITE_GROUPS: SiteGroup[] = [
  "Monastery",
  "Heritage",
  "Sacred",
  "Water",
  "Nature",
  "Journey",
  "Town",
];

/**
 * Palette. Sampled from the design tokens rather than invented: forest ridge
 * for monasteries, bronze for heritage, Tibetan red for sacred sites, the
 * validated chart jade for water, slate blue for nature, warm neutral for
 * towns. Distinguishable in greyscale by pairing with marker size and label.
 */
export const SITE_GROUP_COLOUR: Record<SiteGroup, string> = {
  Monastery: "#43614d",
  Heritage: "#8a6110",
  Sacred: "#a63a2a",
  Water: "#00907a",
  Nature: "#4c6e8f",
  Journey: "#6b4f8a",
  Town: "#5d5647",
};

export const SITE_GROUP_LABEL: Record<SiteGroup, string> = {
  Monastery: "Monasteries",
  Heritage: "Heritage & museums",
  Sacred: "Stupas & temples",
  Water: "Lakes, rivers & falls",
  Nature: "Parks & sanctuaries",
  Journey: "Passes & treks",
  Town: "Towns & markets",
};

export interface MapSite {
  /** "monastery:rumtek" or "place:yuksom" — unique across both sets. */
  id: string;
  kind: "monastery" | "place";
  slug: string;
  name: string;
  /** Tradition for a monastery, place category otherwise. */
  category: string;
  group: SiteGroup;
  district: SikkimDistrict;
  coordinates: Coordinates;
  description: string;
  image: string;
  imageAlt: string;
  googleMapsUrl: string;
  /** Internal page, where one exists. */
  detailHref?: string;
  /** The source that published this record and its coordinate. */
  sourceUrl?: string;
  /** True when provenance is better than "unverified". */
  verified: boolean;
  permitNote?: string;
  elevation?: number;
  /** Slugs of stories that reference this site. */
  storySlugs: string[];
  established?: number;
  /** Lower-cased blob for search. */
  searchText: string;
}

const monasterySites: MapSite[] = mappableMonasteries.map((monastery) => {
  const storySlugs = getStoriesForMonastery(monastery.slug).map((story) => story.slug);
  return {
    id: `monastery:${monastery.slug}`,
    kind: "monastery",
    slug: monastery.slug,
    name: monastery.name,
    category: monastery.tradition,
    group: "Monastery",
    district: monastery.district,
    coordinates: monastery.coordinates!,
    description: monastery.description,
    image: monastery.image,
    imageAlt: `${monastery.name}, ${monastery.district} district`,
    googleMapsUrl: monastery.googleMapsUrl,
    detailHref: `/monasteries/${monastery.slug}`,
    sourceUrl: monastery.provenance.sourceUrl,
    verified: monastery.provenance.confidence !== "unverified",
    established: monastery.establishedYear,
    storySlugs,
    searchText: [
      monastery.name,
      monastery.district,
      monastery.tradition,
      "monastery gompa",
      monastery.description,
    ]
      .join(" ")
      .toLowerCase(),
  };
});

const placeSites: MapSite[] = places.map((place) => {
  const storySlugs = getStoriesForPlace(place.slug).map((story) => story.slug);
  return {
    id: `place:${place.slug}`,
    kind: "place",
    slug: place.slug,
    name: place.name,
    category: place.category,
    group: place.group as SiteGroup,
    district: place.district,
    coordinates: place.coordinates,
    description: place.description,
    image: place.image,
    imageAlt: place.imageAlt,
    googleMapsUrl: place.googleMapsUrl,
    sourceUrl: place.provenance.sourceUrl,
    verified: place.provenance.confidence !== "unverified",
    ...(place.permitNote ? { permitNote: place.permitNote } : {}),
    ...(place.elevation ? { elevation: place.elevation } : {}),
    storySlugs,
    searchText: [
      place.name,
      place.district,
      place.category,
      place.group,
      /* Search synonyms, so "waterfall" finds a Waterfall and "trek" a Pass. */
      place.category === "Waterfall" ? "waterfall falls water" : "",
      place.category === "Lake" ? "lake water" : "",
      place.category === "Pass" ? "pass trek trekking route" : "",
      place.category === "Nature reserve" ? "nature park sanctuary wildlife trekking" : "",
      place.category === "Temple" ? "temple mandir viewpoint" : "",
      place.category === "Stupa" ? "stupa chorten sacred" : "",
      place.category === "Museum" ? "museum institute archive" : "",
      place.category === "Town" ? "town market bazaar food" : "",
      place.category === "Tea garden" ? "tea garden food" : "",
      place.description,
    ]
      .join(" ")
      .toLowerCase(),
  };
});

export const mapSites: MapSite[] = [...monasterySites, ...placeSites];

export const MAP_DISTRICTS: SikkimDistrict[] = [
  ...new Set(mapSites.map((site) => site.district)),
].sort() as SikkimDistrict[];

export function getMapSiteById(id: string): MapSite | undefined {
  return mapSites.find((site) => site.id === id);
}

/** Counts for the explore page header — computed, never hand-written. */
export const MAP_STATS = {
  sites: mapSites.length,
  monasteries: monasterySites.length,
  places: placeSites.length,
  withStories: mapSites.filter((site) => site.storySlugs.length > 0).length,
  /** Catalogued monasteries with no publishable coordinate — published, not hidden. */
  unmapped: monasteries.length - mappableMonasteries.length,
} as const;
