/**
 * What the visitor has actually opened.
 *
 * WHY IT IS SHAPED LIKE THIS
 * --------------------------
 * The requirement was discovery that learns from use rather than from a
 * "what kind of traveller are you?" prompt — nobody answers those honestly and
 * a heritage archive should not be asking. So the only signal is what someone
 * opened, in what order.
 *
 * Two constraints shaped the implementation:
 *
 * 1. It never leaves the browser. There is no endpoint, no identifier and no
 *    profile — localStorage and nothing else. A public archive of a living
 *    religious tradition has no business building a behavioural record of who
 *    read what, and saying so is worth more than the data would be.
 *
 * 2. It does not ship the graph. Recommending "related to what you viewed"
 *    naively means putting the whole corpus in the client so it can be
 *    traversed — which is precisely the mistake that had 70 stories and 77
 *    archive items travelling in the JavaScript for every route. Instead each
 *    page hands the recorder the handful of neighbours it already computed on
 *    the server, and those travel with the visit. The client stores a graph
 *    fragment, never the graph.
 */

export type VisitKind = "monastery" | "place" | "story" | "event" | "archive";

export interface VisitLink {
  kind: VisitKind;
  name: string;
  href: string;
}

export interface VisitRecord extends VisitLink {
  /** Epoch ms. Used for ordering and for ageing the history out. */
  at: number;
  /** Server-computed neighbours of this entity — the graph fragment. */
  neighbours: VisitLink[];
}

const KEY = "sikkim-darshan:visits";

/** Keep the trail short: this is "what you were just looking at", not a log. */
const MAX_VISITS = 12;

/** Older than this and it is no longer "recent" in any useful sense. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function isRecord(value: unknown): value is VisitRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<VisitRecord>;
  return (
    typeof v.href === "string" &&
    typeof v.name === "string" &&
    typeof v.kind === "string" &&
    typeof v.at === "number"
  );
}

export function readVisits(): VisitRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed
      .filter(isRecord)
      .filter((v) => v.at >= cutoff)
      .map((v) => ({ ...v, neighbours: Array.isArray(v.neighbours) ? v.neighbours : [] }))
      .sort((a, b) => b.at - a.at);
  } catch {
    /* A corrupt or unreadable store must never break a page. */
    return [];
  }
}

/** Record a visit, moving it to the front if it has been seen before. */
export function recordVisit(entry: Omit<VisitRecord, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readVisits().filter((v) => v.href !== entry.href);
    const next = [{ ...entry, at: Date.now() }, ...existing].slice(0, MAX_VISITS);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    notify();
  } catch {
    /* Private browsing, a full quota, or storage disabled. Discovery is a
       nicety; failing to record must never surface to the visitor. */
  }
}

export function clearVisits(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    notify();
  } catch {
    /* as above */
  }
}

/**
 * Things worth offering next.
 *
 * The neighbours of everything recently opened, minus everything already
 * opened, most-recent source first. Deduplicated by href, because two
 * monasteries in the same district will propose each other's stories.
 */
export function suggestionsFrom(visits: VisitRecord[], limit = 6): VisitLink[] {
  const seen = new Set(visits.map((v) => v.href));
  const out: VisitLink[] = [];
  for (const visit of visits) {
    for (const neighbour of visit.neighbours) {
      if (seen.has(neighbour.href)) continue;
      seen.add(neighbour.href);
      out.push(neighbour);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/* ------------------------------------------------------- external store ---
 *
 * Reading localStorage during render would disagree with the server's HTML, and
 * reading it in an effect to call setState is the pattern React now warns
 * about. useSyncExternalStore is the API built for exactly this: a snapshot the
 * server can produce (always empty) and one the client reads from storage.
 *
 * getSnapshot has to be referentially stable or React re-renders forever, so
 * the parsed array is memoised against the raw string it came from and only
 * recomputed when that string actually changes.
 */

const EMPTY: VisitRecord[] = [];

let cachedRaw: string | null = null;
let cachedValue: VisitRecord[] = EMPTY;

export function getVisitsSnapshot(): VisitRecord[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = readVisits();
  return cachedValue;
}

/** The server has no storage, so it always sees an empty history. */
export function getVisitsServerSnapshot(): VisitRecord[] {
  return EMPTY;
}

/**
 * Storage changes come from two directions: another tab (the `storage` event)
 * and this tab (recordVisit, which fires no event of its own).
 */
const listeners = new Set<() => void>();

export function subscribeToVisits(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onChange);
  }
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onChange);
    }
  };
}

function notify() {
  cachedRaw = null; // force a re-parse on the next snapshot
  for (const listener of listeners) listener();
}
