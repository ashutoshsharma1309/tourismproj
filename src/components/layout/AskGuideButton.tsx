"use client";

import { Compass } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { openGuide } from "@/lib/guide-events";

/**
 * A control that opens the trip guide from anywhere.
 *
 * The guide already has a floating launcher in the bottom-right corner. This
 * exists because a first-time visitor does not know that circle is a guide,
 * and the header is where they look for the things a product can do. It
 * carries no state of its own: it asks the guide to open (`openGuide()`) and
 * the guide answers. Styling is the caller's, so the same control sits in the
 * header pill row, the mobile drawer and the "How TerraStory works" strip.
 */
export function AskGuideButton({
  className,
  children = "Ask the guide",
  icon = true,
  onBeforeOpen,
}: {
  className?: string;
  children?: ReactNode;
  icon?: boolean;
  /** Runs before the guide is asked to open — the drawer uses it to close. */
  onBeforeOpen?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onBeforeOpen?.();
        openGuide();
      }}
      aria-label="Ask the guide"
      className={cn(
        "inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        className,
      )}
    >
      {icon ? <Compass className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}
