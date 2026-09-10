"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { destinationLocationLine } from "@/lib/destinations/location";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DestinationMarker } from "@/lib/destinations";
import { CATEGORY_LABEL } from "@/data/published-knowledge";
import { DATA_DEPTH_LABEL } from "@/types/destination";

/* The map is heavy and below the fold on mobile; loading it on demand keeps
   it out of the initial payload. Same pattern as the Sikkim explore map. */
const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[22rem] w-full rounded-xl sm:h-[28rem]" />,
});

/**
 * The world view: fifteen destinations, one interaction, no invented content.
 *
 * TWO THINGS THIS COMPONENT WILL NOT DO
 * -------------------------------------
 * 1. It defines no coordinates. Every marker comes from the canonical
 *    registry via `buildDestinationMarkers`, so adding a destination is a
 *    registry entry and nothing here changes.
 *
 * 2. It shows no statistic it cannot support. A destination with no approved
 *    research says exactly that. There are no visitor numbers, rankings,
 *    hotel counts or popularity scores anywhere in this file, because none of
 *    those exist as sourced facts — and inventing them is the one thing this
 *    product has consistently refused to do.
 *
 * The map is not the only route in. Everything reachable by clicking a marker
 * is also reachable from the list below it, which is what makes the page work
 * on a phone and from a keyboard.
 */

/* Marker colour carries knowledge status. Deliberately not "how good is this
   destination" — how much verified knowledge exists. */
const DEPTH_COLOUR: Record<string, string> = {
  deep: "#43614d",
  curated: "#2f6f8f",
  researched: "#a8762c",
  planned: "#8a8578",
};

const DEPTH_TONE = {
  deep: "jade",
  curated: "info",
  researched: "marigold-soft",
  planned: "neutral",
} as const;

export function WorldMap({
  destinations,
  documentedCount,
}: {
  destinations: DestinationMarker[];
  /* Counted from coverage by the page, not from the evidence-block flag. */
  documentedCount: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const markers = useMemo(
    () =>
      destinations.map((d) => ({
        id: d.id,
        position: { lat: d.lat, lng: d.lng },
        title: d.name,
        subtitle: destinationLocationLine(d.name, d.region, d.country),
        color: DEPTH_COLOUR[d.depth] ?? DEPTH_COLOUR.planned,
        emphasis: d.hasKnowledge,
      })),
    [destinations],
  );

  const selected = destinations.find((d) => d.id === selectedId) ?? null;

  return (
    <section className="mt-10">
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <LeafletMap
            className="h-[22rem] w-full sm:h-[28rem] lg:h-[32rem]"
            markers={markers}
            /*
             * Fit rather than a fixed centre and zoom. A fixed viewport that
             * frames Europe and Asia pushes New York off the left edge on a
             * 390px screen, so a destination becomes unreachable without
             * panning — on the one page whose job is that every destination
             * is discoverable. Fitting keeps all fifteen in frame at any
             * width, and it keeps working when a sixteenth is added.
             */
            fitToMarkers
            selectedId={selectedId ?? undefined}
            onSelect={setSelectedId}
            ariaLabel="World map of TerraStory destinations. Every destination shown here is also listed below."
          />
          {/*
            Bottom clearance. The site's floating controls — the ambient-sound
            toggle and the guide button — are fixed to the viewport corners and
            sat directly on top of this line, and on mobile across the foot of
            the map itself.
          */}
          <p className="mt-3 pb-16 text-caption text-muted sm:pb-0" aria-live="polite">
            {destinations.length} destinations · {documentedCount} documented
            {selected ? ` · ${selected.name} selected` : ""}
          </p>
        </div>

        {/*
          The preview. Shown beside the map on desktop and below it on mobile,
          so a small screen never has a panel covering the thing it describes.
        */}
        <aside
          className="rounded-xl border border-border bg-surface p-5"
          aria-label="Selected destination"
        >
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-h3">{selected.name}</h3>
                <Badge tone={DEPTH_TONE[selected.depth as keyof typeof DEPTH_TONE] ?? "neutral"}>
                  {DATA_DEPTH_LABEL[selected.depth]}
                </Badge>
              </div>
              <p className="mt-1 text-caption text-muted">
                {selected.region ? `${selected.region} · ` : ""}
                {selected.country}
              </p>

              {selected.hasKnowledge ? (
                <>
                  <p className="mt-4 text-label font-medium">You can explore</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {selected.experiences.map((e) => (
                      <li key={e}>
                        <Badge tone="neutral">{CATEGORY_LABEL[e] ?? e}</Badge>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-4 text-body text-muted">
                  Research is not yet available for {selected.name}. It is registered
                  in the architecture, and nothing is shown for it until sources have
                  been found and reviewed.
                </p>
              )}

              <Link
                href={`/destinations/${selected.id}`}
                className="focus-visible:ring-primary mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-label font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:outline-none"
              >
                Explore {selected.name}
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-display text-h3">Choose a destination</h3>
              <p className="mt-2 text-body text-muted">
                Select a marker to see what has been verified about a place — or use
                the list below, which holds the same fifteen.
              </p>
              <p className="mt-4 text-caption text-subtle">
                Marker colour shows how much verified knowledge exists, not how
                interesting a place is.
              </p>
              <ul className="mt-3 space-y-1.5 text-caption text-muted">
                {(["deep", "curated", "researched", "capsule", "planned"] as const).map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: DEPTH_COLOUR[d] }}
                    />
                    {DATA_DEPTH_LABEL[d]}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
