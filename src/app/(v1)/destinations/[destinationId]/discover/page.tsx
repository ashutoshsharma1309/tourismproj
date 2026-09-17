/*
 * PHASE 14 — tourism discovery.
 *
 * The question this route answers is the one a first-time visitor actually
 * has: not "where is Rumtek?", which assumes they have heard of it, but
 * "what is here, and why would I go?".
 *
 * Groups are derived from the destination's own content — an interest group
 * exists only where records carry it — and the destination comes from the
 * route, never from a default.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import { CapsuleContent } from "@/components/discovery/CapsuleContent";
import { ExperienceCard } from "@/components/discovery/ExperienceCard";
import { Footer } from "@/components/layout/Footer";
import { DepthBadge } from "@/components/ui/DepthBadge";
import { NotAvailable } from "@/components/ui/Provenance";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { discoveryGroups, experiencesFor } from "@/lib/discovery";
import { listDestinations } from "@/lib/destinations/registry";
import {
  destinationPath,
  destinationsWithAnyCapability,
  resolveDestination,
} from "@/lib/destinations/resolve";
import { destinationOpenGraph } from "@/lib/destinations/social-card";
import { ALL_INTERESTS } from "@/lib/planner/types";
import { DATA_DEPTH_SUMMARY } from "@/types/destination";
import type { JourneyInterest } from "@/lib/planner/types";

/**
 * Discovery exists where there is something to discover, and — as with the
 * planner — also where there is approved knowledge but nothing visitable, so
 * that the page can say so rather than 404 as though the destination did not
 * exist.
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

  const title = `Discover ${destination.name}`;
  const description = `What ${destination.name} offers a visitor — heritage sites, places, and the history and stories that connect them, each one traceable to a source.`;
  const canonical = destinationPath(destinationId, "discover");

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: await destinationOpenGraph(destination, { title, description, url: canonical }),
  };
}

/** The interest filter, validated against the closed vocabulary. */
function parseInterest(value: string | string[] | undefined): JourneyInterest | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw.length > 40) return null;
  return (ALL_INTERESTS as string[]).includes(raw) ? (raw as JourneyInterest) : null;
}

export default async function DiscoverPage({ params, searchParams }: PageProps) {
  const { destinationId } = await params;
  const { destination, capabilities } = await resolveDestination(destinationId);
  if (!capabilities[CAPABILITY] && !capabilities[HONEST_EMPTY_CAPABILITY]) notFound();

  const experiences = await experiencesFor(destinationId);

  /*
   * THE KIND-OF-PLACE TAXONOMY IS THE DESTINATION'S OWN.
   *
   * Every record carries a `typeLabel` — "Temple", "Ghat", "Museum" — which
   * is its source's classification. Counting those across THIS destination's
   * records yields its vocabulary: Jaipur offers Fort / Palace / Museum,
   * Varanasi offers Ghat / Temple / Mosque, and neither is asked to use the
   * other's. Nothing here is a global list; a kind appears only because a
   * record of that kind exists. The filter composes with the interest filter
   * below, so "Temples that are also History" is one URL.
   */
  const kinds = new Map<string, number>();
  for (const experience of experiences) {
    kinds.set(experience.typeLabel, (kinds.get(experience.typeLabel) ?? 0) + 1);
  }
  const rawType = (await searchParams).type;
  const requestedType = Array.isArray(rawType) ? rawType[0] : rawType;
  const activeType =
    requestedType && requestedType.length <= 40 && kinds.has(requestedType) ? requestedType : null;
  const scoped = activeType
    ? experiences.filter((experience) => experience.typeLabel === activeType)
    : experiences;
  const kindRows = [...kinds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const groups = discoveryGroups(scoped);
  const knowledge = getPublishedKnowledge(destinationId);

  const requested = parseInterest((await searchParams).interest);
  /* A filter for an interest this destination cannot satisfy is dropped
     rather than rendered as an empty result. */
  const active = groups.some((group) => group.interest === requested) ? requested : null;
  const shown = active ? groups.filter((group) => group.interest === active) : groups;

  const withCoordinates = experiences.filter((experience) => experience.coordinates !== undefined);
  const historyEdges = experiences.reduce((total, e) => total + e.historyRefs.length, 0);
  const storyEdges = experiences.reduce((total, e) => total + e.storyRefs.length, 0);

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Discover"
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-balance-heading">
            Discover {destination.name}
          </h1>
          {/* Depth is stated beside the title so a researched destination is
              never presented with the authority of a deep archive. */}
          <DepthBadge depth={knowledge?.depth.depth ?? destination.depth} />
        </div>
        <p className="mt-2 max-w-prose text-caption text-subtle">
          {DATA_DEPTH_SUMMARY[knowledge?.depth.depth ?? destination.depth]}
        </p>

        {experiences.length === 0 ? (
          <div className="mt-10">
            <NotAvailable
              title="Tourism experiences are not yet available for this destination"
              body={
                knowledge
                  ? `${destination.name} has ${knowledge.depth.metrics.approvedClaims} reviewer-approved facts from ${knowledge.sourcesUsed.length} sources, but no catalogued site or place record. That is verified knowledge, not a tourism offer, and it is not presented as one.`
                  : `${destination.name} is registered in the architecture, but nothing visitable has been catalogued for it. Nothing is shown rather than something invented.`
              }
              action={
                <Link
                  href={destinationPath(destinationId)}
                  className="font-medium text-primary hover:underline"
                >
                  {knowledge ? `Read what is verified about ${destination.name}` : `About ${destination.name}`}
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <p className="mt-4 max-w-3xl text-body-lg leading-relaxed text-muted">
              {experiences.length} catalogued {experiences.length === 1 ? "record" : "records"}{" "}
              you can visit, connected by {historyEdges} links to dated historical events and{" "}
              {storyEdges} links to archive stories. {withCoordinates.length} publish a
              coordinate. Every count on this page is measured from the records
              themselves.
            </p>

            <nav className="mt-8" aria-label="Discovery groups">
              <h2 className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                Explore this destination through
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                <li>
                  <Link
                    href={destinationPath(destinationId, "discover")}
                    aria-current={active === null ? "true" : undefined}
                    className={`focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                      active === null
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    Everything
                    <span className="text-caption text-subtle">{experiences.length}</span>
                  </Link>
                </li>
                {groups.map((group) => (
                  <li key={group.interest}>
                    <Link
                      href={`${destinationPath(destinationId, "discover")}?interest=${group.interest}${activeType ? `&type=${encodeURIComponent(activeType)}` : ""}`}
                      prefetch={false}
                      aria-current={active === group.interest ? "true" : undefined}
                      className={`focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                        active === group.interest
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {group.label}
                      <span className="text-caption text-subtle">{group.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* By kind of place — only offered when there is more than one kind to choose between. */}
              {kindRows.length > 1 ? (
                <div className="mt-5">
                  <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                    By kind of place
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2" aria-label="Filter by kind of place">
                    <li>
                      <Link
                        href={`${destinationPath(destinationId, "discover")}${active ? `?interest=${active}` : ""}`}
                        prefetch={false}
                        aria-current={activeType === null ? "true" : undefined}
                        className={`focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                          activeType === null
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        Any kind
                      </Link>
                    </li>
                    {kindRows.map(([kind, count]) => (
                      <li key={kind}>
                        <Link
                          href={`${destinationPath(destinationId, "discover")}?type=${encodeURIComponent(kind)}${active ? `&interest=${active}` : ""}`}
                          prefetch={false}
                          aria-current={activeType === kind ? "true" : undefined}
                          className={`focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                            activeType === kind
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {kind}
                          <span className="text-subtle">{count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {/* Said only when it is true of this destination: Sikkim carries
                  all ten, and "10 of the 10" is noise rather than honesty. */}
              {groups.length < ALL_INTERESTS.length ? (
                <p className="mt-3 text-caption text-muted">
                  {groups.length} of the {ALL_INTERESTS.length} interests this system knows about
                  are offered here. The other {ALL_INTERESTS.length - groups.length} are absent
                  because no record in {destination.name} carries them.
                </p>
              ) : null}
            </nav>

            {shown.map((group) => (
              <section key={group.interest} className="mt-12" aria-labelledby={`group-${group.interest}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 id={`group-${group.interest}`} className="font-display text-h2 text-balance-heading">
                    {group.label}
                  </h2>
                  <p className="text-caption text-muted">
                    {group.count} {group.count === 1 ? "record" : "records"} · ordered by how much
                    of the archive points at each
                  </p>
                </div>
                <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* A reader who has narrowed by interest OR by kind has asked
                      for the whole set, not a three-card preview of it. */}
                  {group.experiences.slice(0, active || activeType ? group.count : 3).map((experience) => (
                    <li key={experience.id} className="min-w-0">
                      <ExperienceCard
                        experience={experience}
                        highlightInterests={[group.interest]}
                      />
                    </li>
                  ))}
                </ul>
                {!active && group.count > 3 ? (
                  <p className="mt-4">
                    <Link
                      href={`${destinationPath(destinationId, "discover")}?interest=${group.interest}${activeType ? `&type=${encodeURIComponent(activeType)}` : ""}`}
                      prefetch={false}
                      className="font-medium text-primary hover:underline"
                    >
                      See all {group.count} under {group.label}
                    </Link>
                  </p>
                ) : null}
              </section>
            ))}

            {/* PHASE 18 — a capsule's history, cultural notes and citations
                render here rather than on pages of their own. */}
            <CapsuleContent destinationId={destinationId} />

            <section className="mt-14 rounded-xl border border-border bg-surface-muted/60 p-5 md:p-6">
              <h2 className="font-display text-h3">Turn this into a journey</h2>
              <p className="mt-2 max-w-prose text-body text-muted">
                Adding an experience pins it in the planner, which decides the
                days, the order and the grouping around it — from the same
                records, with the same evidence.
              </p>
              <Link
                href={destinationPath(destinationId, "plan")}
                className="focus-visible:ring-primary mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
              >
                Open the journey planner
              </Link>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
