import { clampDays, MAX_DAYS, MIN_DAYS } from "./itinerary";
import { ALL_INTERESTS, PACE_CAPACITY } from "./types";
import type { Experience, JourneyInput, JourneyInterest, JourneyPace } from "./types";

/**
 * Planner state: the URL is the state.
 *
 * WHY THE URL AND NOT A CLIENT STORE
 * ----------------------------------
 * Three properties fall out of it, and all three were requirements:
 *
 *   - **Determinism is visible.** The same URL is the same plan, and you can
 *     see the whole input in the address bar. "Same input, same output" is
 *     not a claim about internal state; it is a link you can send someone.
 *   - **It works with no JavaScript.** The form is a plain GET form and the
 *     remove buttons are links, so the planner is fully usable — and fully
 *     testable — without a client bundle.
 *   - **Nothing to invalidate.** No local storage, no session, no cache key.
 *
 * EVERYTHING HERE IS UNTRUSTED INPUT
 * ----------------------------------
 * A query string is written by whoever sends the link. Every value is parsed
 * against a closed vocabulary, and — the part that matters — removed ids are
 * checked against the CANDIDATE SET OF THIS DESTINATION. An id belonging to
 * another destination, an id that does not exist, and an id shaped like a
 * path traversal are all discarded identically, because the test is
 * membership rather than syntax. No user-supplied string ever reaches a
 * filesystem path, a module specifier or a data lookup key.
 */

/** Hard caps. A URL longer than this is not a traveller editing a plan. */
export const LIMITS = {
  /** Total characters accepted from any single parameter. */
  paramChars: 2_000,
  /** Removals a plan may carry. Well above the largest catalogued set. */
  removals: 60,
} as const;

const PACES = Object.keys(PACE_CAPACITY) as JourneyPace[];

/** An id the planner will even consider looking up. */
const ID_PATTERN = /^(site|place):[a-z0-9][a-z0-9-]{0,63}$/;

export type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return raw.length > LIMITS.paramChars ? "" : raw;
}

/**
 * A list parameter, accepting BOTH shapes.
 *
 * The form posts checkboxes as repeated keys (`interests=history&
 * interests=nature`); the links this planner builds use one comma-joined
 * value, which keeps a shared URL short and stable. Reading only the first
 * repeated value — the obvious implementation — silently dropped every
 * interest but one when the form was used, which is the kind of bug that
 * looks like bad ranking rather than bad parsing.
 */
function listParam(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values
    .filter((entry) => entry.length <= LIMITS.paramChars)
    .flatMap((entry) => entry.split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, LIMITS.removals * 2);
}

export interface ParsedState extends JourneyInput {
  /** Ids that were sent but rejected — surfaced, never silently swallowed. */
  rejectedRemovals: number;
  /** Added ids that were rejected, for the same reasons. */
  rejectedPins: number;
  /** Interests that were sent but this destination cannot satisfy. */
  rejectedInterests: number;
}

/**
 * Parse a query string into a planner input.
 *
 * `candidates` is the destination's own experience set, so this cannot be
 * called without the thing that makes id validation meaningful.
 */
export function parseState(
  destinationId: string,
  params: RawParams,
  candidates: Experience[],
  offeredInterests: JourneyInterest[],
): ParsedState {
  const knownIds = new Set(candidates.map((candidate) => candidate.id));
  const offered = new Set(offeredInterests);

  const daysRaw = Number(first(params.days));
  const days = clampDays(Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 3);

  const paceRaw = first(params.pace);
  const pace: JourneyPace = (PACES as string[]).includes(paceRaw)
    ? (paceRaw as JourneyPace)
    : "balanced";

  const interestsRaw = listParam(params.interests);
  const interests = interestsRaw.filter(
    (value): value is JourneyInterest =>
      (ALL_INTERESTS as string[]).includes(value) && offered.has(value as JourneyInterest),
  );

  const pinnedRaw = listParam(params.pin);
  const removedRaw = listParam(params.remove);
  const removed = removedRaw
    .filter((id) => ID_PATTERN.test(id))
    /* Membership, not syntax: an id from another destination fails here. */
    .filter((id) => knownIds.has(id))
    .slice(0, LIMITS.removals);

  const removedSet = new Set(removed);
  const pinned = pinnedRaw
    .filter((id) => ID_PATTERN.test(id))
    .filter((id) => knownIds.has(id))
    /* An explicit removal beats an earlier add. */
    .filter((id) => !removedSet.has(id))
    .slice(0, LIMITS.removals);

  return {
    destinationId,
    days,
    pace,
    interests: dedupe(interests),
    removed: dedupe(removed),
    pinned: dedupe(pinned),
    rejectedRemovals: removedRaw.length - removed.length,
    rejectedPins: pinnedRaw.length - pinned.length,
    rejectedInterests: interestsRaw.length - interests.length,
  };
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Build the planner URL for a state, optionally overriding parts of it.
 *
 * Parameters are emitted in a fixed order and defaults are omitted, so the
 * same plan always has the same URL — two links to one itinerary would break
 * the "the URL is the plan" property that everything else here relies on.
 */
export function planHref(
  basePath: string,
  state: JourneyInput,
  overrides: Partial<JourneyInput> = {},
): string {
  const next = { ...state, ...overrides };
  const query = new URLSearchParams();

  if (next.days !== 3) query.set("days", String(clampDays(next.days)));
  if (next.pace !== "balanced") query.set("pace", next.pace);
  if (next.interests.length > 0) query.set("interests", [...next.interests].sort().join(","));
  if (next.pinned.length > 0) query.set("pin", [...next.pinned].sort().join(","));
  if (next.removed.length > 0) query.set("remove", [...next.removed].sort().join(","));

  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export { MAX_DAYS, MIN_DAYS };
