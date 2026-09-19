import { listDestinations } from "@/lib/destinations/registry";
import type { JourneyInterest } from "@/lib/planner/types";

/**
 * The journey a visitor is assembling: which destinations, and what they came
 * for.
 *
 * WHY THIS EXISTS AS ITS OWN MODEL
 * --------------------------------
 * Every other piece of state in this product is in the URL, because every
 * other piece belongs to one page. A journey does not: it is built on the
 * homepage, added to from a destination page, and read on a page that has not
 * been written yet. Threading it through query parameters would put a
 * whole-registry list in every link on the site.
 *
 * WHAT IT IS DELIBERATELY NOT
 * ---------------------------
 * It is not "Add to trip" under another name. That was a *collecting* gesture
 * attached to individual records — a button on every discovery card that made
 * hoarding the dominant interaction of a product about why places matter. This
 * is destination-level and journey-level: which places a visitor intends to
 * understand, chosen from a screen whose entire purpose is choosing.
 *
 * It holds NO content. Only ids and interests — the things a person chose. The
 * records themselves are read from the archive by the pages that render them,
 * so a stale or hand-edited journey can never put wrong content on screen; at
 * worst it names a destination that no longer exists, which `sanitise` drops.
 */

/**
 * The whole of a journey: what was chosen, and how far through it the visitor
 * has got.
 *
 * PROGRESS IS A LIST, NOT AN INDEX
 * --------------------------------
 * `completed` holds destination ids rather than a cursor. A cursor breaks the
 * moment somebody removes a destination they had already finished — the number
 * still points somewhere, just at the wrong place. Ids survive reordering,
 * removal and re-adding, and the "current" destination is derived from them:
 * the first chosen destination not yet completed.
 */
export interface JourneyState {
  /** Destination ids, in the order the visitor chose them. */
  destinations: string[];
  /** Interests, from the planner's own closed vocabulary. */
  interests: JourneyInterest[];
  /** Ids the visitor has marked finished. A subset of `destinations`. */
  completed: string[];
  /**
   * Places inside those destinations the traveller chose to remember — record
   * ids such as "sikkim/monastery:rumtek". Added only by an explicit action
   * (the Guide suggests; the traveller clicks). Each belongs to a destination
   * in `destinations`.
   */
  places: string[];
}

export const EMPTY_JOURNEY: JourneyState = { destinations: [], interests: [], completed: [], places: [] };

/** A saved place id: "<destination>/<monastery|place|stay>:<slug>". */
export const JOURNEY_PLACE_ID = /^([a-z-]{2,40})\/(monastery|place|stay):([a-z0-9-]{1,100})$/;
export const MAX_JOURNEY_PLACES = 60;

export function placeDestination(placeId: string): string | null {
  return JOURNEY_PLACE_ID.exec(placeId)?.[1] ?? null;
}

/**
 * How many destinations a single journey may hold: every registered one.
 * Read from the registry rather than typed, so adding a destination never
 * leaves a visitor unable to select the last card.
 */
export const MAX_JOURNEY_DESTINATIONS = listDestinations().length;

/**
 * The storage key, versioned.
 *
 * A shape change ships under a new key rather than a migration: the whole
 * state is two lists of choices a visitor can remake in seconds, and a
 * migration path for that is more code than it could ever save.
 */
export const JOURNEY_STORAGE_KEY = "terrastory.journey.v1";

/**
 * Whatever came out of storage, made safe.
 *
 * Storage is user-writable, survives deploys, and is the one input to this
 * system that is not the archive. Anything unrecognised is dropped rather than
 * rendered: an id that is not a registered destination, a duplicate, a
 * non-string, an oversized list, an interest outside the vocabulary.
 */
export function sanitise(
  raw: unknown,
  knownDestinations: readonly string[],
  knownInterests: readonly string[],
): JourneyState {
  if (!raw || typeof raw !== "object") return EMPTY_JOURNEY;
  const value = raw as Partial<Record<keyof JourneyState, unknown>>;

  const destinations = Array.isArray(value.destinations)
    ? [...new Set(value.destinations.filter((id): id is string => typeof id === "string"))]
        .filter((id) => knownDestinations.includes(id))
        .slice(0, MAX_JOURNEY_DESTINATIONS)
    : [];

  const interests = Array.isArray(value.interests)
    ? ([...new Set(value.interests.filter((i): i is string => typeof i === "string"))].filter(
        (i) => knownInterests.includes(i),
      ) as JourneyInterest[])
    : [];

  /* Progress is only meaningful for destinations still in the journey. */
  const completed = Array.isArray(value.completed)
    ? [...new Set(value.completed.filter((id): id is string => typeof id === "string"))].filter(
        (id) => destinations.includes(id),
      )
    : [];

  const places = Array.isArray(value.places)
    ? [...new Set(value.places.filter((id): id is string => typeof id === "string"))]
        .filter((id) => JOURNEY_PLACE_ID.test(id) && destinations.includes(placeDestination(id) ?? ""))
        .slice(0, MAX_JOURNEY_PLACES)
    : [];

  return { destinations, interests, completed, places };
}

/**
 * Remember a place. Its destination joins the journey too, because a place
 * in a destination the traveller is not going to is not part of their trip.
 */
export function addPlace(state: JourneyState, placeId: string): JourneyState {
  const destination = placeDestination(placeId);
  if (!destination || state.places.includes(placeId) || state.places.length >= MAX_JOURNEY_PLACES) return state;
  const destinations = state.destinations.includes(destination)
    ? state.destinations
    : state.destinations.length >= MAX_JOURNEY_DESTINATIONS
      ? null
      : [...state.destinations, destination];
  if (!destinations) return state;
  return { ...state, destinations, places: [...state.places, placeId] };
}

export function removePlace(state: JourneyState, placeId: string): JourneyState {
  return { ...state, places: state.places.filter((id) => id !== placeId) };
}

/** Toggle a destination, preserving the order the visitor chose. */
export function toggleDestination(state: JourneyState, id: string): JourneyState {
  const has = state.destinations.includes(id);
  if (has) {
    /* Removing a destination removes its progress with it — otherwise
       re-adding it later would show it already finished. */
    return {
      ...state,
      destinations: state.destinations.filter((entry) => entry !== id),
      completed: state.completed.filter((entry) => entry !== id),
      places: state.places.filter((placeId) => placeDestination(placeId) !== id),
    };
  }
  if (state.destinations.length >= MAX_JOURNEY_DESTINATIONS) return state;
  return { ...state, destinations: [...state.destinations, id] };
}

/** Mark a destination finished. Idempotent, and never invents membership. */
export function completeDestination(state: JourneyState, id: string): JourneyState {
  if (!state.destinations.includes(id) || state.completed.includes(id)) return state;
  return { ...state, completed: [...state.completed, id] };
}

/**
 * Where the visitor is: the first chosen destination they have not finished.
 *
 * Derived rather than stored, so it cannot disagree with the two lists it is
 * derived from — the failure mode a stored cursor has.
 */
export function currentDestination(state: JourneyState): string | null {
  return state.destinations.find((id) => !state.completed.includes(id)) ?? null;
}

/** The one after the given destination, in the order the visitor chose. */
export function nextDestination(state: JourneyState, after: string): string | null {
  const at = state.destinations.indexOf(after);
  if (at === -1) return null;
  return state.destinations.slice(at + 1).find((id) => !state.completed.includes(id)) ?? null;
}

/** True when every chosen destination has been finished. */
export function journeyComplete(state: JourneyState): boolean {
  return (
    state.destinations.length > 0 &&
    state.destinations.every((id) => state.completed.includes(id))
  );
}

/** Toggle an interest. */
export function toggleInterest(state: JourneyState, interest: JourneyInterest): JourneyState {
  const has = state.interests.includes(interest);
  return {
    ...state,
    interests: has
      ? state.interests.filter((entry) => entry !== interest)
      : [...state.interests, interest],
  };
}

/**
 * The route a journey begins at.
 *
 * ONE DESTINATION AT A TIME, ALWAYS.
 *
 * A journey of three destinations does not open three dashboards; it opens the
 * first, and the journey bar carries the rest. That is the contract later
 * phases build on, and it is why this returns a single path rather than a
 * list: there is no screen in this product that renders several destinations'
 * content at once, and there should not be one.
 */
export function journeyEntryPath(state: JourneyState): string | null {
  /* Resuming, not restarting: the entry point is wherever the visitor got to. */
  const resume = currentDestination(state);
  if (resume) return `/destinations/${resume}`;
  return state.destinations.length > 0 ? "/journey" : null;
}
