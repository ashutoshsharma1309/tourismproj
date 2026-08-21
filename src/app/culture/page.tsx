import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CultureShelves } from "@/components/culture/CultureShelves";
import type { Shelf } from "@/components/culture/CultureShelves";
import { Footer } from "@/components/layout/Footer";
import { CULTURE_SHELVES, CULTURE_STATS } from "@/data/culture-videos";
import { stories } from "@/data/stories";
import { SITE_URL } from "@/lib/constants";

/**
 * Culture, food and traditions on film.
 *
 * The archive could already be read and listened to; this is the part that can
 * be watched, and it covers the subjects the monastery pages do not — the
 * kitchen, the loom, the wedding, the market.
 *
 * Every film is embedded rather than linked, so a visitor who wants to know
 * what churpi is does not have to leave for YouTube and decide whether to come
 * back. Nothing is re-hosted: this is YouTube's own player, and the channel is
 * named on every card.
 */

export const metadata: Metadata = {
  title: "Culture, food and traditions",
  description: `${CULTURE_STATS.total} verified films on Sikkim's food, festivals, music, crafts, textiles and communities — every one checked against YouTube's own record of its title and channel, and played without leaving the archive.`,
  alternates: { canonical: `${SITE_URL}/culture` },
};

export default function CulturePage() {
  /*
   * Each shelf carries the stories the archive already holds on its subject.
   * Capped at four so the strip stays a doorway rather than a second index,
   * and taken in the archive's own order rather than at random, so the page
   * does not reshuffle between builds.
   */
  const shelves: Shelf[] = CULTURE_SHELVES.map((shelf) => ({
    id: shelf.id,
    label: shelf.label,
    blurb: shelf.blurb,
    videos: shelf.videos,
    stories: stories
      .filter((story) => (shelf.storyCategories as string[]).includes(story.category))
      .slice(0, 4)
      .map((story) => ({ slug: story.slug, title: story.title, category: story.category })),
  }));

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Culture on film
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          The kitchen, the loom, the dance floor
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          {CULTURE_STATS.total} films across {CULTURE_STATS.categories} subjects — Sikkim&apos;s
          food, festivals, music and dance, crafts, textiles, communities and the
          ordinary weeks in between. Each one plays here, on this page.
        </p>

        <p className="mt-4 max-w-2xl text-small leading-relaxed text-muted">
          Every film was checked against YouTube&apos;s own record of it, so the
          title and channel below are what the platform reports and not what a
          search result advertised. {CULTURE_STATS.institutional} come from
          government, public-broadcaster or institute channels — the Eastern
          Zonal Cultural Centre, DD&nbsp;Gangtok, the Namgyal Institute of
          Tibetology. Of 109 candidates examined, 75 were rejected: duplicates,
          Shorts, films about Darjeeling or Nepal rather than Sikkim, political
          material, and two whose owners do not permit embedding.
        </p>

        <div className="mt-8">
          <CultureShelves shelves={shelves} />
        </div>

        <section
          className="mt-12 rounded-xl border bg-surface-muted/40 p-5"
          aria-labelledby="culture-sources"
        >
          <h2 id="culture-sources" className="flex items-center gap-2 font-display text-h4">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
            How these were chosen, and what is missing
          </h2>
          <p className="mt-2 max-w-3xl text-small leading-relaxed text-muted">
            Nothing here is downloaded, re-encoded or re-hosted. Playback is
            YouTube&apos;s own embedded player, so the film stays with the person
            who made it, along with their analytics and their controls, and
            nothing loads from YouTube until you press play. Where an owner
            restricts embedding, the film was dropped rather than worked around.
          </p>
          <p className="mt-3 max-w-3xl text-small leading-relaxed text-muted">
            Textiles is the thinnest shelf, and the reason is worth stating: the
            one institutional handloom film found refuses embedding. Crafts,
            heritage and daily life stopped at three films each rather than
            being padded with material that only mentions Sikkim in passing. A
            shelf here is short when the verified footage ran out, not when the
            searching did.
          </p>
          <p className="mt-3 font-mono text-caption text-subtle">
            {CULTURE_STATS.hd} of {CULTURE_STATS.total} are HD uploads · last
            verified {CULTURE_STATS.verifiedAt} ·{" "}
            <Link href="/stories" className="text-primary hover:underline">
              the written archive
            </Link>{" "}
            ·{" "}
            <Link href="/monasteries" className="text-primary hover:underline">
              monastery films
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
