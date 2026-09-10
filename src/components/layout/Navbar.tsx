"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NavLanguage } from "@/components/i18n/NavLanguage";
import { openSearch } from "@/components/search/CommandPalette";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { destinationIdFromPath } from "@/lib/destinations/nav-path";
import type { DestinationNavMap } from "@/lib/destinations/nav";

/**
 * Global navigation. Transparent while it overlays the hero, condensing into
 * architectural glass once the page scrolls.
 *
 * PHASE 20 MADE IT KNOW WHERE THE VISITOR IS. The product links come from
 * `NAV_LINKS`; the destination links come from the destination in the URL, via
 * a map the server derived from each destination's actual content. A section
 * is never offered to a destination that does not have it, which is why the
 * links can be trusted rather than merely present.
 */
export function Navbar({ destinationSections = {} }: { destinationSections?: DestinationNavMap }) {
  const pathname = usePathname();

  /*
   * The destination whose sections belong in the bar. Null on /, /discover,
   * /destinations and /destinations/compare — none of which is a destination,
   * and all of which correctly show the product links alone.
   */
  const destinationId = destinationIdFromPath(pathname);
  const sections = destinationId ? (destinationSections[destinationId] ?? []) : [];
  /*
   * A destination's sections sit after the product links in one list with one
   * style, so a label that exists in both groups renders twice, adjacent and
   * identical: on Kyoto the bar read "… Plan Compare Experiences Stories"
   * with a global "Stories" four links earlier, and the two went to different
   * pages. Sikkim had it for both Stories and History from the beginning; it
   * became visible everywhere once the other fourteen destinations gained
   * stories of their own.
   *
   * The product link is the one that gives way. A visitor reading Kyoto who
   * clicks "Stories" means Kyoto's, and the global index is still one click
   * away under Destinations — whereas a destination's own section has no
   * other route into it from here.
   */
  const scoped = new Set(sections.map((section) => section.label));
  const links = [
    ...NAV_LINKS.filter((link) => !scoped.has(link.label)),
    ...sections.map((section) => ({ href: section.href, label: section.label, prefetch: undefined })),
  ];
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
        <Link href="/" className="text-glow shrink-0" aria-label={`${SITE.name} — home`}>
          <Logo />
        </Link>

        {/*
          Sikkim carries the longest bar; below xl every link lives in the
          drawer.

          `min-w-0 overflow-x-auto` and a `shrink-0` search cluster, because
          this row is no longer a fixed length. It used to hold thirteen
          hard-coded links; it now holds three product links plus however many
          sections the current destination has, which on Sikkim is thirteen
          more. At sixteen the row pushed the SEARCH BUTTON OUT OF THE
          VIEWPORT — `qa:global-intelligence` caught it trying to click a
          control that had been shoved off the right-hand edge. A navigation
          bar that grows with content has to be allowed to scroll rather than
          evict the controls beside it.
        */}
        <nav aria-label="Primary" className="hidden min-w-0 flex-1 overflow-x-auto xl:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex items-center gap-3.5 xl:gap-5">
            {links.map((link) => {
              const base = link.href.split("#")[0] || "/";
              const active = base !== "/" && pathname.startsWith(base);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={link.prefetch}
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

        <div className="flex shrink-0 items-center gap-2">
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

          {/*
            The language selector, on desktop. It was reachable from exactly
            one component before this — the destination hub body — which meant
            a reader on a place, story or discovery page had no way to see
            that eleven other interface languages existed. It renders itself
            only where a translated page exists to send them to.
          */}
          <NavLanguage className="hidden sm:block" />

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
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={link.prefetch}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-3 text-body font-medium text-foreground-inverse/85 transition-colors hover:bg-foreground-inverse/10"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

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
