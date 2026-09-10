"use client";

import { Award, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import type { GalleryPhoto } from "@/data/galleries";
import { cn } from "@/lib/cn";

/**
 * The photographic record of a place.
 *
 * A single hero photograph tells a visitor a building exists. A gallery tells
 * them what it is like to stand there — which is the whole job of this site.
 *
 * Two rules shape the markup:
 *
 *  1. Every frame carries its author and licence. These are other people's
 *     photographs, given freely under terms that require the credit, so the
 *     credit is part of the component rather than a footnote somewhere.
 *  2. The grid is a mosaic, not a uniform strip. Photographs of a courtyard,
 *     a mural and a ridge line want different shapes, and a first frame with
 *     room to breathe is what makes the section read as photography rather
 *     than as thumbnails.
 */

/**
 * A photograph plus, optionally, the name of what it shows. Single-site
 * galleries leave `subject` unset because the section header already says it;
 * the mixed showcase sets it per frame.
 */
export type LabelledPhoto = GalleryPhoto & { subject?: string; href?: string };

const ASSESSMENT_LABEL: Record<string, string> = {
  featured: "Commons Featured picture",
  quality: "Commons Quality image",
  valued: "Commons Valued image",
};

function AssessmentBadge({ assessment }: { assessment: string }) {
  return (
    <Badge tone="marigold-soft" className="gap-1.5">
      <Award className="size-3" aria-hidden />
      {assessment === "featured" ? "Featured" : assessment === "quality" ? "Quality" : "Valued"}
    </Badge>
  );
}

/** The credit line a free licence obliges us to print. */
function Credit({ photo, className }: { photo: GalleryPhoto; className?: string }) {
  return (
    <p className={cn("text-caption leading-relaxed", className)}>
      <span className="font-medium">{photo.attribution}</span>
      {" · "}
      {photo.licenseUrl ? (
        <a
          href={photo.licenseUrl}
          target="_blank"
          rel="noreferrer license"
          className="underline decoration-dotted underline-offset-2 hover:no-underline"
        >
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
      {" · "}
      <a
        href={photo.descriptionUrl}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:no-underline"
      >
        Wikimedia Commons
      </a>
    </p>
  );
}

/**
 * Full-screen viewer. Arrow keys and Escape work, focus is pulled onto the
 * dialog and restored to the tile that opened it, and body scroll is locked —
 * the same contract as the site's Modal, but full-bleed so the photograph is
 * the interface.
 */
function Lightbox({
  photos,
  index,
  subject,
  onClose,
  onNavigate,
}: {
  photos: LabelledPhoto[];
  index: number;
  subject: string;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];
  /* A mixed showcase names each frame's own subject; a single-site gallery
     names the site once, in the header. */
  const label = photo?.subject ?? subject;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNavigate((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onNavigate((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-secondary/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} — photograph ${index + 1} of ${photos.length}`}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <p className="font-mono text-caption tracking-wider text-foreground-inverse/70 uppercase">
          {photo.href ? (
            <a href={photo.href} className="hover:text-accent hover:underline">
              {label}
            </a>
          ) : (
            label
          )}{" "}
          · {index + 1} / {photos.length}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close photograph"
          className="flex size-10 items-center justify-center rounded-full text-foreground-inverse/80 transition-colors hover:bg-foreground-inverse/15 hover:text-foreground-inverse focus-visible:ring-2 focus-visible:ring-foreground-inverse focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16">
        <Image
          key={photo.localPath}
          src={photo.localPath}
          alt={photo.caption ?? `${label}, photographed by ${photo.attribution}`}
          width={photo.width}
          height={photo.height}
          sizes="(min-width: 768px) 85vw, 100vw"
          className="animate-scale-in max-h-full w-auto max-w-full object-contain"
          priority
        />

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
              aria-label="Previous photograph"
              className="absolute left-1 flex size-11 items-center justify-center rounded-full bg-secondary/60 text-foreground-inverse transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-foreground-inverse focus-visible:outline-none md:left-4"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onNavigate((index + 1) % photos.length)}
              aria-label="Next photograph"
              className="absolute right-1 flex size-11 items-center justify-center rounded-full bg-secondary/60 text-foreground-inverse transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-foreground-inverse focus-visible:outline-none md:right-4"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-4 text-foreground-inverse/85 md:px-6">
        {photo.caption ? (
          <p className="text-small leading-relaxed">{photo.caption}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Credit photo={photo} className="text-foreground-inverse/70" />
          {photo.assessment ? (
            <span className="text-caption text-foreground-inverse/60">
              {ASSESSMENT_LABEL[photo.assessment]}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** One tile in the mosaic. */
function Tile({
  photo,
  subject,
  onOpen,
  className,
  sizes,
  priority,
  showSubject = false,
}: {
  photo: LabelledPhoto;
  subject: string;
  onOpen: () => void;
  className?: string;
  sizes: string;
  priority?: boolean;
  /** Print the frame's own subject on the tile — for mixed showcases. */
  showSubject?: boolean;
}) {
  const label = photo.subject ?? subject;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open photograph: ${photo.caption ?? label}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-surface-muted",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out-soft",
        "hover:-translate-y-1 hover:border-accent hover:shadow-lifted",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className,
      )}
    >
      <Image
        src={photo.localPath}
        alt={photo.caption ?? `${label}, photographed by ${photo.attribution}`}
        fill
        sizes={sizes}
        priority={priority}
        className="media-zoom object-cover group-hover:scale-[1.06]"
      />
      {photo.assessment ? (
        <span className="absolute top-2.5 left-2.5">
          <AssessmentBadge assessment={photo.assessment} />
        </span>
      ) : null}

      {/* The credit is visible without opening the frame — a licence
          obligation should not be hidden behind an interaction. */}
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-secondary/90 to-transparent p-3 pt-8 text-left transition-opacity duration-300",
          /* A showcase tile must always name what it shows — an unlabelled
             photograph of somewhere is not information. A gallery tile's
             subject is already in the section heading, so its credit can
             stay out of the way until hover. */
          showSubject
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {showSubject ? (
          <span className="block truncate font-display text-body font-semibold text-foreground-inverse">
            {label}
          </span>
        ) : null}
        <span className="block truncate text-caption text-foreground-inverse/85">
          © {photo.attribution} · {photo.license}
        </span>
      </span>
      <span className="pointer-events-none absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-secondary/55 text-foreground-inverse opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Expand className="size-3.5" aria-hidden />
      </span>
    </button>
  );
}

/** Shared open/close plumbing — focus returns to the tile that opened it. */
function useLightbox() {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpenAt(null);
    // Without this, dismissing the viewer strands focus at the top of the
    // document and a keyboard user has to tab back through the whole page.
    openerRef.current?.focus();
  }, []);

  const open = useCallback((index: number) => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpenAt(index);
  }, []);

  return { openAt, open, close, setOpenAt };
}

export interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  /** The place these photographs are of — used in alt text and the viewer. */
  subject: string;
  /** Mosaic gives the first frame a double tile; grid treats all equally. */
  layout?: "mosaic" | "grid";
  className?: string;
}

export function PhotoGallery({
  photos,
  subject,
  layout = "mosaic",
  className,
}: PhotoGalleryProps) {
  const { openAt, open, close, setOpenAt } = useLightbox();

  if (photos.length === 0) return null;

  const mosaic = layout === "mosaic" && photos.length >= 3;

  return (
    <div className={className}>
      <div
        className={cn(
          "grid gap-3",
          mosaic
            ? "grid-cols-2 md:grid-cols-4 auto-rows-36 md:auto-rows-44"
            : "grid-cols-2 sm:grid-cols-3 auto-rows-36 md:auto-rows-44",
        )}
      >
        {photos.map((photo, index) => {
          /* The opening frame gets four tiles' worth of space; after that a
             portrait photograph takes a tall tile so it is not centre-cropped
             into a letterbox. */
          const isLead = mosaic && index === 0;
          const isPortrait = photo.height > photo.width * 1.15;
          return (
            <Tile
              key={photo.localPath}
              photo={photo}
              subject={subject}
              onOpen={() => open(index)}
              /* Deliberately not `priority`: the page hero already claims it,
                 and a second high-priority fetch on the same screen just
                 slows the one that decides LCP. */
              className={cn(
                isLead && "col-span-2 row-span-2",
                !isLead && isPortrait && "row-span-2",
              )}
              sizes={
                isLead
                  ? "(min-width: 768px) 50vw, 92vw"
                  : "(min-width: 768px) 25vw, 46vw"
              }
            />
          );
        })}
      </div>

      {openAt !== null ? (
        <Lightbox
          photos={photos}
          index={openAt}
          subject={subject}
          onClose={close}
          onNavigate={setOpenAt}
        />
      ) : null}
    </div>
  );
}

/**
 * A horizontally scrolling band of photography drawn from many places at once.
 *
 * The point is different from PhotoGallery's: this is not a record of one
 * site, it is an argument that the state is worth the flight. So every tile
 * names its own subject and links to it, and the rail is scrolled rather than
 * wrapped — a strip that runs off the edge of the screen invites a drag in a
 * way a tidy grid does not.
 */
export function PhotoShowcase({
  photos,
  className,
}: {
  photos: LabelledPhoto[];
  className?: string;
}) {
  const { openAt, open, close, setOpenAt } = useLightbox();

  if (photos.length === 0) return null;

  return (
    <div className={className}>
      <ul className="scroll-rail flex gap-4 overflow-x-auto pb-4">
        {photos.map((photo, index) => (
          <li
            key={photo.localPath}
            className="snap-card w-64 shrink-0 sm:w-80"
          >
            <Tile
              photo={photo}
              subject={photo.subject ?? "Sikkim"}
              onOpen={() => open(index)}
              showSubject
              className="h-72 w-full sm:h-88"
              sizes="(min-width: 640px) 20rem, 16rem"
            />
          </li>
        ))}
      </ul>

      {openAt !== null ? (
        <Lightbox
          photos={photos}
          index={openAt}
          subject={photos[openAt]?.subject ?? "Sikkim"}
          onClose={close}
          onNavigate={setOpenAt}
        />
      ) : null}
    </div>
  );
}
