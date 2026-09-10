import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { VerificationChip } from "@/components/ui/VerificationChip";
import { archiveEraAnchor, archiveTimelineByEra, TIMELINE_STATS } from "@/data/archive-timeline";
import type { TimelineEntry } from "@/data/archive-timeline";

/**
 * The archive placed in time.
 *
 * A server component on purpose. The whole thing is static data and the era
 * jump-bar is anchor links, so nothing here needs to reach the browser as
 * JavaScript — the page already ships a client-side explorer for search, and
 * shipping a second copy of the catalogue to render a list would undo that.
 *
 * STRUCTURE
 * ---------
 * One rail down the left, era headings above it, objects hanging off it in date
 * order. The rail and the year gutter are aria-hidden decoration: every date
 * they mark is also written in the row itself, so a screen reader hears the
 * record rather than the drawing of it.
 *
 * Every row states the period label exactly as the record writes it. Nothing
 * here interpolates a year, and nothing rounds "Founded late 19th century" into
 * a number — see sortYearOf for why the parsed year is ordering-only.
 */

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const { item } = entry;

  return (
    <li className="relative pl-8 sm:pl-28">
      {/*
        The year in the gutter is what makes this scan as a timeline rather than
        as a list with dates in it. It is hidden below `sm`, where there is no
        room for a gutter and the row's own period line carries the date.

        It prints an explicit year only — see gutterLabelOf. A record reading
        "Founded late 19th century" shows "19th c." here, never the 1850 it
        sorts by.
      */}
      {entry.gutter ? (
        <span
          data-numeric
          aria-hidden
          className="absolute top-6 left-0 hidden w-20 text-right font-mono text-caption font-medium text-subtle sm:block"
        >
          {entry.gutter}
        </span>
      ) : null}

      {/*
        The node on the rail. Filled for material photographed in Sikkim, hollow
        for a stand-in photographed elsewhere — the same distinction the card
        badge makes, carried into the rail so the shape of the collection is
        visible while scrolling rather than only on each card.
      */}
      <span
        aria-hidden
        className={cnNode(item.sikkimSubject)}
      />

      <article className="card-focus card-lift group relative flex gap-4 rounded-xl border bg-surface p-4 shadow-soft sm:gap-5 sm:p-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:size-28">
          <Image
            src={item.mediaUrl}
            alt={item.title}
            fill
            loading="lazy"
            sizes="(min-width: 640px) 7rem, 5rem"
            className="media-zoom object-cover group-hover:scale-[1.04]"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-caption text-subtle">
            {/* The record's own words. Never the parsed sort year. */}
            <span className="font-medium text-accent-ink">{item.period}</span>
            <span aria-hidden>·</span>
            <span className="tracking-wider uppercase">{item.category}</span>
          </p>

          <h3 className="font-display text-h4 text-balance-heading">
            <Link href={`/destinations/sikkim/archive/${item.id}`} className="focus-visible:outline-none">
              <span className="absolute inset-0 z-10" aria-hidden />
              {item.title}
            </Link>
          </h3>

          {item.summary ? (
            <p className="line-clamp-2 text-small leading-relaxed text-muted">{item.summary}</p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1.5">
            <VerificationChip status={item.verification} />
            {item.community ? <Badge tone="neutral">{item.community}</Badge> : null}
            {item.location ? (
              <span className="flex items-center gap-1 font-mono text-caption text-subtle">
                <MapPin className="size-3" aria-hidden />
                {item.location}
              </span>
            ) : null}
            {!item.sikkimSubject ? (
              <Badge tone="warning">Photographed outside Sikkim</Badge>
            ) : null}
            <span className="ml-auto font-mono text-caption text-subtle">{item.license}</span>
          </div>
        </div>
      </article>
    </li>
  );
}

/** The rail node. Extracted only to keep the class string out of the markup. */
function cnNode(inSikkim: boolean): string {
  return [
    "absolute top-6 left-3.25 size-3 rounded-full border-2 sm:left-24",
    inSikkim ? "border-primary bg-primary" : "border-border-strong bg-surface",
  ].join(" ");
}

export function ArchiveTimeline() {
  return (
    <div>
      {/* Era jump bar. Anchors, so it works with JavaScript disabled and each
          era is linkable on its own. */}
      <nav aria-label="Jump to an era" className="flex flex-wrap gap-2">
        {archiveTimelineByEra.map((group) => (
          <a
            key={group.era}
            href={`#${archiveEraAnchor(group.era)}`}
            className="rounded-full border border-border-strong px-3.5 py-1.5 font-mono text-caption text-muted transition-colors hover:border-primary hover:text-primary"
          >
            {group.era}
            <span data-numeric className="ml-1.5 text-subtle">
              {group.entries.length}
            </span>
          </a>
        ))}
      </nav>

      {archiveTimelineByEra.map((group) => (
        <section
          key={group.era}
          id={archiveEraAnchor(group.era)}
          className="mt-12 scroll-mt-24"
          aria-labelledby={`${archiveEraAnchor(group.era)}-heading`}
        >
          {/*
            Sticky, because an era is 8 to 13 rows tall and the reader loses
            which century they are in halfway down it. `top` clears the fixed
            header; the backdrop is opaque so rows do not read through it.
          */}
          <div className="sticky top-16 z-10 -mx-2 bg-surface-muted/95 px-2 py-2 backdrop-blur-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id={`${archiveEraAnchor(group.era)}-heading`} className="font-display text-h3">
                {group.era}
              </h3>
              <span data-numeric className="font-mono text-caption text-subtle">
                {group.span} · {group.entries.length}{" "}
                {group.entries.length === 1 ? "object" : "objects"}
              </span>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-small leading-relaxed text-muted">{group.blurb}</p>

          {/*
            The rail is one absolutely positioned line behind the rows, not a
            border on each row — rows are separated by a gap, and a per-row
            border would draw the timeline as a dashed line. It is aria-hidden:
            it carries nothing the headings and the dates do not already say.
          */}
          {/* The rail lives outside the <ul>: a list may only contain list
              items, and a decorative span among the rows is invalid markup an
              assistive technology is entitled to expose. */}
          <div className="relative mt-6">
            <span
              aria-hidden
              className="absolute top-3 bottom-3 left-4.5 w-0.5 rounded bg-border sm:left-25.25"
            />
            <ul className="flex flex-col gap-4">
              {group.entries.map((entry) => (
                <TimelineRow key={entry.item.id} entry={entry} />
              ))}
            </ul>
          </div>
        </section>
      ))}

      <p className="mt-10 rounded-xl border border-dashed p-5 text-small leading-relaxed text-muted">
        <strong className="text-foreground">
          {TIMELINE_STATS.dated} of {TIMELINE_STATS.total} objects carry a date
        </strong>{" "}
        and appear above, from {TIMELINE_STATS.earliest} to {TIMELINE_STATS.latest}. The
        other {TIMELINE_STATS.undated} are not undated by oversight: a dish, a
        drum, a lake or a weaving technique documents something continuously
        true, and giving it a year to fill out the timeline would be inventing
        the one thing this archive refuses to invent. They are searchable below,
        and each carries its own source.
      </p>
    </div>
  );
}
