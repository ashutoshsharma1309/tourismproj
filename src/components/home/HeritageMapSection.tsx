"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Skeleton } from "@/components/ui/Skeleton";
import { MAP_STATS, SITE_GROUP_COLOUR, SITE_GROUP_LABEL, SITE_GROUPS, mapSites } from "@/data/map-sites";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-120 w-full rounded-xl" />,
});

/**
 * The whole sacred landscape on one map, colour-coded by the same six marker
 * families the explore page uses — so the legend a visitor learns here still
 * means the same thing when they get to /explore.
 */
export function HeritageMapSection() {
  return (
    <div>
      <div className="relative">
        <LeafletMap
          className="h-120"
          markers={mapSites.map((site) => ({
            id: site.id,
            position: site.coordinates,
            title: site.name,
            subtitle: `${site.category} · ${site.district} district`,
            href: site.detailHref ?? `/explore?place=${site.slug}`,
            color: SITE_GROUP_COLOUR[site.group],
          }))}
          ariaLabel="Map of sourced heritage and natural sites across Sikkim"
        />
        {/* Glass legend — sits over the map like an instrument panel. */}
        <div className="glass pointer-events-none absolute right-3 bottom-3 z-10 hidden rounded-lg px-4 py-3 shadow-card sm:block">
          <p className="font-mono text-eyebrow tracking-widest text-muted uppercase">Legend</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {SITE_GROUPS.map((group) => (
              <li key={group} className="flex items-center gap-2 text-caption">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: SITE_GROUP_COLOUR[group] }}
                />
                {SITE_GROUP_LABEL[group]}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted">
          {MAP_STATS.sites} sites with a published coordinate · tap any marker
        </p>
        <Link
          href="/explore"
          className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
        >
          Open the full explorer
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
