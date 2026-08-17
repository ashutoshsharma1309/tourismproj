"use client";

import { Expand, ImageOff, X, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

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
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Portrait files get a capped frame so a 1:3 photograph does not push the
     whole page down; landscape keeps its own ratio. */
  const ratio = width > 0 && height > 0 ? width / height : 4 / 3;
  const framedRatio = Math.max(ratio, 0.72);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

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
            className={cn(
              "object-contain transition-opacity duration-500",
              state === "ready" ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              setOpen(true);
            }}
            className="glass-dark absolute right-3 bottom-3 flex h-10 items-center gap-2 rounded-full px-4 text-caption font-medium text-foreground-inverse transition-opacity hover:opacity-90"
          >
            <Expand className="size-3.5" aria-hidden />
            View full size
          </button>
        </div>
        <figcaption className="mt-2 text-caption leading-relaxed text-subtle">{credit}</figcaption>
      </figure>

      {/* ------------------------------------------------------------ lightbox */}
      {open ? (
        <div
          className="fixed inset-0 z-100 flex flex-col bg-secondary/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 p-4">
            <p className="min-w-0 truncate text-small text-foreground-inverse/85">{alt}</p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-pressed={zoomed}
                className="flex h-10 items-center gap-2 rounded-full border border-foreground-inverse/30 px-4 text-caption font-medium text-foreground-inverse transition-colors hover:bg-foreground-inverse/10"
              >
                {zoomed ? (
                  <>
                    <ZoomOut className="size-3.5" aria-hidden />
                    Fit to screen
                  </>
                ) : (
                  <>
                    <ZoomIn className="size-3.5" aria-hidden />
                    Zoom to full size
                  </>
                )}
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close full-size view"
                className="flex size-10 items-center justify-center rounded-full text-foreground-inverse transition-colors hover:bg-foreground-inverse/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </div>

          <div className={cn("min-h-0 flex-1 p-4 pt-0", zoomed ? "overflow-auto" : "overflow-hidden")}>
            {zoomed ? (
              /* Natural size, panned by scrolling. next/image is bypassed on
                 purpose here — the point of this view is the unresized file. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt} width={width} height={height} className="max-w-none" />
            ) : (
              <div className="relative h-full w-full">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            )}
          </div>

          <p className="shrink-0 px-4 pb-4 text-caption text-foreground-inverse/70">{credit}</p>
        </div>
      ) : null}
    </>
  );
}
