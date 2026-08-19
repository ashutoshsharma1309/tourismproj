"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { openSearch } from "@/components/search/CommandPalette";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS, SITE } from "@/lib/constants";

/**
 * Global navigation. Transparent while it overlays the hero, condensing into
 * architectural glass once the page scrolls.
 */
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  /* The drawer remembers the path it opened on, so navigation closes it by
     derivation — no synchronising effect needed. */
  const [overlay, setOverlay] = useState({ path: pathname, menu: false });
  const menuOpen = overlay.menu && overlay.path === pathname;
  const setMenuOpen = (menu: boolean) => setOverlay({ path: pathname, menu });

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



  /* Transparent only while overlaying the homepage hero; everywhere else the
     bar sits on glass so ivory text never lands on an ivory page. */
  const onGlass = scrolled || pathname !== "/";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-90 text-foreground-inverse transition-[background-color,border-color,backdrop-filter] duration-300",
        onGlass ? "header-solid" : "border-b border-transparent",
      )}
    >
      {/* Only when the bar has no background of its own. */}
      {!onGlass ? (
        <div aria-hidden className="header-scrim pointer-events-none absolute inset-x-0 top-0 h-24" />
      ) : null}

      <div className="relative mx-auto flex h-16 max-w-[84rem] items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="text-glow" aria-label={`${SITE.name} — home`}>
          <Logo />
        </Link>

        {/* Ten links need ~1080px; below xl they live in the drawer. */}
        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-3.5 xl:gap-5">
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
                        : "text-muted-inverse hover:text-foreground-inverse",
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
            className="flex h-9 items-center gap-2 rounded-full border border-foreground-inverse/25 bg-header px-3.5 text-label whitespace-nowrap text-muted-inverse transition-colors hover:border-foreground-inverse/60 hover:text-foreground-inverse"
          >
            <Search className="size-3.5" aria-hidden />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden rounded border border-foreground-inverse/25 px-1.5 py-0.5 font-mono text-[10px] md:inline">
              ⌘K
            </kbd>
          </button>

          {/* Role switcher — mock personas until real auth lands. */}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex size-10 items-center justify-center rounded-full text-foreground-inverse/85 transition-colors hover:bg-foreground-inverse/10 xl:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-100 xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
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
          </div>
        </div>
      ) : null}
    </header>
  );
}
