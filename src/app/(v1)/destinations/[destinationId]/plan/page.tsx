/*
 * PHASE 13 — the journey planner.
 *
 * Destination-native: the destination comes from the route and is never
 * asked for again. The plan itself comes from the query string, so the URL
 * is the entire state — see src/lib/planner/state.ts.
 */
import { ArrowRight, Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import { JourneyDay } from "@/components/journey/JourneyDay";
import { JourneyForm } from "@/components/journey/JourneyForm";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { NotAvailable } from "@/components/ui/Provenance";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { listDestinations } from "@/lib/destinations/registry";
import {
  destinationPath,
  destinationsWithAnyCapability,
  resolveDestination,
} from "@/lib/destinations/resolve";
import { destinationOpenGraph } from "@/lib/destinations/social-card";
import { availableInterests, buildCandidates, buildItinerary } from "@/lib/planner";
import { parseState, planHref } from "@/lib/planner/state";
import { INTEREST_LABEL, PACE_CAPACITY, PACE_LABEL } from "@/lib/planner/types";

/**
 * The capability that makes a PLAN possible: somewhere sourced to go.
 *
 * `knowledge` is accepted as well, and only so the page can be honest: a
 * destination with approved research but no catalogued site renders "no
 * verified experiences yet" instead of a 404 that would read as "no such
 * destination". A destination with neither gets no route at all.
 */
const CAPABILITY = "experiences" as const;
const HONEST_EMPTY_CAPABILITY = "knowledge" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithAnyCapability(
    [CAPABILITY, HONEST_EMPTY_CAPABILITY],
    listDestinations().map((destination) => destination.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

interface PageProps {
  params: Promise<{ destinationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destinationId } = await params;
  const { destination } = await resolveDestination(destinationId);
  const name = destination.name;

  const title = `Plan a journey in ${name}`;
  const description = `Build a day-by-day journey through ${name} from catalogued, sourced records — every recommendation explained, nothing invented.`;
  const canonical = destinationPath(destinationId, "plan");

  /*
   * The card is declared here for the same reason the hub declares one: page
   * metadata REPLACES the parent's openGraph rather than merging into it, so
   * a page that omits the block inherits the root layout's Sikkim
   * photograph. `/destinations/jaipur/plan` shipped exactly that until
   * qa:planner caught it.
   */
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: await destinationOpenGraph(destination, { title, description, url: canonical }),
  };
}

export default async function PlanPage({ params, searchParams }: PageProps) {
  const { destinationId } = await params;
  const { destination, capabilities } = await resolveDestination(destinationId);
  if (!capabilities[CAPABILITY] && !capabilities[HONEST_EMPTY_CAPABILITY]) notFound();

  const candidates = await buildCandidates(destinationId);
  const offeredInterests = availableInterests(candidates);
  const state = parseState(destinationId, await searchParams, candidates, offeredInterests);
  const itinerary = await buildItinerary(state);

  const basePath = destinationPath(destinationId, "plan");
  const knowledge = getPublishedKnowledge(destinationId);
  const mapped = candidates.filter((candidate) => candidate.coordinates !== undefined).length;
  const areas = new Set(candidates.map((candidate) => candidate.area).filter(Boolean));

  return (
    <>
      <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Plan"
        />

        <p className="mt-6 font-mono text-eyebrow tracking-widest text-primary uppercase">
          Journey planner
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Plan a journey in {destination.name}
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
          Built from {candidates.length} catalogued {candidates.length === 1 ? "record" : "records"}
          {areas.size > 0 ? ` across ${areas.size} ${areas.size === 1 ? "district" : "districts"}` : ""} —
          the same place, story and history records the rest of this
          archive publishes. Every recommendation states why it is there, and
          nothing here is generated: there is no model in this path.
        </p>

        {candidates.length === 0 ? (
          <div className="mt-10">
            <NotAvailable
              title="No verified experiences yet"
              body={
                knowledge
                  ? `${destination.name} has ${knowledge.depth.metrics.approvedClaims} reviewer-approved facts, but no catalogued site or place record — and a fact is not somewhere you can stand. Rather than turn sentences into stops, the planner says so.`
                  : `${destination.name} is registered, but nothing visitable has been catalogued for it yet. No itinerary can honestly be built.`
              }
              action={
                <Link
                  href={destinationPath(destinationId)}
                  className="font-medium text-primary hover:underline"
                >
                  See what {destination.name} does have
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-10">
              <JourneyForm action={basePath} state={state} offeredInterests={offeredInterests} />
            </div>

            <section className="mt-10" aria-labelledby="plan-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h2 id="plan-heading" className="font-display text-h2 text-balance-heading">
                  {itinerary.days.length === 0
                    ? "No plan could be built"
                    : `${itinerary.days.length}-day plan`}
                </h2>
                <p className="text-caption text-muted">
                  {PACE_LABEL[state.pace]} pace · up to {PACE_CAPACITY[state.pace]} places a day ·{" "}
                  {itinerary.stopCount} {itinerary.stopCount === 1 ? "stop" : "stops"}
                </p>
              </div>

              {state.interests.length > 0 ? (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-caption text-muted">
                  <span>Ranked for</span>
                  {state.interests.map((interest) => (
                    <Badge key={interest} tone="jade">
                      {INTEREST_LABEL[interest]}
                    </Badge>
                  ))}
                </p>
              ) : (
                <p className="mt-3 text-caption text-muted">
                  No interests selected, so the ranking falls back to how much of
                  the archive points at each record and how well sourced it is.
                </p>
              )}

              {itinerary.gap ? (
                <p className="mt-5 rounded-lg border border-warning/40 bg-warning-soft/40 p-4 text-body text-foreground">
                  {itinerary.gap.message}
                  {itinerary.gap.unusedCount > 0
                    ? ` ${itinerary.gap.unusedCount} further ${itinerary.gap.unusedCount === 1 ? "record" : "records"} did not fit this pace.`
                    : ""}{" "}
                  Nothing has been invented to fill the remaining{" "}
                  {itinerary.gap.requestedDays - itinerary.gap.plannedDays}{" "}
                  {itinerary.gap.requestedDays - itinerary.gap.plannedDays === 1 ? "day" : "days"}.
                </p>
              ) : null}

              {state.pinned.length > 0 ? (
                <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-primary/30 bg-primary-soft/40 p-4 text-body">
                  <span>
                    {state.pinned.length}{" "}
                    {state.pinned.length === 1 ? "experience you added" : "experiences you added"}{" "}
                    from discovery{" "}
                    {state.pinned.length === 1 ? "is" : "are"} kept in this plan — the planner
                    decided the day and the order around{" "}
                    {state.pinned.length === 1 ? "it" : "them"}.
                  </span>
                  <Link
                    href={planHref(basePath, state, { pinned: [] })}
                    className="font-medium text-primary hover:underline"
                  >
                    Clear additions
                  </Link>
                </p>
              ) : null}

              {state.removed.length > 0 ? (
                <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
                  <span>
                    {state.removed.length} {state.removed.length === 1 ? "stop" : "stops"} removed
                    and the plan rebuilt around{" "}
                    {state.removed.length === 1 ? "it" : "them"}.
                  </span>
                  <Link
                    href={planHref(basePath, state, { removed: [] })}
                    className="font-medium text-primary hover:underline"
                  >
                    Put them back
                  </Link>
                </p>
              ) : null}

              {state.rejectedRemovals > 0 || state.rejectedPins > 0 || state.rejectedInterests > 0 ? (
                <p className="mt-3 text-caption text-subtle">
                  {state.rejectedRemovals + state.rejectedPins + state.rejectedInterests} value
                  {state.rejectedRemovals + state.rejectedPins + state.rejectedInterests === 1
                    ? " was"
                    : "s were"}{" "}
                  ignored: this planner only accepts identifiers that belong to{" "}
                  {destination.name}.
                </p>
              ) : null}

              <div className="mt-6 space-y-6">
                {itinerary.days.map((day) => (
                  <JourneyDay key={day.day} day={day} basePath={basePath} state={state} />
                ))}
              </div>
            </section>

            {/*
              Practical safety, stated once and prominently rather than
              repeated per stop. Hours, fees, transport and availability are
              not published for these records, and the planner does not
              produce them (§I8 in docs/protected-features.md).
            */}
            <section className="mt-10 rounded-xl border border-border bg-surface-muted/60 p-5 md:p-6">
              <h2 className="font-display text-h3">What this plan does not tell you</h2>
              <ul className="mt-3 space-y-2 text-body text-muted">
                <li>
                  <strong className="font-medium text-foreground">
                    Opening hours, fees and transport are not verified
                  </strong>{" "}
                  for these records, so none are shown. Where a record does publish
                  something practical — a permit requirement, an elevation — it
                  appears on the stop itself.
                </li>
                <li>
                  <strong className="font-medium text-foreground">
                    Distances are straight lines
                  </strong>{" "}
                  between published coordinates, never road distances and never
                  travel times. {mapped} of {candidates.length} records publish a
                  coordinate; the rest are placed by district only.
                </li>
                <li>
                  <strong className="font-medium text-foreground">Nothing here is AI-generated.</strong>{" "}
                  The ranking is a documented arithmetic formula and the
                  explanations describe that arithmetic.
                </li>
              </ul>
              {capabilities.tripPlanner ? (
                <p className="mt-4 text-body text-muted">
                  For road legs between valleys, {destination.name} also has a{" "}
                  <Link
                    href={destinationPath(destinationId, "planner")}
                    className="font-medium text-primary hover:underline"
                  >
                    routed itinerary planner
                  </Link>{" "}
                  built on a hand-authored corridor graph.
                </p>
              ) : null}
            </section>

            {itinerary.alsoAvailable.length > 0 ? (
              <section className="mt-10" aria-labelledby="also-heading">
                <h2 id="also-heading" className="font-display text-h3">
                  Also catalogued, not placed
                </h2>
                <p className="mt-2 max-w-prose text-body text-muted">
                  {itinerary.alsoAvailable.length} further{" "}
                  {itinerary.alsoAvailable.length === 1 ? "record" : "records"} ranked lower for
                  these choices. Change the interests or the pace and they move.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {itinerary.alsoAvailable.slice(0, 8).map((experience) => (
                    <li key={experience.id}>
                      <Link
                        href={experience.href}
                        prefetch={false}
                        className="focus-visible:ring-primary flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-small transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium">{experience.title}</span>
                          <span className="block text-caption text-muted">
                            {experience.typeLabel}
                            {experience.area ? ` · ${experience.area}` : ""}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-subtle" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        {knowledge ? (
          <section className="mt-10 rounded-xl border border-border p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-display text-h3">
              <Compass className="size-5 text-primary" aria-hidden />
              The knowledge behind this destination
            </h2>
            <p className="mt-2 max-w-prose text-body text-muted">
              {/*
                `stats` is typed `Record<string, number>`, so `stats.anything`
                compiles and returns undefined at runtime — which is how
                "Jaipur has undefined reviewer-approved facts" shipped past
                typecheck. `depth.metrics` is a real typed shape.
              */}
              {knowledge.depth.metrics.approvedClaims} reviewer-approved facts from{" "}
              {knowledge.sourcesUsed.length}{" "}
              {knowledge.sourcesUsed.length === 1 ? "source" : "sources"} stand behind{" "}
              {destination.name}. The planner does not turn them into stops — a
              claim is a sentence, not a place — but they are what the history
              and story links on each stop lead into.
            </p>
            <Link
              href={destinationPath(destinationId)}
              className="mt-4 inline-block font-medium text-primary hover:underline"
            >
              Read the verified record
            </Link>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
