"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";

import { useJourney } from "@/lib/journey/JourneyProvider";
import { journeyEntryPath } from "@/lib/journey/state";

/**
 * What the visitor has chosen, and the way onward.
 *
 * WHY IT IS A SECTION AND NOT A FLOATING BAR
 * ------------------------------------------
 * A fixed bar would be the fourth thing pinned to the bottom of this page,
 * behind the ambient-sound toggle and the guide launcher — and those two
 * already had to be shrunk once because they were covering a primary CTA.
 * The tray sits in the page, directly under the destinations it summarises,
 * where the choosing happens.
 *
 * WHAT IT SHOWS WHEN NOTHING IS CHOSEN
 * ------------------------------------
 * An invitation, not a void. The section is the answer to "what do I do with
 * these fifteen cards", so it has to be there before anything is selected;
 * it just has nothing to remove yet.
 *
 * ORDER IS THE ORDER THEY WERE CHOSEN. Not alphabetical, not by coverage — a
 * journey is a sequence, and the visitor built it.
 */
export function JourneyTray({
  names,
}: {
  /** Destination id → display name, resolved on the server from the registry. */
  names: Record<string, string>;
}) {
  const { journey, hydrated, remove, clear } = useJourney();
  const chosen = journey.destinations;
  const entry = journeyEntryPath(journey);

  return (
    <section
      id="your-journey"
      aria-labelledby="journey-heading"
      className="scroll-mt-20 border-y border-border bg-surface-muted/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Your journey
        </p>
        <h2 id="journey-heading" className="mt-3 font-display text-h2 text-balance-heading">
          {hydrated && chosen.length > 0
            ? `${chosen.length} destination${chosen.length === 1 ? "" : "s"} selected`
            : "Choose where to begin"}
        </h2>

        {/*
          `aria-live` so a screen-reader user hears the count change when they
          add or remove a destination from a card further up the page.
        */}
        <div aria-live="polite" className="mt-4">
          {!hydrated ? (
            <p className="text-body text-muted">Loading your journey…</p>
          ) : chosen.length === 0 ? (
            <p className="max-w-2xl text-body-lg leading-relaxed text-muted">
              Add destinations from the cards above. You can pick one, or several
              — a journey runs through them one at a time, and you can change it
              whenever you like.
            </p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {chosen.map((id, index) => (
                  <li key={id}>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface py-1.5 ps-3 pe-1.5 text-small font-medium">
                      <span className="font-mono text-caption text-subtle" data-numeric>
                        {index + 1}
                      </span>
                      {names[id] ?? id}
                      <button
                        type="button"
                        onClick={() => remove(id)}
                        aria-label={`Remove ${names[id] ?? id} from your journey`}
                        className="flex size-6 items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>

              {journey.interests.length > 0 ? (
                <p className="mt-4 text-caption text-subtle">
                  Interests carried with it: {journey.interests.join(", ")}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={entry ?? "#destinations"}
            aria-disabled={!entry}
            prefetch={false}
            onClick={(event) => {
              if (!entry) event.preventDefault();
            }}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-small font-medium transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              entry
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "pointer-events-none bg-surface-muted text-subtle"
            }`}
          >
            Begin my journey
            <ArrowRight className="size-4" aria-hidden />
          </Link>

          {hydrated && chosen.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-full px-3 py-2 text-small font-medium text-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* The boundary, stated rather than left to be discovered. */}
        <p className="mt-4 text-caption text-subtle">
          Your journey is kept in this browser only — there is no account, and
          nothing is sent anywhere.
        </p>
      </div>
    </section>
  );
}
