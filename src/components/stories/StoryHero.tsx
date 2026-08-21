"use client";

import { Camera, Expand } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { ImageViewer } from "@/components/media/ImageViewer";

/**
 * A story's hero photograph.
 *
 * This replaced a fixed-height band — `h-64 sm:h-80 md:h-104` with
 * `object-cover` — that cropped every photograph to whatever the band's ratio
 * happened to be. At the widest breakpoint that is about 2.5:1, so a 4:3
 * archive photograph lost roughly sixty per cent of its height, taken out of
 * the middle. The coronation throne at Norbugang sits low in its frame and was
 * cropped clean out of its own picture, and because nothing on the page opened
 * the image, there was no way to see what had been removed.
 *
 * Now the frame is bounded but the picture is contained, so the whole of it is
 * always on screen. Where a photograph does not fill the frame, a blurred copy
 * of that same photograph fills the space behind it — no letterbox bars, and
 * nothing borrowed from another image.
 */
export function StoryHero({
  src,
  alt,
  width,
  height,
  credit,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  credit?: {
    attribution: string;
    license: string;
    descriptionUrl: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const caption = credit
    ? `${alt}. © ${credit.attribution} · ${credit.license} · Wikimedia Commons`
    : alt;

  return (
    <figure className="mx-auto mt-5 max-w-5xl px-4 md:px-6">
      <div className="relative overflow-hidden rounded-2xl border bg-surface-muted">
        {!failed ? (
          <div
            aria-hidden
            className="absolute inset-0 scale-110 opacity-40 blur-2xl"
            style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        ) : null}

        <div className="relative flex justify-center">
          <Image
            src={src}
            alt={alt}
            width={width ?? 1600}
            height={height ?? 1200}
            priority
            sizes="(min-width: 1024px) 64rem, 100vw"
            onError={() => setFailed(true)}
            className="h-auto max-h-[26rem] w-auto max-w-full object-contain sm:max-h-[32rem]"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass-dark absolute right-3 bottom-3 flex h-10 items-center gap-2 rounded-full px-4 text-caption font-medium text-foreground-inverse transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground-inverse focus-visible:outline-none"
        >
          <Expand className="size-3.5" aria-hidden />
          View full size
        </button>
      </div>

      {credit ? (
        <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-subtle">
          <Camera className="size-3.5 shrink-0" aria-hidden />
          <span>{alt}.</span>
          <a
            href={credit.descriptionUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {credit.attribution}
          </a>
          <span>· {credit.license} · Wikimedia Commons</span>
        </figcaption>
      ) : null}

      {open ? (
        <ImageViewer
          images={[{ src, alt, width, height, caption }]}
          index={0}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </figure>
  );
}
