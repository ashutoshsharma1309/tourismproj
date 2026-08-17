"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { HISTORY_ERAS, eraAnchor } from "@/data/history";

/**
 * Era jump-bar for the timeline.
 *
 * Progressive enhancement only: the anchors are plain links that work without
 * JavaScript, and the observer merely highlights whichever era the reader is
 * currently inside. Nothing in the timeline depends on this component running.
 */
export function EraNav() {
  const [active, setActive] = useState<string>(HISTORY_ERAS[0]!.id);

  useEffect(() => {
    const sections = HISTORY_ERAS.map((era) => document.getElementById(eraAnchor(era.id))).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        /* The topmost heading currently in the upper half of the viewport wins. */
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0]?.target.getAttribute("data-era");
        if (first) setActive(first);
      },
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Jump to era"
      className="sticky top-16 z-40 -mx-4 border-y bg-background/85 backdrop-blur-md md:-mx-6"
    >
      <ul className="scroll-rail flex gap-1 overflow-x-auto px-4 py-2.5 md:px-6">
        {HISTORY_ERAS.map((era) => {
          const id = eraAnchor(era.id);
          const isActive = active === era.id;
          return (
            <li key={era.id} className="shrink-0">
              <a
                href={`#${id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex flex-col rounded-lg px-3 py-1.5 transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <span className="text-label font-medium whitespace-nowrap">{era.id}</span>
                <span
                  data-numeric
                  className={cn(
                    "font-mono text-eyebrow whitespace-nowrap",
                    isActive ? "text-primary" : "text-subtle",
                  )}
                >
                  {era.span}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
