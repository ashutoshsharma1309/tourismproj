import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getSite,
  getSiteAudio,
  getSiteMedia,
  getStoriesForSite,
  publishedSitePaths,
} from "@/db/queries/destinations";

/**
 * THE site page. One file, every monastery, lake, market and viewpoint.
 *
 * The sources block at the foot is not a footnote — it is the reason this
 * archive is worth more than a travel blog, and it renders from the same
 * `sourceRefs` the database refuses to publish a site without.
 */

export const revalidate = 3600;

interface SourceRef {
  label: string;
  url: string;
  accessedAt: string | null;
}

export async function generateStaticParams() {
  return publishedSitePaths();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string; site: string }>;
}): Promise<Metadata> {
  const { destination, site: siteSlug } = await params;
  const found = await getSite(destination, siteSlug);
  if (!found) return {};
  return {
    title: `${found.site.name} — ${found.destination.name} — Darshan`,
    description: found.site.summary ?? undefined,
  };
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ destination: string; site: string }>;
}) {
  const { destination: destinationSlug, site: siteSlug } = await params;
  const found = await getSite(destinationSlug, siteSlug);
  if (!found) notFound();

  const { site, destination } = found;
  const [images, audio, relatedStories] = await Promise.all([
    getSiteMedia(site.id),
    getSiteAudio(site.id),
    getStoriesForSite(site.id),
  ]);

  const hero = images[0];
  const refs = (site.sourceRefs ?? []) as SourceRef[];

  return (
    <main className="min-h-screen bg-[var(--ink)] text-[var(--parchment)]">
      <header className="relative">
        {hero ? (
          <div className="relative h-[48vh] min-h-[20rem] w-full">
            <Image
              src={hero.url}
              alt={hero.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/50 to-transparent"
            />
          </div>
        ) : null}

        <div className="relative z-10 mx-auto -mt-28 max-w-3xl px-6">
          <Link
            href={`/d/${destination.slug}`}
            className="text-[14px] text-[var(--brass)] hover:underline"
          >
            {destination.name}
          </Link>
          <h1 className="mt-2 font-serif text-[46px] leading-[1.05]">{site.name}</h1>
          <p className="mt-1 text-[14px] text-[var(--parchment)]/60">
            {[site.lineage, site.foundedYear ? `founded ${site.foundedYear}` : null]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        {site.summary ? (
          <p className="mt-8 max-w-[68ch] text-[20px] leading-relaxed text-[var(--parchment)]/90">
            {site.summary}
          </p>
        ) : null}

        {site.body ? (
          <div className="mt-8 max-w-[68ch] space-y-5 text-[16px] leading-relaxed text-[var(--parchment)]/80">
            {site.body.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {/* Audio. The honest state matters more than the player: most sites
            have no narration, and a dead play button is worse than a sentence. */}
        <section className="mt-14 border-t border-[var(--slate)]/30 pt-8">
          <h2 className="font-serif text-[26px]">Listen</h2>
          {audio.length > 0 ? (
            <>
              <p className="mt-2 text-[14px] text-[var(--parchment)]/60">
                Narrated in {audio.length} {audio.length === 1 ? "language" : "languages"}.
              </p>
              <ul className="mt-4 space-y-3">
                {audio.map((guide) => (
                  <li key={guide.id} className="flex items-center gap-4">
                    <span className="w-10 shrink-0 font-mono text-[12px] text-[var(--brass)]">
                      {guide.locale}
                    </span>
                    <audio controls preload="none" src={guide.url} className="h-9 w-full max-w-md">
                      <track kind="captions" />
                    </audio>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 max-w-[68ch] text-[14px] text-[var(--parchment)]/60">
              No narration has been recorded for this site yet. The written
              guide above is the full record.
            </p>
          )}
        </section>

        {relatedStories.length > 0 ? (
          <section className="mt-14 border-t border-[var(--slate)]/30 pt-8">
            <h2 className="font-serif text-[26px]">Stories</h2>
            <ul className="mt-4 space-y-4">
              {relatedStories.map((story) => (
                <li key={story.slug}>
                  {/*
                    NOT A LINK, DELIBERATELY. This surface has no story route
                    yet, and "/stories/<slug>" belongs to v1 — where a legacy
                    rewrite sends it into Sikkim. A Kyoto site would have
                    offered its story and landed the reader in another
                    destination's archive. The story is shown, with its dek,
                    until (explore) has a route of its own to point at.
                  */}
                  <p className="font-serif text-[20px]">{story.title}</p>
                  {story.dek ? (
                    <p className="mt-1 max-w-[68ch] text-[14px] leading-relaxed text-[var(--parchment)]/70">
                      {story.dek}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Sources. The database will not publish a site without one. */}
        <section className="mt-14 border-t border-[var(--slate)]/30 pt-8">
          <h2 className="font-serif text-[26px]">Sources</h2>
          <ul className="mt-4 space-y-2">
            {refs.map((ref) => (
              <li key={ref.url} className="text-[14px]">
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--brass)] hover:underline"
                >
                  {ref.label}
                </a>
                {ref.accessedAt ? (
                  <span className="text-[var(--parchment)]/50"> — checked {ref.accessedAt}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {images.length > 0 ? (
          <section className="mt-14 border-t border-[var(--slate)]/30 pt-8">
            <h2 className="font-serif text-[26px]">Photography</h2>
            <ul className="mt-4 space-y-1 text-[12px] text-[var(--parchment)]/50">
              {images.map((image) => (
                <li key={image.id}>
                  {image.alt} — {image.credit ?? "credit unrecorded"}
                  {image.licence ? `, ${image.licence}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
