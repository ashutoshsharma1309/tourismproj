import { Clock3, ExternalLink, Headphones, MapPin, Rotate3d } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import {
  NotAvailable,
  SourceNote,
  VerificationBadge,
} from "@/components/ui/Provenance";
import { getAudioGuides } from "@/data/audio";
import { getStoriesForMonastery } from "@/data/stories";
import { StoryCard } from "@/components/stories/StoryCard";
import { getMonasteryBySlug, monasteries } from "@/data/monasteries";
import { HeritageAudioPlayer } from "@/components/monasteries/HeritageAudioPlayer";
import { formatCoordinates } from "@/lib/format";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return monasteries.map((monastery) => ({ slug: monastery.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const monastery = getMonasteryBySlug(slug);
  if (!monastery) return {};
  return { title: monastery.name, description: monastery.description };
}

export default async function MonasteryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const monastery = getMonasteryBySlug(slug);
  if (!monastery) notFound();
  const guides = getAudioGuides(monastery.slug);
  const relatedStories = getStoriesForMonastery(monastery.slug);

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-20 md:px-6">
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

            {/* Digital experiences — honest availability, never assumed. */}
            <h2 className="mt-12 font-display text-h2">Digital experiences</h2>
            <div className="mt-5 grid min-w-0 gap-4">
              {monastery.tour.available ? null : (
                <NotAvailable
                  title="360° experience not yet available"
                  body={`No verified 360° capture of ${monastery.name} exists in the open-licensed record yet. This site is on the digitisation roster — we would rather show nothing than show somewhere else's prayer hall.`}
                  action={
                    <a
                      href={monastery.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-border-strong px-6 text-small font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      <MapPin className="size-4" aria-hidden />
                      View location on Google Maps
                    </a>
                  }
                />
              )}
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
                    <Rotate3d className="size-3.5" aria-hidden /> 360° tour
                  </dt>
                  <dd className="text-muted">
                    {monastery.tour.available ? "Available" : "Not yet captured"}
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
              <h3 className="text-h4 font-semibold">Photograph</h3>
              <p className="mt-2 text-caption leading-relaxed text-muted">
                Image located by the site&apos;s own name on Wikimedia Commons and
                checked reachable.{" "}
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
      </main>
      <Footer />
    </>
  );
}
