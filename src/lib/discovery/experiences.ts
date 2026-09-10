import { buildCandidates } from "@/lib/planner/candidates";
import { INTEREST_LABEL } from "@/lib/planner/types";
import type { Experience, JourneyInterest } from "@/lib/planner/types";

/**
 * Discovery — the layer that answers "what is here, and why does it matter?"
 *
 * WHY IT SITS ON TOP OF THE PLANNER'S CANDIDATES
 * ----------------------------------------------
 * Because the alternative is two answers to the same question. The planner
 * already assembles every visitable record in a destination, with the
 * authored edges that connect it to history and stories, and with the
 * provenance of each interest it carries. Discovery needs exactly that set —
 * it just presents it for browsing rather than for scheduling.
 *
 * So there is one experience model, built once, in `planner/candidates.ts`.
 * Discovery adds no facts. Everything in this file is a projection, a count
 * of real relationships, or a comparison between two records that already
 * exist.
 *
 * NOTHING HERE RANKS BY TASTE. There is no "top", no "best", no "most
 * beautiful". A group is ordered by how much of the archive points at each
 * record, which is a measurement, and ties break on id, which is stable.
 */

/** A browsable group of experiences, derived from what the destination has. */
export interface DiscoveryGroup {
  interest: JourneyInterest;
  label: string;
  /** Real count. Never rounded up, never padded. */
  count: number;
  experiences: Experience[];
}

/**
 * How much of the archive points at this record — the ordering signal for
 * discovery, and the raw material for "why this place".
 */
export function connectionCount(experience: Experience): number {
  return experience.historyRefs.length + experience.storyRefs.length;
}

/** Deterministic: most-connected first, then title, then id. */
export function byConnectedness(a: Experience, b: Experience): number {
  const difference = connectionCount(b) - connectionCount(a);
  if (difference !== 0) return difference;
  return a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id);
}

/**
 * The discovery groups for a destination.
 *
 * A group exists only where at least one record carries the interest, so the
 * page cannot offer a category that opens onto nothing — the same rule that
 * governs destination capabilities and planner interests.
 */
export function discoveryGroups(experiences: Experience[]): DiscoveryGroup[] {
  const order = [...new Set(experiences.flatMap((experience) => experience.interests))].sort();
  return order
    .map((interest) => {
      const members = experiences
        .filter((experience) => experience.interests.includes(interest))
        .sort(byConnectedness);
      return {
        interest,
        label: INTEREST_LABEL[interest],
        count: members.length,
        experiences: members,
      };
    })
    .filter((group) => group.count > 0);
}

/**
 * "Why this place?" — statements of fact, each one countable.
 *
 * Every line is a count of an authored relationship or a restatement of the
 * record's own classification. There is no line here that could be called a
 * marketing claim, because there is no adjective in any of them that the
 * data does not supply.
 */
export function whyThisPlace(experience: Experience): string[] {
  const lines: string[] = [];

  if (experience.historyRefs.length > 0) {
    const count = experience.historyRefs.length;
    lines.push(
      `Connected to ${count} dated historical ${count === 1 ? "event" : "events"} in this destination's timeline`,
    );
  }
  if (experience.storyRefs.length > 0) {
    const count = experience.storyRefs.length;
    lines.push(`Referenced across ${count} verified ${count === 1 ? "story" : "stories"} in the archive`);
  }

  /* The record's own classification, stated plainly. */
  lines.push(`Catalogued as ${article(experience.typeLabel)}${experience.area ? ` in ${experience.area}` : ""}`);

  if (experience.practical.length > 0) {
    lines.push(
      `The record publishes ${experience.practical.map((note) => note.label.toLowerCase()).join(" and ")}`,
    );
  }
  if (experience.coordinates === undefined) {
    lines.push("No authoritative coordinate is published for it, so it is not plotted");
  }

  return lines;
}

function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** Load a destination's experiences. One call site for the whole layer. */
export async function experiencesFor(destinationId: string): Promise<Experience[]> {
  return buildCandidates(destinationId);
}

/**
 * Look up one experience, scoped to its destination.
 *
 * The scoping is the security property: the id is only ever resolved against
 * the set built FOR THIS destination, so a Sikkim id requested under
 * /destinations/jaipur/... resolves to nothing rather than to Sikkim content.
 */
export async function experienceFor(
  destinationId: string,
  experienceId: string,
): Promise<Experience | null> {
  const all = await experiencesFor(destinationId);
  return all.find((experience) => experience.id === experienceId) ?? null;
}

/** The experience built from a given record, if that record is visitable. */
export async function experienceForRecord(
  destinationId: string,
  kind: "site" | "place",
  slug: string,
): Promise<Experience | null> {
  return experienceFor(destinationId, `${kind}:${slug}`);
}
