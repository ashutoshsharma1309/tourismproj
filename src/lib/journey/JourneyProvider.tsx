"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { createJourneyStore } from "@/lib/journey/store";
import {
  EMPTY_JOURNEY,
  MAX_JOURNEY_DESTINATIONS,
  completeDestination,
  currentDestination,
  journeyComplete,
  nextDestination,
  toggleDestination,
  toggleInterest,
  type JourneyState,
} from "@/lib/journey/state";
import type { JourneyInterest } from "@/lib/planner/types";

/**
 * The journey, held in the browser.
 *
 * WHY LOCALSTORAGE AND NOT A DATABASE
 * -----------------------------------
 * The whole state is two lists of choices a visitor makes in about fifteen
 * seconds. There is no account system, and adding one so a shortlist could
 * survive a change of device would be a far larger promise than this feature
 * makes. The boundary is stated on screen rather than left to be discovered:
 * the journey lives in this browser.
 *
 * WHY useSyncExternalStore
 * ------------------------
 * See `store.ts`. The short version: the obvious useState + useEffect shape is
 * a cascading render, and this is the primitive React provides for reading
 * browser state without a hydration mismatch.
 *
 * WHAT THE PROVIDER DOES NOT KNOW
 * -------------------------------
 * The registry. It is handed the valid ids and interests as props from a
 * server component, because importing the destination registry into a client
 * component ships the whole registry to the browser — a trap this repository
 * has hit three times, most recently with the twenty-language dictionary.
 */

interface JourneyContextValue {
  journey: JourneyState;
  /**
   * False during the server render and the hydrating pass. Consumers use it to
   * avoid telling somebody with three destinations that they have none.
   */
  hydrated: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  toggleInterestId: (interest: JourneyInterest) => void;
  clear: () => void;
  full: boolean;
  /** Progress, all derived from the two lists so they cannot disagree. */
  complete: (id: string) => void;
  isComplete: (id: string) => boolean;
  current: string | null;
  nextAfter: (id: string) => string | null;
  finished: boolean;
  /**
   * Put a journey saved to the traveller's account onto this device.
   * Unknown ids are dropped by the store's sanitise-on-read.
   */
  replace: (next: { destinations: string[]; completed: string[] }) => void;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({
  children,
  destinationIds,
  interestIds,
}: {
  children: ReactNode;
  destinationIds: readonly string[];
  interestIds: readonly string[];
}) {
  /* One store for the life of the provider. */
  const [store] = useState(() => createJourneyStore(destinationIds, interestIds));

  const journey = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  /*
   * `hydrated` is derived the same way: the server snapshot says false, the
   * client snapshot says true, and React swaps them in the same pass it swaps
   * the journey. No effect, no second render.
   */
  const hydrated = useSyncExternalStore(
    store.subscribe,
    () => true,
    () => false,
  );

  const value = useMemo<JourneyContextValue>(
    () => ({
      journey,
      hydrated,
      isSelected: (id) => journey.destinations.includes(id),
      toggle: (id) => store.set(toggleDestination(journey, id)),
      remove: (id) =>
        store.set({
          ...journey,
          destinations: journey.destinations.filter((entry) => entry !== id),
        }),
      toggleInterestId: (interest) => store.set(toggleInterest(journey, interest)),
      clear: () => store.set(EMPTY_JOURNEY),
      full: journey.destinations.length >= MAX_JOURNEY_DESTINATIONS,
      complete: (id) => store.set(completeDestination(journey, id)),
      isComplete: (id) => journey.completed.includes(id),
      current: currentDestination(journey),
      nextAfter: (id) => nextDestination(journey, id),
      finished: journeyComplete(journey),
      replace: (next) => store.set({ ...journey, destinations: next.destinations, completed: next.completed }),
    }),
    [journey, hydrated, store],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

/**
 * The journey, for a client component.
 *
 * Throws outside the provider rather than returning an empty journey: a
 * selector that silently does nothing is much harder to notice than one that
 * fails immediately.
 */
export function useJourney(): JourneyContextValue {
  const context = useContext(JourneyContext);
  if (!context) throw new Error("useJourney must be used inside <JourneyProvider>");
  return context;
}
