import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Landmark,
  MapPin,
  ScrollText,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveCard } from "@/components/archive/ArchiveCard";
import { ArchiveMedia } from "@/components/archive/ArchiveMedia";
import { Footer } from "@/components/layout/Footer";
import { StoryCard } from "@/components/stories/StoryCard";
import { Badge } from "@/components/ui/Badge";
import { VerificationChip } from "@/components/ui/VerificationChip";
import {
  archiveItems,
  archiveMapUrl,
  getArchiveItem,
  getRelatedArchiveItems,
} from "@/data/archive";
import { getHistoryEvent } from "@/data/history";
import { getMonasteryBySlug } from "@/data/monasteries";
import { getStoryBySlug } from "@/data/stories";
import { formatDate } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return archiveItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = getArchiveItem(id);
  if (!item) return {};
  return {
    title: item.title,
    description: item.summary ?? item.context.slice(0, 160),
  };
}

/**
 * One archive object, with everything a heritage record has to preserve:
 * where, when, who, what, source, licence and verification status.
 *
 * The metadata table is not an afterthought at the bottom of the page — it is
 * the reason the page exists. A photograph without it is decoration.
 */
export default async function ArchiveItemPage({ params }: PageProps) {
  const { id } = await params;
  const item = getArchiveItem(id);
  if (!item) notFound();

  const monasteries = item.relatedMonasteries
    .map((slug) => getMonasteryBySlug(slug))
    .filter((m) => m !== undefined);
  const stories = item.relatedStories.map((s) => getStoryBySlug(s)).filter((s) => s !== undefined);
  const events = item.relatedEvents.map((e) => getHistoryEvent(e)).filter((e) => e !== undefined);
  const related = getRelatedArchiveItems(item);
  const mapUrl = archiveMapUrl(item);

  const credit = [
    item.creator ? `Photograph by ${item.creator}` : "Creator not stated",
    item.license,
    `via Wikimedia Commons`,
  ].join(" · ");

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-20 md:px-6">
        <Link
          href="/archive"
          className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          The Digital Heritage Archive
        </Link>

        <div className="mt-6 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* ---------------------------------------------------------- media */}
          <div className="min-w-0">
            <ArchiveMedia
              src={item.mediaUrl}
              alt={item.title}
              width={item.width}
              height={item.height}
              credit={credit}
            />

            {!item.sikkimSubject && item.captureNote ? (
              <p className="mt-5 rounded-lg border-l-4 border-warning bg-warning-soft p-4 text-small leading-relaxed">
                <strong>Not photographed in Sikkim.</strong> {item.captureNote}
              </p>
            ) : null}

            <section className="mt-8" aria-label="Context">
              <h2 className="font-display text-h3">Context</h2>
              {item.summary ? (
                <p className="mt-3 text-body-lg leading-relaxed">{item.summary}</p>
              ) : null}
              <blockquote className="mt-4 border-l-2 border-border-strong pl-4">
                <p className="text-body leading-relaxed text-muted">{item.context}</p>
                <cite className="mt-2 block text-caption not-italic text-subtle">
                  Quoted from{" "}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {item.sourceName}
                  </a>
                  , which is available under CC BY-SA. This archive quotes it rather
                  than paraphrasing, so no unsourced claim can creep in.
                </cite>
              </blockquote>
            </section>
          </div>

          {/* ------------------------------------------------------- metadata */}
          <div className="min-w-0">
            <p className="font-mono text-eyebrow tracking-widest text-accent-ink uppercase">
              {item.category}
            </p>
            <h1 className="mt-3 font-display text-h1 text-balance-heading">{item.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <VerificationChip status={item.verification} />
              <Badge tone="neutral">{item.license}</Badge>
            </div>

            {/* Preservation metadata — where, when, who, what, source, licence. */}
            <section className="mt-7" aria-label="Preservation metadata">
              <h2 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                Preservation record
              </h2>
              <dl className="mt-3 divide-y rounded-xl border bg-surface">
                {[
                  { term: "Where", value: item.location ?? "Not tied to a single place" },
                  { term: "District", value: item.district ? `${item.district} district` : "—" },
                  { term: "When", value: item.period ?? "Documents a living practice, not a date" },
                  { term: "Community", value: item.community ?? "Not attributed to one community" },
                  { term: "Object type", value: `Still image · ${item.width}×${item.height}px` },
                  { term: "Creator", value: item.creator ?? "Not stated by the holding source" },
                  { term: "Licence", value: item.license },
                  { term: "Verified", value: formatDate(item.verifiedAt) },
                ].map((row) => (
                  <div key={row.term} className="flex gap-4 px-4 py-3">
                    <dt className="w-24 shrink-0 text-caption text-subtle">{row.term}</dt>
                    <dd className="min-w-0 flex-1 text-small break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Source & licence, with the actual links. */}
            <section className="mt-5" aria-label="Source and licence">
              <h2 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                Source &amp; rights
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-small transition-colors hover:border-primary"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">Subject source</span>
                      <span className="block truncate text-caption text-subtle">
                        {item.sourceName}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-subtle" aria-hidden />
                  </a>
                </li>
                <li>
                  <a
                    href={item.commonsFilePage}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-small transition-colors hover:border-primary"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">Original file &amp; full licence</span>
                      <span className="block truncate text-caption text-subtle">
                        {item.commonsFile}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-subtle" aria-hidden />
                  </a>
                </li>
                {item.licenseUrl ? (
                  <li>
                    <a
                      href={item.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-small transition-colors hover:border-primary"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">Licence terms</span>
                        <span className="block truncate text-caption text-subtle">
                          {item.license}
                        </span>
                      </span>
                      <ExternalLink className="size-4 shrink-0 text-subtle" aria-hidden />
                    </a>
                  </li>
                ) : null}
              </ul>
              <p className="mt-3 text-caption leading-relaxed text-subtle">
                Attribution as required by the licence:{" "}
                <span className="text-muted">{credit}</span>
                {item.credit ? (
                  <>
                    {" "}
                    Source statement: <span className="text-muted">{item.credit}</span>
                  </>
                ) : null}
              </p>
            </section>

            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <MapPin className="size-4" aria-hidden />
                View on map
              </a>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed p-4 text-caption leading-relaxed text-subtle">
                No map link: this object documents a practice rather than a place,
                or was photographed outside Sikkim. No coordinate is invented to
                give it a pin.
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------- related heritage */}
        {events.length > 0 ? (
          <section className="mt-16" aria-label="Related historical events">
            <h2 className="flex items-center gap-2 font-display text-h2">
              <ScrollText className="size-5 text-accent-ink" aria-hidden />
              In the timeline
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <li key={event.slug}>
                  <Link
                    href={`/history/${event.slug}`}
                    className="card-lift flex h-full flex-col rounded-xl border bg-surface p-5"
                  >
                    <span
                      data-numeric
                      className="font-mono text-eyebrow tracking-widest text-accent-ink uppercase"
                    >
                      {event.yearLabel}
                    </span>
                    <span className="mt-2 font-display text-h4 text-balance-heading">
                      {event.title}
                    </span>
                    <span className="mt-2 grow text-small leading-relaxed text-muted">
                      {event.shortDescription}
                    </span>
                    <span className="mt-4">
                      <VerificationChip status={event.verification} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {monasteries.length > 0 ? (
          <section className="mt-14" aria-label="Related monasteries">
            <h2 className="flex items-center gap-2 font-display text-h2">
              <Landmark className="size-5 text-accent-ink" aria-hidden />
              Related monasteries
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {monasteries.map((monastery) => (
                <li key={monastery.slug}>
                  <Link
                    href={`/monasteries/${monastery.slug}`}
                    className="card-lift flex h-full flex-col gap-1.5 rounded-xl border bg-surface p-4"
                  >
                    <span className="text-body font-semibold">{monastery.name}</span>
                    <span className="font-mono text-caption text-subtle">
                      {monastery.district} district · est. {monastery.establishedYear}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="jade">{monastery.tradition}</Badge>
                      {monastery.audio.available ? <Badge tone="success">Audio guide</Badge> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {stories.length > 0 ? (
          <section className="mt-14" aria-label="Related stories">
            <h2 className="flex items-center gap-2 font-display text-h2">
              <BookOpen className="size-5 text-accent-ink" aria-hidden />
              Related stories
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-14" aria-label="More from the archive">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-h2">More from the archive</h2>
              <Link
                href="/archive"
                className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
              >
                Browse everything
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((candidate) => (
                <ArchiveCard key={candidate.id} item={candidate} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
