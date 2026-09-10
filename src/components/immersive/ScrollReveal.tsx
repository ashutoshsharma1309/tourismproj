import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  /** Retained for call-site compatibility; no longer used. */
  threshold?: number;
  /** Retained for call-site compatibility; no longer used. */
  delay?: number;
  className?: string;
}

/**
 * A layout wrapper. It deliberately does not animate.
 *
 * THIS USED TO FADE CONTENT IN, AND THAT WAS THE BUG.
 *
 * Every one of its 58 call sites rendered at `opacity: 0, y: 40` and only
 * animated to visible once 10% of the element had entered the viewport, over
 * 0.6 seconds, with stagger delays on sibling cards. Scrolling at a normal
 * reading pace outruns that: measured on the home page, up to six on-screen
 * elements sat below full opacity at any moment during a fast scroll. The
 * reader arrives at a section and finds it blank, then watches it appear —
 * which reads as a page still loading, not as a page with a flourish.
 *
 * It was worse than a cosmetic issue. Because framer-motion writes the initial
 * style inline, the hidden state was in the server-rendered HTML too, so before
 * hydration the content was invisible rather than merely un-animated.
 *
 * The component survives rather than being deleted from 58 places because it is
 * still a real structural element — removing the wrapper would change the grid
 * and flex layouts that surround it. It simply renders its children now.
 *
 * Motion that earns its place is kept elsewhere and untouched: the hero's
 * entrance, the parallax layer, the counters, hover states, the map. The
 * distinction is that those are things the reader chooses to look at, not
 * things standing between the reader and the text.
 */
export function ScrollReveal({ children, className }: ScrollRevealProps) {
  return <div className={className}>{children}</div>;
}
