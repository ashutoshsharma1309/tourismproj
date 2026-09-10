"use client";

import Link from "next/link";

import { useJourney } from "@/lib/journey/JourneyProvider";

/**
 * Where this destination sits in the journey, shown inside the Darshan.
 *
 * WHY IT IS ONE LINE
 * ------------------
 * The destination is the hero of this page. A journey that announced itself
 * with a progress dashboard would make the product about the journey, which
 * is the wrong subject — nobody came to watch a stepper fill up. So it is a
 * single row of names with the current one marked, and it renders nothing at
 * all unless the visitor is actually mid-journey with more than one
 * destination chosen.
 *
 * SINGLE-DESTINATION JOURNEYS GET NO INDICATOR. A row that reads "● Mumbai"
 * and nothing else is noise dressed as navigation.
 */
export function JourneyProgress({
  destinationId,
  names,
}: {
  destinationId: string;
  /** id → display name, resolved on the server from the registry. */
  names: Record<string, string>;
}) {
  const { journey, hydrated, isComplete } = useJourney();

  if (!hydrated) return null;
  if (journey.destinations.length < 2) return null;
  if (!journey.destinations.includes(destinationId)) return null;

  const done = journey.completed.length;

  return (
    <nav
      aria-label="Your journey"
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface-muted/50 px-4 py-2.5"
    >
      <span className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
        Your journey
      </span>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
        {journey.destinations.map((id, index) => {
          const here = id === destinationId;
          const finished = isComplete(id);
          return (
            <li key={id} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden className="px-1 text-subtle">
                  ·
                </span>
              ) : null}
              <Link
                href={`/destinations/${id}`}
                prefetch={false}
                aria-current={here ? "page" : undefined}
                className={`rounded-full px-2 py-1 text-caption transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  here
                    ? "bg-primary/10 font-semibold text-primary"
                    : finished
                      ? "text-subtle line-through decoration-subtle/50"
                      : "text-muted"
                }`}
              >
                {/* The state is in the text too, not only in the colour. */}
                <span className="sr-only">
                  {here ? "Current destination: " : finished ? "Completed: " : "Upcoming: "}
                </span>
                {names[id] ?? id}
              </Link>
            </li>
          );
        })}
      </ol>
      <span className="ms-auto text-caption text-subtle" data-numeric>
        {done} of {journey.destinations.length} complete
      </span>
    </nav>
  );
}
