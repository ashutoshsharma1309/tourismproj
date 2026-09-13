"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NavLanguage } from "@/components/i18n/NavLanguage";
import { AskGuideButton } from "@/components/layout/AskGuideButton";
import { openSearch } from "@/components/search/CommandPalette";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS, SITE } from "@/lib/constants";
import type { DestinationNavMap } from "@/lib/destinations/nav";

/**
 * Global navigation. Transparent while it overlays the hero, condensing into
 * architectural glass once the page scrolls.
 *
 * THE HEADER IS THE SAME ON EVERY PAGE.
 * Phase 20 taught it to append the current destination's sections, which
 * fixed a header that offered Sikkim's routes on Paris — and produced a
 * ten-link bar on every destination page, where a first-time visitor could
 * not tell the product's links from the page's. The sections now belong to
 * the destination hub, which is the page that has them, and this bar carries
 * the four product links plus search, the guide and the language switcher.
 *
 * `destinationSections` is still accepted so the layout that builds it does
 * not have to change in the same commit; nothing here reads it any more.
 */
export function Navbar(_props: { destinationSections?: DestinationNavMap }) {
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

  /*
   * ONE ACTIVE LINK. "Explore" owns /destinations and everything under it,
   * and "Compare" owns /destinations/compare — a plain prefix test lit both
   * on the comparison page. The longest matching prefix wins.
   */
  const activeHref = NAV_LINKS.filter(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

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
        <Link href="/" className="text-glow shrink-0" aria-label={`${SITE.name} — home`}>
          <Logo />
        </Link>

        {/* Four links fit from `lg`; below that they live in the drawer. */}
        <nav aria-label="Primary" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center gap-5 xl:gap-6">
            {NAV_LINKS.map((link) => {
              const active = link.href === activeHref;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={link.prefetch}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center whitespace-nowrap text-small font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
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

        <div className="flex shrink-0 items-center gap-2">
          {/*
            The guide, named in the header. Its floating launcher is a
            compass in the bottom-right corner, which a newcomer reads as
            decoration; here it says what it is. The control asks the mounted
            guide to open — see `lib/guide-events.ts`.
          */}
          <AskGuideButton className="hidden h-9 rounded-full border border-foreground-inverse/25 bg-header px-3.5 text-label whitespace-nowrap text-muted-inverse hover:border-foreground-inverse/60 hover:text-foreground-inverse lg:inline-flex" />

          <button
            type="button"
            onClick={openSearch}
            aria-label="Search (Command K)"
            className="flex h-9 items-center gap-2 rounded-full border border-foreground-inverse/25 bg-header px-3.5 text-label whitespace-nowrap text-muted-inverse transition-colors hover:border-foreground-inverse/60 hover:text-foreground-inverse focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Search className="size-3.5" aria-hidden />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden rounded border border-foreground-inverse/25 px-1.5 py-0.5 font-mono text-[10px] md:inline">
              ⌘K
            </kbd>
          </button>

          {/*
            The language selector, on desktop. It renders itself only where a
            translated page exists to send them to.
          */}
          <NavLanguage className="hidden sm:block" />

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex size-11 items-center justify-center rounded-full text-foreground-inverse/85 transition-colors hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none lg:hidden"
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
                className="flex size-11 items-center justify-center rounded-full text-foreground-inverse/85 hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
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
                      prefetch={link.prefetch}
                      onClick={() => setMenuOpen(false)}
                      aria-current={link.href === activeHref ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-body font-medium transition-colors hover:bg-foreground-inverse/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                        link.href === activeHref ? "text-accent-soft" : "text-foreground-inverse/85",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Closes the drawer first: the guide panel opens in the corner
                the drawer is covering. A capture-phase handler on a wrapper
                was tried and the guide never opened — the drawer unmounted
                under the click before the button's own handler ran. */}
            <div className="mt-2">
              <AskGuideButton
                onBeforeOpen={() => setMenuOpen(false)}
                className="w-full rounded-lg px-3 py-3 text-body font-medium text-foreground-inverse/85 hover:bg-foreground-inverse/10"
              />
            </div>

            {/*
              And on mobile, inside the drawer — where §31 requires it stay
              reachable rather than being a desktop-only affordance. The
              drawer is dark, so the selector gets its own light surface.
            */}
            <div className="mt-6 border-t border-foreground-inverse/15 pt-6">
              <p className="text-caption text-foreground-inverse/50">Language</p>
              {/*
                Inverse text, because this drawer is dark. `text-foreground`
                here rendered the current language's name in near-black on a
                near-black panel: the control looked like an empty pill with a
                globe in it, which is how it was caught on a 390px screenshot.
                The open list keeps its own light surface, so only the summary
                needs inverting.
              */}
              <NavLanguage className="mt-3 [&>summary]:border-foreground-inverse/25 [&>summary]:text-foreground-inverse" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
