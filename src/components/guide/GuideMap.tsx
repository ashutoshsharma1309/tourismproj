"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { MapMarker } from "@/components/maps/LeafletMap";
import type { LatLng } from "@/lib/assistant/types";

/**
 * The Guide's map: the same Leaflet map the destination pages use, loaded
 * only when an answer has something to show on it — a route, or places with
 * published coordinates. A place without a coordinate is never plotted.
 */
const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-44 w-full animate-pulse rounded-lg bg-white/5" aria-hidden />,
});

export function GuideMap({
  points,
  route,
  label,
}: {
  points: { id: string; name: string; coords: LatLng; href?: string; emphasis?: boolean }[];
  route?: LatLng[] | null;
  label: string;
}) {
  const markers = useMemo<MapMarker[]>(
    () => points.map((p) => ({ id: p.id, position: p.coords, title: p.name, href: p.href, emphasis: p.emphasis })),
    [points],
  );
  if (markers.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border-inverse/70" data-guide-map>
      <LeafletMap className="h-44 w-full" markers={markers} polyline={route ?? undefined} fitToMarkers ariaLabel={label} />
    </div>
  );
}
