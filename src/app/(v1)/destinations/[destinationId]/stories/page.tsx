/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { ArrowRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { StoriesExplorer } from "@/components/stories/StoriesExplorer";
import { buttonClasses } from "@/components/ui/Button";
import { getDestination, listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { destinationOpenGraph } from "@/lib/destinations/social-card";
import { SITE_URL } from "@/lib/constants";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import { StoryCard } from "@/components/stories/StoryCard";
import { getStories } from "@/lib/destinations/content";
import type { Story } from "@/data/stories/types";
import {
  STORY_CATEGORIES,
  STORY_CLAIM_TYPES,
  STORY_COMMUNITIES,
  STORY_STATS,
  stories,
} from "@/data/stories";

/* PHASE 18 — the page-bearing capability, not the content one. A capsule has
   stories; it does not have stories PAGES, and this index rendered Sikkim's
   archive under its URL until the two were told apart. */
const CAPABILITY = "storyPages" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  /*
   * CAPABILITY, not the content capability. These disagreed: params were
   * generated for every destination that HAS such records, while the page
   * requires records long enough to carry their own pages. The twelve
   * capsules were therefore built, rendered, 404'd and written to disk as
   * 404 shells — twelve pages that exist to not exist.
   */
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

/*
 * PHASE 19 — metadata belongs to the destination in the URL.
 *
 * This was a static object reading "Stories of Sikkim", which every
 * destination routed through this file inherited. Phase 19 made that visible:
 * `/destinations/paris/stories` shipped an RSC payload titled "Stories of
 * Sikkim · Sikkim Darshan", and its social card was a photograph of Rumtek —
 * the same failure `destinationOpenGraph` was extracted to stop in Phase 12,
 * in the one place that had not been converted.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}): Promise<Metadata> {
  const { destinationId } = await params;
  const destination = getDestination(destinationId);
  if (!destination) return {};

  const title = `Stories of ${destination.name}`;
  const description = `A cultural archive of ${destination.name}. Every story cites its sources and says whether it is a historical record, an oral tradition or a legend.`;
  return {
    title,
    description,
    openGraph: await destinationOpenGraph(destination, {
      title,
      description,
      url: `${SITE_URL}/destinations/${destinationId}/stories`,
    }),
  };
}

export default async function StoriesPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  /*
   * TWO INDEXES BEHIND ONE ROUTE. Below this block is Sikkim's explorer —
   * its nineteen shelves, its communities filter, its seventy stories. When
   * fourteen destinations gained `storyPages`, this route rendered that
   * explorer at all of their URLs: Kyoto's story index showed seventy
   * photographs of Sikkim. A capsule destination renders its own stories,
   * on the shelves its own records fill.
   */
  if (destinationId !== "sikkim") {
    const stories = (await getStories(destinationId)) as Story[];
    const featured = stories.find((story) => story.heroImage) ?? stories[0];
    const rest = stories.filter((story) => story.slug !== featured?.slug);
    const shelves = new Map<string, Story[]>();
    for (const story of rest) {
      const key = story.category ?? "Stories";
      if (!shelves.has(key)) shelves.set(key, []);
      shelves.get(key)!.push(story);
    }
    const ordered = [...shelves.entries()].sort((a, b) => b[1].length - a[1].length);
    return (
      <>
        <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-24 md:px-6">
          <DestinationBreadcrumb destinationId={destinationId} destinationName={destination.name} section="Stories" />
          <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            Stories of {destination.name}
          </h1>
          <p className="mt-4 max-w-[68ch] text-body-lg leading-relaxed text-muted">
            {stories.length} {stories.length === 1 ? "story" : "stories"} across {ordered.length}{" "}
            {ordered.length === 1 ? "shelf" : "shelves"} — what {destination.name} eats, celebrates and makes, each
            quoted from a cited source and each saying how it should be read.
          </p>

          {featured ? (
            <section aria-labelledby="featured-story" className="mt-10">
              <h2 id="featured-story" className="sr-only">Featured story</h2>
              <div className="max-w-3xl">
                <StoryCard story={featured} />
              </div>
            </section>
          ) : null}

          {ordered.map(([shelf, items]) => (
            <section key={shelf} className="mt-16" aria-labelledby={`shelf-${shelf.replace(/\W+/g, "-")}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-6">
                <h2 id={`shelf-${shelf.replace(/\W+/g, "-")}`} className="font-display text-h2">{shelf}</h2>
                <p className="font-mono text-caption text-subtle">{items.length} {items.length === 1 ? "story" : "stories"}</p>
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </section>
          ))}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main id="main" className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Stories"
        />
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Stories of Sikkim
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          A cultural archive you can check
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-muted">
          {STORY_STATS.stories} stories across {STORY_STATS.categories} categories, covering{" "}
          {STORY_STATS.communities} communities. Every one carries its sources, and every one says
          how it should be read — because a monastery&apos;s own legend is worth telling, and worth
          labelling.
        </p>

        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y py-5">
          {[
            { label: "Stories", value: STORY_STATS.stories },
            { label: "Categories", value: STORY_STATS.categories },
            { label: "Communities", value: STORY_STATS.communities },
            { label: "Sources cited", value: STORY_STATS.sources },
            { label: "With a government source", value: STORY_STATS.governmentSourced },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                {stat.label}
              </dt>
              <dd className="mt-1 font-display text-h3" data-numeric>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <Link href={`/destinations/${destinationId}/explore`} className={buttonClasses({ variant: "outline", size: "sm" })}>
            <MapPin className="size-4" aria-hidden />
            See these places on the map
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <h2 className="sr-only">Browse and search the archive</h2>
        <div className="mt-10">
          <StoriesExplorer
            stories={stories}
            categories={STORY_CATEGORIES}
            communities={STORY_COMMUNITIES}
            claimTypes={STORY_CLAIM_TYPES}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
