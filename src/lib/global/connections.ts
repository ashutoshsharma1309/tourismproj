import type { DestinationCoverage } from "@/lib/global/coverage";
import { themesFor } from "@/lib/global/themes";
import type { ThemePresence } from "@/lib/global/themes";
import { INTEREST_LABEL } from "@/lib/planner/types";
import type { JourneyInterest } from "@/lib/planner/types";

/**
 * The cross-destination graph.
 *
 * An edge exists between two destinations when this archive holds material of
 * the same kind about both — and the edge carries the material. There are two
 * relationship types, in this order of strength:
 *
 *   1. **shared-theme** — both carry a theme from the explicit vocabulary in
 *      themes.ts, evidenced by the exact claims and records that matched.
 *   2. **shared-interest** — both have coverage for the same interest, one
 *      through catalogued records, the other through approved claims or its
 *      own records.
 *
 * Every edge states its own reason and its own counts. Nothing here is a
 * similarity score, and nothing infers a relationship from a name, a country,
 * a region or a coincidence of spelling.
 *
 * WHAT AN EDGE DOES NOT CLAIM
 * ---------------------------
 * That the two places are alike, that one is a substitute for the other, or
 * that a visitor who enjoyed one will enjoy the other. It claims that this
 * archive can show you the same kind of material about both, and it hands you
 * that material so you can decide.
 */

export type ConnectionKind = "shared-theme" | "shared-interest";

export interface DestinationConnection {
  /** The destination on the other end. */
  otherId: string;
  otherName: string;
  otherDepth: DestinationCoverage["depth"];
  kind: ConnectionKind;
  /** The sentence rendered to the reader. */
  reason: string;
  /** Theme id or interest id, for grouping and links. */
  subject: string;
  subjectLabel: string;
  /** Counts on each side, so the asymmetry is visible rather than smoothed. */
  here: { claims: number; records: number };
  there: { claims: number; records: number };
  /** Up to three inspectable items from each side. */
  evidenceHere: ThemePresence["evidence"];
  evidenceThere: ThemePresence["evidence"];
}

const KIND_ORDER: Record<ConnectionKind, number> = { "shared-theme": 0, "shared-interest": 1 };

/** Theme presence for every destination, computed once. */
export function themeIndex(coverage: DestinationCoverage[]): Map<string, ThemePresence[]> {
  return new Map(
    coverage.map((entry) => [
      entry.destination.id,
      themesFor(entry.destination.id, entry.experiences),
    ]),
  );
}

/**
 * Connections from one destination to every other.
 *
 * Deterministic: theme edges first, then interest edges; within a kind, by the
 * combined weight of evidence on the other side, then by the other
 * destination's name.
 */
export function connectionsFrom(
  subject: DestinationCoverage,
  all: DestinationCoverage[],
  themes: Map<string, ThemePresence[]>,
  limit = 6,
): DestinationConnection[] {
  const here = themes.get(subject.destination.id) ?? [];
  const edges: DestinationConnection[] = [];
  const claimed = new Set<string>();

  for (const other of all) {
    if (other.destination.id === subject.destination.id) continue;
    const there = themes.get(other.destination.id) ?? [];

    for (const presence of here) {
      const match = there.find((entry) => entry.theme.id === presence.theme.id);
      if (!match) continue;
      const key = `${other.destination.id}:${presence.theme.id}`;
      if (claimed.has(key)) continue;
      claimed.add(key);
      edges.push({
        otherId: other.destination.id,
        otherName: other.destination.name,
        otherDepth: other.depth,
        kind: "shared-theme",
        subject: presence.theme.id,
        subjectLabel: presence.theme.label,
        reason: `Both hold material on ${presence.theme.label.toLowerCase()} — ${describe(presence)} here, ${describe(match)} in ${other.destination.name}`,
        here: { claims: presence.claims, records: presence.records },
        there: { claims: match.claims, records: match.records },
        evidenceHere: presence.evidence,
        evidenceThere: match.evidence,
      });
    }

    /* Interest edges only where a theme edge did not already connect the two
       on the same ground — a second sentence saying the same thing is noise. */
    for (const interest of subject.covered) {
      if (!other.covered.includes(interest)) continue;
      const key = `${other.destination.id}:interest:${interest}`;
      if (claimed.has(key)) continue;
      claimed.add(key);
      const hereRow = subject.interests.find((entry) => entry.interest === interest);
      const thereRow = other.interests.find((entry) => entry.interest === interest);
      if (!hereRow || !thereRow) continue;
      edges.push({
        otherId: other.destination.id,
        otherName: other.destination.name,
        otherDepth: other.depth,
        kind: "shared-interest",
        subject: interest,
        subjectLabel: INTEREST_LABEL[interest as JourneyInterest],
        reason: `Both have ${INTEREST_LABEL[interest].toLowerCase()} coverage — ${hereRow.basis} here; ${thereRow.basis} in ${other.destination.name}`,
        here: { claims: hereRow.claims, records: hereRow.experiences },
        there: { claims: thereRow.claims, records: thereRow.experiences },
        evidenceHere: [],
        evidenceThere: [],
      });
    }
  }

  return edges
    .sort((a, b) => {
      if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      const aWeight = a.there.claims + a.there.records;
      const bWeight = b.there.claims + b.there.records;
      if (aWeight !== bWeight) return bWeight - aWeight;
      return a.otherName.localeCompare(b.otherName, "en") || a.subject.localeCompare(b.subject);
    })
    .slice(0, limit);
}

function describe(presence: ThemePresence): string {
  const parts: string[] = [];
  if (presence.records > 0) {
    parts.push(`${presence.records} catalogued ${presence.records === 1 ? "record" : "records"}`);
  }
  if (presence.claims > 0) {
    parts.push(`${presence.claims} approved ${presence.claims === 1 ? "claim" : "claims"}`);
  }
  return parts.join(" and ");
}

/**
 * Destinations that carry a given theme — the experience-to-destination
 * direction. "Where else can I find Buddhist heritage?"
 */
export function destinationsWithTheme(
  themeId: string,
  coverage: DestinationCoverage[],
  themes: Map<string, ThemePresence[]>,
): { coverage: DestinationCoverage; presence: ThemePresence }[] {
  return coverage
    .map((entry) => ({
      coverage: entry,
      presence: (themes.get(entry.destination.id) ?? []).find((p) => p.theme.id === themeId),
    }))
    .filter((entry): entry is { coverage: DestinationCoverage; presence: ThemePresence } =>
      entry.presence !== undefined,
    )
    .sort(
      (a, b) =>
        b.presence.records + b.presence.claims - (a.presence.records + a.presence.claims) ||
        a.coverage.destination.name.localeCompare(b.coverage.destination.name, "en"),
    );
}
