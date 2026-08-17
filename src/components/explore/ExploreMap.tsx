"use client";

import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Layers,
  ListFilter,
  MapPin,
  Mountain,
  Navigation,
  Search,
  ShieldCheck,
  TicketCheck,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SITE_GROUP_COLOUR, SITE_GROUP_LABEL, SITE_GROUPS } from "@/data/map-sites";
import type { MapSite, SiteGroup } from "@/data/map-sites";
import { cn } from "@/lib/cn";
import { distanceKm, formatDistanceKm } from "@/lib/geo";
import { formatCoordinates } from "@/lib/format";
import type { SikkimDistrict } from "@/types";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-100 w-full rounded-xl" />,
});

interface StoryLink {
  slug: string;
  title: string;
  category: string;
}

interface ExploreMapProps {
  sites: MapSite[];
  districts: SikkimDistrict[];
  /** slug → { title, category } for every story referenced by a site. */
  storyIndex: Record<string, StoryLink>;
  /** How many catalogued monasteries have no publishable coordinate. */
  unmappedMonasteries: number;
}

/** Search terms that map onto a marker family, so "waterfalls near Gangtok" works. */
const GROUP_SYNONYMS: Array<[SiteGroup, string[]]> = [
  ["Monastery", ["monastery", "monasteries", "gompa", "gompas", "buddhist"]],
  ["Heritage", ["heritage", "museum", "museums", "ruins", "tea", "history", "historic"]],
  ["Sacred", ["temple", "temples", "stupa", "stupas", "chorten", "sacred", "shrine"]],
  ["Water", ["lake", "lakes", "waterfall", "waterfalls", "falls", "river", "rivers", "water"]],
  ["Nature", ["park", "parks", "sanctuary", "sanctuaries", "nature", "wildlife", "forest"]],
  ["Journey", ["pass", "passes", "trek", "trekking", "trail", "viewpoint"]],
  ["Town", ["town", "towns", "market", "markets", "bazaar", "city", "food"]],
];

interface ParsedQuery {
  /** Free text after any "near X" has been removed. */
  text: string;
  /** The anchor site named after "near", if it resolved. */
  anchor?: MapSite;
  /** Group implied by the words before "near". */
  impliedGroups: SiteGroup[];
}

/**
 * Parses queries of the shape "<what> near <where>".
 *
 * This is the difference between a search box that finds a name and one that
 * answers the question people actually arrive with: what can I see around the
 * place I am staying?
 */
function parseQuery(raw: string, sites: MapSite[]): ParsedQuery {
  const query = raw.trim().toLowerCase();
  if (!query) return { text: "", impliedGroups: [] };

  const nearMatch = query.match(/^(.*?)\s*\b(?:near|around|close to)\b\s*(.+)$/);
  if (!nearMatch) return { text: query, impliedGroups: impliedGroupsFor(query) };

  const [, whatRaw, whereRaw] = nearMatch;
  const where = whereRaw!.trim();
  const anchor =
    sites.find((site) => site.name.toLowerCase() === where) ??
    sites.find((site) => site.name.toLowerCase().includes(where)) ??
    sites.find((site) => site.district.toLowerCase() === where);

  if (!anchor) return { text: query, impliedGroups: impliedGroupsFor(query) };
  const what = whatRaw!.trim();
  return { text: what, anchor, impliedGroups: impliedGroupsFor(what) };
}

function impliedGroupsFor(text: string): SiteGroup[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const groups = new Set<SiteGroup>();
  for (const [group, synonyms] of GROUP_SYNONYMS) {
    if (words.some((word) => synonyms.includes(word))) groups.add(group);
  }
  return [...groups];
}

function GroupDot({ group, className }: { group: SiteGroup; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: SITE_GROUP_COLOUR[group] }}
    />
  );
}

/** The card shown for a selected marker: desktop side panel and mobile sheet. */
function SiteDetail({
  site,
  nearby,
  stories,
  onSelect,
  onClose,
}: {
  site: MapSite;
  nearby: Array<{ site: MapSite; km: number }>;
  stories: StoryLink[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg bg-surface-muted">
        <Image
          src={site.image}
          alt={site.imageAlt}
          fill
          sizes="(min-width: 1024px) 26rem, 100vw"
          className="object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-card transition-colors hover:bg-surface"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">
          <GroupDot group={site.group} />
          {site.category}
        </Badge>
        {site.verified ? (
          <Badge tone="success">
            <ShieldCheck className="size-3" aria-hidden /> Sourced
          </Badge>
        ) : null}
        {site.permitNote ? (
          <Badge tone="warning">
            <TicketCheck className="size-3" aria-hidden /> Permit
          </Badge>
        ) : null}
      </div>

      <h3 className="mt-2.5 font-display text-h3">{site.name}</h3>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-caption text-subtle">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" aria-hidden />
          {site.district} district
        </span>
        <span>· {formatCoordinates(site.coordinates.lat, site.coordinates.lng)}</span>
        {site.elevation ? (
          <span className="inline-flex items-center gap-1">
            · <Mountain className="size-3" aria-hidden />
            {site.elevation.toLocaleString("en-IN")} m
          </span>
        ) : null}
      </p>

      <p className="mt-3 text-small leading-relaxed text-muted">{site.description}</p>

      {site.permitNote ? (
        <p className="mt-3 rounded-lg border-l-4 border-warning bg-warning-soft p-3 text-caption leading-relaxed">
          {site.permitNote}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {site.detailHref ? (
          <Link href={site.detailHref} className={buttonClasses({ size: "sm" })}>
            Explore
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
        <a
          href={site.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <Navigation className="size-4" aria-hidden />
          Directions
        </a>
        {site.sourceUrl ? (
          <a
            href={site.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            Source
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>

      {stories.length > 0 ? (
        <section className="mt-5 border-t pt-4">
          <h4 className="flex items-center gap-1.5 font-mono text-eyebrow tracking-widest text-subtle uppercase">
            <BookOpen className="size-3.5" aria-hidden />
            Stories about this place
          </h4>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {stories.map((story) => (
              <li key={story.slug}>
                <Link
                  href={`/stories/${story.slug}`}
                  className="group flex items-start gap-2 rounded-md py-1 text-small text-primary hover:underline"
                >
                  <ArrowRight
                    className="mt-1 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                  {story.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {nearby.length > 0 ? (
        <section className="mt-5 border-t pt-4">
          <h4 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
            What else is around
          </h4>
          <ul className="mt-2.5 flex flex-col gap-1">
            {nearby.map(({ site: other, km }) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => onSelect(other.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-small transition-colors hover:bg-surface-muted"
                >
                  <GroupDot group={other.group} />
                  <span className="min-w-0 flex-1 truncate">{other.name}</span>
                  <span className="shrink-0 font-mono text-caption text-subtle" data-numeric>
                    {formatDistanceKm(km)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-subtle">Straight-line distance, not road distance.</p>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Explore Sikkim — the visual discovery layer.
 *
 * Everything plotted here comes from a record with a published coordinate. The
 * counter under the map says how many catalogued monasteries are missing from
 * it, because a map that silently omits records is worse than one that admits
 * the gap.
 */
export function ExploreMap({
  sites,
  districts,
  storyIndex,
  unmappedMonasteries,
}: ExploreMapProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [activeGroups, setActiveGroups] = useState<Set<SiteGroup>>(new Set());
  const [district, setDistrict] = useState<SikkimDistrict | "All">("All");
  const [withStoriesOnly, setWithStoriesOnly] = useState(false);
  const [noPermitOnly, setNoPermitOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  /* Deep links: /explore?place=yuksom and /explore?monastery=rumtek, arriving
     from a story's "Places in this story" list. */
  const linkedId = useMemo(() => {
    const place = searchParams.get("place");
    const monastery = searchParams.get("monastery");
    const id = place ? `place:${place}` : monastery ? `monastery:${monastery}` : null;
    return id && sites.some((site) => site.id === id) ? id : null;
  }, [searchParams, sites]);

  /* Selection is derived, not synchronised: a click records which URL it was
     made against, so arriving at a new deep link supersedes it without an
     effect that writes state during render. */
  const [picked, setPicked] = useState<{ id?: string; forLink: string | null }>({
    forLink: null,
  });
  const selectedId =
    picked.forLink === linkedId ? picked.id : (linkedId ?? undefined);
  const setSelectedId = useCallback(
    (id?: string) => setPicked({ id, forLink: linkedId }),
    [linkedId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery), 200);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const parsed = useMemo(() => parseQuery(query, sites), [query, sites]);

  const filtered = useMemo(() => {
    const groups = activeGroups.size > 0 ? activeGroups : new Set(parsed.impliedGroups);
    const terms = parsed.text.split(/\s+/).filter(Boolean);

    let result = sites.filter((site) => {
      if (groups.size > 0 && !groups.has(site.group)) return false;
      if (district !== "All" && site.district !== district) return false;
      if (withStoriesOnly && site.storySlugs.length === 0) return false;
      if (noPermitOnly && site.permitNote) return false;
      /* Words that named a marker family are already applied as a filter, so
         they must not also have to appear in the text. */
      const textTerms = terms.filter(
        (term) => !GROUP_SYNONYMS.some(([, synonyms]) => synonyms.includes(term)),
      );
      if (textTerms.length > 0 && !textTerms.every((term) => site.searchText.includes(term)))
        return false;
      return true;
    });

    if (parsed.anchor) {
      const anchor = parsed.anchor;
      result = result
        .map((site) => ({ site, km: distanceKm(anchor.coordinates, site.coordinates) }))
        .filter(({ site, km }) => site.id === anchor.id || km <= 40)
        .sort((a, b) => a.km - b.km)
        .map(({ site }) => site);
    }

    return result;
  }, [sites, activeGroups, district, withStoriesOnly, noPermitOnly, parsed]);

  const selected = useMemo(
    () => sites.find((site) => site.id === selectedId),
    [sites, selectedId],
  );

  const nearby = useMemo(() => {
    if (!selected) return [];
    return sites
      .filter((site) => site.id !== selected.id)
      .map((site) => ({ site, km: distanceKm(selected.coordinates, site.coordinates) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
  }, [sites, selected]);

  const selectedStories = useMemo(
    () =>
      (selected?.storySlugs ?? [])
        .map((slug) => storyIndex[slug])
        .filter((story): story is StoryLink => story !== undefined),
    [selected, storyIndex],
  );

  const markers = useMemo(
    () =>
      filtered.map((site) => ({
        id: site.id,
        position: site.coordinates,
        title: site.name,
        subtitle: `${site.category} · ${site.district} district`,
        color: SITE_GROUP_COLOUR[site.group],
        emphasis: site.storySlugs.length > 0,
      })),
    [filtered],
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      /* On a phone the sheet is below the fold; bring it into view. */
      if (window.matchMedia("(max-width: 1023px)").matches) {
        window.setTimeout(
          () => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          60,
        );
      }
    },
    [setSelectedId],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(undefined);
    if (linkedId) router.replace("/explore", { scroll: false });
  }, [linkedId, router, setSelectedId]);

  const groupCounts = useMemo(() => {
    const counts = new Map<SiteGroup, number>();
    for (const site of sites) counts.set(site.group, (counts.get(site.group) ?? 0) + 1);
    return counts;
  }, [sites]);

  const activeFilterCount =
    activeGroups.size +
    (district !== "All" ? 1 : 0) +
    (withStoriesOnly ? 1 : 0) +
    (noPermitOnly ? 1 : 0);

  const clearAll = () => {
    setRawQuery("");
    setQuery("");
    setActiveGroups(new Set());
    setDistrict("All");
    setWithStoriesOnly(false);
    setNoPermitOnly(false);
  };

  const layerToggles = (
    <div className="flex flex-wrap gap-2">
      {SITE_GROUPS.map((group) => {
        const active = activeGroups.has(group);
        const implied = !active && parsed.impliedGroups.includes(group);
        return (
          <button
            key={group}
            type="button"
            aria-pressed={active}
            onClick={() =>
              setActiveGroups((current) => {
                const next = new Set(current);
                if (next.has(group)) next.delete(group);
                else next.add(group);
                return next;
              })
            }
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-label font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              active
                ? "border-primary bg-primary-soft text-primary"
                : implied
                  ? "border-primary/60 bg-surface text-primary"
                  : "border-border-strong bg-surface text-muted hover:border-primary hover:text-primary",
            )}
          >
            <GroupDot group={group} />
            {SITE_GROUP_LABEL[group]}
            <span className="text-caption text-subtle tabular-nums">{groupCounts.get(group) ?? 0}</span>
          </button>
        );
      })}
    </div>
  );

  const secondaryFilters = (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
          District
        </span>
        <select
          value={district}
          onChange={(event) => setDistrict(event.target.value as SikkimDistrict | "All")}
          className="h-11 rounded-lg border border-border-strong bg-surface px-3 text-small"
        >
          <option value="All">All districts</option>
          {districts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-eyebrow tracking-widest text-subtle uppercase">Show only</span>
        {[
          {
            label: "Places with a story",
            checked: withStoriesOnly,
            onChange: () => setWithStoriesOnly((value) => !value),
          },
          {
            label: "No permit needed",
            checked: noPermitOnly,
            onChange: () => setNoPermitOnly((value) => !value),
          },
        ].map((option) => (
          <label
            key={option.label}
            className="flex cursor-pointer items-center gap-2.5 text-small text-muted"
          >
            <input
              type="checkbox"
              checked={option.checked}
              onChange={option.onChange}
              className="size-4 accent-[var(--color-primary)]"
            />
            {option.label}
          </label>
        ))}
      </div>

      {activeFilterCount > 0 || query ? (
        <Button variant="outline" size="sm" onClick={clearAll} className="self-start">
          <X className="size-4" aria-hidden />
          Clear filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder="Try “Rumtek”, “Pelling”, or “lakes near Gangtok”"
            aria-label="Search places on the map"
            className="h-12 w-full rounded-full border border-border-strong bg-surface pr-4 pl-11 text-small placeholder:text-subtle focus-visible:border-primary"
          />
        </label>
        <Button
          variant="outline"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          <ListFilter className="size-4" aria-hidden />
          Filters
          {activeFilterCount > 0 ? <Badge tone="jade">{activeFilterCount}</Badge> : null}
        </Button>
      </div>

      {/* Layer toggles are always visible — they are the map's legend. */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 font-mono text-eyebrow tracking-widest text-subtle uppercase">
          <Layers className="size-3.5" aria-hidden />
          Layers
        </p>
        <div className="mt-2.5">{layerToggles}</div>
      </div>

      {filtersOpen ? (
        <div className="animate-slide-up mt-4 rounded-xl border bg-surface p-5 md:max-w-md">
          {secondaryFilters}
        </div>
      ) : null}

      {parsed.anchor ? (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-primary-soft px-3.5 py-2.5 text-small text-primary">
          <MapPin className="size-4" aria-hidden />
          Showing sites within 40 km of <strong>{parsed.anchor.name}</strong>, nearest first.
        </p>
      ) : null}

      {/* Map + detail panel */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_26rem]">
        <div className="relative min-w-0">
          <LeafletMap
            className="h-[26rem] sm:h-[32rem] lg:h-[38rem]"
            markers={markers}
            selectedId={selectedId}
            onSelect={handleSelect}
            fitToMarkers
            ariaLabel="Map of heritage and natural sites in Sikkim"
          />

          {/* No floating legend here: the layer chips above are the legend, and
              a second copy over the map only hid markers in the south-east. */}

          <p className="mt-3 flex flex-wrap items-center justify-between gap-3 text-small text-muted">
            <span aria-live="polite">
              {filtered.length === 0
                ? "No sites match — try clearing a layer"
                : `${filtered.length} of ${sites.length} sites plotted`}
            </span>
            {unmappedMonasteries > 0 ? (
              <Link href="/preservation" className="text-caption text-subtle hover:text-primary">
                {unmappedMonasteries} catalogued monaster
                {unmappedMonasteries === 1 ? "y has" : "ies have"} no publishable coordinate →
              </Link>
            ) : null}
          </p>
        </div>

        {/* Desktop: sticky detail panel. Mobile: sheet below the map. */}
        <div ref={detailRef} className="min-w-0">
          <div className="lg:sticky lg:top-24">
            {selected ? (
              <div className="animate-scale-in rounded-xl border bg-surface p-5 shadow-card">
                <SiteDetail
                  site={selected}
                  nearby={nearby}
                  stories={selectedStories}
                  onSelect={handleSelect}
                  onClose={closeDetail}
                />
              </div>
            ) : (
              <div className="rounded-xl border bg-surface p-5">
                <h3 className="font-display text-h3">Pick a marker</h3>
                <p className="mt-2 text-small leading-relaxed text-muted">
                  Every marker on this map has a coordinate published by a named source. Select one
                  for its record, its permit position, what lies nearby, and the stories that
                  reference it.
                </p>
                <ul className="mt-4 flex max-h-96 flex-col divide-y overflow-y-auto">
                  {filtered.slice(0, 40).map((site) => (
                    <li key={site.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(site.id)}
                        className="flex w-full items-center gap-2.5 py-2.5 text-left transition-colors hover:bg-surface-muted"
                      >
                        <GroupDot group={site.group} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-small font-medium">{site.name}</span>
                          <span className="block truncate font-mono text-caption text-subtle">
                            {site.category} · {site.district}
                          </span>
                        </span>
                        {site.storySlugs.length > 0 ? (
                          <span className="shrink-0 text-caption text-subtle">
                            {site.storySlugs.length} stor
                            {site.storySlugs.length === 1 ? "y" : "ies"}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
