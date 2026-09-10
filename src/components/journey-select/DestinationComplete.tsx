"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { useJourney } from "@/lib/journey/JourneyProvider";

/**
 * The end of one destination, and the way into the next.
 *
 * WHY COMPLETION IS A BUTTON AND NOT A SCROLL DEPTH
 * -------------------------------------------------
 * Inferring "explored" from how far somebody scrolled would be a fabricated
 * engagement metric — the reader might have skimmed, or opened the page and
 * left it. A button is a statement the visitor actually made, which is the
 * only kind this product publishes.
 *
 * THE COUNTS ARE REAL OR ABSENT
 * -----------------------------
 * The recap shows what this destination holds, counted from the archive and
 * passed in from the server. It does NOT say how much of it the visitor read,
 * because nothing here measures that and a number that looks like engagement
 * but is really inventory would be the worst kind of fake.
 */
export function DestinationComplete({
  destinationId,
  destinationName,
  names,
  counts,
}: {
  destinationId: string;
  destinationName: string;
  names: Record<string, string>;
  /** What this destination holds — counted from the archive, on the server. */
  counts: { label: string; value: number }[];
}) {
  const { journey, hydrated, isComplete, complete, nextAfter } = useJourney();

  /* Only shown to somebody actually on a journey through this destination. */
  if (!hydrated) return null;
  if (!journey.destinations.includes(destinationId)) return null;

  const done = isComplete(destinationId);
  const next = nextAfter(destinationId);
  const nextName = next ? (names[next] ?? next) : null;

  return (
    <section
      aria-labelledby="darshan-complete"
      className="mt-14 rounded-2xl border border-border bg-surface-muted/50 p-6 md:p-8"
    >
      <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
        {done ? "Completed" : "When you are ready"}
      </p>
      <h2 id="darshan-complete" className="mt-3 font-display text-h3 text-balance-heading">
        {done ? `${destinationName} is marked complete` : `Finish ${destinationName}`}
      </h2>

      {counts.length > 0 ? (
        <>
          <p className="mt-3 max-w-2xl text-body text-muted">
            What this destination holds — counted from the archive, not from how
            much of it you read:
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {counts.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-caption text-subtle">{label}</dt>
                <dd className="font-mono text-h4 font-medium" data-numeric>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {!done ? (
          <button
            type="button"
            onClick={() => complete(destinationId)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Check className="size-4" aria-hidden />
            Mark {destinationName} complete
          </button>
        ) : null}

        {done && next ? (
          <Link
            href={`/destinations/${next}`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Continue to {nextName}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}

        {done && !next ? (
          <Link
            href="/journey"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            See your journey
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}

        <Link
          href="/journey"
          prefetch={false}
          className="rounded-full px-3 py-2 text-small font-medium text-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {done ? "Review the journey" : "See the whole journey"}
        </Link>
      </div>
    </section>
  );
}
