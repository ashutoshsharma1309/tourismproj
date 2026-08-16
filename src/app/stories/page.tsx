import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { StoryCard } from "@/components/stories/StoryCard";
import { STORY_CATEGORIES, stories } from "@/data/stories";

export const metadata: Metadata = {
  title: "Stories of Sikkim",
  description:
    "A cultural archive of Sikkim's monasteries, festivals, crafts and history — each story separating documented record from oral tradition and legend.",
};

export default function StoriesPage() {
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Stories of Sikkim
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          The archive behind the buildings
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          {stories.length} stories across {STORY_CATEGORIES.length} categories. Each one
          says whether it is documented history, an oral tradition, or a legend —
          because a monastery&apos;s own legend is worth telling, and worth
          labelling.
        </p>

        {STORY_CATEGORIES.map((category) => {
          const inCategory = stories.filter((s) => s.category === category);
          return (
            <section key={category} className="mt-14" aria-label={category}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-h2">{category}</h2>
                <span className="text-caption text-subtle">
                  {inCategory.length} {inCategory.length === 1 ? "story" : "stories"}
                </span>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
