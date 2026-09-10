import { destinationPath } from "@/lib/destinations/resolve";
import type { DestinationCapability } from "@/types/destination";

/**
 * Where each capability lives, as a URL segment under `/destinations/<id>/`.
 *
 * WHY THIS IS ONE TABLE
 * ---------------------
 * It was two, and both were wrong in the same way. The destination hub page
 * carried a `SIKKIM_ROUTES` map whose values were fully-qualified
 * `/destinations/sikkim/...` paths — so the one component that is supposed to
 * render *any* destination linked every destination's sections to Sikkim's.
 * `sitemap.ts` carried a second copy: twelve literal Sikkim paths, which
 * would silently omit a second destination the day one gained a section.
 *
 * The route segments themselves are NOT destination-specific — every
 * destination's sites live under `.../monasteries` because that is the route
 * this application declares, the same way every one of them uses `/explore`
 * for its map. The destination id is the only variable, so the table holds
 * segments and the id is applied by `capabilitySectionPath`.
 *
 * A capability absent from this table has no section route: `knowledge`
 * renders on the hub page itself, `audio`, `video` and `panorama` are
 * features of a site page rather than places to visit, and `festivals` and
 * `food` have no route at all yet. Absent means "no link", never "guess one".
 */
export const CAPABILITY_SECTION: Partial<Record<DestinationCapability, string[]>> = {
  /*
   * One capability can own more than one route. `experiences` owns both
   * halves of the tourism loop: `discover` (what is here and why) and `plan`
   * (turn it into days). They are listed primary-first — the primary is what
   * a link to the capability means — and both are emitted in the sitemap,
   * because a route nobody can find is a route nobody uses.
   */
  experiences: ["discover", "plan"],
  sites: ["monasteries"],
  /* The section routes belong to the page-bearing capabilities: a capsule
     has stories and history, but they live on its discovery page. */
  storyPages: ["stories"],
  historyPages: ["history"],
  culture: ["culture"],
  archive: ["archive"],
  map: ["explore"],
  stays: ["hotels"],
  trade: ["industry"],
  permits: ["permits"],
  responsible: ["responsible"],
  preservation: ["preservation"],
  tripPlanner: ["planner"],
};

/** Capabilities that have a browsable section, in the order a visitor meets them. */
export const SECTION_CAPABILITIES = Object.keys(
  CAPABILITY_SECTION,
) as DestinationCapability[];

/**
 * The canonical path to a destination's PRIMARY section for a capability, or
 * null if the capability has no section route. Callers must handle null
 * rather than defaulting.
 */
export function capabilitySectionPath(
  destinationId: string,
  capability: DestinationCapability,
): string | null {
  const [primary] = CAPABILITY_SECTION[capability] ?? [];
  return primary ? destinationPath(destinationId, primary) : null;
}

/** Every route a capability owns, primary first. */
export function capabilitySectionPaths(
  destinationId: string,
  capability: DestinationCapability,
): string[] {
  return (CAPABILITY_SECTION[capability] ?? []).map((segment) =>
    destinationPath(destinationId, segment),
  );
}
