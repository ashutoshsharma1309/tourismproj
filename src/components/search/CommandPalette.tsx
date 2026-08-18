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
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { SearchGroup, SearchIcon, SearchItem } from "@/lib/search-index";

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

export function CommandPalette({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? items.filter((item) => `${item.label} ${item.sublabel}`.toLowerCase().includes(needle))
      : items.filter((item) => item.group === "Go to");
    return GROUP_ORDER.flatMap((group) => matches.filter((m) => m.group === group)).slice(0, 12);
  }, [items, query]);

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
              Nothing matches “{query}”. Try a monastery or hotel name.
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
                    <span className="min-w-0">
                      <span className="block truncate text-small font-medium">{item.label}</span>
                      <span className="block truncate text-caption text-subtle">
                        {item.sublabel}
                      </span>
                    </span>
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
