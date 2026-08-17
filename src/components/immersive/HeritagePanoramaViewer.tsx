"use client";

import { Expand, Maximize2, Minus, Move, Plus, RotateCcw, Shrink } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { PanoramaRecord } from "@/data/panoramas";

/**
 * Interactive panorama viewer.
 *
 * Drag to look around, pinch or scroll to zoom, and go fullscreen. It renders a
 * wide stitched photograph, not a sphere — the source publishes no horizontal
 * field of view, so the viewer pans inside the frame and the UI never claims
 * 360°. Behaviour is identical on touch and pointer devices.
 *
 * The panorama is several megabytes, so nothing is fetched until the visitor
 * asks for it. Before that the section shows a small poster crop.
 */

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * How much wider than its frame the panorama sits at rest.
 *
 * Without this the viewer looks interactive and is not: a 1.97:1 photograph
 * inside a 2:1 frame fits exactly, every drag clamps to zero, and the panorama
 * never moves. Overscanning guarantees there is always something to pan to,
 * whatever the frame's aspect ratio ends up being at a given breakpoint.
 */
const OVERSCAN = 1.4;

interface Point {
  x: number;
  y: number;
}

export function HeritagePanoramaViewer({
  record,
  monasteryName,
  district,
  mapsUrl,
}: {
  record: PanoramaRecord;
  monasteryName: string;
  district: string;
  mapsUrl: string;
}) {
  const [entered, setEntered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ origin: Point; offset: Point; distance: number; zoom: number } | null>(null);

  const aspect = (record.width ?? 2) / (record.height ?? 1);

  /* Measured rather than assumed: the frame's aspect ratio changes between
     breakpoints and again in fullscreen, and the pan limits have to follow it. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setStage({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Rendered size of the image at a given zoom, always overflowing the frame. */
  const sizeAt = useCallback(
    (atZoom: number) => {
      if (!stage.width || !stage.height) return { width: 0, height: 0 };
      const height = Math.max(stage.height, (stage.width * OVERSCAN) / aspect) * atZoom;
      return { width: height * aspect, height };
    },
    [aspect, stage.height, stage.width],
  );

  const clamp = useCallback(
    (next: Point, atZoom: number): Point => {
      const { width, height } = sizeAt(atZoom);
      const maxX = Math.max(0, (width - stage.width) / 2);
      const maxY = Math.max(0, (height - stage.height) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [sizeAt, stage.height, stage.width],
  );

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      setZoom((current) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
        setOffset((o) => clamp(o, next));
        return next;
      });
    },
    [clamp],
  );

  /* Pointer events cover mouse, pen and touch with one code path, and a second
     pointer turns the same gesture into a pinch. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (!entered) return;
    /* Capture keeps a drag alive when the pointer leaves the frame. Synthetic
       pointers — assistive tech, automated tests — carry ids the browser will
       not capture, and that must not abort the gesture. */
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* proceed without capture */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 1) {
      setDragging(true);
      gesture.current = { origin: points[0]!, offset, distance: 0, zoom };
    } else if (points.length === 2) {
      const [a, b] = points as [Point, Point];
      gesture.current = {
        origin: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        offset,
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointers.current.values()];
    const g = gesture.current;

    if (points.length >= 2) {
      const [a, b] = points as [Point, Point];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.distance > 0) {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (g.zoom * distance) / g.distance));
        setZoom(next);
        setOffset(clamp(g.offset, next));
      }
      return;
    }

    const p = points[0]!;
    setOffset(clamp({ x: g.offset.x + (p.x - g.origin.x), y: g.offset.y + (p.y - g.origin.y) }, zoom));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      setDragging(false);
      gesture.current = null;
    }
  };

  /* Wheel zoom is registered natively: React's onWheel is passive, so it cannot
     preventDefault and the page would scroll away under the panorama. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !entered) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? -0.25 : 0.25);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [entered, zoomBy]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen?.().catch(() => undefined);
  };

  /* Arrow keys pan, +/- zoom, 0 resets — the viewer is usable without a mouse. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!entered) return;
    const step = 60;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    if (moves[e.key]) {
      e.preventDefault();
      setOffset((o) => clamp({ x: o.x + moves[e.key]!.x, y: o.y + moves[e.key]!.y }, zoom));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(0.5);
    } else if (e.key === "-") {
      e.preventDefault();
      zoomBy(-0.5);
    } else if (e.key === "0") {
      e.preventDefault();
      reset();
    }
  };

  const controlClass =
    "flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";

  return (
    <figure className="min-w-0">
      <div
        ref={shellRef}
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border-inverse bg-surface-inverse",
          fullscreen ? "h-screen w-screen rounded-none" : "aspect-16/10 sm:aspect-2/1",
        )}
      >
        <div
          ref={stageRef}
          role="img"
          tabIndex={entered ? 0 : -1}
          aria-label={`Panorama of ${monasteryName}: ${record.vantage}. Drag to look around.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute inset-0 touch-none select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white",
            entered && (dragging ? "cursor-grabbing" : "cursor-grab"),
          )}
        >
          {entered ? (
            <div
              className="absolute top-1/2 left-1/2 will-change-transform"
              style={{
                width: `${sizeAt(zoom).width}px`,
                height: `${sizeAt(zoom).height}px`,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                transition: dragging
                  ? "none"
                  : "transform 160ms var(--ease-out-soft), width 160ms var(--ease-out-soft), height 160ms var(--ease-out-soft)",
              }}
            >
              <Image
                src={record.viewerUrl ?? record.imageUrl ?? ""}
                alt={`${monasteryName} — ${record.vantage}`}
                fill
                sizes="100vw"
                draggable={false}
                onLoad={() => setLoaded(true)}
                className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
              />
            </div>
          ) : (
            <Image
              src={record.previewUrl ?? record.imageUrl ?? ""}
              alt={`${monasteryName} — ${record.vantage}`}
              fill
              sizes="(min-width: 1024px) 720px, 100vw"
              className="scale-105 object-cover opacity-55 blur-[2px]"
            />
          )}
        </div>

        {/* Idle state — the heavy rendition is not fetched until this is used. */}
        {entered ? null : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-linear-to-t from-black/80 via-black/45 to-black/25 p-6 text-center">
            <p className="font-mono text-eyebrow tracking-widest text-white/70 uppercase">
              Experience this monastery
            </p>
            <p className="max-w-md font-display text-h3 text-white text-balance-heading">
              Stand in the courtyard of {monasteryName}
            </p>
            <button
              type="button"
              onClick={() => setEntered(true)}
              className="mt-1 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-small font-medium text-secondary transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Move className="size-4" aria-hidden />
              Explore the panorama
            </button>
            <p className="text-caption text-white/60">
              {record.width?.toLocaleString()} × {record.height?.toLocaleString()} · loads on demand
            </p>
          </div>
        )}

        {/* Live controls */}
        {entered ? (
          <>
            {/* The scrim carries the caption over whatever the panorama happens
                to show behind it — here, bright mist and a wet stone courtyard. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-linear-to-b from-black/80 via-black/45 to-transparent p-4 pb-12">
              <div className="min-w-0">
                <p className="truncate font-display text-h4 text-white">{monasteryName}</p>
                <p className="truncate font-mono text-caption text-white/85">
                  {record.vantage} · {district} district
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/25 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-widest text-white/80 uppercase backdrop-blur-md">
                Verified capture
              </span>
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/70 via-black/30 to-transparent"
              aria-hidden
            />

            <div className="absolute right-4 bottom-4 flex items-center gap-2">
              <button type="button" onClick={() => zoomBy(-0.5)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className={controlClass}>
                <Minus className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={() => zoomBy(0.5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className={controlClass}>
                <Plus className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={reset} aria-label="Reset view" className={controlClass}>
                <RotateCcw className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className={controlClass}
              >
                {fullscreen ? <Shrink className="size-4" aria-hidden /> : <Expand className="size-4" aria-hidden />}
              </button>
            </div>

            <p className="pointer-events-none absolute bottom-5 left-4 hidden items-center gap-1.5 font-mono text-caption text-white/80 sm:flex">
              <Maximize2 className="size-3" aria-hidden />
              Drag to look around · scroll or pinch to zoom
            </p>
          </>
        ) : null}
      </div>

      {/* Attribution is a licence condition, not a nicety: CC BY-SA requires it. */}
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-subtle">
        <span className="font-medium text-foreground">Panoramic photograph</span>
        <span aria-hidden>·</span>
        <span>{record.author}</span>
        <span aria-hidden>·</span>
        <a href={record.licenceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          {record.licence}
        </a>
        <span aria-hidden>·</span>
        <a href={record.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          {record.provider}
        </a>
        {record.capturedAt ? (
          <>
            <span aria-hidden>·</span>
            <span>captured {record.capturedAt}</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Open in Google Maps
        </a>
      </figcaption>
    </figure>
  );
}
