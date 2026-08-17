"use client";

import { ListFilter, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StoryCard } from "@/components/stories/StoryCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CLAIM_LABEL, searchStories } from "@/data/stories";
import type { ClaimType, Community, Story, StoryCategory } from "@/data/stories";
import { cn } from "@/lib/cn";

interface StoriesExplorerProps {
  stories: Story[];
  categories: StoryCategory[];
  communities: Community[];
  claimTypes: ClaimType[];
}

type Filters = {
  categories: Set<StoryCategory>;
  communities: Set<Community>;
  claims: Set<ClaimType>;
};

const EMPTY: Filters = { categories: new Set(), communities: new Set(), claims: new Set() };

/** Toggle a value in a Set without mutating the one React is holding. */
function toggle<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function FilterChip({
  active,
  onToggle,
  children,
  count,
}: {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-label font-medium transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover"
          : "border-border-strong bg-surface text-muted hover:border-primary hover:text-primary active:bg-surface-muted",
      )}
    >
      {children}
      {count !== undefined ? (
        <span className={cn("text-caption tabular-nums", active ? "opacity-80" : "text-subtle")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The archive's front door: search across every word of every story, plus
 * filters for category, community and how a claim should be read.
 *
 * Filtering is deliberately additive within a facet (Lepcha OR Bhutia) and
 * restrictive across facets (Lepcha AND Festivals), which is what people
 * expect from faceted search even when they cannot articulate it.
 */
export function StoriesExplorer({
  stories,
  categories,
  communities,
  claimTypes,
}: StoriesExplorerProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Debounce so a 70-story full-text scan does not run on every keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery), 200);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const facetFiltered = useMemo(
    () =>
      stories.filter((story) => {
        if (filters.categories.size > 0 && !filters.categories.has(story.category)) return false;
        if (
          filters.communities.size > 0 &&
          !story.communities.some((community) => filters.communities.has(community))
        )
          return false;
        if (filters.claims.size > 0 && !filters.claims.has(story.claimType)) return false;
        return true;
      }),
    [stories, filters],
  );

  const results = useMemo(() => searchStories(query, facetFiltered), [query, facetFiltered]);

  /* Counts shown on chips reflect the whole archive, not the current result
     set — a chip that reads "0" because of another filter is just confusing. */
  const categoryCounts = useMemo(() => {
    const counts = new Map<StoryCategory, number>();
    for (const story of stories) counts.set(story.category, (counts.get(story.category) ?? 0) + 1);
    return counts;
  }, [stories]);

  const communityCounts = useMemo(() => {
    const counts = new Map<Community, number>();
    for (const story of stories)
      for (const community of story.communities)
        counts.set(community, (counts.get(community) ?? 0) + 1);
    return counts;
  }, [stories]);

  const activeCount =
    filters.categories.size + filters.communities.size + filters.claims.size + (query ? 1 : 0);

  const clearAll = () => {
    setRawQuery("");
    setQuery("");
    setFilters(EMPTY);
  };

  const filterPanel = (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
          Category
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <FilterChip
              key={category}
              active={filters.categories.has(category)}
              count={categoryCounts.get(category)}
              onToggle={() =>
                setFilters((current) => ({
                  ...current,
                  categories: toggle(current.categories, category),
                }))
              }
            >
              {category}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
          Community
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {communities.map((community) => (
            <FilterChip
              key={community}
              active={filters.communities.has(community)}
              count={communityCounts.get(community)}
              onToggle={() =>
                setFilters((current) => ({
                  ...current,
                  communities: toggle(current.communities, community),
                }))
              }
            >
              {community}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
          How to read it
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {claimTypes.map((claim) => (
            <FilterChip
              key={claim}
              active={filters.claims.has(claim)}
              onToggle={() =>
                setFilters((current) => ({ ...current, claims: toggle(current.claims, claim) }))
              }
            >
              {CLAIM_LABEL[claim]}
            </FilterChip>
          ))}
        </div>
        <p className="mt-3 text-caption leading-relaxed text-subtle">
          Every story says whether it is a historical record, a community&apos;s oral
          tradition, a legend or a travel account.
        </p>
      </fieldset>

      {activeCount > 0 ? (
        <Button variant="outline" size="sm" onClick={clearAll} className="self-start">
          <X className="size-4" aria-hidden />
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder="Search stories — Losar, Lepcha, momo, Khangchendzonga…"
            aria-label="Search stories"
            className="h-12 w-full rounded-full border border-border-strong bg-surface pr-4 pl-11 text-small placeholder:text-subtle focus-visible:border-primary"
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
      </div>

      <div className="mt-8 flex gap-8">
        <aside className="hidden w-72 shrink-0 lg:block" aria-label="Filter stories">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border bg-surface p-5">
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="text-small text-muted" aria-live="polite">
            {results.length === 0
              ? "No stories match"
              : `${results.length} of ${stories.length} stories`}
            {query ? ` matching “${query}”` : ""}
          </p>

          {results.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
              <p className="font-display text-h3">Nothing in the archive matches that</p>
              <p className="mx-auto mt-2 max-w-md text-body text-muted">
                Try a place, a community or a festival — Yuksom, Limbu, Bhumchu — or clear
                the filters and browse.
              </p>
              <Button variant="outline" onClick={clearAll} className="mt-5">
                Clear search and filters
              </Button>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((story, index) => (
                <StoryCard key={story.slug} story={story} priority={index < 3} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-100 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filter stories"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-secondary/60 backdrop-blur-sm"
            tabIndex={-1}
          />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 flex w-[min(22rem,92vw)] flex-col bg-surface">
            <div className="flex items-center justify-between border-b p-5">
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
            <div className="flex-1 overflow-y-auto p-5">{filterPanel}</div>
            <div className="border-t p-5">
              <Button onClick={() => setDrawerOpen(false)} className="w-full">
                Show {results.length} {results.length === 1 ? "story" : "stories"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
