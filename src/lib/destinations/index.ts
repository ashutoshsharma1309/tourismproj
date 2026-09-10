/**
 * The destination engine — public surface.
 *
 * Import from here, not from the sibling modules, so the split between the
 * cheap registry and the dynamically-loaded content layer stays an internal
 * detail that can be re-arranged without touching callers.
 */
export type { DestinationMarker } from "@/lib/destinations/registry";

export {
  DEFAULT_DESTINATION_ID,
  buildDestinationMarkers,
  getDefaultDestination,
  getDestination,
  getDivisionNames,
  getDivisions,
  getTaxonomy,
  groupByCountry,
  isKnownDestination,
  listAvailableDestinations,
  listDestinations,
} from "@/lib/destinations/registry";

export {
  availableCapabilities,
  getArchive,
  getAudioGuides,
  getCulture,
  getDestinationSummary,
  getHistory,
  getMappableSites,
  getMapSites,
  getPanoramas,
  getPlaces,
  getSites,
  getSources,
  getStays,
  getStories,
  getTradeOperators,
  resolveCapabilities,
} from "@/lib/destinations/content";
