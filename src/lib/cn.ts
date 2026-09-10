import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught this project's type scale.
 *
 * THE BUG THIS FIXES
 * ------------------
 * tailwind-merge decides which utilities conflict by classifying them, and out
 * of the box it only knows Tailwind's own font-size names (`text-sm`,
 * `text-lg`, …). This project's scale is `text-display`, `text-body`,
 * `text-small`, `text-label`, `text-caption`, `text-eyebrow`, `text-price` —
 * none of which it recognises, so it files them as *colour* utilities instead.
 *
 * The consequence: any class list containing both a size and a colour from that
 * family silently lost one of them. `buttonClasses({ variant: "primary" })`
 * emits `text-primary-foreground … text-small`, and passing that through cn()
 * dropped the colour — which is how the home page's "Plan Your Journey" button
 * ended up rendering near-black body text on forest green at 2.45:1 instead of
 * the near-white it declares.
 *
 * Declaring the scale here fixes the whole class of bug rather than the one
 * button that happened to expose it: a size and a colour are now understood to
 * be different properties, and neither evicts the other.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "h3",
            "h4",
            "body-lg",
            "body",
            "small",
            "label",
            "caption",
            "eyebrow",
            "price",
          ],
        },
      ],
    },
  },
});

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
