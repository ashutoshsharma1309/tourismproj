"use client";

import { Expand, ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { ImageViewer } from "@/components/media/ImageViewer";

/**
 * The archive's image viewer.
 *
 * Three things it must never do: stretch a photograph, claim the picture is
 * still loading when it has actually failed, and lose the attribution. The
 * frame takes its aspect ratio from the file's own dimensions, a load error
 * swaps in a stated fallback rather than a broken icon, and the credit line
 * lives outside the viewer so it survives whatever the viewer is doing.
 *
 * Zoom is opt-in: the inline image is a normal, contained photograph, and the
 * full-size lightbox only mounts once a reader asks for it.
 */
export function ArchiveMedia({
  src,
  alt,
  width,
  height,
  credit,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [open, setOpen] = useState(false);

  /* Portrait files get a capped frame so a 1:3 photograph does not push the
     whole page down; landscape keeps its own ratio. */
  const ratio = width > 0 && height > 0 ? width / height : 4 / 3;
  const framedRatio = Math.max(ratio, 0.72);


  if (state === "error") {
    return (
      <div className="flex aspect-4/3 w-full flex-col items-center justify-center rounded-xl border border-dashed bg-surface-muted/40 p-8 text-center">
        <ImageOff className="size-6 text-subtle" aria-hidden />
        <p className="mt-3 font-display text-h4">This image could not be loaded</p>
        <p className="mt-1.5 max-w-sm text-small leading-relaxed text-muted">
          The file is catalogued and its licence is recorded, but the image
          itself did not load. Nothing is substituted in its place.
        </p>
      </div>
    );
  }

  return (
    <>
      <figure className="min-w-0">
        <div
          className="relative w-full overflow-hidden rounded-xl border bg-surface-muted"
          style={{ aspectRatio: framedRatio }}
        >
          {state === "loading" ? (
            <div
              aria-hidden
              className="animate-shimmer absolute inset-0 bg-[linear-gradient(90deg,var(--color-surface-muted)_0%,var(--color-surface)_50%,var(--color-surface-muted)_100%)] bg-[length:200%_100%]"
            />
          ) : null}
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 60rem, 100vw"
            /* No fade. The skeleton sits behind this image and is removed on
               load, so the photograph appears the instant it decodes. Holding a
               decoded image at opacity 0 for half a second is the same defect
               the scroll reveal had: the reader arrives and finds nothing
               there. */
            className="object-contain"
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="glass-dark absolute right-3 bottom-3 flex h-10 items-center gap-2 rounded-full px-4 text-caption font-medium text-foreground-inverse transition-opacity hover:opacity-90"
          >
            <Expand className="size-3.5" aria-hidden />
            View full size
          </button>
        </div>
        <figcaption className="mt-2 text-caption leading-relaxed text-subtle">{credit}</figcaption>
      </figure>

      {/* The viewer is shared with the story pages — one implementation of
          fit-to-screen, zoom, pan and keyboard, so a fix in one place reaches
          every picture in the archive. */}
      {open ? (
        <ImageViewer
          images={[{ src, alt, width, height, caption: credit }]}
          index={0}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
