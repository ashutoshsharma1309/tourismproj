import { getPublishedKnowledge } from "@/data/published-knowledge";
import { experiencesFor } from "@/lib/discovery/experiences";
import { getHistory, getStories, resolveCapabilities } from "@/lib/destinations/content";
import { getDestination, listDestinations } from "@/lib/destinations/registry";
import { CAPABILITY_SECTION } from "@/lib/destinations/sections";
import { CAPABILITY_LABEL } from "@/types/destination";
import type { DataDepth, DestinationCapability } from "@/types/destination";

/**
 * What a destination actually offers, counted.
 *
 * EVERY NUMBER HERE IS A `length`. There is no estimate, no rounding and no
 * "over 50" anywhere in this file: `experiences` is the size of the record
 * set, `historyEdges` is how many authored edges point from events to those
 * records, `approvedClaims` comes from the published knowledge's own metrics.
 * A destination with nothing gets zeroes, and the UI renders zero as "not
 * yet available" rather than as a small number.
 *
 * WHY IT IS NOT A RANKING
 * -----------------------
 * These summaries make destinations comparable, which is useful and also the
 * exact point where a tourism product usually starts lying: "best", "top",
 * "most beautiful". Nothing here orders destinations by quality. Sikkim has
 * more records than Kyoto because more of Sikkim has been catalogued — that
 * is a statement about this archive, not about the two places, and the depth
 * badge beside each number says which kind of coverage produced it.
 *
 * Server-only: it reaches the content accessors. Runs at build time.
 */
export interface DestinationSummaryCounts {
  id: string;
  name: string;
  country: string;
  region: string | null;
  /** Earned depth where research has been published, else the declared one. */
  depth: DataDepth;
  /** Capabilities that resolved true, in declaration order. */
  capabilities: DestinationCapability[];
  capabilityLabels: string[];
  /**
   * How many BROWSABLE sections this destination has — capabilities that own a
   * route, not capabilities in total.
   *
   * `/destinations` used `capabilityLabels.length` and called it "sections",
   * which said Paris had 4 while Paris's own hub listed 1: `stories`,
   * `history` and `knowledge` are kinds of material, not places to go. One
   * number, one meaning — the card, the navbar and the hub's Explore grid now
   * all count the same thing.
   */
  sectionCount: number;
  /** Visitable records. */
  experiences: number;
  /** Records that publish a coordinate. */
  mapped: number;
  /** Authored edges from history events to those records. */
  historyEdges: number;
  /** Authored edges from stories to those records. */
  storyEdges: number;
  stories: number;
  historyEvents: number;
  approvedClaims: number;
  timelineEntries: number;
  sources: number;
  /** True when this destination has nothing at all to show. */
  empty: boolean;
}

export async function destinationCounts(destinationId: string): Promise<DestinationSummaryCounts | null> {
  const destination = getDestination(destinationId);
  if (!destination) return null;

  const [capabilitySet, experiences, stories, history] = await Promise.all([
    resolveCapabilities(destinationId),
    experiencesFor(destinationId),
    getStories(destinationId),
    getHistory(destinationId),
  ]);

  const knowledge = getPublishedKnowledge(destinationId);
  const capabilities = (Object.keys(capabilitySet) as DestinationCapability[]).filter(
    (capability) => capabilitySet[capability],
  );

  return {
    id: destination.id,
    name: destination.name,
    country: destination.country.name,
    region: destination.region?.name ?? null,
    depth: knowledge?.depth.depth ?? destination.depth,
    capabilities,
    capabilityLabels: capabilities.map((capability) => CAPABILITY_LABEL[capability]),
    sectionCount: capabilities.filter((capability) => CAPABILITY_SECTION[capability]?.length).length,
    experiences: experiences.length,
    mapped: experiences.filter((experience) => experience.coordinates !== undefined).length,
    historyEdges: experiences.reduce((total, e) => total + e.historyRefs.length, 0),
    storyEdges: experiences.reduce((total, e) => total + e.storyRefs.length, 0),
    stories: stories.length,
    historyEvents: history.length,
    approvedClaims: knowledge?.depth.metrics.approvedClaims ?? 0,
    timelineEntries: knowledge?.timeline.length ?? 0,
    sources: knowledge?.sourcesUsed.length ?? 0,
    empty: capabilities.length === 0,
  };
}

/** Every destination's counts, in registry order. */
export async function allDestinationCounts(): Promise<DestinationSummaryCounts[]> {
  const results = await Promise.all(
    listDestinations().map((destination) => destinationCounts(destination.id)),
  );
  return results.filter((counts): counts is DestinationSummaryCounts => counts !== null);
}
