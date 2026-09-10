"use client";

import { AlertTriangle, Building2, Compass, Phone, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { LICENCE_BADGE, type LicenceState } from "@/lib/licence";
import type { OperatorIndex, OperatorKind, OperatorRecord } from "@/lib/operator-index";

/**
 * The state's licensed tourism establishments, made searchable.
 *
 * The department publishes both registers already. It publishes them as
 * paginated tables inside an Angular bundle — 75 pages for the agencies alone —
 * with no search, no district filter and no API. This component is the same
 * data with the three controls that make it usable by the person whose trip or
 * livelihood depends on it.
 *
 * WHY IT FETCHES INSTEAD OF TAKING A PROP
 * ---------------------------------------
 * 2,763 records. See `/api/operators` and `lib/operator-index.ts`. The page
 * renders its summary and its caveats on the server, so the part that matters
 * is readable before this component has loaded anything, and the fetch failing
 * degrades to a stated error rather than a blank page.
 */

const KIND_LABEL: Record<OperatorKind, string> = {
  hotel: "Hotel",
  agency: "Travel agency",
};

const LICENCE_TONE: Record<LicenceState, "success" | "warning" | "neutral"> = {
  current: "success",
  lapsed: "warning",
  undated: "neutral",
};

type KindFilter = OperatorKind | "all";
type LicenceFilter = LicenceState | "all";

/** How many rows render at once. The registers are far too long to paint whole. */
const PAGE = 60;

interface OperatorDirectoryProps {
  /** Rendered before the index arrives, so the page is never empty. */
  totals: { hotels: number; agencies: number; all: number };
}

export function OperatorDirectory({ totals }: OperatorDirectoryProps) {
  const [index, setIndex] = useState<OperatorIndex | null>(null);
  const [failed, setFailed] = useState(false);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [district, setDistrict] = useState<string>("all");
  const [licence, setLicence] = useState<LicenceFilter>("all");
  const [shown, setShown] = useState(PAGE);

  /* Deferred rather than debounced: filtering 2,763 rows is fast, but typing
     into it on a mid-range phone still drops frames if every keystroke blocks
     paint. This keeps the input responsive and lets the list lag by a tick. */
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/operators")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: OperatorIndex) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Any filter change puts you back at the top of a fresh result set. Keeping
     the old count would silently show 300 rows of something you just filtered
     to 12.

     Adjusted during render rather than in an effect: an effect would paint the
     long list once and then immediately repaint it short, which is both a
     visible flash and the cascading render the lint rule is there to catch. */
  const filterKey = `${deferredQuery}|${kind}|${district}|${licence}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setShown(PAGE);
  }

  const results = useMemo(() => {
    if (!index) return [];
    const q = deferredQuery.trim().toLowerCase();

    return index.operators.filter((o) => {
      if (kind !== "all" && o.kind !== kind) return false;
      if (district !== "all" && o.district !== district) return false;
      if (licence !== "all" && o.licence !== licence) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.district.toLowerCase().includes(q) ||
        (o.registrationNo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [index, deferredQuery, kind, district, licence]);

  const active = kind !== "all" || district !== "all" || licence !== "all" || query.trim() !== "";

  if (failed) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong p-6">
        <p className="flex items-center gap-2 text-small font-medium text-foreground">
          <AlertTriangle className="size-4 text-warning" aria-hidden />
          The register could not be loaded.
        </p>
        <p className="mt-2 text-small leading-relaxed text-muted">
          The directory is served as a static file from this site, so this is
          most likely a connection problem rather than an outage. The registers
          themselves remain published by the department — both are linked above.
        </p>
      </div>
    );
  }

  if (!index) {
    return (
      <div aria-busy="true" aria-live="polite">
        <p className="text-small text-muted">
          Loading {totals.all.toLocaleString()} registered establishments…
        </p>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, district or registration number"
            aria-label="Search the registers"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pr-4 pl-9 text-small text-foreground placeholder:text-subtle focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="Type"
            value={kind}
            onChange={(v) => setKind(v as KindFilter)}
            options={[
              { value: "all", label: `All ${totals.all.toLocaleString()}` },
              { value: "hotel", label: `Hotels ${totals.hotels.toLocaleString()}` },
              { value: "agency", label: `Agencies ${totals.agencies.toLocaleString()}` },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="District"
            value={district}
            onChange={setDistrict}
            options={[
              { value: "all", label: "All districts" },
              ...index.districts.map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="Registration"
            value={licence}
            onChange={(v) => setLicence(v as LicenceFilter)}
            options={[
              { value: "all", label: "Any" },
              { value: "current", label: LICENCE_BADGE.current },
              { value: "lapsed", label: LICENCE_BADGE.lapsed },
              { value: "undated", label: LICENCE_BADGE.undated },
            ]}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-small text-muted" role="status" aria-live="polite">
          {results.length.toLocaleString()}{" "}
          {results.length === 1 ? "establishment" : "establishments"}
          {active ? " match" : " on the registers"}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setKind("all");
              setDistrict("all");
              setLicence("all");
            }}
            className="inline-flex items-center gap-1 text-small text-primary hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border-strong p-6">
          <p className="text-small font-medium text-foreground">
            Nothing on either register matches that.
          </p>
          <p className="mt-2 text-small leading-relaxed text-muted">
            These are the department&apos;s registers as read on{" "}
            {index.assessedOn}, not a search of every business in Sikkim. An
            establishment that is not registered will not appear here, and that
            absence is not evidence about the business either way.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {results.slice(0, shown).map((o) => (
              <OperatorRow key={`${o.kind}-${o.slug}`} operator={o} />
            ))}
          </ul>

          {shown < results.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-4 w-full rounded-full border border-border-strong bg-surface px-5 py-3 text-small font-medium text-foreground hover:bg-surface-muted"
            >
              Show {Math.min(PAGE, results.length - shown)} more
              <span className="text-muted">
                {" "}
                · {(results.length - shown).toLocaleString()} remaining
              </span>
            </button>
          )}
        </>
      )}

      <p className="mt-6 rounded-xl border border-dashed border-border-strong p-4 text-caption leading-relaxed text-muted">
        {index.licenceCaveat}
      </p>
    </div>
  );
}

function OperatorRow({ operator }: { operator: OperatorRecord }) {
  const Icon = operator.kind === "hotel" ? Building2 : Compass;

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-small font-semibold text-foreground">
            <Icon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="break-words">{operator.name}</span>
          </p>
          <p className="mt-1 text-caption text-muted">
            {KIND_LABEL[operator.kind]} · {operator.district}
            {operator.registrationNo && (
              <>
                {" "}
                · <span className="font-mono">{operator.registrationNo}</span>
              </>
            )}
          </p>
          {operator.contact && (
            <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
              <Phone className="size-3 shrink-0" aria-hidden />
              <span className="font-mono break-all">{operator.contact}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {/* An absent grade renders as nothing at all. It must never look
              like a low one — the register simply records none for 2,671 of
              these 2,763 entries. */}
          {operator.grade && <Badge tone="marigold-soft">{operator.grade}</Badge>}
          <Badge tone={LICENCE_TONE[operator.licence]}>
            {LICENCE_BADGE[operator.licence]}
          </Badge>
          {operator.validUpto && (
            <span className="font-mono text-caption text-subtle">
              {operator.validUpto}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

interface FilterGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterGroup({ label, value, onChange, options }: FilterGroupProps) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      <span className="font-mono text-caption tracking-wide text-subtle uppercase">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full border px-3 py-1 text-caption font-medium transition-colors",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong bg-surface text-muted hover:bg-surface-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
