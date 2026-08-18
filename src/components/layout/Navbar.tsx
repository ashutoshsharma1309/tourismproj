"use client";

import { ChevronDown, Menu, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { openSearch } from "@/components/search/CommandPalette";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS, SITE } from "@/lib/constants";

/**
 * The two views that actually exist: the public catalogue, and the curator's
 * review queue where discovered candidates wait for approval. The former
 * hotel-owner and monastery-admin dashboards were removed with the fabricated
 * data they displayed.
 */
const ROLES = [
  { href: "/", label: "Visitor" },
  { href: "/preservation/review", label: "Curator" },
] as const;

/**
 * Global navigation. Transparent while it overlays the hero, condensing into
 * architectural glass once the page scrolls. The role switcher stands in for
 * auth until Phase 3 — it routes to each persona's surface.
 */
export function Navbar() {
  const pathname = usePathname();
  const roleRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  /* Overlays remember the path they opened on, so navigation closes them
     by derivation — no synchronising effect needed. */
  const [overlays, setOverlays] = useState({ path: pathname, menu: false, role: false });
  const menuOpen = overlays.menu && overlays.path === pathname;
  const roleOpen = overlays.role && overlays.path === pathname;
  const setMenuOpen = (menu: boolean) => setOverlays({ path: pathname, menu, role: false });
  const setRoleOpen = (role: boolean) => setOverlays({ path: pathname, menu: false, role });

  /* Condense onto glass after the first few pixels of scroll. */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close the role menu on outside click. */
  useEffect(() => {
    if (!roleOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!roleRef.current?.contains(e.target as Node))
        setOverlays((current) => ({ ...current, role: false }));
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [roleOpen]);

  const activeRole =
    ROLES.find((role) => role.href !== "/" && pathname.startsWith(role.href)) ?? ROLES[0];

  /* Transparent only while overlaying the homepage hero; everywhere else the
     bar sits on glass so ivory text never lands on an ivory page. */
  const onGlass = scrolled || pathname !== "/";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-90 text-foreground-inverse transition-[background-color,border-color,backdrop-filter] duration-300",
        onGlass ? "glass-dark border-x-0 border-t-0 border-b" : "border-b border-transparent",
      )}
    >
      {/* Only when the bar has no background of its own. */}
      {!onGlass ? (
        <div aria-hidden className="header-scrim pointer-events-none absolute inset-x-0 top-0 h-24" />
      ) : null}

      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="text-glow" aria-label={`${SITE.name} — home`}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-4 xl:gap-6">
            {NAV_LINKS.map((link) => {
              const base = link.href.split("#")[0] || "/";
              const active = base !== "/" && pathname.startsWith(base);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap text-small font-medium transition-colors",
                      active
                        /* Was text-accent (#c08a2d), which measures 2.32:1
                           against the glass navbar — axe flagged it as a
                           serious contrast failure on 8 of 10 audited routes.
                           accent-soft is the same gilt hue at 5.91:1. */
                        ? "text-accent-soft"
                        : "text-foreground-inverse/80 hover:text-foreground-inverse",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search (Command K)"
            className="flex h-9 items-center gap-2 rounded-full border border-foreground-inverse/25 px-3.5 text-label whitespace-nowrap text-foreground-inverse/80 transition-colors hover:border-foreground-inverse/60 hover:text-foreground-inverse"
          >
            <Search className="size-3.5" aria-hidden />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden rounded border border-foreground-inverse/25 px-1.5 py-0.5 font-mono text-[10px] md:inline">
              ⌘K
            </kbd>
          </button>

          {/* Role switcher — mock personas until real auth lands. */}
          <div ref={roleRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setRoleOpen(!roleOpen)}
              aria-expanded={roleOpen}
              aria-haspopup="menu"
              className="flex h-9 items-center gap-2 rounded-full border border-foreground-inverse/25 px-3.5 text-label whitespace-nowrap text-foreground-inverse/80 transition-colors hover:border-foreground-inverse/60 hover:text-foreground-inverse"
            >
              <UserRound className="size-3.5" aria-hidden />
              <span className="hidden xl:inline">View as:</span> {activeRole.label}
              <ChevronDown
                className={cn("size-3.5 transition-transform", roleOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            {roleOpen ? (
              <div
                role="menu"
                className="animate-scale-in absolute right-0 mt-2 w-52 rounded-lg border border-border-inverse bg-surface-inverse p-1.5 shadow-overlay"
              >
                {ROLES.map((role) => (
                  <Link
                    key={role.label}
                    role="menuitem"
                    href={role.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-small transition-colors",
                      role.label === activeRole.label
                        ? "bg-foreground-inverse/10 text-accent-soft"
                        : "text-foreground-inverse/80 hover:bg-foreground-inverse/10 hover:text-foreground-inverse",
                    )}
                  >
                    {role.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex size-10 items-center justify-center rounded-full text-foreground-inverse/85 transition-colors hover:bg-foreground-inverse/10 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-100 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-secondary/60 backdrop-blur-sm"
            tabIndex={-1}
          />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 flex w-72 flex-col overflow-y-auto bg-surface-inverse p-6">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex size-10 items-center justify-center rounded-full text-foreground-inverse/85 hover:bg-foreground-inverse/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-caption text-foreground-inverse/50">{SITE.tagline}</p>
            <nav aria-label="Mobile" className="mt-6">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-3 text-body font-medium text-foreground-inverse/85 transition-colors hover:bg-foreground-inverse/10"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-8 font-mono text-eyebrow tracking-widest text-foreground-inverse/50 uppercase">
              View as
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {ROLES.map((role) => (
                <li key={role.label}>
                  <Link
                    href={role.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-small text-foreground-inverse/75 transition-colors hover:bg-foreground-inverse/10"
                  >
                    {role.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </header>
  );
}
