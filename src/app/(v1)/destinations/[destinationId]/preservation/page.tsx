/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { BookOpen, Camera, Check, Clock3, Headphones, Images, Languages, MapPin, Minus, Rotate3d, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { VerificationChip } from "@/components/ui/VerificationChip";
import { ARCHIVE_COMMUNITIES, ARCHIVE_COVERAGE } from "@/data/archive";
import { GALLERY_PHOTO_COUNT, monasteryGallery } from "@/data/galleries";
import { HISTORY_COVERAGE } from "@/data/history";
import { monasteries } from "@/data/monasteries";
import { isFullSphere } from "@/data/panoramas";
import { STORY_CATEGORIES, stories } from "@/data/stories";
import { SOURCES } from "@/data/sources";
import { getTourismMetrics } from "@/lib/stats";
import { formatStatNumber } from "@/lib/format";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

const CAPABILITY = "preservation" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "preservation",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "Digital preservation",
  description:
    "What this archive has documented, what it has not, and where every claim comes from.",
};

/**
 * The preservation dashboard.
 *
 * It reports facts about our own archive — coverage, gaps and provenance —
 * which are things we can count exactly. It replaces the operator dashboards,
 * whose revenue, occupancy and remittance figures were invented.
 */
export default async function PreservationPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  const total = monasteries.length;
  const sourced = monasteries.filter((m) => m.provenance.confidence !== "unverified").length;
  const mapped = monasteries.filter((m) => m.coordinates).length;
  /* Two separate counts, because they are two separate claims. A capture
     exists for Rumtek; a full 360° sphere still exists for nobody, and one row
     must not be allowed to imply the other. */
  const captured = monasteries.filter((m) => m.tour.available).length;
  const spheres = monasteries.filter(
    (m) => m.tour.available && isFullSphere(m.tour.projection),
  ).length;
  const narrated = monasteries.filter((m) => m.audio.available).length;
  const withHours = monasteries.filter((m) => m.visitingHours.status !== "unpublished").length;
  const withStory = monasteries.filter(
    (m) => stories.some((s) => s.relatedMonasteries.includes(m.slug)),
  ).length;
  const withGallery = monasteries.filter((m) => monasteryGallery(m.slug).length > 0).length;
  const documented = stories.filter((s) => s.claimType === "documented history").length;

  const coverage = [
    { label: "Records with a cited source", done: sourced, icon: ShieldCheck },
    { label: "Sites with an authoritative coordinate", done: mapped, icon: MapPin },
    { label: "Sites with a verified panoramic capture", done: captured, icon: Camera },
    { label: "Sites with a true 360° sphere", done: spheres, icon: Rotate3d },
    { label: "Sites with a published audio guide", done: narrated, icon: Headphones },
    { label: "Sites with a photographic gallery", done: withGallery, icon: Images },
    { label: "Sites with any reported visiting hours", done: withHours, icon: Clock3 },
    { label: "Sites appearing in a written story", done: withStory, icon: BookOpen },
  ];

  const metrics = getTourismMetrics();

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Preserve"
        />
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Digital preservation
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          What we have documented — and what we have not
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          A heritage archive is only as good as its provenance. This page reports
          the state of ours: what is sourced, what is mapped, what is still
          missing. The gaps are published on purpose.
        </p>

        {/* Headline counts. Every number here is computed from the records —
            none of it is typed in, and none of it is rounded up. */}
        <section className="mt-10" aria-label="Preservation at a glance">
          <h2 className="font-display text-h2">Sikkim heritage preservation</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            Counted from this archive&apos;s own records at build time. If the
            archive holds {ARCHIVE_COVERAGE.total} objects, this page says{" "}
            {ARCHIVE_COVERAGE.total}.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Monasteries digitised", value: monasteries.length, href: `/destinations/${destinationId}/monasteries` },
              { label: "Historical events documented", value: HISTORY_COVERAGE.total, href: `/destinations/${destinationId}/history` },
              { label: "Archive objects catalogued", value: ARCHIVE_COVERAGE.total, href: `/destinations/${destinationId}/archive` },
              { label: "Cultural stories written", value: stories.length, href: `/destinations/${destinationId}/stories` },
              { label: "Communities represented", value: ARCHIVE_COMMUNITIES.length, href: `/destinations/${destinationId}/archive` },
              { label: "Districts covered", value: ARCHIVE_COVERAGE.districts, href: `/destinations/${destinationId}/archive` },
              {
                label: "Sources cited across the timeline",
                value: HISTORY_COVERAGE.citations,
                href: `/destinations/${destinationId}/history`,
              },
              { label: "Audio guides published", value: narrated, href: `/destinations/${destinationId}/monasteries` },
              {
                label: "Photographs credited to their photographer",
                value: GALLERY_PHOTO_COUNT,
                href: `/destinations/${destinationId}/explore`,
              },
            ].map((stat) => (
              <li key={stat.label}>
                <Link
                  href={stat.href}
                  className="card-lift flex h-full flex-col rounded-xl border bg-surface p-5"
                >
                  <span data-numeric className="font-display text-price text-primary">
                    {stat.value}
                  </span>
                  <span className="mt-1 text-small font-medium">{stat.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-caption leading-relaxed text-subtle">
            Deliberately absent: a visitor counter, a &ldquo;heritage saved&rdquo;
            percentage, and any figure describing material this project has not
            actually catalogued.
          </p>
        </section>

        {/* How firmly the two new collections stand. */}
        <section className="mt-14" aria-label="Verification of history and archive">
          <h2 className="font-display text-h2">How firmly it stands</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            A record count means nothing without the confidence behind it. Both
            new collections are broken down by verification state.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Historical timeline",
                href: `/destinations/${destinationId}/history`,
                total: HISTORY_COVERAGE.total,
                rows: [
                  { status: "verified" as const, value: HISTORY_COVERAGE.verified },
                  { status: "source-backed" as const, value: HISTORY_COVERAGE.sourceBacked },
                  { status: "oral tradition" as const, value: HISTORY_COVERAGE.oralTradition },
                ],
                note: `${HISTORY_COVERAGE.withImage} of ${HISTORY_COVERAGE.total} events have a legitimately sourced photograph. The rest say so.`,
              },
              {
                title: "Digital heritage archive",
                href: `/destinations/${destinationId}/archive`,
                total: ARCHIVE_COVERAGE.total,
                rows: [
                  { status: "verified" as const, value: ARCHIVE_COVERAGE.verified },
                  { status: "source-backed" as const, value: ARCHIVE_COVERAGE.sourceBacked },
                  { status: "oral tradition" as const, value: ARCHIVE_COVERAGE.oralTradition },
                ],
                note: `${ARCHIVE_COVERAGE.photographedInSikkim} of ${ARCHIVE_COVERAGE.total} objects were photographed in Sikkim; the remainder illustrate shared Himalayan traditions and say where they were taken.`,
              },
            ].map((block) => (
              <div key={block.title} className="rounded-xl border bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-h4 font-semibold">{block.title}</h3>
                  <Link href={block.href} className="text-caption text-primary hover:underline">
                    Open
                  </Link>
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {block.rows.map((row) => (
                    <li key={row.status} className="flex items-center gap-3">
                      <VerificationChip status={row.status} />
                      <span
                        aria-hidden
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((row.value / block.total) * 100)}%` }}
                        />
                      </span>
                      <span data-numeric className="font-mono text-caption text-subtle">
                        {row.value}/{block.total}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-caption leading-relaxed text-subtle">{block.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage */}
        <section className="mt-14" aria-label="Archive coverage">
          <h2 className="font-display text-h2">Monastery coverage</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {coverage.map((row) => {
              const pct = Math.round((row.done / total) * 100);
              return (
                <li key={row.label} className="rounded-xl border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-small font-medium">
                      <row.icon className="size-4 shrink-0 text-primary" aria-hidden />
                      {row.label}
                    </span>
                    <span data-numeric className="font-mono text-small text-subtle">
                      {row.done}/{total}
                    </span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="img"
                    aria-label={`${pct}% complete`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-caption text-subtle">
                    {row.done === 0
                      ? "Not started — nothing is shown in its place."
                      : `${pct}% of catalogued sites`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Capability vs. content — a built viewer is not a captured site. */}
        <section className="mt-14" aria-label="Capability versus content">
          <h2 className="font-display text-h2">Capability is not coverage</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            Having built a viewer is not the same as having something true to
            show in it. These are tracked separately on purpose.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                capability: "Panorama viewer",
                built: true,
                content: `${captured} of ${total} sites have a verified capture · ${spheres} are full 360°`,
                note: "The sweep for a licensed 360° sphere of a Sikkim monastery returned nothing. One genuine wide capture of Rumtek's courtyard survived inspection and is published as the 180° photograph it is. The viewer takes whatever a record declares and never upgrades a panorama into a sphere.",
              },
              {
                capability: "Story archive",
                built: true,
                content: `${stories.length} stories across ${STORY_CATEGORIES.length} categories`,
                note: `${documented} are documented history; the rest are labelled oral tradition or legend on the card and in the article, never presented as settled fact.`,
              },
              {
                capability: "Audio guide player",
                built: true,
                content: `${narrated} of ${total} sites have narration`,
                note: "Scripts are composed per language from verified facts, never translated across them. English, Hindi and Bengali use macOS voices and Nepali uses Piper. Bhutia, Lepcha, Assamese and Dzongkha have no voice on any engine available here.",
              },
            ].map((row) => (
              <li key={row.capability} className="rounded-xl border bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 text-small font-medium">
                    <Languages className="size-4 shrink-0 text-primary" aria-hidden />
                    {row.capability}
                  </span>
                  <Badge tone="success">built</Badge>
                </div>
                <p className="mt-2 text-small text-muted">{row.content}</p>
                <p className="mt-1.5 text-caption leading-relaxed text-subtle">{row.note}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Per-site register */}
        <section className="mt-14" aria-label="Site register">
          <h2 className="font-display text-h2">Site register</h2>
          <p className="mt-2 text-body text-muted">
            Every catalogued site and the state of its record.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-160 text-small">
              <thead>
                <tr className="border-b text-left text-caption text-muted">
                  <th scope="col" className="px-3 py-2.5 font-medium">Monastery</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">District</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Record</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Mapped</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Panorama</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Audio</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {monasteries.map((m) => (
                  <tr key={m.slug} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/destinations/${destinationId}/monasteries/${m.slug}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{m.district}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        tone={m.provenance.confidence === "unverified" ? "warning" : "success"}
                      >
                        {m.provenance.confidence === "unverified" ? "Unverified" : "Sourced"}
                      </Badge>
                    </td>
                    {[
                      Boolean(m.coordinates),
                      m.tour.available,
                      m.audio.available,
                      m.visitingHours.status !== "unpublished",
                    ].map(
                      (yes, i) => (
                        <td key={i} className="px-3 py-2.5">
                          {yes ? (
                            <Check className="size-4 text-success" aria-label="Yes" />
                          ) : (
                            <Minus className="size-4 text-subtle" aria-label="No" />
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verified statistics */}
        <section className="mt-14" aria-label="Verified statistics">
          <h2 className="font-display text-h2">Verified statistics</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <li key={metric.id} className="rounded-xl border bg-surface p-5">
                <p className="text-caption text-subtle">
                  {metric.label} · {metric.period}
                </p>
                <p data-numeric className="mt-2 font-display text-price">
                  {metric.value === null ? (
                    <span className="text-h4 text-muted">Data not available</span>
                  ) : (
                    formatStatNumber(metric.value)
                  )}
                </p>
                {metric.previousValue ? (
                  <p data-numeric className="mt-1 text-caption text-subtle">
                    {metric.previousPeriod}: {formatStatNumber(metric.previousValue)}
                  </p>
                ) : null}
                <p className="mt-3 text-caption leading-relaxed text-subtle">
                  {metric.provenance.caveat}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Sources */}
        <section className="mt-14" aria-label="Review queue">
          <h2 className="font-display text-h2">Discovery pipeline</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            The Heritage Discovery Agent enumerates monastery articles, extracts
            each record with its source, and scores it on evidence. Candidates
            wait for a person before they reach the catalogue — that review
            happens against the agent&apos;s output in the repository, not in a
            page on this site.
          </p>
        </section>

        <section className="mt-14" aria-label="Source registry">
          <h2 className="font-display text-h2">Source registry</h2>
          <p className="mt-2 text-body text-muted">
            Every source this archive draws on, and exactly what may be cited from it.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {Object.values(SOURCES).map((source) => (
              <li key={source.id} className="rounded-xl border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-small font-medium text-primary hover:underline"
                  >
                    {source.name}
                  </a>
                  <Badge tone="neutral">{source.type}</Badge>
                </div>
                <p className="mt-1.5 text-caption leading-relaxed text-muted">{source.covers}</p>
                {source.notes ? (
                  <p className="mt-1 text-caption text-warning">{source.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
