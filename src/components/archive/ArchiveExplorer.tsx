"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ArchiveCard } from "@/components/archive/ArchiveCard";
import { VERIFICATION_LABEL } from "@/data/history";
import type { VerificationStatus } from "@/data/history";
import type { ArchiveCategory, ArchiveItem, PeriodBucket } from "@/data/archive";
import { cn } from "@/lib/cn";
import type { SikkimDistrict } from "@/types";

/**
 * Search and filtering over the archive.
 *
 * Everything runs client-side over a pre-built lowercase haystack, so typing
 * is instant and there is no request per keystroke. Only `PAGE` cards are
 * mounted at a time and their images are lazy — an archive that grows to a few
 * hundred objects must not fire a few hundred image requests on first paint.
 */

const PAGE = 12;

export interface ArchiveFacets {
  categories: ArchiveCategory[];
  communities: string[];
  districts: SikkimDistrict[];
  periods: PeriodBucket[];
  verifications: VerificationStatus[];
}

interface Filters {
  category: ArchiveCategory | null;
  community: string | null;
  district: SikkimDistrict | null;
  period: PeriodBucket | null;
  verification: VerificationStatus | null;
}

const EMPTY: Filters = {
  category: null,
  community: null,
  district: null,
  period: null,
  verification: null,
};

/** Example queries, chosen because each one actually returns something. */
const SUGGESTIONS = ["Rumtek", "Lepcha", "Pang Lhabsol", "Limbu", "cardamom", "Yuksom"];

export function ArchiveExplorer({
  items,
  facets,
}: {
  items: ArchiveItem[];
  facets: ArchiveFacets;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [visible, setVisible] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.community && !item.communities.includes(filters.community)) return false;
      if (filters.district && item.district !== filters.district) return false;
      if (filters.period && item.periodBucket !== filters.period) return false;
      if (filters.verification && item.verification !== filters.verification) return false;
      if (needle && !item.searchText.includes(needle)) return false;
      return true;
    });
  }, [items, query, filters]);

  /* Any change to the query or the filters returns to the first page. */
  const update = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setVisible(PAGE);
  };
  const onQuery = (value: string) => {
    setQuery(value);
    setVisible(PAGE);
  };
  const reset = () => {
    setFilters(EMPTY);
    setQuery("");
    setVisible(PAGE);
  };

  const shown = results.slice(0, visible);

  return (
    <div>
      {/* --------------------------------------------------------- controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search the archive — a monastery, a community, a festival, a dish…"
              aria-label="Search the archive"
              className="h-12 w-full rounded-full border bg-surface pr-4 pl-11 text-small placeholder:text-subtle focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            aria-controls="archive-filters"
            className={cn(
              "flex h-12 shrink-0 items-center gap-2 rounded-full border px-5 text-small font-medium transition-colors",
              showFilters || activeCount > 0
                ? "border-primary bg-primary-soft text-primary"
                : "bg-surface hover:border-border-strong",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {activeCount > 0 ? (
              <span
                data-numeric
                className="flex size-5 items-center justify-center rounded-full bg-primary text-caption text-primary-foreground"
              >
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* Suggestions, shown only on an untouched search. */}
        {!query && activeCount === 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-subtle">Try:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onQuery(suggestion)}
                className="rounded-full border bg-surface px-3 py-1 text-caption text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {/* ------------------------------------------------------- filters */}
        {showFilters ? (
          <div id="archive-filters" className="animate-slide-up rounded-xl border bg-surface p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FilterGroup
                label="Category"
                options={facets.categories}
                value={filters.category}
                onChange={(value) => update({ category: value })}
              />
              <FilterGroup
                label="Community"
                options={facets.communities}
                value={filters.community}
                onChange={(value) => update({ community: value })}
              />
              <FilterGroup
                label="District"
                options={facets.districts}
                value={filters.district}
                onChange={(value) => update({ district: value })}
              />
              <FilterGroup
                label="Period"
                options={facets.periods}
                value={filters.period}
                onChange={(value) => update({ period: value })}
              />
              <FilterGroup
                label="Verification"
                options={facets.verifications}
                value={filters.verification}
                labelFor={(status) => VERIFICATION_LABEL[status]}
                onChange={(value) => update({ verification: value })}
              />
              <div className="flex flex-col justify-end">
                <p className="text-caption leading-relaxed text-subtle">
                  Every object in this archive is a still image. Audio and video
                  filters appear when there is audio and video to filter.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------- result summary */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <p aria-live="polite" className="text-small text-muted">
          <strong data-numeric className="text-foreground">
            {results.length}
          </strong>{" "}
          {results.length === 1 ? "object" : "objects"}
          {query ? (
            <>
              {" "}
              matching <span className="text-foreground">&ldquo;{query}&rdquo;</span>
            </>
          ) : null}
        </p>
        {query || activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            Clear all
          </button>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ grid */}
      {results.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <p className="font-display text-h3">Nothing in the archive matches that</p>
          <p className="mx-auto mt-2 max-w-md text-body text-muted">
            The archive holds {items.length} objects, and this is not one of them
            yet. That is a gap in the record, not a failed search — try a broader
            term, or contribute what you have.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex h-11 items-center rounded-full border border-border-strong px-6 text-small font-medium transition-colors hover:border-primary hover:text-primary"
          >
            Clear the search
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item, index) => (
              <ArchiveCard key={item.id} item={item} priority={index < 3} />
            ))}
          </div>
          {visible < results.length ? (
            <div className="mt-10 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setVisible((count) => count + PAGE)}
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-small font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Show more objects
              </button>
              <p data-numeric className="text-caption text-subtle">
                Showing {shown.length} of {results.length}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- filter group */

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labelFor,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  labelFor?: (option: T) => string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
        {label}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted hover:border-primary hover:text-primary",
              )}
            >
              {labelFor ? labelFor(option) : option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
