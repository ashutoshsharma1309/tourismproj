import {
  ArrowLeft,
  ArrowRight,
  Camera,
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

import { Footer } from "@/components/layout/Footer";
import { ClaimBadge } from "@/components/stories/StoryCard";
import { StorySources } from "@/components/stories/StorySources";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { getMonasteryBySlug } from "@/data/monasteries";
import { isFullSphere } from "@/data/panoramas";
import { getPlaceBySlug } from "@/data/places";
import {
  CLAIM_DESCRIPTION,
  CLAIM_LABEL,
  getRelatedStories,
  getStoryBySlug,
  getStoryNeighbours,
  stories,
} from "@/data/stories";
import { formatDate } from "@/lib/format";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
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
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();

  const monasteries = story.relatedMonasteries
    .map((monasterySlug) => getMonasteryBySlug(monasterySlug))
    .filter((monastery) => monastery !== undefined);

  const places = story.relatedPlaces
    .map((placeSlug) => getPlaceBySlug(placeSlug))
    .filter((place) => place !== undefined);

  const related = getRelatedStories(story, 3);
  const { previous, next } = getStoryNeighbours(story.slug);

  return (
    <>
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 rounded-full py-1 text-small font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All stories
          </Link>
        </div>

        {/* Hero */}
        <figure className="mx-auto mt-5 max-w-5xl px-4 md:px-6">
          <div className="relative h-64 overflow-hidden rounded-2xl border bg-surface-muted sm:h-80 md:h-104">
            <Image
              src={story.heroImage}
              alt={story.heroAlt}
              fill
              priority
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="object-cover"
            />
          </div>
          {story.imageCredit ? (
            <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-subtle">
              <Camera className="size-3.5 shrink-0" aria-hidden />
              <span>{story.heroAlt}.</span>
              <a
                href={story.imageCredit.descriptionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {story.imageCredit.attribution}
              </a>
              <span>· {story.imageCredit.license} · Wikimedia Commons</span>
            </figcaption>
          ) : null}
        </figure>

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
                  href="/explore"
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
                      href={`/explore?place=${place.slug}`}
                      className="group flex h-full gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                        <Image
                          src={place.image}
                          alt={place.imageAlt}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold group-hover:text-primary">
                          {place.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-caption text-subtle">
                          {place.category} · {place.district} district
                        </span>
                        <span className="mt-1 block text-caption text-muted">
                          {place.permitNote ? "Permit required" : "Open access"}
                        </span>
                      </span>
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
                      href={`/monasteries/${monastery.slug}`}
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
                href={`/stories/${previous.slug}`}
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
                href={`/stories/${next.slug}`}
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
                  href={`/stories/${item.slug}`}
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
              <Link href="/stories" className={buttonClasses({ variant: "outline" })}>
                <ArrowLeft className="size-4" aria-hidden />
                Back to all stories
              </Link>
              <Link href="/explore" className={buttonClasses({ variant: "primary" })}>
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
