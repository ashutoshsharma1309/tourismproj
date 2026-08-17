"use client";

import { ExternalLink, Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { MonasteryVideo } from "@/data/videos";

/**
 * Embedded monastery video.
 *
 * The visitor stays on Ney Heritage: playback happens in YouTube's own iframe
 * player, which is the only way to show this footage without downloading and
 * re-hosting someone else's copyrighted work. The link out to YouTube is
 * secondary, offered for attribution rather than as the way to watch.
 *
 * Nothing from YouTube loads until the visitor presses play. Until then the
 * component renders the poster frame and no third-party iframe exists on the
 * page at all — which keeps the monastery pages light and means no cookie is
 * set by a service the visitor has not chosen to use. Playback starts muted-free
 * but never automatically: sound only ever follows a deliberate press.
 */
export function YouTubeHeritagePlayer({
  video,
  monasteryName,
  label,
}: {
  video: MonasteryVideo;
  monasteryName: string;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border-inverse bg-surface-inverse">
        {playing ? (
          <iframe
            src={`${video.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={`${monasteryName} — ${video.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${video.title}`}
            className="group absolute inset-0 size-full cursor-pointer"
          >
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="(min-width: 1024px) 720px, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/10" aria-hidden />

            <span className="absolute inset-x-0 top-0 flex justify-start p-4">
              <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-widest text-white/80 uppercase backdrop-blur-md">
                {label}
              </span>
            </span>

            <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-secondary shadow-lifted transition-transform duration-300 group-hover:scale-110 sm:size-20">
              <Play className="size-6 translate-x-0.5 fill-current sm:size-7" aria-hidden />
            </span>

            <span className="absolute inset-x-0 bottom-0 p-4 text-left sm:p-5">
              <span className="line-clamp-2 block font-display text-h4 text-white">{video.title}</span>
              <span className="mt-1 block font-mono text-caption text-white/70">
                {video.channel} · plays here, on YouTube&apos;s player
              </span>
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-subtle">
        <span className="font-medium text-foreground">Video</span>
        <span aria-hidden>·</span>
        <a href={video.channelUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          {video.channel}
        </a>
        <span aria-hidden>·</span>
        <a
          href={video.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Watch on YouTube
          <ExternalLink className="size-3" aria-hidden />
        </a>
        <span aria-hidden>·</span>
        <span>Embedded, not re-hosted</span>
      </figcaption>
    </figure>
  );
}
