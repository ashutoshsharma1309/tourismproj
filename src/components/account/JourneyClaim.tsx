"use client";

import { useState } from "react";

import { saveJourney, setLinked } from "@/components/account/JourneyAccountSync";
import { buttonClasses } from "@/components/ui/Button";
import { useJourney } from "@/lib/journey/JourneyProvider";

/**
 * Shown on the account page when this device holds a journey that was built
 * before signing in. Whose it is cannot be known, so the traveller decides:
 * save it to the account, or keep it on this device only.
 */
export function JourneyClaim({
  destinationNames,
  hasSavedJourney,
}: {
  destinationNames: Record<string, string>;
  hasSavedJourney: boolean;
}) {
  const { journey, hydrated, replace } = useJourney();
  const [decided, setDecided] = useState<"saved" | "kept" | null>(null);
  const [busy, setBusy] = useState(false);

  const isLinked = () => {
    try {
      return window.localStorage.getItem("terrastory.journey.linked.v1") === "1";
    } catch {
      return true;
    }
  };

  if (!hydrated || journey.destinations.length === 0) return null;
  if (decided === "saved") return <p role="status" className="rounded-lg border border-border bg-surface p-4 text-small">This journey is now saved to your account.</p>;
  if (decided === "kept" || isLinked()) return null;

  const names = journey.destinations.map((id) => destinationNames[id] ?? id).join(" → ");

  return (
    <section aria-labelledby="journey-claim" className="rounded-xl border border-accent/40 bg-accent-soft/30 p-5">
      <h2 id="journey-claim" className="font-display text-h4">A journey on this device isn&rsquo;t in your account</h2>
      <p className="mt-2 text-body text-muted">{names}</p>
      <p className="mt-1 text-small text-muted">
        {hasSavedJourney
          ? "Saving it replaces the journey your account has in progress."
          : "Save it to continue it on any device, or keep it here only."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          className={buttonClasses({ variant: "primary", size: "md" })}
          onClick={async () => {
            setBusy(true);
            if (hasSavedJourney) {
              /* Archive the saved one first, then save this device's journey. */
              await saveJourney([], []);
            }
            const ok = await saveJourney(journey.destinations, journey.completed);
            setBusy(false);
            if (ok) {
              setLinked(true);
              replace({ destinations: journey.destinations, completed: journey.completed });
              setDecided("saved");
            }
          }}
        >
          Save to my account
        </button>
        <button type="button" className={buttonClasses({ variant: "secondary", size: "md" })} onClick={() => setDecided("kept")}>
          Keep on this device only
        </button>
      </div>
    </section>
  );
}
