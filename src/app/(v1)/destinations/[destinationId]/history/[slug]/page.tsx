/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileQuestion,
  Landmark,
  MapPin,
  Mountain,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { StoryCard } from "@/components/stories/StoryCard";
import { Badge } from "@/components/ui/Badge";
import { VerificationChip } from "@/components/ui/VerificationChip";
import { ArchiveCard } from "@/components/archive/ArchiveCard";
import { getArchiveForEvent, getArchiveItemByKey } from "@/data/archive";
import { eventMapUrl } from "@/data/history";
import { getMonasteryBySlug } from "@/data/monasteries";
import { historyContext } from "@/lib/destinations/history-lookup";
import { formatDate } from "@/lib/format";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/components/seo/JsonLd";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { getHistory } from "@/lib/destinations/content";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

interface PageProps {
  params: Promise<{ destinationId: string; slug: string }>;
}

const CAPABILITY = "historyPages" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  /*
   * PHASE 18 — each destination's own events, and only the long-form ones.
   *
   * Same leak as the story and place routes: Sikkim's 26 events were being
   * generated under every capsule destination. This page renders description
   * paragraphs, key facts, a verification note and a source list; a capsule
   * history entry is one retrieved sentence, so `description` is the test.
   */
  const perDestination = await Promise.all(
    ids.map(async (destinationId) => {
      const own = await getHistory(destinationId);
      return own
        .filter((event) => "description" in event)
        .map((event) => ({ destinationId, slug: event.slug }));
    }),
  );
  return perDestination.flat();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destinationId, slug } = await params;
  const { event } = await historyContext(destinationId, slug);
  if (!event) return {};
  /* An event's photograph is an archive object, reached through its imageKey —
     the same resolution the page body uses. Events without one fall back to the
     site card rather than naming a file that does not exist. */
  const media = event.imageKey ? getArchiveItemByKey(event.imageKey) : undefined;
  return {
    title: `${event.title} · ${event.yearLabel}`,
    description: event.shortDescription,
    alternates: { canonical: `/destinations/${destinationId}/history/${event.slug}` },
    openGraph: {
      title: `${event.title} — ${event.yearLabel}`,
      description: event.shortDescription,
      ...(media ? { images: [{ url: media.mediaUrl, alt: media.title }] } : {}),
      type: "article",
    },
  };
}

/**
 * A historical event, in its own right.
 *
 * Clicking an event on the timeline opens this page — not a monastery page.
 * The related monasteries, stories, places and archive objects are offered
 * here as onward journeys, taken only if the reader chooses one.
 */
export default async function HistoryEventPage({ params }: PageProps) {
  const { destinationId, slug } = await params;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);
  /*
   * The destination's own corpus. `getHistoryEvent` reads `@/data/history`,
   * which knows Sikkim's 26 events and nothing else — so all 127 enriched
   * capsule events prerendered as 404s despite being listed in the static
   * params above.
   */
  const { event, previous, next, places: relatedPlaces, stories } = await historyContext(
    destinationId,
    slug,
  );
  if (!event) notFound();

  const media = event.imageKey ? getArchiveItemByKey(event.imageKey) : undefined;
  const monasteries = (event.relatedMonasteries ?? [])
    .map((slug) => getMonasteryBySlug(slug))
    .filter((monastery) => monastery !== undefined);
  const archive = getArchiveForEvent(event.slug);
  const mapUrl = eventMapUrl(event);
  const hasHeritage = monasteries.length + stories.length + archive.length + relatedPlaces.length > 0;

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: event.title,
            description: event.shortDescription,
            url: `/destinations/${destinationId}/history/${event.slug}`,
            image: media?.mediaUrl,
            section: event.era,
          }),
          breadcrumbSchema([
            { name: "History", url: `/destinations/${destinationId}/history` },
            { name: event.title, url: `/destinations/${destinationId}/history/${event.slug}` },
          ]),
        ]}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-24 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="History"
          sectionHref={destinationPath(destinationId, "history")}
          current={event.title}
        />

        {/* --------------------------------------------------------- header */}
        <header className="mt-5">
          <p
            data-numeric
            className="font-mono text-eyebrow tracking-widest text-accent-ink uppercase"
          >
            {event.era} · {event.yearLabel}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">{event.title}</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-muted">{event.shortDescription}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <VerificationChip status={event.verification} />
            <Badge tone="neutral">
              {event.sources.length} {event.sources.length === 1 ? "source" : "sources"}
            </Badge>
            <span className="text-caption text-subtle">
              Last verified {formatDate(event.lastVerifiedAt)}
            </span>
          </div>
        </header>

        {/* ---------------------------------------------------------- media */}
        <div className="mt-8">
          {media ? (
            <figure>
              <div className="relative aspect-16/9 overflow-hidden rounded-xl border bg-surface-muted">
                <Image
                  src={media.mediaUrl}
                  alt={media.title}
                  fill
                  priority
                  sizes="(min-width: 1152px) 1152px, 100vw"
                  className={cn(
                    "object-cover",
                    // Portrait sources crop from the top so faces survive.
                    media.height > media.width ? "object-[50%_18%]" : "object-center",
                  )}
                />
              </div>
              <figcaption className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-caption text-subtle">
                <Link href={`/destinations/${destinationId}/archive/${media.id}`} className="text-primary hover:underline">
                  {media.title}
                </Link>
                <span aria-hidden>·</span>
                <span>
                  {media.creator ?? "Creator not stated"} · {media.license}
                </span>
                {event.imageNote ? (
                  <span className="w-full pt-1 leading-relaxed">{event.imageNote}</span>
                ) : null}
              </figcaption>
            </figure>
          ) : (
            <div className="rounded-xl border border-dashed bg-surface-muted/40 p-8 text-center">
              <FileQuestion className="mx-auto size-6 text-subtle" aria-hidden />
              <p className="mt-3 font-display text-h3">Documentation currently unavailable</p>
              <p className="mx-auto mt-2 max-w-lg text-small leading-relaxed text-muted">
                No openly licensed photograph, document or object depicting this
                event has been located for the archive. Rather than illustrate it
                with something unrelated, this space is left as it is — a record
                of what is still missing.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ------------------------------------------------------- account */}
          <div className="min-w-0">
            <section aria-label="Historical context">
              <h2 className="font-display text-h2">What happened</h2>
              <div className="mt-4 flex flex-col gap-4">
                {event.description.map((paragraph, index) => (
                  <p key={index} className="text-body-lg leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section className="mt-10" aria-label="Key facts">
              <h2 className="font-display text-h3">Key facts</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {event.keyFacts.map((fact) => (
                  <li
                    key={fact}
                    className="flex gap-3 rounded-lg border bg-surface p-4 text-small leading-relaxed"
                  >
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {fact}
                  </li>
                ))}
              </ul>
            </section>

            {/* ----------------------------------------- sources & references */}
            <section className="mt-10" aria-label="Sources and references">
              <h2 className="font-display text-h3">Sources &amp; references</h2>
              <p className="mt-2 text-small text-muted">
                What each source was used for, so a reader can check any single
                claim rather than the page as a whole.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {event.sources.map((source) => (
                  <li key={source.url} className="rounded-lg border bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline"
                      >
                        {source.name}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                      <Badge tone={source.type === "government" ? "success" : "neutral"}>
                        {source.type}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-caption leading-relaxed text-muted">{source.covers}</p>
                  </li>
                ))}
              </ul>
              {event.verificationNote ? (
                <p className="mt-4 rounded-lg border-l-4 border-warning bg-warning-soft p-4 text-small leading-relaxed">
                  <strong>On the record&apos;s limits.</strong> {event.verificationNote}
                </p>
              ) : null}
            </section>
          </div>

          {/* ------------------------------------------------------- actions */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border bg-surface p-5">
              <h2 className="text-h4 font-semibold">Follow this thread</h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {hasHeritage ? (
                  <a
                    href="#related-heritage"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    Explore related heritage
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                ) : null}
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border-strong px-5 text-small font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    <MapPin className="size-4" aria-hidden />
                    View on map
                  </a>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-caption leading-relaxed text-subtle">
                    This event has no single mappable location — no coordinate is
                    invented to give it one.
                  </p>
                )}
              </div>
              <dl className="mt-5 flex flex-col gap-3 border-t pt-4 text-small">
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Era</dt>
                  <dd className="text-right font-medium">{event.era}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Date</dt>
                  <dd data-numeric className="text-right font-medium">
                    {event.yearLabel}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Archive objects</dt>
                  <dd data-numeric className="text-right font-medium">
                    {archive.length}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Previous / next in the timeline. */}
            <nav aria-label="Timeline navigation" className="flex flex-col gap-2">
              {previous ? (
                <Link
                  href={`/destinations/${destinationId}/history/${previous.slug}`}
                  className="group rounded-lg border bg-surface p-4 transition-colors hover:border-primary"
                >
                  <span className="flex items-center gap-1.5 text-caption text-subtle">
                    <ArrowLeft className="size-3.5" aria-hidden />
                    Earlier · {previous.yearLabel}
                  </span>
                  <span className="mt-1 block text-small font-medium group-hover:text-primary">
                    {previous.title}
                  </span>
                </Link>
              ) : null}
              {next ? (
                <Link
                  href={`/destinations/${destinationId}/history/${next.slug}`}
                  className="group rounded-lg border bg-surface p-4 text-right transition-colors hover:border-primary"
                >
                  <span className="flex items-center justify-end gap-1.5 text-caption text-subtle">
                    Later · {next.yearLabel}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                  <span className="mt-1 block text-small font-medium group-hover:text-primary">
                    {next.title}
                  </span>
                </Link>
              ) : null}
            </nav>
          </aside>
        </div>

        {/* ----------------------------------------------- related heritage */}
        {hasHeritage ? (
          <section id="related-heritage" className="mt-16 scroll-mt-24" aria-label="Related heritage">
            <h2 className="font-display text-h2">Related heritage</h2>
            <p className="mt-2 max-w-2xl text-body text-muted">
              Everything else in this archive that this event touches.
            </p>

            {archive.length > 0 ? (
              <div className="mt-8">
                <h3 className="flex items-center gap-2 font-display text-h3">
                  <BookOpen className="size-4 text-accent-ink" aria-hidden />
                  In the archive
                </h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {archive.map((item) => (
                    <ArchiveCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {monasteries.length > 0 ? (
              <div className="mt-10">
                <h3 className="flex items-center gap-2 font-display text-h3">
                  <Landmark className="size-4 text-accent-ink" aria-hidden />
                  Monasteries
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {monasteries.map((monastery) => (
                    <li key={monastery.slug}>
                      <Link
                        href={`/destinations/${destinationId}/monasteries/${monastery.slug}`}
                        className="card-lift group flex h-full flex-col gap-1.5 overflow-hidden rounded-xl border bg-surface p-4"
                      >
                        {/* The site as it stands today — deliberately NOT
                            offered as a depiction of the event itself, which
                            is why it sits down here with the cross-links
                            rather than in the media slot at the top. */}
                        <span className="relative -mx-4 -mt-4 mb-1 block h-28 overflow-hidden bg-surface-muted">
                          <Image
                            src={monastery.image}
                            alt={`${monastery.name} today`}
                            fill
                            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                            className="media-zoom object-cover group-hover:scale-[1.05]"
                          />
                        </span>
                        <span className="text-body font-semibold">{monastery.name}</span>
                        <span className="font-mono text-caption text-subtle">
                          {monastery.district} district · est. {monastery.establishedYear}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone="jade">{monastery.tradition}</Badge>
                          {monastery.audio.available ? (
                            <Badge tone="success">Audio guide</Badge>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {stories.length > 0 ? (
              <div className="mt-10">
                <h3 className="flex items-center gap-2 font-display text-h3">
                  <BookOpen className="size-4 text-accent-ink" aria-hidden />
                  Stories
                </h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {stories.map((story) => (
                    <StoryCard key={story.slug} story={story} />
                  ))}
                </div>
              </div>
            ) : null}

            {relatedPlaces.length > 0 ? (
              <div className="mt-10">
                <h3 className="flex items-center gap-2 font-display text-h3">
                  <Mountain className="size-4 text-accent-ink" aria-hidden />
                  Places
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/*
                    PHASE 14: these cards linked to Google Maps, which ended
                    the journey on someone else's website. The place has its
                    own sourced record here — with its stories and its
                    connected events — so the card leads there and the maps
                    link stays available beside it.
                  */}
                  {relatedPlaces.map((place) => (
                    <li key={place.slug}>
                      <div className="card-lift flex h-full flex-col gap-1.5 rounded-xl border bg-surface p-4">
                        <Link
                          href={destinationPath(destinationId, "places", place.slug)}
                          prefetch={false}
                          className="text-body font-semibold hover:text-primary"
                        >
                          {place.name}
                        </Link>
                        <span className="font-mono text-caption text-subtle">
                          {place.category} · {place.district} district
                        </span>
                        <span className="mt-1 text-caption leading-relaxed text-muted">
                          {place.description}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
                          {/* "Add to trip" is gone from the product; the row
                              keeps the two actions that lead somewhere. */}
                          <Link
                            href={destinationPath(destinationId, "places", place.slug)}
                            prefetch={false}
                            className="font-medium text-primary hover:underline"
                          >
                            View place
                          </Link>
                          {/* Sikkim's places carry a Maps link; a capsule
                              place carries a coordinate and no such URL, and
                              inventing one would be inventing a location. */}
                          <a
                            href={"googleMapsUrl" in place ? place.googleMapsUrl : (place.wikipediaUrl ?? "#")}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-subtle hover:text-primary"
                          >
                            Map
                            <ExternalLink className="size-3" aria-hidden />
                          </a>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
