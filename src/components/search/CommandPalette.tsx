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
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { archiveItems } from "@/data/archive";
import { historyTimeline } from "@/data/history";
import { hotels } from "@/data/hotels";
import { monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { stories } from "@/data/stories";

/**
 * Global ⌘K search over everything the platform knows: monasteries, stays,
 * festivals and destinations within the app. Pure client-side filtering over
 * the local catalogue — instant, keyboard-first.
 *
 * `openSearch()` may be called from anywhere (navbar, hero) — the palette
 * itself is mounted once in the root layout.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function openSearch() {
  for (const listener of listeners) listener();
}

interface SearchItem {
  label: string;
  sublabel: string;
  href: string;
  group: "Monasteries" | "Stories" | "History" | "Archive" | "Places" | "Stays" | "Go to";
  icon: LucideIcon;
}

function buildIndex(): SearchItem[] {
  const items: SearchItem[] = [];
  for (const monastery of monasteries) {
    items.push({
      label: monastery.name,
      sublabel: `${monastery.tradition} · ${monastery.district} · est. ${monastery.establishedYear}`,
      href: `/monasteries/${monastery.slug}`,
      group: "Monasteries",
      icon: Landmark,
    });
  }
  /* Stories were missing from this index, which is why searching a story
     title used to surface a monastery instead — the single most confusing
     thing about the old search. */
  for (const story of stories) {
    items.push({
      label: story.title,
      sublabel: `${story.category} · ${story.communities.join(", ")}`,
      href: `/stories/${story.slug}`,
      group: "Stories",
      icon: BookOpen,
    });
  }
  for (const event of historyTimeline) {
    items.push({
      label: event.title,
      sublabel: `${event.yearLabel} · ${event.era}`,
      href: `/history/${event.slug}`,
      group: "History",
      icon: ScrollText,
    });
  }
  for (const item of archiveItems) {
    items.push({
      label: item.title,
      sublabel: [item.category, item.community, item.location].filter(Boolean).join(" · "),
      href: `/archive/${item.id}`,
      group: "Archive",
      icon: ImageIcon,
    });
  }
  for (const place of places) {
    items.push({
      label: place.name,
      sublabel: `${place.category} · ${place.district} district`,
      href: `/explore?place=${place.slug}`,
      group: "Places",
      icon: Mountain,
    });
  }
  for (const hotel of hotels) {
    items.push({
      label: hotel.name,
      sublabel: `${hotel.district} district · registered stay`,
      href: hotel.googleMapsUrl,
      group: "Stays",
      icon: BedDouble,
    });
  }
  items.push(
    { label: "Explore monasteries", sublabel: "Search, filter, map", href: "/monasteries", group: "Go to", icon: Compass },
    { label: "Stories of Sikkim", sublabel: "The cultural archive, searchable", href: "/stories", group: "Go to", icon: BookOpen },
    { label: "The Story of Sikkim", sublabel: "The interactive historical timeline", href: "/history", group: "Go to", icon: ScrollText },
    { label: "Digital Heritage Archive", sublabel: "Search the catalogued collection", href: "/archive", group: "Go to", icon: ImageIcon },
    { label: "Contribute to the archive", sublabel: "Submit a photograph, document or practice", href: "/archive/contribute", group: "Go to", icon: Compass },
    { label: "Explore Sikkim", sublabel: "Every sourced coordinate on one map", href: "/explore", group: "Go to", icon: Compass },
    { label: "Book a stay", sublabel: "Directory of registered properties", href: "/hotels", group: "Go to", icon: Compass },
    { label: "Plan a heritage journey", sublabel: "Day-by-day itinerary", href: "/planner", group: "Go to", icon: Compass },
  );
  return items;
}

const GROUP_ORDER: SearchItem["group"][] = [
  "Monasteries",
  "Stories",
  "History",
  "Archive",
  "Places",
  "Stays",
  "Go to",
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(), []);

  /* Open via navbar button or ⌘K / Ctrl+K. */
  useEffect(() => {
    const show: Listener = () => {
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
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? index.filter((item) =>
          `${item.label} ${item.sublabel}`.toLowerCase().includes(needle),
        )
      : index.filter((item) => item.group === "Go to");
    return GROUP_ORDER.flatMap((group) => matches.filter((m) => m.group === group)).slice(0, 12);
  }, [index, query]);

  const go = (item: SearchItem) => {
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-120 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-secondary/50 backdrop-blur-sm"
        tabIndex={-1}
      />
      <div className="animate-scale-in relative w-full max-w-xl overflow-hidden rounded-xl border bg-surface shadow-overlay">
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-4 shrink-0 text-subtle" aria-hidden />
          <input
            ref={inputRef}
            value={query}
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

        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-small text-muted">
              Nothing matches “{query}”. Try a monastery or hotel name.
            </li>
          ) : (
            results.map((item, i) => {
              const showHeading = i === 0 || results[i - 1]?.group !== item.group;
              return (
                <li key={`${item.group}:${item.label}`}>
                  {showHeading ? (
                    <p className="px-3 pt-3 pb-1 font-mono text-eyebrow tracking-widest text-subtle uppercase">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onClick={() => go(item)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      i === active ? "bg-primary-soft text-primary" : "text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn("size-4 shrink-0", i === active ? "text-primary" : "text-subtle")}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-small font-medium">{item.label}</span>
                      <span className="block truncate text-caption text-subtle">
                        {item.sublabel}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
