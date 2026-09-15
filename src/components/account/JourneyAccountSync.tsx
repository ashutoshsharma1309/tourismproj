"use client";

import { useEffect, useRef, useState } from "react";

import { JOURNEY_LINK_KEY } from "@/lib/account/client";
import { clearSignedInHint, hasSignedInHint } from "@/lib/account/hint";
import { useJourney } from "@/lib/journey/JourneyProvider";

/**
 * Keeps the journey on this device and the signed-in traveller's saved
 * journey in step, without ever deciding on their behalf whose journey an
 * anonymous one was.
 *
 *   saved journey, empty device        → the saved journey is loaded here
 *   device journey already linked      → changes are saved to the account
 *   empty device, nothing saved        → linked: a journey started while
 *                                         signed in is saved as it grows
 *   device journey never linked        → nothing happens automatically;
 *                                         <JourneyClaim> asks the traveller
 *
 * "Linked" is a flag in this browser set when the journey was loaded from or
 * saved to the account, and removed at sign-out along with the journey.
 */

function linked(): boolean {
  try {
    return window.localStorage.getItem(JOURNEY_LINK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLinked(on: boolean) {
  try {
    if (on) window.localStorage.setItem(JOURNEY_LINK_KEY, "1");
    else window.localStorage.removeItem(JOURNEY_LINK_KEY);
  } catch {
    /* storage blocked */
  }
}

export async function saveJourney(destinationIds: string[], completedIds: string[]): Promise<boolean> {
  try {
    const response = await fetch("/api/account/journey", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destinationIds, completedIds }),
      credentials: "same-origin",
    });
    if (response.status === 401) clearSignedInHint();
    return response.ok;
  } catch {
    return false;
  }
}

export function JourneyAccountSync() {
  const { journey, hydrated, replace } = useJourney();
  const [ready, setReady] = useState(false);
  const lastSaved = useRef<string>("");

  /* Once per page load: load the saved journey onto an empty device. */
  useEffect(() => {
    /* Signed out: nothing to load, and the save effect below does nothing. */
    if (!hydrated || ready || !hasSignedInHint()) return;
    let cancelled = false;
    fetch("/api/account/journey", { credentials: "same-origin" })
      .then((response) => {
        if (response.status === 401) clearSignedInHint();
        return response.ok ? response.json() : null;
      })
      .then((body: { journey: { destinationIds: string[]; completedIds: string[] } | null } | null) => {
        if (cancelled) return;
        const saved = body?.journey ?? null;
        if (saved && journey.destinations.length === 0) {
          replace({ destinations: saved.destinationIds, completed: saved.completedIds });
          lastSaved.current = JSON.stringify([saved.destinationIds, saved.completedIds]);
          setLinked(true);
        } else if (saved && linked()) {
          lastSaved.current = JSON.stringify([saved.destinationIds, saved.completedIds]);
        } else if (!saved && journey.destinations.length === 0) {
          /* Signed in, nothing saved, nothing on the device: a journey started
             from here on is this traveller's own, so it is saved as it grows. */
          setLinked(true);
          lastSaved.current = JSON.stringify([[], []]);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once hydrated
  }, [hydrated]);

  /* Afterwards: save changes to a linked journey, debounced. */
  useEffect(() => {
    if (!ready || !hasSignedInHint() || !linked()) return;
    const key = JSON.stringify([journey.destinations, journey.completed]);
    if (key === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      void saveJourney(journey.destinations, journey.completed).then((ok) => {
        if (ok) lastSaved.current = key;
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [journey, ready]);

  return null;
}
