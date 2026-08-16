"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Skeleton } from "@/components/ui/Skeleton";
import { places } from "@/data/places";
import type { MonasteryDetails, MonasteryTradition } from "@/types";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-120 w-full rounded-xl" />,
});

const TRADITION_COLOURS: Record<MonasteryTradition, string> = {
  Nyingma: "#a63a2a",
  Kagyu: "#4c6e8f",
  "Karma Kagyu": "#00907a",
  "Zurmang Kagyu": "#c08a2d",
};

interface HeritageMapSectionProps {
  monasteries: MonasteryDetails[];
}

/** The whole sacred landscape on one map, colour-coded by lineage. */
export function HeritageMapSection({ monasteries }: HeritageMapSectionProps) {
  return (
    <div>
      <div className="relative">
        <LeafletMap
          className="h-120"
          markers={[
            ...monasteries
              .filter((m) => m.coordinates)
              .map((monastery) => ({
                position: monastery.coordinates!,
                title: monastery.name,
                subtitle: `${monastery.tradition} · est. ${monastery.establishedYear}`,
                href: `/monasteries/${monastery.slug}`,
                color: TRADITION_COLOURS[monastery.tradition],
              })),
            ...places.map((place) => ({
              position: place.coordinates,
              title: place.name,
              subtitle: `${place.category} · ${place.district} district`,
              href: place.googleMapsUrl,
              color: "#5d5647",
            })),
          ]}
        />
        {/* Glass legend — sits over the map like an instrument panel. */}
        <div className="glass pointer-events-none absolute right-3 bottom-3 z-10 hidden rounded-lg px-4 py-3 shadow-card sm:block">
          <p className="font-mono text-eyebrow tracking-widest text-muted uppercase">
            Lineages
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            <li className="flex items-center gap-2 text-caption">
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ backgroundColor: "#5d5647" }} />
              Heritage &amp; natural sites
            </li>
            {(Object.keys(TRADITION_COLOURS) as MonasteryTradition[]).map((tradition) => (
              <li key={tradition} className="flex items-center gap-2 text-caption">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: TRADITION_COLOURS[tradition] }}
                />
                {tradition}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted">
          {monasteries.filter((m) => m.coordinates).length + places.length} sites with a published coordinate · tap any marker
        </p>
        <Link
          href="/monasteries"
          className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
        >
          Open the full explorer
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
