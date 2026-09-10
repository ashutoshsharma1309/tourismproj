/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CultureShelves } from "@/components/culture/CultureShelves";
import { DestinationCultureShelves } from "@/components/culture/DestinationCultureShelves";
import { cultureShelves } from "@/lib/destinations/culture";
import type { Shelf } from "@/components/culture/CultureShelves";
import { Footer } from "@/components/layout/Footer";
import { CULTURE_SHELVES, CULTURE_STATS } from "@/data/culture-videos";
import { stories } from "@/data/stories";
import { SITE_URL } from "@/lib/constants";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

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

const CAPABILITY = "culture" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "culture",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

/*
 * `generateMetadata`, not a static `metadata` const: the canonical URL names
 * the destination, and a module-scope constant cannot see the route's params.
 * It was hardcoded to Sikkim, which was invisible only because this route
 * generates for Sikkim alone today.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}): Promise<Metadata> {
  const { destinationId } = await params;
  const shelves = await cultureShelves(destinationId);
  const counted = shelves.reduce((n, shelf) => n + shelf.entries.length, 0);
  return {
    title: "Culture, food and traditions",
    /* Sikkim's page is films; every other destination's is its own records.
       One description for both would be wrong on fourteen of fifteen. */
    description:
      counted > 0
        ? `${counted} documented subjects — what this destination eats, celebrates and makes, each quoted from a cited source.`
        : `${CULTURE_STATS.total} verified films on Sikkim's food, festivals, music, crafts, textiles and communities — every one checked against YouTube's own record of its title and channel, and played without leaving the archive.`,
    alternates: { canonical: `${SITE_URL}/destinations/${destinationId}/culture` },
  };
}

export default async function CulturePage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  /*
   * TWO PAGES BEHIND ONE ROUTE, AND THAT IS DELIBERATE.
   *
   * Sikkim's culture is 50 films that were each verified for subject, channel
   * and embedding permission; the other fourteen have no films and are not
   * going to be given unverified ones. What they do have is 195 documented
   * subjects with photographs, sources and — since the stories pass — an
   * article each. So the route renders whichever corpus the destination
   * actually holds, and neither borrows the other's furniture.
   */
  const destinationShelves = await cultureShelves(destinationId);
  if (destinationShelves.length > 0) {
    const counted = destinationShelves.reduce((n, shelf) => n + shelf.entries.length, 0);
    const withArticle = destinationShelves
      .flatMap((shelf) => shelf.entries)
      .filter((entry) => entry.storyHref).length;
    return (
      <>
        <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
          <DestinationBreadcrumb
            destinationId={destinationId}
            destinationName={destination.name}
            section="Culture"
          />
          <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            What {destination.name} eats, celebrates and makes
          </h1>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            {counted} documented {counted === 1 ? "subject" : "subjects"} across{" "}
            {destinationShelves.length}{" "}
            {destinationShelves.length === 1 ? "shelf" : "shelves"}
            {withArticle > 0 ? `, ${withArticle} of them with an article of their own` : ""}.
            The shelves are the ones this destination&apos;s own records fill —
            no subject is listed here because another destination has it.
          </p>
          <DestinationCultureShelves
            shelves={destinationShelves}
            destinationName={destination.name}
          />
        </main>
        <Footer />
      </>
    );
  }

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
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Culture"
        />
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
          Tibetology, the Sikkim State Archives, UNDP India. Of 173 candidates
          examined across two sweeps, 123 were rejected: duplicates, Shorts,
          films about Darjeeling or Nepal rather than Sikkim, political
          material, and five whose owners do not permit embedding.
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
            <Link href={`/destinations/${destinationId}/stories`} className="text-primary hover:underline">
              the written archive
            </Link>{" "}
            ·{" "}
            <Link href={`/destinations/${destinationId}/monasteries`} className="text-primary hover:underline">
              monastery films
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
