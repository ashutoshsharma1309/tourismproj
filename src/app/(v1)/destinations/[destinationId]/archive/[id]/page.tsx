/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import {
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
import { archiveMapUrl, getArchiveItem, getRelatedArchiveItems } from "@/data/archive";
import { getHistoryEvent } from "@/data/history";
import { getMonasteryBySlug } from "@/data/monasteries";
import { getStoryBySlug } from "@/data/stories";
import { formatDate } from "@/lib/format";
import { JsonLd, breadcrumbSchema, creativeWorkSchema } from "@/components/seo/JsonLd";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { capsuleArchiveObject, ownArchiveIds } from "@/lib/destinations/archive-lookup";
import { getPlaces } from "@/lib/destinations/content";
import Image from "next/image";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

interface PageProps {
  params: Promise<{ destinationId: string; id: string }>;
}

const CAPABILITY = "archive" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  /*
   * EACH DESTINATION'S OWN OBJECTS — not Sikkim's 77 under every id.
   * The cross-product below is what this replaced; it built 2,120 pages of
   * which 1,078 were Sikkim's catalogue at fourteen other destinations' URLs.
   */
  const perDestination = await Promise.all(
    ids.map(async (destinationId) =>
      (await ownArchiveIds(destinationId)).map((id) => ({ destinationId, id })),
    ),
  );
  return perDestination.flat();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destinationId, id } = await params;
  const capsule = await capsuleArchiveObject(destinationId, id);
  if (capsule) {
    const { object } = capsule;
    return {
      title: object.title,
      description: object.description?.slice(0, 160) ?? `${object.objectType}, catalogued for this destination.`,
      openGraph: { title: object.title, images: [{ url: object.mediaUrl, alt: object.title }] },
    };
  }
  const item = destinationId === "sikkim" ? getArchiveItem(id) : undefined;
  if (!item) return {};
  const description = item.summary ?? item.context.slice(0, 160);
  return {
    title: item.title,
    description,
    alternates: { canonical: `/destinations/${destinationId}/archive/${item.id}` },
    openGraph: {
      title: item.title,
      description,
      images: [{ url: item.mediaUrl, alt: item.title }],
      type: "article",
    },
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
  const { destinationId, id } = await params;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  /* A capsule destination's object renders its own record — never Sikkim's. */
  const capsule = await capsuleArchiveObject(destinationId, id);
  if (capsule) {
    const { object, previous, next, total } = capsule;
    const places = await getPlaces(destinationId);
    const relatedPlaces = object.relatedPlaces
      .map((slug) => places.find((place) => place.slug === slug))
      .filter((place): place is NonNullable<typeof place> => Boolean(place));
    const record: [string, string | null][] = [
      ["Type", object.objectType],
      ["Date", object.date],
      ["Maker", object.creator],
      ["Rights", object.rights],
    ];
    return (
      <>
        <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-24 md:px-6">
          <nav aria-label="Breadcrumb" className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
            <Link href={`/destinations/${destinationId}`} className="hover:text-primary">{destination.name}</Link>
            {" · "}
            <Link href={`/destinations/${destinationId}/archive`} className="hover:text-primary">Archive</Link>
          </nav>

          <figure className="mt-6">
            <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-surface-muted">
              <Image
                src={object.mediaUrl}
                alt={object.title}
                fill
                priority
                sizes="(min-width: 1024px) 60rem, 100vw"
                /* An archive shows the object whole. */
                className="object-contain"
              />
            </div>
            <figcaption className="mt-3 text-caption text-subtle">
              {object.creator ?? "Maker unknown"} · {object.rights} · via Wikimedia Commons
            </figcaption>
          </figure>

          <p className="mt-10 font-mono text-eyebrow tracking-widest text-primary uppercase">{object.objectType}</p>
          <h1 className="mt-2 max-w-3xl font-display text-h1 text-balance-heading">{object.title}</h1>

          <dl className="mt-8 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-border py-5 text-small">
            {record.filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-subtle">{label}</dt>
                <dd className="text-muted">{value}</dd>
              </div>
            ))}
            <dt className="text-subtle">Source</dt>
            <dd className="text-muted">
              <a href={object.originalUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Wikimedia Commons file page
              </a>
            </dd>
          </dl>

          {object.description ? (
            <section className="mt-8 max-w-[68ch]">
              <h2 className="font-display text-h3">Description</h2>
              <p className="mt-3 text-body leading-relaxed text-muted">{object.description}</p>
              <p className="mt-2 text-caption text-subtle">Verbatim from the source record. Nothing here was written for this page.</p>
            </section>
          ) : null}

          <section className="mt-8 max-w-[68ch]">
            <h2 className="font-display text-h3">Provenance</h2>
            <p className="mt-3 text-small leading-relaxed text-muted">{object.provenance}</p>
            <p className="mt-2 text-caption text-subtle">
              Dimensions, materials and a holding institution are not stated because no source in this catalogue states them.
            </p>
          </section>

          {relatedPlaces.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-h3">Connected places</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {relatedPlaces.map((place) => (
                  <li key={place.slug}>
                    <Link
                      href={`/destinations/${destinationId}/discover#place-${place.slug}`}
                      className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-small hover:border-primary hover:text-primary"
                    >
                      {place.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav aria-label="Catalogue order" className="mt-14 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
            {previous ? (
              <Link href={`/destinations/${destinationId}/archive/${previous.id}`} className="tile p-4 hover:border-primary">
                <span className="block font-mono text-eyebrow tracking-widest text-subtle uppercase">Previous</span>
                <span className="mt-1 block font-display text-h4">{previous.title}</span>
              </Link>
            ) : <span />}
            {next ? (
              <Link href={`/destinations/${destinationId}/archive/${next.id}`} className="tile p-4 text-right hover:border-primary">
                <span className="block font-mono text-eyebrow tracking-widest text-subtle uppercase">Next</span>
                <span className="mt-1 block font-display text-h4">{next.title}</span>
              </Link>
            ) : <span />}
          </nav>
          <p className="mt-4 text-caption text-subtle">One of {total} catalogued objects for {destination.name}.</p>
        </main>
        <Footer />
      </>
    );
  }

  const item = destinationId === "sikkim" ? getArchiveItem(id) : undefined;
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
      <JsonLd
        data={[
          creativeWorkSchema({
            title: item.title,
            description: item.summary ?? item.context.slice(0, 200),
            id: item.id,
            mediaUrl: item.mediaUrl,
            license: item.license,
            creator: item.creator,
            period: item.period,
          }),
          breadcrumbSchema([
            { name: "Archive", url: `/destinations/${destinationId}/archive` },
            { name: item.title, url: `/destinations/${destinationId}/archive/${item.id}` },
          ]),
        ]}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-24 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Archive"
          sectionHref={destinationPath(destinationId, "archive")}
          current={item.title}
        />

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

            {/*
              The disclaimer used to require a hand-written captureNote, so an
              item photographed outside Sikkim with no note rendered no warning
              at all — the reader saw Punakha Dzong, in Bhutan, presented like
              any Sikkim record. Four of the 21 out-of-state items were in that
              state. Every such item already records where it was taken, so the
              notice now always appears and falls back to that.
            */}
            {!item.sikkimSubject ? (
              <p className="mt-5 rounded-lg border-l-4 border-warning bg-warning-soft p-4 text-small leading-relaxed">
                <strong>Not photographed in Sikkim.</strong>{" "}
                {item.captureNote ??
                  `This photograph was taken at ${item.location ?? "a location outside Sikkim"}. It illustrates a subject connected to Sikkim's history without depicting a place inside the state.`}
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
                    href={`/destinations/${destinationId}/history/${event.slug}`}
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
                    href={`/destinations/${destinationId}/monasteries/${monastery.slug}`}
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
                href={`/destinations/${destinationId}/archive`}
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
