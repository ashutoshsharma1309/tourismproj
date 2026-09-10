"use client";

import { ChevronLeft, ChevronRight, ImageOff, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The full-screen image viewer used everywhere a reader opens a picture.
 *
 * WHY THIS EXISTS
 * ---------------
 * Story heroes were drawn into a fixed-height band with `object-cover`. A
 * 1920×1440 photograph forced into a 1024×416 frame loses about sixty per cent
 * of its height, and what it loses is the middle — so the coronation throne at
 * Norbugang, which sits low in its frame, was cropped out of its own picture.
 * There was also nothing to click: no viewer existed on a story page at all, so
 * a reader had no way to see the rest of it.
 *
 * THE RULE THIS COMPONENT ENFORCES
 * --------------------------------
 * Opening an image shows the WHOLE image. Scale 1 means "fitted to the
 * viewport", never "natural size" — a 4000px file must not open at 400% on a
 * phone, which is exactly the "too zoomed in" complaint. Zoom is something the
 * reader does afterwards, deliberately, and `reset` always returns to the
 * complete picture.
 *
 * Panning is clamped so the photograph cannot be flung off-screen and lost;
 * at fit scale it is disabled entirely, because there is nothing to pan to.
 */

export interface ViewerImage {
  src: string;
  alt: string;
  /** Intrinsic pixels. Used for the "natural size" ceiling, not for layout. */
  width?: number;
  height?: number;
  caption?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 1.5;

export function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ViewerImage[];
  index: number;
  onIndexChange?: (next: number) => void;
  onClose: () => void;
}) {
  const image = images[index];
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  /* Whether a finger or the mouse is currently on the picture. This is state,
     not a ref, because the render reads it — a transition during a drag makes
     the photograph lag behind the pointer. */
  const [gesturing, setGesturing] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());

  const many = images.length > 1;

  /* Every reset path goes through here so no caller can leave the viewer
     zoomed into a corner of a picture the reader has not seen yet. */
  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  /* A new picture always arrives fitted, whatever the reader did to the last
     one. Carrying 400% zoom across a next-image press would reintroduce the
     original bug one photograph later.

     Adjusted during render rather than in an effect: React's own guidance for
     resetting state when a prop changes, and it avoids the frame in which the
     next photograph would be painted at the previous one's zoom. */
  const [shown, setShown] = useState(index);
  if (shown !== index) {
    setShown(index);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFailed(false);
  }

  /*
   * Pan bounds.
   *
   * The rendered image is the fitted box multiplied by `scale`, so the amount
   * it can travel in each axis is half the overflow. Clamping to that keeps at
   * least the edge of the photograph against the edge of the viewport — the
   * reader can never drag it into empty space and think it has vanished.
   */
  const clamp = useCallback((next: { x: number; y: number }, at: number) => {
    const el = imgRef.current;
    const frame = frameRef.current;
    if (!el || !frame) return { x: 0, y: 0 };
    const maxX = Math.max(0, (el.clientWidth * at - frame.clientWidth) / 2);
    const maxY = Math.max(0, (el.clientHeight * at - frame.clientHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  const zoomTo = useCallback(
    (next: number) => {
      const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      setScale(target);
      setOffset((current) => (target === 1 ? { x: 0, y: 0 } : clamp(current, target)));
    },
    [clamp],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          event.preventDefault();
          zoomTo(scale * STEP);
          break;
        case "-":
        case "_":
          event.preventDefault();
          zoomTo(scale / STEP);
          break;
        case "0":
          reset();
          break;
        case "ArrowRight":
          /* Zoomed in, the arrows pan the picture; fitted, they walk the
             gallery. Both are what the key obviously means in that state. */
          if (scale > 1) setOffset((o) => clamp({ x: o.x - 60, y: o.y }, scale));
          else if (many && onIndexChange) onIndexChange((index + 1) % images.length);
          break;
        case "ArrowLeft":
          if (scale > 1) setOffset((o) => clamp({ x: o.x + 60, y: o.y }, scale));
          else if (many && onIndexChange)
            onIndexChange((index - 1 + images.length) % images.length);
          break;
        case "ArrowUp":
          if (scale > 1) {
            event.preventDefault();
            setOffset((o) => clamp({ x: o.x, y: o.y + 60 }, scale));
          }
          break;
        case "ArrowDown":
          if (scale > 1) {
            event.preventDefault();
            setOffset((o) => clamp({ x: o.x, y: o.y - 60 }, scale));
          }
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [scale, index, images.length, many, onIndexChange, onClose, zoomTo, reset, clamp]);

  const onPointerDown = (event: React.PointerEvent) => {
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      if (!a || !b) return;
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale };
      drag.current = null;
      setGesturing(true);
      return;
    }
    if (scale > 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
      setGesturing(true);
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (points.current.has(event.pointerId)) {
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinch.current && points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0) {
        zoomTo(pinch.current.scale * (distance / pinch.current.distance));
      }
      return;
    }
    if (!drag.current) return;
    setOffset(
      clamp(
        {
          x: drag.current.ox + (event.clientX - drag.current.x),
          y: drag.current.oy + (event.clientY - drag.current.y),
        },
        scale,
      ),
    );
  };

  const onPointerUp = (event: React.PointerEvent) => {
    points.current.delete(event.pointerId);
    if (points.current.size < 2) pinch.current = null;
    drag.current = null;
    if (points.current.size === 0) setGesturing(false);
  };

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-secondary/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 p-3 sm:p-4">
        <p className="min-w-0 flex-1 truncate text-small text-foreground-inverse/85">
          {many ? `${index + 1} of ${images.length} · ` : ""}
          {image.alt}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ViewerButton onClick={() => zoomTo(scale / STEP)} label="Zoom out" disabled={scale <= MIN_SCALE}>
            <Minus className="size-4" aria-hidden />
          </ViewerButton>
          <span
            className="w-12 text-center font-mono text-caption text-foreground-inverse/70 tabular-nums"
            aria-live="polite"
          >
            {Math.round(scale * 100)}%
          </span>
          <ViewerButton onClick={() => zoomTo(scale * STEP)} label="Zoom in" disabled={scale >= MAX_SCALE}>
            <Plus className="size-4" aria-hidden />
          </ViewerButton>
          <ViewerButton onClick={reset} label="Reset to fit the screen" disabled={scale === 1}>
            <RotateCcw className="size-4" aria-hidden />
          </ViewerButton>
          <ViewerButton ref={closeRef} onClick={onClose} label="Close image viewer">
            <X className="size-5" aria-hidden />
          </ViewerButton>
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => (scale > 1 ? reset() : zoomTo(2))}
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          zoomTo(scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
        }}
      >
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <ImageOff className="size-7 text-foreground-inverse/60" aria-hidden />
            <p className="mt-3 font-display text-h4 text-foreground-inverse">
              This image could not be loaded
            </p>
            <p className="mt-1.5 max-w-sm text-small leading-relaxed text-foreground-inverse/70">
              The file is catalogued and its licence recorded, but the image itself
              did not load. Nothing is substituted in its place.
            </p>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
            {/* The unresized file, fitted by CSS. next/image is deliberately not
                used here: this view exists to show the original, and `fill`
                would re-introduce a cropping container. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              draggable={false}
              onError={() => setFailed(true)}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: gesturing ? "none" : "transform 160ms ease-out",
                cursor: scale > 1 ? (gesturing ? "grabbing" : "grab") : "default",
              }}
              /* `h-auto w-auto` matters more than it looks. Without it the
                 element box stretches to the flex container while the picture
                 is letterboxed inside it by object-contain — so the box is
                 bigger than what the reader can see, and the pan clamp, which
                 measures the box, lets the photograph be dragged into the empty
                 margin. Sizing the element to the picture makes the two the
                 same rectangle and the clamp exact. */
              className="h-auto max-h-full w-auto max-w-full object-contain select-none"
            />
          </div>
        )}

        {many && onIndexChange ? (
          <>
            <ViewerArrow
              side="left"
              label="Previous image"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            />
            <ViewerArrow
              side="right"
              label="Next image"
              onClick={() => onIndexChange((index + 1) % images.length)}
            />
          </>
        ) : null}
      </div>

      {image.caption ? (
        <p className="shrink-0 px-4 pb-4 text-caption leading-relaxed text-foreground-inverse/70">
          {image.caption}
        </p>
      ) : null}
    </div>
  );
}

function ViewerButton({
  ref,
  onClick,
  label,
  disabled,
  children,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full text-foreground-inverse transition-colors hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-foreground-inverse focus-visible:outline-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function ViewerArrow({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`glass-dark absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-foreground-inverse transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground-inverse focus-visible:outline-none ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? (
        <ChevronLeft className="size-5" aria-hidden />
      ) : (
        <ChevronRight className="size-5" aria-hidden />
      )}
    </button>
  );
}
