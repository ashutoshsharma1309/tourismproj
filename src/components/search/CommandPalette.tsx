"use client";

import {
  BedDouble,
  BookOpen,
  Compass,
  Image as ImageIcon,
  Landmark,
  Mountain,
  ScrollText,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { itemsInScope, ownerNameOf, ownerOf } from "@/lib/search-index";
import type { SearchGroup, SearchIcon, SearchIndex, SearchItem } from "@/lib/search-index";

/**
 * Global ⌘K search over everything the platform knows: monasteries, stays,
 * festivals and destinations within the app.
 *
 * The index arrives as a prop, built on the server by
 * `buildSearchIndex()` (src/lib/search-index.ts). This component deliberately
 * imports no data module: when it did, the whole story and archive corpus was
 * pulled into the client bundle of every route in the application, because the
 * palette is mounted once in the root layout.
 *
 * `openSearch()` may be called from anywhere (navbar, hero) — the palette
 * itself is mounted once in the root layout.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function openSearch() {
  for (const listener of listeners) listener();
}

const ICONS: Record<SearchIcon, LucideIcon> = {
  landmark: Landmark,
  book: BookOpen,
  scroll: ScrollText,
  image: ImageIcon,
  mountain: Mountain,
  bed: BedDouble,
  compass: Compass,
};

const GROUP_ORDER: SearchGroup[] = [
  "Monasteries",
  "Stories",
  "History",
  "Archive",
  "Places",
  "Stays",
  "Go to",
];

export function CommandPalette({ seed }: { seed: SearchIndex }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
   * PHASE 15 — the corpus is fetched, not inlined.
   *
   * The layout serialised the whole index into every document: 301 KB of
   * script per page for a feature most visits never open. Now the layout
   * inlines only the navigation entries (`seed`) and the rest arrives from
   * `/api/search-index` — a statically generated, browser-cacheable payload —
   * the first time the palette is opened.
   *
   * Failure is not silent and not fatal: if the fetch fails the palette keeps
   * working over the seed and says so, which is the same rule the rest of the
   * product follows about missing data.
   */
  const [deferred, setDeferred] = useState<SearchIndex | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const index = useMemo(() => (deferred ? [...seed, ...deferred] : seed), [seed, deferred]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  /* Open via navbar button or ⌘K / Ctrl+K. */
  useEffect(() => {
    const show: Listener = () => {
      /* Remember what had focus so it can be given back on close — without
         this, dismissing the palette drops the caret to <body> and a keyboard
         visitor restarts from the top of the document. */
      restoreRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
      setQuery("");
      setActive(0);
    };
    listeners.add(show);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      listeners.delete(show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /* Fetch the corpus once, on first open.

     The "have we started" flag is a ref, not state: setting state
     synchronously inside an effect schedules a second render before paint,
     and the lint rule that catches it is right — the flag is bookkeeping,
     not something the UI renders. */
  const fetchStarted = useRef(false);
  useEffect(() => {
    if (!open || fetchStarted.current) return;
    fetchStarted.current = true;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoadState("loading");
    });
    fetch("/api/search-index")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((payload: SearchIndex) => {
        if (cancelled) return;
        setDeferred(payload);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      /* The page behind a modal must not scroll under it. */
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    restoreRef.current?.focus();
    return undefined;
  }, [open]);

  /*
   * Which destination the visitor is currently exploring — read from the URL.
   *
   * PHASE 11. This used to fall back to "sikkim" for any path outside
   * /destinations, because Sikkim's content lived at un-prefixed routes. That
   * fallback was the last place the application assumed a destination rather
   * than resolving one, and it meant a visitor on the landing page was
   * silently treated as exploring Sikkim.
   *
   * Every destination page now carries its id in the path, so the URL is the
   * only input. A page that belongs to no destination — the landing page,
   * global discovery, the reviewer tool — returns null, and search there is
   * global, which is the honest scope for a page about no particular place.
   */
  const currentDestination = useMemo(() => {
    const match = pathname?.match(/^\/destinations\/([a-z0-9-]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  /*
   * Scoped by default, global on request.
   *
   * A visitor exploring Kyoto who searches "monastery" should not be shown
   * Rumtek as though it were Kyoto's — that is the isolation this exists for.
   * They may still want it, so `global` is one keystroke away rather than
   * unavailable.
   */
  const [globalSearch, setGlobalSearch] = useState(false);

  const scopedItems = useMemo(
    () =>
      itemsInScope(
        index,
        globalSearch || !currentDestination
          ? { kind: "global" }
          : { kind: "destination", destinationId: currentDestination },
      ),
    [index, globalSearch, currentDestination],
  );

  /* Which items belong to the destination being explored — used to rank
     them first in global search rather than to exclude anything. */
  const localHrefs = useMemo(() => {
    if (!currentDestination) return null;
    return new Set(
      itemsInScope(index, { kind: "destination", destinationId: currentDestination }).map((i) => i.href),
    );
  }, [index, currentDestination]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? scopedItems.filter((item) => `${item.label} ${item.sublabel}`.toLowerCase().includes(needle))
      : scopedItems.filter((item) => item.group === "Go to");
    const grouped = GROUP_ORDER.flatMap((group) => matches.filter((m) => m.group === group));
    /*
     * In global search, results from the destination the visitor is actually
     * exploring come first. Searching "temple" from Kyoto should surface
     * Kyoto's before anywhere else's — the other destinations are still
     * there, just below. In destination scope this is a no-op, since
     * everything already belongs to that destination.
     */
    const ranked =
      globalSearch && localHrefs
        ? [...grouped].sort((a, b) => Number(localHrefs.has(b.href)) - Number(localHrefs.has(a.href)))
        : grouped;
    return ranked.slice(0, 12);
    /* `index` is not a dependency: scopedItems and localHrefs are both already
       derived from it, so listing it here would only re-run this on identity
       changes that cannot alter the result. */
  }, [scopedItems, query, globalSearch, localHrefs]);

  const go = (item: SearchItem) => {
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  const optionId = (i: number) => `${listboxId}-option-${i}`;

  return (
    <div
      className="fixed inset-0 z-120 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <button
        type="button"
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-secondary/50 backdrop-blur-sm"
        tabIndex={-1}
      />
      <div className="animate-scale-in relative w-full max-w-xl overflow-hidden rounded-xl border bg-surface shadow-overlay">
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-4 shrink-0 text-subtle" aria-hidden />
          {/*
            Declared as a combobox so a screen reader announces the highlighted
            result as the arrow keys move through them. Previously this was a
            bare <input>, so arrowing down the list announced nothing at all.
          */}
          <input
            ref={inputRef}
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={results[active] ? optionId(active) : undefined}
            aria-autocomplete="list"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                const item = results[active];
                if (item) go(item);
              }
            }}
            placeholder="Search stories, monasteries, places and stays…"
            aria-label="Search"
            className="h-14 w-full bg-transparent text-body placeholder:text-subtle focus:outline-none"
          />
          <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-subtle">esc</kbd>
          {/*
            Scope control. Destination-scoped by default so one destination's
            content cannot be mistaken for another's; global is one click away
            because a visitor may genuinely want to search everywhere.
          */}
          {currentDestination ? (
            <button
              type="button"
              onClick={() => {
                setGlobalSearch((v) => !v);
                setActive(0);
              }}
              aria-pressed={globalSearch}
              className="focus-visible:ring-primary shrink-0 rounded-full border border-border px-2.5 py-0.5 text-caption text-muted transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
            >
              {globalSearch ? "All destinations" : `In ${currentDestination}`}
            </button>
          ) : null}
        </div>

        {/*
          A listbox may only own options. This was a <ul role="listbox"> whose
          <li> children each wrapped a button carrying role="option", which
          breaks the ownership relationship the role depends on. Group headings
          are marked presentational so they do not read as results.
        */}
        <div
          id={listboxId}
          role="listbox"
          aria-label="Results"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-small text-muted">
              {loadState === "loading"
                ? "Loading the archive index…"
                : loadState === "failed"
                  ? "The archive index could not be loaded, so only navigation is searchable right now."
                  : `Nothing matches “${query}”. Try a monastery or hotel name.`}
            </p>
          ) : (
            results.map((item, i) => {
              const showHeading = i === 0 || results[i - 1]?.group !== item.group;
              const Icon = ICONS[item.icon];
              return (
                <div key={`${item.group}:${item.label}`}>
                  {showHeading ? (
                    <p
                      role="presentation"
                      className="px-3 pt-3 pb-1 font-mono text-eyebrow tracking-widest text-subtle uppercase"
                    >
                      {item.group}
                    </p>
                  ) : null}
                  <div
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    onClick={() => go(item)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      i === active ? "bg-primary-soft text-primary" : "text-foreground",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", i === active ? "text-primary" : "text-subtle")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-medium">{item.label}</span>
                      <span className="block truncate text-caption text-subtle">
                        {item.sublabel}
                      </span>
                    </span>
                    {/*
                      Where the result comes from, when that is not obvious.
                      In global search a Kyoto claim surfaced while reading
                      Sikkim must say Kyoto — otherwise the ranking reads as
                      ownership. The name is carried on the index group, so
                      this costs nothing per result.
                    */}
                    {(() => {
                      const owner = ownerOf(index, item);
                      if (!owner || owner === currentDestination) return null;
                      return (
                        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-caption text-subtle">
                          {ownerNameOf(index, item) ?? owner}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
