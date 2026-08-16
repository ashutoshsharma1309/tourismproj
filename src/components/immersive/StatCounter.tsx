"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { formatStatNumber } from "@/lib/format";

interface StatCounterProps {
  /** Final value the counter lands on. */
  value: number;
  label: string;
  icon?: ReactNode;
  prefix?: string;
  suffix?: string;
  /** Decimal places to keep while counting (e.g. 1 for "₹12.5 Cr"). */
  decimals?: number;
}

/**
 * Counts from 0 to `value` the first time it scrolls into view.
 * Indian digit grouping, tabular numerals, instant under reduced motion.
 */
export function StatCounter({
  value,
  label,
  icon,
  prefix = "",
  suffix = "",
  decimals = 0,
}: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setCurrent,
    });
    return () => controls.stop();
  }, [inView, value, reduceMotion]);

  // Under reduced motion the final value renders directly — no counting.
  const shown = reduceMotion ? value : current;
  const digits =
    decimals > 0 ? shown.toFixed(decimals) : formatStatNumber(Math.round(shown));

  return (
    <div ref={ref} className="flex flex-col items-center gap-3 text-center">
      {icon ? (
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary-soft"
        >
          {icon}
        </span>
      ) : null}
      <p className="number-counter font-mono text-3xl font-medium text-accent md:text-4xl">
        <span className="sr-only">
          {prefix}
          {decimals > 0 ? value.toFixed(decimals) : formatStatNumber(value)}
          {suffix} {label}
        </span>
        <span aria-hidden>
          {prefix}
          {digits}
          {suffix}
        </span>
      </p>
      <p className="text-label text-foreground-inverse/70">{label}</p>
    </div>
  );
}
