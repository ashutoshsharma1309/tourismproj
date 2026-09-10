"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface ParallaxLayer {
  /**
   * How far the layer counter-scrolls. 0 moves with the page (nearest);
   * higher values lag behind and read as farther away (foreground ~0.15,
   * midground ~0.35 — the background photo itself uses 0.55).
   */
  speed: number;
  content: ReactNode;
  className?: string;
}

interface ParallaxHeroProps {
  background: {
    src: string;
    alt: string;
    /** Extra classes for the photo, e.g. object-position or animate-kenburns. */
    className?: string;
  };
  /** Decorative art layers stacked above the photo, below the copy. */
  layers?: ParallaxLayer[];
  /**
   * Overrides the scrim. The default bottom-up gradient is near-transparent
   * across the middle of the frame, which is fine for a hero whose copy sits
   * in the bottom eighth and useless for one whose copy sits over the subject.
   * A hero that places its copy in a column should pass a directional gradient
   * so that column has a real ground.
   */
  scrimClassName?: string;
  /** Hero copy and CTAs, rendered above the gradient scrim. */
  children: ReactNode;
}

/**
 * Full-viewport parallax hero. The photo and each art layer translate at
 * different speeds as the page scrolls away. Parallax switches off below
 * `md` (mobile GPUs, address-bar resize jank) and under reduced motion —
 * the section then renders as a static composition.
 */
export function ParallaxHero({
  background,
  layers = [],
  scrimClassName = "gradient-overlay",
  children,
}: ParallaxHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const reduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const parallaxEnabled = isDesktop && !reduceMotion;

  return (
    <section ref={sectionRef} className="relative min-h-svh overflow-hidden bg-surface-inverse">
      {/* Photo — farthest layer. Oversized downward and pinned to the top so the
          subject stays framed; the layer only ever drifts down by less than one
          section height, so its top edge never enters the visible window. */}
      {/*
        Overscan and drift are deliberately small.
        
        This was a 140%-tall layer drifting at speed 0.55. Overscan is a zoom:
        a 1.5 landscape photograph in a 1440×900 hero became a 1440×1260 box —
        aspect 1.14 — so two fifths of the frame's width was cropped away before
        object-position was even considered, and the hero read as a close-up of
        whatever happened to be centred. 118% with a gentler drift keeps the
        parallax legible while showing the photograph much closer to its own
        proportions.
      */}
      <Layer progress={scrollYProgress} speed={0.28} enabled={parallaxEnabled}>
        <div className="absolute inset-x-0 top-0 h-[118%]">
          <Image
            src={background.src}
            alt={background.alt}
            fill
            priority
            sizes="100vw"
            className={cn("object-cover", background.className)}
          />
        </div>
      </Layer>

      {layers.map((layer, index) => (
        <Layer
          key={index}
          progress={scrollYProgress}
          speed={layer.speed}
          enabled={parallaxEnabled}
          className={layer.className}
        >
          {layer.content}
        </Layer>
      ))}

      {/* Scrim keeps copy readable regardless of the photo underneath. */}
      <div aria-hidden className={cn("absolute inset-0", scrimClassName)} />

      <div className="relative z-10 flex min-h-svh flex-col">{children}</div>
    </section>
  );
}

interface LayerProps {
  progress: MotionValue<number>;
  speed: number;
  enabled: boolean;
  className?: string;
  children: ReactNode;
}

/** Separate component so the useTransform hook never sits inside a loop. */
function Layer({ progress, speed, enabled, className, children }: LayerProps) {
  const y = useTransform(progress, [0, 1], ["0%", `${speed * 60}%`]);
  return (
    <motion.div
      aria-hidden
      style={enabled ? { y } : undefined}
      className={cn("parallax-layer", className)}
    >
      {children}
    </motion.div>
  );
}
