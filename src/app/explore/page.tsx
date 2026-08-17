import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ExploreMap } from "@/components/explore/ExploreMap";
import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MAP_DISTRICTS, MAP_STATS, mapSites } from "@/data/map-sites";
import { stories } from "@/data/stories";

export const metadata: Metadata = {
  title: "Explore Sikkim",
  description:
    "Every monastery, lake, pass, sanctuary and heritage site in Sikkim with a coordinate published by a named source — searchable, filterable, and linked to the stories that explain them.",
};

/** slug → the fields the map panel needs. Built once, on the server. */
const STORY_INDEX = Object.fromEntries(
  stories.map((story) => [
    story.slug,
    { slug: story.slug, title: story.title, category: story.category },
  ]),
);

export default function ExplorePage() {
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Explore Sikkim
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          {MAP_STATS.sites} places, every coordinate sourced
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-muted">
          {MAP_STATS.monasteries} monasteries and {MAP_STATS.places} heritage, sacred and natural
          sites. Filter by layer, search by name — or ask for lakes near Gangtok — and follow any
          marker into the stories that explain it.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/stories" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <BookOpen className="size-4" aria-hidden />
            Read the stories
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/monasteries" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Monastery catalogue
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <h2 className="sr-only">Map and filters</h2>
        <div className="mt-8">
          {/* useSearchParams needs a Suspense boundary for the deep-link support. */}
          <Suspense fallback={<Skeleton className="h-152 w-full rounded-xl" />}>
            <ExploreMap
              sites={mapSites}
              districts={MAP_DISTRICTS}
              storyIndex={STORY_INDEX}
              unmappedMonasteries={MAP_STATS.unmapped}
            />
          </Suspense>
        </div>

        <section aria-labelledby="map-integrity" className="mt-14 rounded-xl border bg-surface p-6">
          <h2 id="map-integrity" className="font-display text-h3">
            What this map will not do
          </h2>
          <ul className="mt-4 grid gap-3 text-small leading-relaxed text-muted sm:grid-cols-2">
            <li>
              <strong className="text-foreground">No estimated pins.</strong> Every coordinate is
              the one published by the cited source. Nothing is placed by eye.
            </li>
            <li>
              <strong className="text-foreground">
                {MAP_STATS.unmapped} monaster{MAP_STATS.unmapped === 1 ? "y is" : "ies are"} missing.
              </strong>{" "}
              They are catalogued but have no coordinate this archive can stand behind, so they are
              left off rather than approximated.
            </li>
            <li>
              <strong className="text-foreground">No stays plotted.</strong> The stay directory has
              no licensed coordinate feed, so properties are listed without being mapped.
            </li>
            <li>
              <strong className="text-foreground">Distances are straight lines.</strong> Road
              distance in Sikkim can be several times further; there is no routing licence here to
              pretend otherwise.
            </li>
          </ul>
          <Link
            href="/preservation"
            className="mt-5 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
          >
            See the full coverage audit
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
