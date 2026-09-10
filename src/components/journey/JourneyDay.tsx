import { MapPin, Minus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { spreadKm } from "@/lib/planner/geography";
import type { ItineraryDay, ItineraryStop, JourneyInput } from "@/lib/planner/types";
import { planHref } from "@/lib/planner/state";

/**
 * One day of the plan.
 *
 * Reads as an itinerary, not as a wall of text: the day states where it is,
 * each stop states why it is there, and every distance says what it is —
 * straight-line, between two published coordinates. There is no schedule,
 * because no record in this archive publishes how long a visit takes.
 */
export function JourneyDay({
  day,
  basePath,
  state,
}: {
  day: ItineraryDay;
  basePath: string;
  state: JourneyInput;
}) {
  const spread = spreadKm(day.stops.map((stop) => stop.experience));

  return (
    /*
     * Labelled by the day number AND the title, in that order.
     *
     * The title alone was the accessible name, and for a CAPSULE destination
     * every day carries the same one: a capsule has a single scope line, the
     * planner groups a day by administrative area, so New York City's two-day
     * plan produced two `region` landmarks both called "Heritage and
     * landscape — The harbour monuments, bridges and museums of the city".
     * axe reports that as `landmark-unique`, and it is right: a screen-reader
     * user listing the landmarks on that page saw the same entry twice with
     * nothing to tell them apart.
     *
     * The day number is already on the page and already the thing that
     * distinguishes them; it just was not part of the name. Nothing moves
     * visually.
     */
    <section
      className="rounded-xl border border-border bg-surface p-5 md:p-6"
      aria-labelledby={`day-label-${day.day} day-${day.day}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p
          id={`day-label-${day.day}`}
          className="font-mono text-eyebrow tracking-widest text-primary uppercase"
        >
          Day {day.day}
        </p>
        {spread !== undefined ? (
          <p className="text-caption text-muted">
            Stops lie within {spread} km of each other in a straight line
          </p>
        ) : null}
      </div>
      <h3 id={`day-${day.day}`} className="mt-2 font-display text-h3 text-balance-heading">
        {day.title}
      </h3>

      <ol className="mt-5 space-y-5">
        {day.stops.map((stop, index) => (
          <Stop
            key={stop.experience.id}
            stop={stop}
            index={index + 1}
            basePath={basePath}
            state={state}
          />
        ))}
      </ol>
    </section>
  );
}

function Stop({
  stop,
  index,
  basePath,
  state,
}: {
  stop: ItineraryStop;
  index: number;
  basePath: string;
  state: JourneyInput;
}) {
  const { experience } = stop;
  const removeHref = planHref(basePath, state, {
    removed: [...state.removed, experience.id],
  });

  return (
    <li className="min-w-0 border-t border-border pt-5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-mono text-caption text-subtle">{index}</p>
          <h4 className="mt-1 font-display text-h4 text-balance-heading">
            <Link href={experience.href} prefetch={false} className="hover:text-primary">
              {experience.title}
            </Link>
          </h4>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
            <Badge tone="neutral">{experience.typeLabel}</Badge>
            {experience.area ? <span>{experience.area}</span> : null}
          </p>
        </div>
        <Link
          href={removeHref}
          scroll={false}
          prefetch={false}
          className="focus-visible:ring-primary inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-caption font-medium text-muted transition-colors hover:border-error hover:text-error focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Remove ${experience.title} from the plan`}
        >
          <Minus className="size-3.5" aria-hidden />
          Remove
        </Link>
      </div>

      {/* The record's own sourced sentence. Not rewritten by the planner. */}
      <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">{experience.summary}</p>

      {stop.reasons.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {stop.reasons.map((reason) => (
            <li key={reason.text} className="flex gap-2 text-caption leading-relaxed text-foreground">
              <span aria-hidden className="text-primary">
                ·
              </span>
              {reason.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-subtle">
        {stop.straightLineFromPreviousKm !== undefined ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            {stop.straightLineFromPreviousKm} km from the previous stop in a straight line — not a
            road distance or a travel time
          </span>
        ) : null}
        {experience.coordinates === undefined ? (
          <span>No published coordinate, so it is not placed geographically</span>
        ) : null}
      </div>

      {experience.practical.length > 0 ? (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-caption">
          {experience.practical.map((note) => (
            <div key={note.label} className="flex gap-1.5">
              <dt className="font-medium text-foreground">{note.label}:</dt>
              <dd className="text-muted">{note.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {experience.historyRefs.length > 0 || experience.storyRefs.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
          <span className="text-subtle">Evidence:</span>
          {experience.historyRefs.slice(0, 2).map((reference) => (
            <Link key={reference.slug} href={reference.href} prefetch={false} className="text-primary hover:underline">
              {reference.title}
            </Link>
          ))}
          {experience.storyRefs.slice(0, 2).map((reference) => (
            <Link key={reference.slug} href={reference.href} prefetch={false} className="text-primary hover:underline">
              {reference.title}
            </Link>
          ))}
        </p>
      ) : null}
    </li>
  );
}
