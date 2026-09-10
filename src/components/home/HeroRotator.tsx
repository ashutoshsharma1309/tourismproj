"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { objectPositionFor } from "@/lib/media/focal";

export interface HeroSlide {
  destinationId: string;
  destinationName: string;
  countryName: string;
  /** The catalogued record the photograph actually shows. */
  placeName: string;
  image: string;
  imageAlt: string;
}

/** Milliseconds a slide holds before the next one begins to appear. */
const HOLD_MS = 7000;
/** Crossfade duration. Matches `duration-1000` on the image layers. */
const FADE_MS = 1000;

/**
 * The rotating global hero.
 *
 * WHY A ROTATOR AND NOT ONE FEATURED PHOTOGRAPH
 * ---------------------------------------------
 * The previous hero chose a single destination — the one with the most
 * catalogued places, excluding Sikkim — and showed it for the life of the
 * build. That answered "not Sikkim" but not "fifteen": a visitor saw one
 * city and a rail of five names, and the other nine destinations existed
 * only as a number in a stat block. Rotating through all fifteen makes the
 * breadth of the archive the first thing the product demonstrates rather
 * than the first thing it claims.
 *
 * WHAT IS ONSCREEN IS ALWAYS A REAL RECORD
 * ----------------------------------------
 * Each slide's photograph is that destination's own first catalogued place,
 * and the caption names it. The hero cannot show a place the archive does
 * not hold, which is the same rule the single-photograph version kept.
 *
 * ONLY THREE IMAGES ARE EVER MOUNTED
 * ----------------------------------
 * An opacity-0 image inside the viewport is still fetched, so mounting all
 * fifteen would pull fifteen full-bleed photographs on first paint — the
 * thing §45 forbids. The render window is {previous, current, next}: the
 * outgoing frame stays long enough to fade out, and the next one is in the
 * document a full seven seconds before it is shown, which is the preload.
 *
 * MOTION IS OPT-OUT AT THE SYSTEM LEVEL
 * -------------------------------------
 * `prefers-reduced-motion` stops the autoplay entirely rather than merely
 * shortening it, and the manual controls keep working — a reader who has
 * asked their OS for stillness gets a static hero they can still page
 * through, not a hero that moves anyway at a different speed.
 */
export function HeroRotator({
  slides,
  destinationCount,
  countryCount,
  placeCount,
}: {
  slides: HeroSlide[];
  destinationCount: number;
  countryCount: number;
  placeCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  /* Which frame is fading out, so it stays mounted for exactly one fade. */
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const outgoingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex((current) => {
        if (next === current) return current;
        setOutgoing(current);
        if (outgoingTimer.current) clearTimeout(outgoingTimer.current);
        outgoingTimer.current = setTimeout(() => setOutgoing(null), FADE_MS);
        return (next + count) % count;
      });
    },
    [count],
  );

  const step = useCallback((delta: number) => goTo(index + delta), [goTo, index]);

  /* The OS preference, watched rather than read once: a reader can change it
     while the page is open, and a hero that keeps moving after they did is
     the failure this check exists to prevent. */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const timer = setTimeout(() => goTo(index + 1), HOLD_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reduced, count, goTo]);

  useEffect(() => () => {
    if (outgoingTimer.current) clearTimeout(outgoingTimer.current);
  }, []);

  if (count === 0) return null;

  const active = slides[index]!;
  /* Mounted set: the frame leaving, the frame here, the frame next. */
  const nextIndex = (index + 1) % count;
  const mounted = new Set<number>([index, nextIndex]);
  if (outgoing !== null) mounted.add(outgoing);

  return (
    <section
      className="relative isolate min-h-[38rem] overflow-hidden bg-secondary text-foreground-inverse lg:min-h-[46rem]"
      aria-roledescription="carousel"
      aria-label="Featured destinations"
    >
      {/* ------------------------------------------------------ photographs */}
      {slides.map((slide, i) =>
        mounted.has(i) ? (
          <div
            key={slide.destinationId}
            className={cn(
              "absolute inset-0 transition-opacity ease-out motion-reduce:transition-none",
              /* One second, so the change registers as a dissolve rather than
                 a cut. §42 asks for 800–1200ms. */
              "duration-1000",
              i === index ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={i === index ? undefined : true}
          >
            <Image
              src={slide.image}
              alt={i === index ? slide.imageAlt : ""}
              fill
              /* Only the first frame blocks paint. The rest are already in the
                 document seven seconds early and load on their own. */
              priority={i === 0}
              sizes="100vw"
              /* The focal manifest's vertical point, so a photograph that is
                 wide enough for the frame but taller than 3:2 (the Gateway of
                 India is square) still crops toward its subject rather than
                 its geometric centre. The place cards already do this. */
              style={{ objectPosition: objectPositionFor(slide.image) }}
              className={cn(
                "object-cover",
                /* A slow drift, so a still photograph does not read as a
                   frozen page. Reuses the existing `kenburns` token rather
                   than adding a second one that means the same thing.
                   Disabled outright under reduced motion. */
                !reduced && i === index && "motion-safe:animate-kenburns",
              )}
            />
          </div>
        ) : null,
      )}

      {/*
        THE GRADIENT, IN THREE LAYERS RATHER THAN ONE BLACK RECTANGLE.

        §8 asks for depth that the photograph survives. A single flat scrim
        heavy enough to carry display type mutes the image it exists to show,
        which is the mistake the previous collage hero made. So: one diagonal
        wash anchored top-left where the type sits, one upward wash seating
        the caption, and a soft vignette. The lower-right stays comparatively
        open, which is the dark-to-brighter reading §9 describes.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-secondary/95 via-secondary/55 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-secondary/85 via-transparent to-secondary/35"
      />

      {/* ------------------------------------------------------------ copy */}
      <div className="relative mx-auto flex min-h-[38rem] max-w-[84rem] flex-col justify-center px-6 py-20 sm:px-10 lg:min-h-[46rem] lg:ps-16">
        <div className="max-w-[38rem]">
          <p className="font-mono text-eyebrow tracking-[0.24em] text-accent uppercase">
            TerraStory · Tourism intelligence
          </p>
          <h1 className="text-glow mt-5 max-w-[16ch] font-display text-display text-balance-heading">
            Discover the stories behind the places
          </h1>
          <p className="mt-5 max-w-prose text-body-lg leading-relaxed text-muted-inverse">
            Explore history, culture, food, heritage and living stories across{" "}
            {destinationCount} destinations — with every factual claim connected to
            the evidence behind it.
          </p>

          {/* Two actions. §11 — the product does not need seven. */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/destinations" className={cn(buttonClasses({ size: "lg" }))}>
              Explore destinations
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/discover"
              prefetch={false}
              /* `ghost-inverse`, not `outline`. The outline variant is a
                 LIGHT pill (`bg-surface text-foreground`); over a photograph
                 it needs inverse text, and setting that on top of the light
                 background rendered ivory-on-ivory — the button was legible
                 only as a shape. This variant exists for exactly this case. */
              className={cn(buttonClasses({ variant: "ghost-inverse", size: "lg" }))}
            >
              Discover by interest
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-foreground-inverse/20 pt-6 sm:grid-cols-4">
            {[
              [String(destinationCount), "destinations"],
              [String(countryCount), "countries"],
              [String(placeCount), "catalogued places"],
              ["Sourced", "every claim"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-mono text-h4 font-medium" data-numeric>
                  {value}
                </dt>
                <dd className="mt-0.5 text-caption text-muted-inverse">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* --------------------------------------------- caption and controls */}
      {/*
        THE BOTTOM PADDING IS NOT DECORATION.

        The ambient-sound toggle and the guide launcher are FIXED to the
        bottom corners of every page. At small viewports this row lands
        directly under them, and the caption naming the photograph — plus
        the rotation controls — end up behind two floating pills. The
        previous hero carried the same `pb-20` for the same reason on its
        destination rail; dropping it here reintroduced the bug, which a
        390px screenshot caught. It relaxes from `lg`, where the fixed
        controls no longer overlap this row.
      */}
      <div className="relative mx-auto flex max-w-[84rem] flex-col gap-4 px-6 pb-28 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:pb-14 lg:ps-16 lg:pe-16">
        {/*
          The caption names the destination AND the record photographed, so
          the image is never an unattributed backdrop. `aria-live` announces
          the change to a reader who cannot see the dissolve.
        */}
        <div aria-live="polite" aria-atomic="true" className="min-w-0">
          <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
            {active.destinationName} · {active.countryName}
          </p>
          <p className="mt-1 font-display text-h4">{active.placeName}</p>
          <Link
            href={`/destinations/${active.destinationId}`}
            className="mt-2 inline-flex min-h-6 items-center gap-1.5 py-1 text-caption font-medium underline-offset-4 hover:underline"
          >
            Explore {active.destinationName}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p className="font-mono text-caption text-muted-inverse" data-numeric>
            <span className="sr-only">Destination </span>
            {String(index + 1).padStart(2, "0")}
            <span aria-hidden> / </span>
            <span className="sr-only">of </span>
            {String(count).padStart(2, "0")}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous destination"
              className="grid size-9 place-items-center rounded-full border border-foreground-inverse/30 transition-colors hover:border-foreground-inverse hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            {/*
              Autoplay must be stoppable — §12 and §49 both require it, and
              WCAG 2.2.2 makes it non-negotiable for anything that moves on
              its own for more than five seconds. Hidden when the OS already
              asked for stillness, because then nothing is playing to pause.
            */}
            {!reduced ? (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Resume rotation" : "Pause rotation"}
                className="grid size-9 place-items-center rounded-full border border-foreground-inverse/30 transition-colors hover:border-foreground-inverse hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next destination"
              className="grid size-9 place-items-center rounded-full border border-foreground-inverse/30 transition-colors hover:border-foreground-inverse hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
