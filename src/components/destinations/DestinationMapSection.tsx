"use client";

import dynamic from "next/dynamic";

import type { MapMarker } from "@/components/maps/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="mt-6 h-[26rem] animate-pulse rounded-xl border border-border bg-surface-muted" />
  ),
});

/**
 * The destination's own places, on its own map.
 *
 * WHY THIS IS A CLIENT WRAPPER AND NOT THE MAP ITSELF
 * ---------------------------------------------------
 * Leaflet touches `window` on import, so it has to be loaded dynamically with
 * `ssr: false`. Keeping that in a thin wrapper means the hub — a server
 * component — passes plain marker data and never becomes a client component
 * itself, which is the mistake that put 700 KB into the bundle in Phase 20.
 *
 * MARKERS COME FROM RECORDS, NEVER FROM A GUESS
 * ---------------------------------------------
 * The caller passes only places whose own source published a coordinate. A
 * place without one is simply absent from the map rather than being placed at
 * a city centroid, which would put a monument somewhere it is not.
 */
export function DestinationMapSection({
  markers,
  staysPlotted = 0,
  destinationName,
  plotted,
  total,
}: {
  markers: MapMarker[];
  /** Documented stays plotted alongside the places, if any. */
  staysPlotted?: number;
  destinationName: string;
  plotted: number;
  total: number;
}) {
  if (markers.length === 0) return null;

  return (
    <section id="map" className="mt-14 scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-h3">{destinationName} on one map</h2>
        <p className="text-caption text-subtle" data-numeric>
          {plotted}
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-body text-muted">
        {plotted === total ? (
          <>Every catalogued place, at the coordinate its own source publishes.</>
        ) : (
          <>
            {plotted} of {total} catalogued places, at the coordinates their own
            sources publish. The other {total - plotted} are not plotted because
            no source states where they are, and a guessed pin is worse than no
            pin.
          </>
        )}
      </p>

      {staysPlotted > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "#43614d" }} />
            Catalogued places
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "#a8622b" }} />
            Documented stays ({staysPlotted}) — each at the coordinate its source publishes
          </span>
        </p>
      ) : null}
      <LeafletMap
        markers={markers}
        className="mt-6 h-[26rem] rounded-xl border border-border"
        fitToMarkers
        ariaLabel={`Map of catalogued places${staysPlotted > 0 ? " and documented stays" : ""} in ${destinationName}`}
      />
    </section>
  );
}
