import { ArrowRight, FileQuestion } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/cn";
import Link from "next/link";

import { VerificationChip } from "@/components/ui/VerificationChip";
import { getArchiveItemByKey } from "@/data/archive";
import type { HistoryEvent } from "@/data/history";

/**
 * One event on the vertical timeline.
 *
 * Desktop puts the year in its own column against the spine; mobile stacks it
 * above the card on a single left rail. Both are the same DOM in the same
 * reading order — the mobile layout is not the desktop one squeezed, and there
 * is no horizontal scrolling at any width.
 */
export function TimelineEvent({ event, priority = false }: { event: HistoryEvent; priority?: boolean }) {
  const media = event.imageKey ? getArchiveItemByKey(event.imageKey) : undefined;

  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 pb-10 last:pb-0 md:grid-cols-[10.5rem_2.5rem_minmax(0,1fr)] md:gap-x-0">
      {/* Year — above the rail on mobile, in its own column on desktop. */}
      <div className="col-start-2 md:col-start-1 md:pt-1 md:text-right">
        <p
          data-numeric
          className="font-display text-h3 leading-none text-primary md:text-h2"
        >
          {event.yearLabel.split(" ")[0]}
        </p>
        <p className="mt-1 font-mono text-eyebrow tracking-widest text-subtle uppercase md:mt-1.5">
          {event.yearLabel}
        </p>
      </div>

      {/* The spine. Decorative — the list itself carries the semantics. */}
      <div
        aria-hidden
        className="col-start-1 row-start-1 row-end-3 flex justify-center md:col-start-2 md:row-start-1 md:row-end-2 md:pt-2"
      >
        <div className="relative flex h-full w-px justify-center bg-border-strong">
          <span className="absolute top-1.5 size-3 rounded-full border-2 border-background bg-primary md:top-2" />
        </div>
      </div>

      {/* The card. */}
      <div className="col-start-2 mt-3 min-w-0 md:col-start-3 md:mt-0">
        <article className="card-focus card-lift group relative overflow-hidden rounded-xl border bg-surface shadow-soft">
          <div className="flex flex-col sm:flex-row">
            {media ? (
              <div className="relative aspect-16/10 shrink-0 overflow-hidden bg-surface-muted sm:aspect-auto sm:w-52 md:w-60">
                <Image
                  src={media.mediaUrl}
                  alt={media.title}
                  fill
                  priority={priority}
                  sizes="(min-width: 768px) 15rem, 100vw"
                  className={cn(
                    "media-zoom object-cover group-hover:scale-[1.04]",
                    media.height > media.width ? "object-[50%_18%]" : "object-center",
                  )}
                />
              </div>
            ) : (
              <div className="flex shrink-0 items-center justify-center border-b border-dashed bg-surface-muted/50 p-6 sm:w-52 sm:border-r sm:border-b-0 md:w-60">
                <div className="text-center">
                  <FileQuestion className="mx-auto size-5 text-subtle" aria-hidden />
                  <p className="mt-2 text-caption leading-relaxed text-subtle">
                    Documentation currently unavailable
                  </p>
                </div>
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col p-5">
              <h3 className="font-display text-h3 text-balance-heading">
                <Link href={`/history/${event.slug}`} className="focus-visible:outline-none">
                  <span className="absolute inset-0 z-10" aria-hidden />
                  {event.title}
                </Link>
              </h3>
              <p className="mt-2 text-small leading-relaxed text-muted">{event.shortDescription}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <VerificationChip status={event.verification} />
                <span className="text-caption text-subtle">
                  {event.sources.length} {event.sources.length === 1 ? "source" : "sources"}
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-small font-medium text-primary">
                  Open
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </li>
  );
}
