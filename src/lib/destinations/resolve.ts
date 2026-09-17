import { notFound } from "next/navigation";

import { getDestination } from "@/lib/destinations/registry";
import { resolveCapabilities } from "@/lib/destinations/content";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import type { CapabilitySet, DestinationCapability } from "@/types/destination";
import type { Destination } from "@/types/destination";

/**
 * The canonical destination resolver.
 *
 * ONE resolver, and it starts from the URL.
 *
 * Before Phase 11 the application answered "which destination is this?" in
 * two different ways: routes under /destinations read it from the path, and
 * everything else — every Sikkim route, and the search palette — fell back to
 * DEFAULT_DESTINATION_ID. That fallback was the last place the architecture
 * assumed Sikkim, and it worked precisely because Sikkim's content lived at
 * un-prefixed URLs.
 *
 * With content at /destinations/<id>/..., the URL always carries the answer,
 * and every destination-scoped page resolves through here.
 *
 * WHY IT THROWS notFound() RATHER THAN RETURNING NULL
 * A page that has resolved a destination has no meaningful way to continue
 * without one, and every caller returning `if (!d) notFound()` is the same
 * line written many times with one chance to forget it. `resolveOrNull` is
 * available for the callers that genuinely need to branch.
 */
export interface ResolvedDestination {
  destination: Destination;
  destinationId: string;
  capabilities: CapabilitySet;
  /** Root of this destination's content, for building links. */
  basePath: string;
  /** True when reviewer-approved research knowledge has been published. */
  hasPublishedKnowledge: boolean;
}

/** The canonical path prefix for a destination's content. */
export function destinationPath(destinationId: string, ...segments: string[]): string {
  return ["/destinations", destinationId, ...segments].filter(Boolean).join("/");
}

/** Resolve without throwing. Returns null for an unregistered destination. */
export async function resolveDestinationOrNull(
  destinationId: string,
): Promise<ResolvedDestination | null> {
  const destination = getDestination(destinationId);
  if (!destination) return null;

  const capabilities = await resolveCapabilities(destinationId);
  return {
    destination,
    destinationId,
    capabilities,
    basePath: destinationPath(destinationId),
    hasPublishedKnowledge: Boolean(getPublishedKnowledge(destinationId)),
  };
}

/**
 * Resolve a destination from a route segment, or 404.
 *
 * An unregistered id never reaches a filesystem path or a module specifier:
 * the registry is a fixed Map, and every destination route also declares
 * `dynamicParams = false`, so an unknown segment is refused by the framework
 * before this runs.
 */
export async function resolveDestination(destinationId: string): Promise<ResolvedDestination> {
  const resolved = await resolveDestinationOrNull(destinationId);
  if (!resolved) notFound();
  return resolved;
}

/**
 * Resolve a destination that must have a given capability, or 404.
 *
 * This is what makes routes capability-gated rather than uniform.
 * /destinations/jaipur/monasteries does not render an empty page explaining
 * that Jaipur has no monasteries — it does not exist, because Jaipur has no
 * monastery corpus and a route that renders nothing is a route that should
 * not have been generated.
 */
export async function requireCapability(
  destinationId: string,
  capability: DestinationCapability,
): Promise<ResolvedDestination> {
  const resolved = await resolveDestination(destinationId);
  if (!resolved.capabilities[capability]) notFound();
  return resolved;
}

/**
 * Destinations that have a capability — the input to `generateStaticParams`.
 *
 * A page is generated because the destination exists AND the capability
 * resolves true. Nothing is generated speculatively, so the route tree
 * describes what is actually there.
 */
export async function destinationsWithCapability(
  capability: DestinationCapability,
  ids: string[],
): Promise<string[]> {
  const results = await Promise.all(
    ids.map(async (id) => ((await resolveCapabilities(id))[capability] ? id : null)),
  );
  return results.filter((id): id is string => id !== null);
}

/**
 * Destinations that have ANY of a set of capabilities.
 *
 * The journey planner is the case this exists for. It is generated where a
 * destination has something to visit (`experiences`) OR reviewer-approved
 * knowledge (`knowledge`), because a registered destination with approved
 * facts and no catalogued site must be able to SAY that — an honest empty
 * state is the Objective-18 requirement, and a 404 would instead imply the
 * destination does not exist. A destination with neither still gets no
 * route: there is nothing to be honest about.
 */
export async function destinationsWithAnyCapability(
  capabilities: DestinationCapability[],
  ids: string[],
): Promise<string[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      const resolved = await resolveCapabilities(id);
      return capabilities.some((capability) => resolved[capability]) ? id : null;
    }),
  );
  return results.filter((id): id is string => id !== null);
}
