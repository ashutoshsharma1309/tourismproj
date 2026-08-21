import generated from "@/data/generated/permits.json";
import type { Provenance } from "@/data/sources";

/**
 * Permits.
 *
 * Sikkim is one of the few places in India where a visitor's itinerary is
 * gated by paperwork: a Protected Area Permit for most of the high country, and
 * a Restricted Area Permit for every foreign national entering it. Which office
 * issues which permit varies by destination, and it is scattered across a
 * government site that renders nothing without JavaScript. `places.ts` has had
 * an unused `permitNote` field waiting for this since it was written.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ---------------------------
 * The department also publishes thirteen offices where a RAP can be obtained,
 * with addresses and telephone numbers. That list is not reproduced here. Its
 * markup renders each office name as a heading and the address as the block
 * after it, so a naive read pairs every office with the next one's address —
 * and a wrong telephone number for a government permit office is worse than no
 * telephone number. The page is linked instead.
 *
 * Refresh with `npm run ingest:tourism`.
 */

export interface PermitDestination {
  slug: string;
  /** Destination as the department names it, e.g. "Tsomgo – Baba Mandir". */
  name: string;
  /** The department's own grouping: East / West / North / South District. */
  region: string;
  /** Who issues the permit, and how it differs for foreign nationals. */
  authority: string;
}

export interface PermitDocuments {
  for: string;
  notes: string[];
  /**
   * A condition of entry that is not a document to carry — currently only the
   * two-wheeler engine-capacity minimum. It is published as prose on the
   * department's page rather than as a checklist item, which is how the first
   * ingest lost it.
   */
  rule?: string;
}

export const permitDestinations = generated.destinations as PermitDestination[];
export const permitDocuments = generated.documents as PermitDocuments[];
export const rapRules = generated.rapRules as string[];

export const PERMIT_STATS = {
  destinations: permitDestinations.length,
  regions: [...new Set(permitDestinations.map((d) => d.region))].length,
  retrievedAt: generated.retrievedAt,
  papUrl: generated.source.papUrl,
  rapUrl: generated.source.rapUrl,
  sourceName: generated.source.name,
} as const;

export const PERMIT_PROVENANCE: Provenance = {
  sourceId: "sikkim-tourism-permits",
  sourceUrl: generated.source.papUrl,
  verifiedAt: generated.retrievedAt,
  confidence: "high",
};

/**
 * Match a place in this archive to its permit requirement.
 *
 * Matching is on normalised name because the department and this archive spell
 * the same places differently — "Tsomgo – Baba Mandir" against "Tsomgo Lake",
 * "Nathula Pass" against "Nathu La". Returns undefined rather than guessing:
 * telling a visitor no permit is needed when one is would strand them at a
 * check post.
 */
const norm = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

export function permitForPlace(placeName: string): PermitDestination | undefined {
  const target = norm(placeName);
  if (!target) return undefined;
  return permitDestinations.find((permit) => {
    const candidate = norm(permit.name);
    if (!candidate) return false;
    const head = norm(permit.name.split(/[–—-]/)[0] ?? "");
    return (
      candidate === target ||
      (head.length >= 5 && (target.includes(head) || head.includes(target)))
    );
  });
}

/**
 * Which permits an itinerary actually needs.
 *
 * Matching on the sleeping base was the obvious thing and it was wrong: the
 * planner's `location` is where you sleep — Gangtok, Lachung — while the permit
 * is needed for where you go in the day. A route that reads "Permit check, then
 * the switchback drive to Tsomgo Lake" sleeps in Gangtok, which needs no permit
 * at all. So this reads the day text.
 *
 * The needle is the destination's leading token, matched with all punctuation
 * and spacing removed, because the department writes "Nathula" where the archive
 * writes "Nathu La".
 */
export function permitsMentionedIn(texts: string[]): PermitDestination[] {
  const haystack = texts.join(" ").toLowerCase().replace(/[^a-z]/g, "");
  const found: PermitDestination[] = [];
  for (const permit of permitDestinations) {
    const head = (permit.name.split(/[\u2013\u2014-]/)[0] ?? "").trim();
    const needle = head.toLowerCase().replace(/[^a-z]/g, "");
    if (needle.length < 5) continue;
    if (haystack.includes(needle)) found.push(permit);
  }
  return found;
}
