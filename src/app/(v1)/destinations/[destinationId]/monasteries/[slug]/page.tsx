/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { ArrowRight, Check, Clock3, ExternalLink, Headphones, MapPin, Rotate3d, X } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExperienceIntelligence } from "@/components/discovery/ExperienceIntelligence";
import { VisitRecorder } from "@/components/discovery/VisitRecorder";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import {
  NotAvailable,
  SourceNote,
  VerificationBadge,
} from "@/components/ui/Provenance";
import { getAudioGuides } from "@/data/audio";
import { monasteryGallery } from "@/data/galleries";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { getStoriesForMonastery } from "@/data/stories";
import { StoryCard } from "@/components/stories/StoryCard";
import { getMonasteryBySlug, monasteries } from "@/data/monasteries";
import { HeritageAudioPlayer } from "@/components/monasteries/HeritageAudioPlayer";
import { ExperienceSection } from "@/components/monasteries/ExperienceSection";
import { VisitorVoices } from "@/components/monasteries/VisitorVoices";
import { MonasteryTimeline } from "@/components/history/MonasteryTimeline";
import { ArchiveCard } from "@/components/archive/ArchiveCard";
import { getArchiveForMonastery } from "@/data/archive";
import { getPanorama } from "@/data/panoramas";
import { getVideo } from "@/data/videos";
import { formatCoordinates } from "@/lib/format";
import { cn } from "@/lib/cn";
import { GUIDELINE_PROVENANCE, siteGuidelines } from "@/data/responsible-tourism";
import { JsonLd, breadcrumbSchema, monasterySchema } from "@/components/seo/JsonLd";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

interface PageProps {
  params: Promise<{ destinationId: string; slug: string }>;
}

const CAPABILITY = "sites" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  const items = monasteries.map((monastery) => ({ slug: monastery.slug }));
  return ids.flatMap((destinationId) =>
    items.map((item) => ({ destinationId, ...item })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destinationId, slug } = await params;
  const monastery = getMonasteryBySlug(slug);
  if (!monastery) return {};
  /* Without an `openGraph` block here the root layout's own block wins, so
     every monastery shared the site-level title and the same photograph. 118
     of the 201 prerendered pages were emitting one identical social card. */
  return {
    title: monastery.name,
    description: monastery.description,
    alternates: { canonical: `/destinations/${destinationId}/monasteries/${monastery.slug}` },
    openGraph: {
      title: `${monastery.name}, ${monastery.district}`,
      description: monastery.description,
      images: [{ url: monastery.image, alt: `${monastery.name}, ${monastery.district}, Sikkim` }],
      type: "article",
    },
  };
}

export default async function MonasteryDetailPage({ params }: PageProps) {
  const { destinationId, slug } = await params;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);
  const monastery = getMonasteryBySlug(slug);
  if (!monastery) notFound();
  const guides = getAudioGuides(monastery.slug);
  const relatedStories = getStoriesForMonastery(monastery.slug);
  const archive = getArchiveForMonastery(monastery.slug);
  const panorama = getPanorama(monastery.slug);
  const video = getVideo(monastery.slug);
  const photos = monasteryGallery(monastery.slug);

  return (
    <>
      <JsonLd
        data={[
          monasterySchema(monastery),
          breadcrumbSchema([
            { name: "Monasteries", url: `/destinations/${destinationId}/monasteries` },
            { name: monastery.name, url: `/destinations/${destinationId}/monasteries/${monastery.slug}` },
          ]),
        ]}
      />
      <VisitRecorder
        kind="monastery"
        name={monastery.name}
        href={`/destinations/${destinationId}/monasteries/${monastery.slug}`}
        neighbours={relatedStories.slice(0, 4).map((story) => ({
          kind: "story" as const,
          name: story.title,
          href: `/destinations/${destinationId}/stories/${story.slug}`,
        }))}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-24 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Monasteries"
          sectionHref={destinationPath(destinationId, "monasteries")}
          current={monastery.name}
        />

        {/* Hero */}
        <div className="relative h-72 overflow-hidden rounded-xl border bg-surface-inverse md:h-105">
          <Image
            src={monastery.image}
            alt={`${monastery.name}, ${monastery.district} district`}
            fill
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover"
          />
          <div className="gradient-overlay absolute inset-0" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="jade">{monastery.tradition}</Badge>
              <Badge tone="inverse">est. {monastery.establishedYear}</Badge>
              <VerificationBadge provenance={monastery.provenance} />
            </div>
            <h1 className="mt-3 font-display text-h1 text-foreground-inverse text-glow">
              {monastery.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-small text-foreground-inverse/85">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                {monastery.district} district
              </span>
              {monastery.coordinates ? (
                <span>
                  {formatCoordinates(
                    monastery.coordinates.lat,
                    monastery.coordinates.lng,
                  )}
                </span>
              ) : (
                <span>Precise coordinate not yet verified</span>
              )}
            </p>
            <p className="mt-3 max-w-2xl text-body text-foreground-inverse/85">
              {monastery.description}
            </p>
          </div>
        </div>

        {/* Photographs — the strongest argument for going. It sits directly
            under the hero because a visitor decides whether a place is worth
            the road to it long before they read the founding date. */}
        {photos.length > 0 ? (
          <section className="mt-10" aria-labelledby="photographs">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="photographs" className="font-display text-h2">
                Photographs
              </h2>
              <p className="font-mono text-caption text-subtle">
                {photos.length} frames · freely licensed · every one credited
              </p>
            </div>
            <PhotoGallery
              photos={photos}
              subject={monastery.name}
              className="mt-5"
            />
          </section>
        ) : null}

        <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* History */}
          <section aria-label="History and culture" className="min-w-0">
            <h2 className="font-display text-h2">History &amp; culture</h2>
            <div className="mt-4 flex flex-col gap-4">
              {monastery.history.map((paragraph, index) => (
                <p key={index} className="text-body-lg leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-surface p-4">
                <dt className="text-caption font-medium text-subtle">Significance</dt>
                <dd className="mt-1 text-small leading-relaxed">{monastery.significance}</dd>
              </div>
              <div className="rounded-lg border bg-surface p-4">
                <dt className="text-caption font-medium text-subtle">Architecture</dt>
                <dd className="mt-1 text-small leading-relaxed">{monastery.architecture}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <SourceNote provenance={monastery.provenance} />
            </div>

            {/* Immersive experience — panorama where one is verified, film
                where it is not, and an honest empty state where neither. */}
            <ExperienceSection monastery={monastery} />

            {/* Listen */}
            <h2 className="mt-14 font-display text-h2">Listen</h2>
            <div className="mt-5 grid min-w-0 gap-4">
              {guides.length > 0 ? (
                <HeritageAudioPlayer guides={guides} />
              ) : (
                <NotAvailable
                  title="Audio guide not yet available"
                  body="The sources for this site do not yet contain enough material to narrate 60 seconds of history without inventing detail. It stays silent until they do."
                />
              )}
            </div>
          </section>

          {/* Visit rail */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border bg-surface p-5">
              <h3 className="text-h4 font-semibold">Visit</h3>
              <a
                href={monastery.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Open in Google Maps
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <dl className="mt-4 flex flex-col gap-3 text-small">
                <div className="flex gap-3">
                  <dt className="flex w-28 shrink-0 items-center gap-1.5 text-subtle">
                    <Clock3 className="size-3.5" aria-hidden /> Hours
                  </dt>
                  <dd className="text-muted">
                    {monastery.visitingHours.status === "unpublished" ? (
                      "Not published — confirm locally"
                    ) : (
                      <>
                        {monastery.visitingHours.summary}
                        <span className="mt-1 block text-caption text-subtle">
                          {monastery.visitingHours.status === "official"
                            ? "Officially published hours"
                            : "Reported hours — confirm locally"}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="flex w-28 shrink-0 items-center gap-1.5 text-subtle">
                    <Rotate3d className="size-3.5" aria-hidden /> Immersive
                  </dt>
                  <dd className="text-muted">
                    {panorama
                      ? "Panoramic capture — pan and zoom"
                      : video
                        ? "Video — no panorama captured yet"
                        : "Not yet captured"}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="flex w-28 shrink-0 items-center gap-1.5 text-subtle">
                    <Headphones className="size-3.5" aria-hidden /> Audio
                  </dt>
                  <dd className="text-muted">
                    {monastery.audio.available ? "Available" : "Not yet recorded"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-caption leading-relaxed text-subtle">
                Dress modestly and ask before
                photographing inside a shrine room.
              </p>
            </div>

            <div className="rounded-xl border bg-surface p-5">
              <h3 className="text-h4 font-semibold">Photography</h3>
              <p className="mt-2 text-caption leading-relaxed text-muted">
                {photos.length > 0 ? (
                  <>
                    {photos.length + 1} freely licensed photographs, each one
                    admitted only on evidence that it shows this site — its own
                    Commons category, its description, or a coordinate on the
                    grounds. Author and licence are printed with every frame.{" "}
                  </>
                ) : (
                  <>
                    Image located by the site&apos;s own name on Wikimedia Commons
                    and checked reachable.{" "}
                  </>
                )}
                <a
                  href={monastery.imageSource}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Commons
                </a>
              </p>
            </div>
          </aside>
        </div>

        {/*
          A working monastery is a religious community that happens to admit
          visitors. The archive told people where to go and what they were
          looking at, and stopped there — so this is the missing half, placed
          before the onward links rather than after them because it is only
          useful to someone who has not left yet.
        */}
        <section className="mt-14" aria-labelledby="visiting-conduct">
          <h2 id="visiting-conduct" className="font-display text-h2">
            Visiting {monastery.name}
          </h2>
          <p className="mt-3 max-w-2xl text-body text-muted">
            Guidance issued by the Tourism &amp; Civil Aviation Department for
            visitors to Sikkim&apos;s religious sites and protected areas.
          </p>
          <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {siteGuidelines.map((section) => (
              <div key={section.slug}>
                <h3 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                  {section.heading}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {section.items.map((item) => {
                    const avoid = item.polarity === "avoid";
                    return (
                      <li key={item.text} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full",
                            avoid ? "bg-error-soft text-error" : "bg-success-soft text-success",
                          )}
                        >
                          {avoid ? (
                            <X className="size-2.5" aria-hidden />
                          ) : (
                            <Check className="size-2.5" aria-hidden />
                          )}
                        </span>
                        <span className="text-small leading-relaxed">
                          <span className="sr-only">{avoid ? "Do not: " : "Do: "}</span>
                          {item.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <SourceNote provenance={GUIDELINE_PROVENANCE} />
          </div>
        </section>

        <VisitorVoices monasterySlug={monastery.slug} monasteryName={monastery.name} />

        <MonasteryTimeline slug={monastery.slug} monasteryName={monastery.name} />

        {/* PHASE 14 — the discovery lens over this record: why it matters in
            countable terms, what earned each of its interests, what connects
            to it, and how to put it in a trip. `showHistory` is off because
            MonasteryTimeline above already renders this site's events. */}
        <ExperienceIntelligence
          destinationId={destinationId}
          kind="site"
          slug={monastery.slug}
          showHistory={false}
        />

        {relatedStories.length > 0 ? (
          <section className="mt-16" aria-label="Related stories">
            <h2 className="font-display text-h2">Stories from here</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedStories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          </section>
        ) : null}

        {/* What the Digital Heritage Archive holds for this site. */}
        {archive.length > 0 ? (
          <section className="mt-16" aria-label="Archive objects from this monastery">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-h2">In the heritage archive</h2>
              <Link
                href={`/destinations/${destinationId}/archive`}
                className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
              >
                The whole archive
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-2 max-w-2xl text-body text-muted">
              Catalogued objects connected to {monastery.name} — each with its
              creator, its licence and its source.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {archive.map((item) => (
                <ArchiveCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
