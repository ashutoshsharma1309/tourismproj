import { ArrowRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { StoriesExplorer } from "@/components/stories/StoriesExplorer";
import { buttonClasses } from "@/components/ui/Button";
import {
  STORY_CATEGORIES,
  STORY_CLAIM_TYPES,
  STORY_COMMUNITIES,
  STORY_STATS,
  stories,
} from "@/data/stories";

export const metadata: Metadata = {
  title: "Stories of Sikkim",
  description:
    "A cultural archive of Sikkim — festivals, communities, food, folk dance, sacred landscapes and heritage trails. Every story cites its sources and says whether it is a historical record, an oral tradition or a legend.",
};

export default function StoriesPage() {
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6">
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
          <Link href="/explore" className={buttonClasses({ variant: "outline", size: "sm" })}>
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
