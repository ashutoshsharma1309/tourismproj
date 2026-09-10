"use client";

import { ArrowRight, BadgeCheck, ExternalLink, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { CultureCategory, CultureVideo } from "@/data/culture-videos";

/**
 * The culture shelves.
 *
 * Playback happens here, in YouTube's own iframe, because sending a visitor to
 * youtube.com to watch a film about Sikkimese food is how a tourism site loses
 * them. The link out to YouTube stays on every card, as attribution rather
 * than as the way to watch.
 *
 * Nothing from YouTube is loaded until a play is pressed: until then a card is
 * a poster frame and a button, and no third-party iframe exists on the page at
 * all. With thirty-four films on one page that is the difference between a
 * page that loads and a page that does not — and it means no cookie is set by
 * a service the visitor has not chosen to use.
 */

export interface RelatedStory {
  slug: string;
  title: string;
  category: string;
}

export interface Shelf {
  id: CultureCategory;
  label: string;
  blurb: string;
  videos: CultureVideo[];
  stories: RelatedStory[];
}

export function CultureShelves({ shelves }: { shelves: Shelf[] }) {
  const [selected, setSelected] = useState<CultureCategory | "">("");
  /* One player at a time. Two iframes both playing is never what the visitor
     asked for, and thirty-four would be a different problem entirely. */
  const [playing, setPlaying] = useState<string | null>(null);

  const shown = selected ? shelves.filter((shelf) => shelf.id === selected) : shelves;
  const total = shelves.reduce((sum, shelf) => sum + shelf.videos.length, 0);

  return (
    <div>
      <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Culture categories">
        <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
          <li>
            <CategoryChip
              selected={selected === ""}
              onClick={() => setSelected("")}
              label="Everything"
              count={total}
            />
          </li>
          {shelves.map((shelf) => (
            <li key={shelf.id}>
              <CategoryChip
                selected={selected === shelf.id}
                onClick={() => setSelected(shelf.id)}
                label={shelf.label}
                count={shelf.videos.length}
              />
            </li>
          ))}
        </ul>
      </nav>

      {shown.map((shelf) => (
        <section
          key={shelf.id}
          id={`culture-${shelf.id}`}
          className="mt-10 scroll-mt-24"
          aria-labelledby={`culture-heading-${shelf.id}`}
        >
          <div className="border-b pb-2">
            <h2 id={`culture-heading-${shelf.id}`} className="font-display text-h3">
              {shelf.label}
            </h2>
            <p className="mt-1 max-w-2xl text-small leading-relaxed text-muted">{shelf.blurb}</p>
          </div>

          <ul className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shelf.videos.map((video) => (
              <li key={video.id} className="flex min-w-0 flex-col">
                <VideoCard
                  video={video}
                  label={shelf.label}
                  playing={playing === video.id}
                  onPlay={() => setPlaying(video.id)}
                />
              </li>
            ))}
          </ul>

          {/* The interconnection: a film about food should lead into what the
              archive already holds on food, not sit in a video silo. */}
          {shelf.stories.length > 0 ? (
            <div className="mt-5 rounded-xl border bg-surface-muted/40 p-4">
              <p className="font-mono text-caption tracking-wide text-subtle uppercase">
                Read alongside {shelf.label.toLowerCase()}
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">
                {shelf.stories.map((story) => (
                  <li key={story.slug}>
                    <Link
                      href={`/destinations/sikkim/stories/${story.slug}`}
                      className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {story.title}
                      <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function VideoCard({
  video,
  label,
  playing,
  onPlay,
}: {
  video: CultureVideo;
  label: string;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <figure className="flex min-w-0 flex-1 flex-col">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border-inverse bg-surface-inverse">
        {playing ? (
          <iframe
            src={`${video.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play: ${video.title}`}
            className="group absolute inset-0 size-full cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none"
          >
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="(min-width: 1280px) 24rem, (min-width: 768px) 45vw, 92vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span
              className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/10"
              aria-hidden
            />
            <span className="absolute inset-x-0 top-0 flex justify-start p-3">
              <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-widest text-white/80 uppercase backdrop-blur-md">
                {label}
              </span>
            </span>
            <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-secondary shadow-lifted transition-transform duration-300 group-hover:scale-110">
              <Play className="size-5 translate-x-0.5 fill-current" aria-hidden />
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 flex min-w-0 flex-1 flex-col">
        <p className="text-body font-semibold text-balance-heading">{video.title}</p>
        <p className="mt-1.5 text-small leading-relaxed text-muted">{video.topic}</p>

        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 font-mono text-caption text-subtle">
          {video.institutional ? (
            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
          ) : null}
          <a
            href={video.channelUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {video.channel}
          </a>
          <span aria-hidden>·</span>
          <a
            href={video.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            YouTube
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </p>
      </figcaption>
    </figure>
  );
}

function CategoryChip({
  selected,
  onClick,
  label,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-surface hover:border-accent"
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`font-mono text-caption tabular-nums ${
          selected ? "text-primary-foreground/75" : "text-subtle"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
