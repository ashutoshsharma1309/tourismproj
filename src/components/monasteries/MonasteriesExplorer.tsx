"use client";

import {
  Headphones,
  LayoutGrid,
  ListFilter,
  Map as MapIcon,
  MapPin,
  Rotate3d,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatCoordinates } from "@/lib/format";
import type { MonasteryDetails, MonasteryTradition, SikkimDistrict } from "@/types";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-120 w-full rounded-xl" />,
});

const DISTRICTS: Array<SikkimDistrict | "All"> = [
  "All",
  "Gangtok",
  "Mangan",
  "Namchi",
  "Gyalshing",
  "Pakyong",
  "Soreng",
];

const TRADITION_COLOURS: Record<MonasteryTradition, string> = {
  Nyingma: "#a63a2a",
  Kagyu: "#4c6e8f",
  "Karma Kagyu": "#00907a",
  "Zurmang Kagyu": "#c08a2d",
};

type Feature = "Sourced record" | "Mapped location";
const FEATURES: Feature[] = ["Sourced record", "Mapped location"];

function hasFeature(monastery: MonasteryDetails, feature: Feature): boolean {
  switch (feature) {
    case "Sourced record":
      return monastery.provenance.confidence !== "unverified";
    case "Mapped location":
      return monastery.coordinates !== undefined;
  }
}

interface MonasteriesExplorerProps {
  monasteries: MonasteryDetails[];
  traditions: MonasteryTradition[];
}

export function MonasteriesExplorer({ monasteries, traditions }: MonasteriesExplorerProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState<SikkimDistrict | "All">("All");
  const [picked, setPicked] = useState<Set<MonasteryTradition>>(new Set());
  const [features, setFeatures] = useState<Set<Feature>>(new Set());
  const [view, setView] = useState<"grid" | "map">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery), 300);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return monasteries.filter((monastery) => {
      if (
        needle &&
        !`${monastery.name} ${monastery.district} ${monastery.tradition}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (district !== "All" && monastery.district !== district) return false;
      if (picked.size > 0 && !picked.has(monastery.tradition)) return false;
      if (features.size > 0 && ![...features].every((f) => hasFeature(monastery, f)))
        return false;
      return true;
    });
  }, [monasteries, query, district, picked, features]);

  const clearAll = () => {
    setRawQuery("");
    setDistrict("All");
    setPicked(new Set());
    setFeatures(new Set());
  };

  const activeCount = (district !== "All" ? 1 : 0) + picked.size + features.size;

  const filterPanel = (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-label font-medium">District</span>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value as SikkimDistrict | "All")}
          className="h-11 rounded-lg border border-border-strong bg-surface px-3 text-small"
        >
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d === "All" ? "All districts" : d}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-label font-medium">Tradition</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {traditions.map((tradition) => {
            const active = picked.has(tradition);
            return (
              <label
                key={tradition}
                className={cn(
                  "flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-label font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong text-muted hover:border-primary hover:text-primary",
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    setPicked((current) => {
                      const next = new Set(current);
                      if (next.has(tradition)) next.delete(tradition);
                      else next.add(tradition);
                      return next;
                    })
                  }
                  className="sr-only"
                />
                {tradition}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-label font-medium">Features</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEATURES.map((feature) => {
            const active = features.has(feature);
            return (
              <label
                key={feature}
                className={cn(
                  "flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-label transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border-strong text-muted hover:border-primary hover:text-primary",
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    setFeatures((current) => {
                      const next = new Set(current);
                      if (next.has(feature)) next.delete(feature);
                      else next.add(feature);
                      return next;
                    })
                  }
                  className="sr-only"
                />
                {feature}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button variant="ghost" size="sm" onClick={clearAll} className="self-start">
        Clear all
      </Button>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search monasteries in Rumtek, Pelling…"
            aria-label="Search monasteries"
            className="h-12 w-full rounded-full border border-border-strong bg-surface pr-4 pl-11 text-small placeholder:text-subtle"
          />
        </label>

        <Button
          variant="outline"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden"
          aria-expanded={drawerOpen}
        >
          <ListFilter className="size-4" aria-hidden />
          Filters
          {activeCount > 0 ? <Badge tone="jade">{activeCount}</Badge> : null}
        </Button>

        <Button
          variant={view === "map" ? "primary" : "outline"}
          onClick={() => setView(view === "grid" ? "map" : "grid")}
          aria-pressed={view === "map"}
        >
          {view === "grid" ? (
            <>
              <MapIcon className="size-4" aria-hidden /> Show map
            </>
          ) : (
            <>
              <LayoutGrid className="size-4" aria-hidden /> Show grid
            </>
          )}
        </Button>
      </div>

      <div className="mt-8 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-24 rounded-xl border bg-surface p-5">{filterPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="text-small text-muted" aria-live="polite">
            {filtered.length === 0
              ? "No monasteries match"
              : `${filtered.length} of ${monasteries.length} monasteries`}
          </p>

          {view === "map" ? (
            <div className="mt-4">
              <LeafletMap
                key={filtered.map((m) => m.slug).join(",")}
                className="h-120"
                markers={filtered.filter((m) => m.coordinates).map((monastery) => ({
                  position: monastery.coordinates!,
                  title: monastery.name,
                  subtitle: `${monastery.tradition} · est. ${monastery.establishedYear}`,
                  href: `/monasteries/${monastery.slug}`,
                  color: TRADITION_COLOURS[monastery.tradition],
                }))}
              />
              <p className="mt-3 flex flex-wrap gap-4 text-caption text-subtle">
                {traditions.map((tradition) => (
                  <span key={tradition} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: TRADITION_COLOURS[tradition] }}
                    />
                    {tradition}
                  </span>
                ))}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed p-12 text-center">
              <p className="font-display text-h3">No monasteries found</p>
              <p className="mt-2 text-body text-muted">Try another search or clear a filter.</p>
              <Button variant="outline" onClick={clearAll} className="mt-5">
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((monastery) => (
                <article
                  key={monastery.slug}
                  className="card-lift group relative flex h-full flex-col overflow-hidden rounded-xl border bg-surface shadow-soft"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                    <Image
                      src={monastery.image}
                      alt={`${monastery.name}, ${monastery.district}`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="media-zoom object-cover group-hover:scale-[1.04]"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge tone="jade">{monastery.tradition}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h3 className="font-display text-h4 font-bold">
                      <Link
                        href={`/monasteries/${monastery.slug}`}
                        className="focus-visible:outline-none"
                      >
                        <span className="absolute inset-0 z-10" aria-hidden />
                        {monastery.name}
                      </Link>
                    </h3>
                    <p className="font-mono text-caption text-subtle">
                      {monastery.district} ·{" "}
                      {monastery.coordinates ? formatCoordinates(monastery.coordinates.lat, monastery.coordinates.lng) : "Location pending verification"}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      
                      {monastery.coordinates ? (
                        <Badge tone="neutral">
                          <MapPin className="size-3" aria-hidden /> Mapped
                        </Badge>
                      ) : null}
                      <Badge tone={monastery.audio.available ? "success" : "neutral"}>
                        <Headphones className="size-3" aria-hidden />
                        {monastery.audio.available
                          ? `Audio · ${monastery.audio.languages.length}`
                          : "No audio"}
                      </Badge>
                      <Badge tone={monastery.tour.available ? "success" : "neutral"}>
                        <Rotate3d className="size-3" aria-hidden />
                        {monastery.tour.available ? "360°" : "No 360°"}
                      </Badge>
                      <Badge tone="neutral">est. {monastery.establishedYear}</Badge>
                      {monastery.provenance.confidence !== "unverified" ? (
                        <Badge tone="success">
                          <ShieldCheck className="size-3" aria-hidden /> Sourced
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-100 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-secondary/60 backdrop-blur-sm"
            tabIndex={-1}
          />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 w-80 overflow-y-auto bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-h3">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {filterPanel}
            <Button onClick={() => setDrawerOpen(false)} className="mt-6 w-full">
              Show {filtered.length} monasteries
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
