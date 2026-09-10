import { ArrowRight, Compass, MapPin, CalendarRange } from "lucide-react";
import Link from "next/link";

import { InterestProvenance } from "@/components/discovery/InterestProvenance";
import {
  experienceForRecord,
  experiencesFor,
  nearbyExperiences,
  relatedExperiences,
  whyThisPlace,
} from "@/lib/discovery";
import { destinationPath } from "@/lib/destinations/resolve";

/**
 * The discovery block on a record's own page.
 *
 * WHY IT LIVES ON THE EXISTING PAGE RATHER THAN A NEW ONE
 * -------------------------------------------------------
 * A monastery already has a page, with its history, its photographs, its
 * audio guides and its sources. Building a second "experience detail" page
 * beside it would be a second content system for the same subject — the
 * thing this phase's brief explicitly rules out — and would split the
 * archive's own record from the tourism view of it.
 *
 * So discovery is a LENS. This block adds the four things a record page
 * could not answer before: why the place matters in countable terms, what
 * earned each of its interests, what else is connected to it and why, and
 * how to put it in a trip.
 *
 * Server component. It reads the destination's experience set at build time;
 * nothing here reaches the browser.
 */
export async function ExperienceIntelligence({
  destinationId,
  kind,
  slug,
  showHistory = true,
}: {
  destinationId: string;
  kind: "site" | "place";
  slug: string;
  /** Set false where the page already renders its own timeline block. */
  showHistory?: boolean;
}) {
  const experience = await experienceForRecord(destinationId, kind, slug);
  if (!experience) return null;

  const all = await experiencesFor(destinationId);
  const related = relatedExperiences(experience, all, 4);
  const nearby = nearbyExperiences(experience, all, 4);
  const why = whyThisPlace(experience);
  const planHref = destinationPath(destinationId, "plan");

  return (
    <section className="mt-14" aria-labelledby="experience-intelligence">
      <h2 id="experience-intelligence" className="font-display text-h2 text-balance-heading">
        Why this place, and what connects to it
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-surface p-5">
          <h3 className="flex items-center gap-2 font-display text-h4">
            <Compass className="size-4 text-primary" aria-hidden />
            Why this place
          </h3>
          <ul className="mt-3 space-y-1.5">
            {why.map((line) => (
              <li key={line} className="flex gap-2 text-body leading-relaxed text-muted">
                <span aria-hidden className="text-primary">
                  ·
                </span>
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-caption text-subtle">
            Every line above is a count of a relationship recorded in the
            archive, not an assessment.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-display text-h4">What it is catalogued under</h3>
          <InterestProvenance experience={experience} />
          {/*
            "Add to trip" is gone from the product. The action here is the one
            a reader of an intelligence panel actually wants next — to see how
            this record fits an itinerary — and it opens the planner rather
            than silently collecting something.
          */}
          <Link
            href={planHref}
            prefetch={false}
            className="focus-visible:ring-primary mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            <CalendarRange className="size-4" aria-hidden />
            Plan a journey here
          </Link>
          <p className="mt-3 text-caption text-subtle">
            The planner orders this destination&apos;s records by a documented
            formula and states the evidence behind every stop.
          </p>
        </div>
      </div>

      {showHistory && experience.historyRefs.length > 0 ? (
        <div className="mt-8">
          <h3 className="font-display text-h3">Historical events connected to this place</h3>
          <p className="mt-2 max-w-prose text-body text-muted">
            These are events whose own records name {experience.title}. The edge
            is authored on the event, not inferred here.
          </p>
          <ul className="mt-4 space-y-2">
            {experience.historyRefs.map((reference) => (
              <li key={reference.slug}>
                <Link
                  href={reference.href}
                  prefetch={false}
                  className="focus-visible:ring-primary flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-small font-medium transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                >
                  {reference.title}
                  <ArrowRight className="size-4 shrink-0 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {related.length > 0 ? (
        <div className="mt-8">
          <h3 className="font-display text-h3">Connected experiences</h3>
          <p className="mt-2 max-w-prose text-body text-muted">
            Each connection below is an edge recorded in the archive or a
            distance between two published coordinates — never a similarity
            score.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((entry) => (
              <li key={entry.experience.id}>
                <Link
                  href={entry.experience.href}
                  prefetch={false}
                  className="focus-visible:ring-primary flex min-w-0 items-start justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block text-small font-medium">{entry.experience.title}</span>
                    <span className="mt-0.5 block text-caption text-muted">{entry.reason}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {nearby.length > 0 ? (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 font-display text-h3">
            <MapPin className="size-4 text-primary" aria-hidden />
            Nearby
          </h3>
          <p className="mt-2 text-caption text-muted">
            Straight-line distances between published coordinates. Not road
            distances, and not travel times.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((entry) => (
              <li key={entry.experience.id}>
                <Link
                  href={entry.experience.href}
                  prefetch={false}
                  className="focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-caption transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="font-medium">{entry.experience.title}</span>
                  <span className="text-subtle">{entry.straightLineKm} km</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : experience.coordinates === undefined ? (
        <p className="mt-8 text-body text-muted">
          No authoritative coordinate is published for {experience.title}, so
          nothing is offered as nearby — a distance from an assumed position
          would be a made-up number.
        </p>
      ) : null}

      <p className="mt-8">
        <Link
          href={destinationPath(destinationId, "discover")}
          prefetch={false}
          className="font-medium text-primary hover:underline"
        >
          Discover more of this destination
        </Link>
      </p>
    </section>
  );
}
