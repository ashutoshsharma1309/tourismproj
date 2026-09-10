"use client";

import { Check, Plus } from "lucide-react";

import { useJourney } from "@/lib/journey/JourneyProvider";

/**
 * The control that puts one destination into a journey.
 *
 * WHY IT IS A BUTTON BESIDE THE CARD AND NOT THE CARD ITSELF
 * ----------------------------------------------------------
 * A destination tile has one obvious meaning — open this place — and making
 * the whole tile toggle a selection instead would break that for every
 * visitor who is not building a journey. So the tile stays a link and the
 * selection is its own control, with its own label, reachable in its own tab
 * stop.
 *
 * `aria-pressed` rather than a checkbox: this is a toggle button whose effect
 * is immediate and visible in the tray, not a form field awaiting submission.
 *
 * BEFORE HYDRATION IT RENDERS ITS RESTING STATE. The journey lives in
 * localStorage, which the server cannot read, so a control that rendered
 * "selected" on the server would be markup the server could not have produced.
 * It is inert for the fraction of a second before the journey arrives, and
 * disabled so a click in that window cannot toggle against a journey that has
 * not loaded.
 */
export function SelectDestination({
  destinationId,
  destinationName,
  className,
}: {
  destinationId: string;
  destinationName: string;
  className?: string;
}) {
  const { isSelected, toggle, hydrated, full } = useJourney();
  const selected = hydrated && isSelected(destinationId);
  const blocked = hydrated && full && !selected;

  return (
    <button
      type="button"
      onClick={() => toggle(destinationId)}
      disabled={!hydrated || blocked}
      aria-pressed={selected}
      aria-label={
        selected
          ? `Remove ${destinationName} from your journey`
          : `Add ${destinationName} to your journey`
      }
      title={blocked ? "A journey holds up to 15 destinations" : undefined}
      className={`inline-flex scroll-mt-24 items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-surface text-muted hover:border-primary hover:text-primary"
      } ${className ?? ""}`}
    >
      {selected ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Plus className="size-3.5" aria-hidden />
      )}
      {selected ? "In your journey" : "Add to journey"}
    </button>
  );
}
