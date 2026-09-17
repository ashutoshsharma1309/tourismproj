import { plannedDestinations } from "@/data/destinations/planned";
import { sikkim } from "@/data/destinations/sikkim";
import type { DataDepth, Destination } from "@/types/destination";

/**
 * The destination registry.
 *
 * DELIBERATELY CHEAP TO IMPORT. This module pulls in identity and geography
 * only — a few hundred bytes per destination — and never touches a content
 * module. That separation is the point: a navbar or a footer can ask "which
 * destinations exist?" without dragging Sikkim's 24,000-line travel-agent
 * register into the bundle.
 *
 * Content lives behind the async accessors in ./content, which use dynamic
 * imports so a page pays only for what it actually renders. The guide index
 * was already moved out of page HTML in this project for costing ~313 KB on
 * every navigation; this keeps that lesson.
 */
const ALL: Destination[] = [sikkim, ...plannedDestinations];

const BY_ID = new Map(ALL.map((d) => [d.id, d]));

/** Every registered destination, Sikkim first, then the planned set. */
export function listDestinations(): Destination[] {
  return ALL;
}

/**
 * The distinct states and union territories the registry reaches, in registry
 * order. Every destination is in India, so "how many countries" is no longer a
 * figure worth stating; the spread across states is.
 */
export function listRegionNames(): string[] {
  return [...new Set(ALL.map((d) => d.region?.name).filter((n): n is string => Boolean(n)))];
}

/** Destinations with content today. Currently Sikkim alone. */
export function listAvailableDestinations(): Destination[] {
  return ALL.filter((d) => d.depth !== "planned");
}

/**
 * Look up a destination. Returns null rather than throwing — an unknown id
 * is a 404, not a crash, and callers already have to handle "not found".
 */
export function getDestination(id: string): Destination | null {
  return BY_ID.get(id) ?? null;
}

export function isKnownDestination(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * The destination the original top-level routes belong to.
 *
 * Phase 2 does not move Sikkim's 270 indexed pages. Anything that needs to
 * know "which destination is this un-prefixed page about?" asks here rather
 * than hard-coding the string, so the eventual route migration is a change
 * to one constant instead of a search across the codebase.
 */
export const DEFAULT_DESTINATION_ID = "sikkim";

export function getDefaultDestination(): Destination {
  const d = BY_ID.get(DEFAULT_DESTINATION_ID);
  /* Registry is static and Sikkim is always present; this is a guard against
     a future edit removing it, not a runtime condition we expect. */
  if (!d) throw new Error(`Default destination "${DEFAULT_DESTINATION_ID}" is not registered`);
  return d;
}

/* -------------------------------------------------------------------------
   Divisions and taxonomies — the single source of truth these replace
   ------------------------------------------------------------------------- */

/** A destination's divisions, or [] when it declares none. */
export function getDivisions(destinationId: string) {
  return getDestination(destinationId)?.divisions ?? [];
}

/** Division display names, in declared order. */
export function getDivisionNames(destinationId: string): string[] {
  return getDivisions(destinationId).map((d) => d.name);
}

export function getTaxonomy(destinationId: string, taxonomyId: string) {
  return getDestination(destinationId)?.taxonomies.find((t) => t.id === taxonomyId) ?? null;
}

/* =========================================================================
   MAP METADATA — identity and status only, never content
   ========================================================================= */

/**
 * The slim projection the global map needs.
 *
 * Deliberately not a `Destination`. A full record carries divisions and
 * taxonomies, and the map needs none of it — this is what crosses to the
 * browser for every destination, so it holds identity, a coordinate,
 * a status and a count. Roughly 150 bytes each.
 *
 * There is exactly one source for these values: the registry below. No
 * component defines a coordinate, and no second marker list exists.
 */
export interface DestinationMarker {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: string | null;
  lat: number;
  lng: number;
  depth: DataDepth;
  /** Whether reviewer-approved knowledge exists. Drives the marker's state. */
  hasKnowledge: boolean;
  /** Experience types a visitor can actually reach. Empty is a valid answer. */
  experiences: string[];
}

/**
 * Build the marker set.
 *
 * `depth` is the EARNED depth where research has been published, falling back
 * to the declared value — the same reconciliation the destination page does,
 * so a marker and the page it leads to never disagree.
 *
 * Takes the published-knowledge lookups as arguments rather than importing
 * them, so this module stays free of any dependency on content and can be
 * imported anywhere without pulling a dataset behind it.
 */
export function buildDestinationMarkers(
  knowledgeFor: (id: string) => { depth?: { depth: DataDepth }; categories?: { category: string }[] } | null,
): DestinationMarker[] {
  return ALL.map((d) => {
    const knowledge = knowledgeFor(d.id);
    const experiences = [...new Set((knowledge?.categories ?? []).map((c) => c.category))].sort();
    return {
      id: d.id,
      name: d.name,
      country: d.country.name,
      countryCode: d.country.code,
      region: d.region?.name ?? null,
      lat: d.geography.centre.lat,
      lng: d.geography.centre.lng,
      depth: knowledge?.depth?.depth ?? d.depth,
      hasKnowledge: Boolean(knowledge && (knowledge.categories ?? []).length > 0),
      experiences,
    };
  });
}

/** Group destinations by country, for a country-level explore view. */
export function groupByCountry(): { country: string; code: string; destinations: Destination[] }[] {
  const groups = new Map<string, { country: string; code: string; destinations: Destination[] }>();
  for (const d of ALL) {
    const existing = groups.get(d.country.code);
    if (existing) existing.destinations.push(d);
    else groups.set(d.country.code, { country: d.country.name, code: d.country.code, destinations: [d] });
  }
  return [...groups.values()];
}
