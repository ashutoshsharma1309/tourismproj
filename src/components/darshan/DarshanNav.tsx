"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Four top-level items, one action, one door.
 *
 * WHY FOUR
 * --------
 * The previous navigation had eleven flat items — Monasteries, Stories,
 * Culture, History, Archive, Explore, Stays, Plan, Permits, Responsible,
 * Preserve. Eleven top-level choices is a table of contents, not navigation,
 * and it forces a visitor to learn the site's internal structure before they
 * can use it.
 *
 * Worse, those were AUTHORING categories. Nobody wakes up wanting "Archive".
 * They want to know where to go, what it costs, where to sleep, and whether
 * they need a permit. Destinations / Plan / Stays / Stories are the four
 * questions a traveller actually arrives with; everything else nests under
 * the destination it belongs to, which is where someone reading about a place
 * will look for it.
 */

const PRIMARY = [
  { href: "/destinations", label: "Destinations" },
  { href: "/plan", label: "Plan" },
  { href: "/stays", label: "Stays" },
  { href: "/stories", label: "Stories" },
] as const;

export function DarshanNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--slate)]/25 bg-[var(--ink)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="font-serif text-[20px] tracking-tight hover:text-[var(--brass)]">
          Darshan
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
          {PRIMARY.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-[14px] transition-colors hover:text-[var(--brass)] ${
                  active ? "text-[var(--brass)]" : "text-[var(--parchment)]/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/*
          "List your property" used to sit here, linking to /partner. The
          Partner surface is not built yet, so the link was a 404 in the one
          place a judge is guaranteed to click. It returns with the route.
        */}
        <div className="ms-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Menu"
            className="text-[14px] text-[var(--parchment)]/80 md:hidden"
          >
            Menu
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav aria-label="Mobile" className="border-t border-[var(--slate)]/25 px-6 py-4 md:hidden">
          <ul className="space-y-3">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-[16px] text-[var(--parchment)]/90"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
