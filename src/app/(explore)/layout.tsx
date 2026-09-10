import Link from "next/link";
import type { ReactNode } from "react";

import { DarshanNav } from "@/components/darshan/DarshanNav";

/* Footer-only, per the IA: these are reference pages, not journeys. */
const FOOTER_LINKS = [
  { label: "Responsible travel", href: "/responsible" },
  { label: "Preservation", href: "/preservation" },
  { label: "Sources", href: "/sources" },
  { label: "Accessibility", href: "/accessibility" },
] as const;

/**
 * The Darshan surface — public, photographic, heritage-first.
 *
 * WHY THIS LAYOUT EXISTS SEPARATELY
 * ---------------------------------
 * Three surfaces, three chromes (CLAUDE.md §1). The traveller-facing site is
 * dark and photographic; the partner SaaS and the government console will be
 * light, because people work in those for hours and nobody wants to do data
 * entry on a near-black ground.
 *
 * The root layout owns the document and nothing else.
 */
export default function ExploreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--parchment)]">
      <a
        href="#main"
        className="sr-only rounded bg-[var(--parchment)] px-4 py-2 text-[14px] font-medium text-[var(--ink)] focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <DarshanNav />

      <div id="main">{children}</div>

      <footer className="border-t border-[var(--slate)]/25 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="font-serif text-[20px]">Darshan</p>
          <nav aria-label="Footer" className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[var(--parchment)]/60">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className="hover:text-[var(--brass)]">
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 max-w-[68ch] text-[12px] leading-relaxed text-[var(--parchment)]/40">
            An independent prototype. Not an official publication of any
            government or tourism authority. Every claim on this site carries
            the source it came from, and the gaps are published rather than
            filled in.
          </p>
        </div>
      </footer>
    </div>
  );
}
