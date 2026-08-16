"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  /** Portion of the element that must be visible before revealing. */
  threshold?: number;
  /** Seconds to wait before the reveal — used to stagger sibling cards. */
  delay?: number;
  className?: string;
}

/**
 * Fades content up as it scrolls into view. Runs once, honours
 * prefers-reduced-motion by rendering visible immediately.
 */
export function ScrollReveal({
  children,
  threshold = 0.1,
  delay = 0,
  className,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: "easeOut", delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
