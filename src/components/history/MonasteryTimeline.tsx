import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { getEventsForMonastery, VERIFICATION_LABEL } from "@/data/history";

/**
 * The state's history, filtered to the events that explain this one building.
 *
 * This is the join that makes the timeline more than a school-history page: a
 * visitor reading about Pemayangtse gets the 1642 coronation that created the
 * office its monks were entitled to perform, not a generic chronology.
 *
 * The events themselves live in src/data/history.ts and are rendered in full at
 * /history and /history/[slug]; this component only surfaces the cross-link.
 */
export function MonasteryTimeline({ slug, monasteryName }: { slug: string; monasteryName: string }) {
  const events = getEventsForMonastery(slug);
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="monastery-history-heading" className="mt-14 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="monastery-history-heading" className="font-display text-h2">
          Where {monasteryName} sits in Sikkim&apos;s history
        </h2>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
        >
          The full timeline
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <li key={event.slug} className="min-w-0">
            <Link
              href={`/history/${event.slug}`}
              className="flex h-full flex-col rounded-xl border bg-surface p-5 transition-colors hover:border-primary/50 hover:bg-surface-muted/40"
            >
              <span className="font-mono text-eyebrow tracking-widest text-accent-ink uppercase">
                {event.yearLabel}
              </span>
              <span className="mt-2 font-display text-h4 text-balance-heading">{event.title}</span>
              <span className="mt-2 grow text-small leading-relaxed text-muted">
                {event.shortDescription}
              </span>
              <span className="mt-3 text-caption text-subtle">
                {VERIFICATION_LABEL[event.verification]}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
