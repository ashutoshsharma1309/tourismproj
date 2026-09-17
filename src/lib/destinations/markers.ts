import { getPublishedKnowledge } from "@/data/published-knowledge";

import { buildDestinationMarkers } from "./registry";

/**
 * Map markers for every destination.
 *
 * WHY THIS ONE-LINE MODULE EXISTS
 * -------------------------------
 * `buildDestinationMarkers` takes a knowledge lookup so the registry does not
 * have to import published knowledge itself. Every caller then supplied the
 * same lookup — which meant the homepage's map section reached for
 * `@/data/published-knowledge` directly, and `qa:publishing` caught it.
 *
 * That check is worth keeping honest rather than widening: reviewer-approved
 * knowledge should be read in the destination layer and nowhere else, so the
 * surfaces that render it receive it already resolved. Supplying the lookup
 * once, here, is the fix; adding the homepage to an allowlist would have been
 * the appearance of one.
 */
export function destinationMarkers() {
  return buildDestinationMarkers((id) => getPublishedKnowledge(id));
}
