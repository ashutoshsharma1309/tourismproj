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
  Clock3,
  Compass,
  Headphones,
  Info,
  MapPin,
  Rotate3d,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VisitRecorder } from "@/components/discovery/VisitRecorder";
import { Footer } from "@/components/layout/Footer";
import { ClaimBadge } from "@/components/stories/StoryCard";
import { StoryHero } from "@/components/stories/StoryHero";
import { StorySources } from "@/components/stories/StorySources";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { getMonasteryBySlug } from "@/data/monasteries";
import { isFullSphere } from "@/data/panoramas";
import { getPlaceBySlug } from "@/data/places";
import { CLAIM_DESCRIPTION, CLAIM_LABEL } from "@/data/stories";
import { getEventsForStory } from "@/data/history";
import { formatDate } from "@/lib/format";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/components/seo/JsonLd";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { getStories } from "@/lib/destinations/content";
import { storyContext, storyPlaces } from "@/lib/destinations/story-lookup";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

interface PageProps {
  params: Promise<{ destinationId: string; slug: string }>;
}

const CAPABILITY = "storyPages" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  /*
   * PHASE 18 — each destination's own stories, and only the long-form ones.
   *
   * This crossed every story-capable destination with Sikkim's 70 stories,
   * which put Sikkim's narratives at eight other destinations' URLs the
   * moment capsules arrived. A capsule story is two retrieved sentences; this
   * page renders body paragraphs, key facts, communities, an image credit and
   * a source list, so `content` is the honest test of whether a record
   * belongs here. Capsule stories are rendered on their destination's
   * discovery page.
   */
  const perDestination = await Promise.all(
    ids.map(async (destinationId) => {
      const own = await getStories(destinationId);
      return own
        .filter((story) => "content" in story)
        .map((story) => ({ destinationId, slug: story.slug }));
    }),
  );
  return perDestination.flat();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  /* The destination is part of the key: two destinations may hold a story
     with the same slug, and the title of one is not the title of the other. */
  const { destinationId, slug } = await params;
  const { story } = await storyContext(destinationId, slug);
  if (!story) return {};
  return {
    title: story.title,
    description: story.summary,
    openGraph: {
      title: story.title,
      description: story.summary,
      images: [{ url: story.heroImage, alt: story.heroAlt }],
      type: "article",
    },
  };
}

export default async function StoryDetailPage({ params }: PageProps) {
  const { destinationId, slug } = await params;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);
  /*
   * The destination's own corpus, not Sikkim's. `getStoryBySlug` reads
   * `@/data/stories`, which knows 70 Sikkim narratives and nothing else — so
   * all 178 capsule stories prerendered as 404s despite being listed in the
   * static params directly above.
   */
  const { story, related, previous, next } = await storyContext(destinationId, slug);
  if (!story) notFound();

  const monasteries = story.relatedMonasteries
    .map((monasterySlug) => getMonasteryBySlug(monasterySlug))
    .filter((monastery) => monastery !== undefined);

  const places = (await storyPlaces(destinationId, story.relatedPlaces))
    .map((place) => place)
    .filter((place) => place !== undefined);

  /*
   * The timeline events that name this story.
   *
   * `getEventsForStory` has existed in `data/history.ts` since the timeline was
   * built and nothing ever called it — so a reader could go from a dated event
   * to the story that tells it, but never back. The edge is the sources' own:
   * an event lists the stories it relates to, and this reads that list in the
   * other direction. Nothing is inferred and no new data exists.
   */
  const timelineEvents = getEventsForStory(story.slug);

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: story.title,
            description: story.summary,
            url: `/destinations/${destinationId}/stories/${story.slug}`,
            image: story.heroImage,
            section: story.category,
          }),
          breadcrumbSchema([
            { name: "Stories", url: `/destinations/${destinationId}/stories` },
            { name: story.title, url: `/destinations/${destinationId}/stories/${story.slug}` },
          ]),
        ]}
      />
      <VisitRecorder
        kind="story"
        name={story.title}
        href={`/destinations/${destinationId}/stories/${story.slug}`}
        neighbours={[
          /* Real record names, not names rebuilt from slugs: title-casing
             "sanga-choeling" gives "Sanga Choeling", while the record is
             "Sanga Choeling Monastery". The lookup is server-side and free. */
          ...story.relatedMonasteries
            .map((slug) => getMonasteryBySlug(slug))
            .filter((entry) => entry !== undefined)
            .slice(0, 2)
            .map((entry) => ({
              kind: "monastery" as const,
              name: entry.name,
              href: `/destinations/${destinationId}/monasteries/${entry.slug}`,
            })),
          ...story.relatedPlaces
            .map((slug) => getPlaceBySlug(slug))
            .filter((entry) => entry !== undefined)
            .slice(0, 2)
            .map((entry) => ({
              kind: "place" as const,
              name: entry.name,
              href: `/destinations/${destinationId}/places/${entry.slug}`,
            })),
        ]}
      />
      <main id="main" className="pt-24 pb-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <DestinationBreadcrumb
            destinationId={destinationId}
            destinationName={destination.name}
            section="Stories"
            sectionHref={destinationPath(destinationId, "stories")}
            current={story.title}
          />
        </div>

        {/* Hero */}
        <StoryHero
          src={story.heroImage}
          alt={story.heroAlt}
          width={story.imageCredit?.width}
          height={story.imageCredit?.height}
          credit={story.imageCredit}
        />

        <article className="mx-auto max-w-3xl px-4 md:px-6">
          <header className="mt-8">
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              {story.category}
            </p>
            <h1 className="mt-3 font-display text-h1 text-balance-heading">{story.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ClaimBadge claimType={story.claimType} />
              <span className="flex items-center gap-1.5 text-caption text-subtle">
                <Clock3 className="size-3.5" aria-hidden />
                {story.readingMinutes} min read
              </span>
              <span className="flex items-center gap-1.5 text-caption text-subtle">
                <Users className="size-3.5" aria-hidden />
                {story.communities.join(", ")}
              </span>
              <span className="text-caption text-subtle">
                Verified {formatDate(story.lastVerified)}
              </span>
            </div>

            <p className="mt-6 text-body-lg leading-relaxed font-medium">{story.summary}</p>
          </header>

          {/* How to read this story — shown for everything except plain record. */}
          {story.claimType !== "documented history" ? (
            <aside className="mt-7 rounded-lg border-l-4 border-warning bg-warning-soft p-4">
              <p className="text-small leading-relaxed">
                <strong>{CLAIM_LABEL[story.claimType]}.</strong>{" "}
                {CLAIM_DESCRIPTION[story.claimType]}
              </p>
            </aside>
          ) : null}

          {story.imageNote ? (
            <p className="mt-5 flex gap-2 rounded-lg border bg-surface-muted/60 p-3.5 text-caption leading-relaxed text-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
              <span>
                <span className="font-medium text-foreground">About the photograph. </span>
                {story.imageNote}
              </span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-5">
            {story.content.map((paragraph, index) => (
              <p key={index} className="text-body-lg leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Key facts */}
          <section
            aria-labelledby="key-facts"
            className="mt-10 rounded-xl border bg-primary-soft/50 p-6"
          >
            <h2 id="key-facts" className="font-display text-h3">
              What to remember
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {story.keyFacts.map((fact) => (
                <li key={fact} className="flex gap-3 text-small leading-relaxed">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {fact}
                </li>
              ))}
            </ul>
          </section>

          {/* Places in this story */}
          {places.length > 0 ? (
            <section aria-labelledby="places-heading" className="mt-12">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="places-heading" className="font-display text-h3">
                  Places in this story
                </h2>
                <Link
                  href={destinationPath(destinationId, "explore")}
                  className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
                >
                  <MapPin className="size-4" aria-hidden />
                  View on the map
                </Link>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {places.map((place) => (
                  <li key={place.slug}>
                    <Link
                      href={destinationPath(destinationId, "places", place.slug)}
                      className="group flex h-full gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                        {place.image ? (
                          <Image
                            src={place.image}
                            alt={place.imageAlt}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <MapPin className="size-5 text-subtle" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold group-hover:text-primary">
                          {place.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-caption text-subtle">
                          {place.category} · {place.district} district
                        </span>
                        {/*
                          "Open access" used to stand here whenever the record
                          carried no permit note. That is an inference from an
                          absence, and it is the kind of practical claim this
                          project does not make: no note means nobody has
                          published a requirement, not that entry is free.
                        */}
                        {"permitNote" in place && place.permitNote ? (
                          <span className="mt-1 block text-caption text-muted">Permit required</span>
                        ) : null}
                      </span>
                    </Link>
                    {/*
                      Both ways in, deliberately. The card leads to the
                      place's own record — its stories, its connected events,
                      add-to-trip — and this leads to the map, which is where
                      a reader who wants to know WHERE it is goes. Replacing
                      the map link with the record link removed a real path;
                      keeping only the map link kept the reader on a pin.
                    */}
                    <Link
                      href={`${destinationPath(destinationId, "explore")}?place=${place.slug}`}
                      prefetch={false}
                      className="mt-1.5 ml-3 inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                    >
                      <MapPin className="size-3" aria-hidden />
                      Show on the map
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Monasteries in this story */}
          {monasteries.length > 0 ? (
            <section aria-labelledby="monasteries-heading" className="mt-12">
              <h2 id="monasteries-heading" className="font-display text-h3">
                Monasteries in this story
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {monasteries.map((monastery) => (
                  <li key={monastery.slug}>
                    <Link
                      href={`/destinations/${destinationId}/monasteries/${monastery.slug}`}
                      className="group flex h-full flex-col gap-1.5 rounded-xl border bg-surface p-4 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <span className="text-body font-semibold group-hover:text-primary">
                        {monastery.name}
                      </span>
                      <span className="font-mono text-caption text-subtle">
                        {monastery.district} district · {monastery.tradition} · est.{" "}
                        {monastery.establishedYear}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={monastery.audio.available ? "success" : "neutral"}>
                          <Headphones className="size-3" aria-hidden />
                          {monastery.audio.available
                            ? `Audio · ${monastery.audio.languages.length}`
                            : "No audio yet"}
                        </Badge>
                        <Badge tone="neutral">
                          <Rotate3d className="size-3" aria-hidden />
                          {!monastery.tour.available
                            ? "No panorama yet"
                            : isFullSphere(monastery.tour.projection)
                              ? "360° available"
                              : "Panorama available"}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Sources */}
          <StorySources sources={story.sources} lastVerified={story.lastVerified} />

          {/* Previous / next */}
          <nav aria-label="Story navigation" className="mt-12 grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/destinations/${destinationId}/stories/${previous.slug}`}
                rel="prev"
                className="group flex flex-col gap-1 rounded-xl border bg-surface p-4 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="flex items-center gap-1.5 font-mono text-eyebrow tracking-widest text-subtle uppercase">
                  <ArrowLeft
                    className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                  Previous
                </span>
                <span className="text-body font-semibold group-hover:text-primary">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden />
            )}
            {next ? (
              <Link
                href={`/destinations/${destinationId}/stories/${next.slug}`}
                rel="next"
                className="group flex flex-col gap-1 rounded-xl border bg-surface p-4 text-right transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none sm:col-start-2"
              >
                <span className="flex items-center justify-end gap-1.5 font-mono text-eyebrow tracking-widest text-subtle uppercase">
                  Next
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="text-body font-semibold group-hover:text-primary">
                  {next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        </article>

        {/* Where this sits in the recorded history — the inverse of the edge
            the timeline already publishes. */}
        {timelineEvents.length > 0 ? (
          <section
            aria-labelledby="timeline-heading"
            className="mx-auto mt-16 max-w-7xl px-4 md:px-6"
          >
            <h2 id="timeline-heading" className="font-display text-h2">
              Where this sits in the timeline
            </h2>
            <p className="mt-2 max-w-2xl text-body text-muted">
              {timelineEvents.length === 1
                ? "One dated event in Sikkim's recorded history names this story."
                : `${timelineEvents.length} dated events in Sikkim's recorded history name this story.`}{" "}
              The link is the archive&apos;s own: the event lists it, and this
              reads that list backwards.
            </p>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {timelineEvents.map((event) => (
                <li key={event.slug}>
                  <Link
                    href={`/destinations/${destinationId}/history/${event.slug}`}
                    className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span
                      className="font-mono text-eyebrow tracking-widest text-primary uppercase"
                      data-numeric
                    >
                      {event.yearLabel}
                    </span>
                    <span className="mt-1 font-display text-h4">{event.title}</span>
                    <span className="mt-2 text-body text-muted">
                      {event.shortDescription}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Related stories */}
        {related.length > 0 ? (
          <section
            aria-labelledby="related-heading"
            className="mx-auto mt-16 max-w-7xl px-4 md:px-6"
          >
            <h2 id="related-heading" className="font-display text-h2">
              Keep going
            </h2>
            <p className="mt-2 text-body text-muted">
              More from the archive that connects to this one.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/destinations/${destinationId}/stories/${item.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border bg-surface shadow-soft transition-[transform,box-shadow,border-color] duration-300 ease-out-soft hover:-translate-y-1.5 hover:border-accent hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                    <Image
                      src={item.heroImage}
                      alt={item.heroAlt}
                      fill
                      sizes="(min-width: 1024px) 24rem, 92vw"
                      className="media-zoom object-cover group-hover:scale-[1.05]"
                    />
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="font-mono text-caption tracking-wider text-accent-ink uppercase">
                      {item.category}
                    </span>
                    <span className="mt-1.5 font-display text-h4 group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="mt-2 line-clamp-2 text-small leading-relaxed text-muted">
                      {item.summary}
                    </span>
                    <span className="mt-auto pt-4 text-small font-semibold text-primary">
                      Read story →
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={`/destinations/${destinationId}/stories`} className={buttonClasses({ variant: "outline" })}>
                <ArrowLeft className="size-4" aria-hidden />
                Back to all stories
              </Link>
              <Link href={`/destinations/${destinationId}/explore`} className={buttonClasses({ variant: "primary" })}>
                <Compass className="size-4" aria-hidden />
                Explore Sikkim on the map
              </Link>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
