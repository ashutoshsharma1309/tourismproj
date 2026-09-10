import {
  EMPTY_JOURNEY,
  JOURNEY_STORAGE_KEY,
  sanitise,
  type JourneyState,
} from "@/lib/journey/state";

/**
 * The journey, as an external store that React can subscribe to.
 *
 * WHY NOT useState + useEffect
 * ----------------------------
 * The obvious shape — start empty, read localStorage in an effect, setState —
 * is a cascading render, and the lint rule that forbids it is correct: React
 * renders the whole tree with an empty journey, then immediately renders it
 * again with the real one.
 *
 * `useSyncExternalStore` is the primitive built for exactly this. It takes a
 * server snapshot (always empty, because the server cannot read a browser) and
 * a client snapshot, and React reconciles the two without a hydration
 * mismatch and without a second render pass driven from an effect.
 *
 * THE SNAPSHOT MUST BE REFERENTIALLY STABLE
 * -----------------------------------------
 * `getSnapshot` is called on every render. Parsing JSON there would return a
 * new object each time, React would see the store as perpetually changed, and
 * the component would re-render forever. So the parsed value is cached against
 * the raw string it came from, and re-parsed only when that string changes.
 *
 * CROSS-TAB SYNC COMES FREE. Subscribing to the `storage` event means two open
 * tabs agree about the journey, which the effect-based version did not.
 */
export interface JourneyStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => JourneyState;
  getServerSnapshot: () => JourneyState;
  set: (next: JourneyState) => void;
}

export function createJourneyStore(
  knownDestinations: readonly string[],
  knownInterests: readonly string[],
): JourneyStore {
  const listeners = new Set<() => void>();

  /* Cache keyed on the raw string, so an unchanged store returns an identical
     object and React sees no change. */
  let cachedRaw: string | null = null;
  let cached: JourneyState = EMPTY_JOURNEY;

  const read = (): string | null => {
    try {
      return window.localStorage.getItem(JOURNEY_STORAGE_KEY);
    } catch {
      /* Private modes and blocked storage throw on access, not just on write. */
      return null;
    }
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      /* Another tab writing the same key. */
      const onStorage = (event: StorageEvent) => {
        if (event.key === JOURNEY_STORAGE_KEY) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },

    getSnapshot() {
      const raw = read();
      if (raw === cachedRaw) return cached;
      cachedRaw = raw;
      if (!raw) {
        cached = EMPTY_JOURNEY;
        return cached;
      }
      try {
        cached = sanitise(JSON.parse(raw), knownDestinations, knownInterests);
      } catch {
        /* Corrupt storage reads as no journey rather than taking the page down. */
        cached = EMPTY_JOURNEY;
      }
      return cached;
    },

    /* The server has no browser storage, and this reference must be stable. */
    getServerSnapshot() {
      return EMPTY_JOURNEY;
    },

    set(next) {
      try {
        window.localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* Full or blocked storage: keep the journey for this session anyway. */
      }
      /* Seed the cache so the very next getSnapshot returns the new value even
         if the write above silently failed. */
      cachedRaw = JSON.stringify(next);
      cached = next;
      emit();
    },
  };
}
