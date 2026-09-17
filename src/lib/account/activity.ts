/**
 * Which page views count as travel history, and how they are named.
 *
 * Shared by the browser recorder and the tests, so it imports nothing that
 * would ship the registry or content to the client. The server re-validates
 * every event against the registry and the destination's own records
 * (lib/account/events.ts); this file only proposes.
 *
 * WHAT COUNTS
 * -----------
 * Opening a destination, a place, a monastery, a story, a history entry, the
 * culture shelf or a stay. Not scrolling, hovering, searching, filtering,
 * switching tabs, or typing to the guide — none of those say what a
 * traveller explored, and all of them say more about a person than a travel
 * history needs to.
 */

export const CLIENT_EVENT_TYPES = [
  "DESTINATION_VIEWED",
  "PLACE_VIEWED",
  "STORY_VIEWED",
  "HISTORY_VIEWED",
  "CULTURE_VIEWED",
  "STAY_VIEWED",
  "AI_GUIDE_USED",
] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export interface ProposedEvent {
  type: ClientEventType;
  destinationId: string | null;
  entityId: string | null;
}

const ID = "[a-z0-9-]+";
/** A capture group, as a string (every group below is non-optional). */
const g = (m: RegExpMatchArray | RegExpExecArray, i: number): string => m[i] ?? "";
const LANG = "(?:/l/[a-z]{2})?";

const RULES: { pattern: RegExp; build: (m: RegExpMatchArray) => ProposedEvent }[] = [
  { pattern: new RegExp(`^${LANG}/destinations/(${ID})/?$`), build: (m) => ({ type: "DESTINATION_VIEWED", destinationId: g(m, 1), entityId: null }) },
  { pattern: new RegExp(`^/destinations/(${ID})/places/(${ID})/?$`), build: (m) => ({ type: "PLACE_VIEWED", destinationId: g(m, 1), entityId: `place:${g(m, 2)}` }) },
  { pattern: new RegExp(`^/destinations/(${ID})/monasteries/(${ID})/?$`), build: (m) => ({ type: "PLACE_VIEWED", destinationId: g(m, 1), entityId: `site:${g(m, 2)}` }) },
  { pattern: new RegExp(`^/destinations/(${ID})/stories/(${ID})/?$`), build: (m) => ({ type: "STORY_VIEWED", destinationId: g(m, 1), entityId: `story:${g(m, 2)}` }) },
  { pattern: new RegExp(`^/destinations/(${ID})/history/(${ID})/?$`), build: (m) => ({ type: "HISTORY_VIEWED", destinationId: g(m, 1), entityId: `history:${g(m, 2)}` }) },
  { pattern: new RegExp(`^/destinations/(${ID})/history/?$`), build: (m) => ({ type: "HISTORY_VIEWED", destinationId: g(m, 1), entityId: null }) },
  { pattern: new RegExp(`^/destinations/(${ID})/culture/?$`), build: (m) => ({ type: "CULTURE_VIEWED", destinationId: g(m, 1), entityId: null }) },
  { pattern: new RegExp(`^/destinations/(${ID})/stays/(${ID})/?$`), build: (m) => ({ type: "STAY_VIEWED", destinationId: g(m, 1), entityId: `stay:${g(m, 2)}` }) },
  {
    pattern: new RegExp(`^/destinations/(${ID})/partner-stays/([0-9a-f-]{36})/?$`),
    build: (m) => ({ type: "STAY_VIEWED", destinationId: g(m, 1), entityId: `partner-stay:${g(m, 2)}` }),
  },
];

/** Routes under /destinations/ that are not destinations. */
const NOT_A_DESTINATION = new Set(["compare", "plan"]);

/**
 * The history event a page view proposes, or null. A capsule destination's
 * places open in place on its discover page (`#place-<id>`), so that hash is
 * a place view too.
 */
export function eventForLocation(pathname: string, hash = ""): ProposedEvent | null {
  const discover = new RegExp(`^/destinations/(${ID})/discover/?$`).exec(pathname);
  const placeHash = /^#place-([a-z0-9-]+)$/.exec(hash);
  if (discover && placeHash) {
    return { type: "PLACE_VIEWED", destinationId: g(discover, 1), entityId: `place:${g(placeHash, 1)}` };
  }
  for (const rule of RULES) {
    const match = pathname.match(rule.pattern);
    if (!match) continue;
    const event = rule.build(match);
    if (event.destinationId && NOT_A_DESTINATION.has(event.destinationId)) return null;
    return event;
  }
  return null;
}

/** Destination ids a comparison URL names, deduplicated and capped like the page. */
export function comparisonIds(search: string): string[] {
  const params = new URLSearchParams(search);
  const ids = params
    .getAll("ids")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => /^[a-z0-9-]{1,40}$/.test(value));
  return [...new Set(ids)].slice(0, 4);
}
