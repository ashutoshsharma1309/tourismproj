import Link from "next/link";

import { LogoMark } from "@/components/brand/Logo";
import { MonasteryRidge } from "@/components/immersive/HeroLayerArt";
import { SITE } from "@/lib/constants";

const COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/monasteries", label: "Monasteries" },
      { href: "/hotels", label: "Stays" },
      { href: "/planner", label: "Plan a journey" },
      { href: "/#map", label: "Heritage map" },
    ],
  },
  {
    heading: "Heritage",
    links: [
      { href: "/stories", label: "Stories" },
      { href: "/preservation", label: "Digital preservation" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { href: "/monasteries", label: "Monastery catalogue" },
      { href: "/preservation", label: "Coverage & sources" },
    ],
  },
] as const;

/*
 * There is no SOCIALS list here any more.
 *
 * Three icons linked to instagram.com, twitter.com and youtube.com — the
 * platforms' own front doors, not accounts belonging to this project, because
 * this project has none. A row of social icons is read as "we are on these
 * platforms", so the row was a claim, and it was false. On a site whose whole
 * argument is that an unsourced claim does not ship, it was also the only
 * assertion in the chrome that no source backed.
 *
 * Restore this when real accounts exist, with their real handles.
 */

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-surface-inverse text-foreground-inverse">
      {/* Himalayan ridge silhouette, barely there. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 text-foreground-inverse opacity-[0.05]">
        <MonasteryRidge />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2.5 font-display text-2xl">
              <LogoMark className="size-8 text-accent" />
              {SITE.name}
            </p>
            <p className="mt-2 max-w-xs text-small leading-relaxed text-foreground-inverse/60">
              {SITE.tagline}
            </p>
            <p className="mt-1 font-mono text-caption tracking-widest text-accent uppercase">
              {SITE.motto}
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="font-mono text-eyebrow tracking-widest text-foreground-inverse/50 uppercase">
                {column.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-small text-foreground-inverse/70 transition-colors hover:text-foreground-inverse"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="relative border-t border-border-inverse">
        <p className="mx-auto max-w-6xl px-6 py-5 text-caption text-foreground-inverse/50">
          © 2026 {SITE.name} — a prototype built for the Sikkim Tourism
          Department. Photography and recordings are freely licensed Wikimedia
          Commons works.
        </p>
      </div>
    </footer>
  );
}
