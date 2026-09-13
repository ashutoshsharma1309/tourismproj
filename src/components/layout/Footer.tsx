import Link from "next/link";

import { LogoMark } from "@/components/brand/Logo";
import { MonasteryRidge } from "@/components/immersive/HeroLayerArt";
import { SITE } from "@/lib/constants";

/*
 * PHASE 20 SPLIT THESE IN TWO.
 *
 * Every link here pointed into Sikkim, and the footer renders on all 319
 * pages — so Paris, Rome and Istanbul each ended with a column headed
 * "Explore" offering Monasteries, Stays and the Sikkim heritage map. The
 * platform's own doors were not in the footer at all.
 *
 * Now the first column is the product and the second is the Sikkim archive,
 * said out loud rather than implied. Naming the column "Sikkim archive" is
 * the whole fix: the links were never wrong, only unlabelled, and a visitor
 * on Rome's page can now see at a glance that they lead somewhere else.
 */
const COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/destinations", label: "Explore India" },
      { href: "/discover", label: "Find my destination" },
      { href: "/journey", label: "View my journey" },
      { href: "/destinations/compare", label: "Compare destinations" },
    ],
  },
  {
    heading: "Sikkim archive",
    links: [
      { href: "/destinations/sikkim", label: "Sikkim Darshan" },
      { href: "/destinations/sikkim/monasteries", label: "Monastery catalogue" },
      { href: "/destinations/sikkim/stories", label: "Stories" },
      { href: "/destinations/sikkim/explore", label: "Heritage map" },
      /*
       * These two were under a "How this works" heading, which reads as a
       * statement about the PRODUCT. Both are Sikkim pages, so on Rome's
       * footer "Coverage & sources" promised something global and landed the
       * reader in another destination's archive — the same defect the primary
       * navigation was fixed for, surviving one floor down. They are correct
       * links; they just have to say whose they are.
       */
      { href: "/destinations/sikkim/preservation", label: "Coverage & sources" },
      { href: "/destinations/sikkim/responsible", label: "Responsible travel" },
    ],
  },
  /*
   * Stories, History and Plan left the header so it could carry the four
   * actions a newcomer needs. They are still the product's global index
   * pages, and this is where they are named.
   */
  {
    heading: "Read and plan",
    links: [
      { href: "/stories", label: "Every story" },
      { href: "/history", label: "One chronology, every destination" },
      { href: "/plan", label: "Plan a trip" },
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
 *
 * The build credit below is not a counter-example to that rule: it is one
 * named person's own profile, which is a real handle, and it is offered as a
 * way to reach the team rather than as a platform presence the project claims
 * to keep.
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
        {/*
          pb-24, not py-5. Two controls are fixed to the bottom of the viewport
          — ambience on the left, the trip guide on the right — and each sits in
          the lowest ~64px. Scrolled to the end of the document, that band lands
          exactly on this bar, and whichever control shares its corner covers
          the text. It covered the sound toggle's own corner first, then the
          build credit when the guide took the other one. Reserving the band is
          the fix that holds however wide those controls get.
        */}
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-5 pb-24 text-caption text-foreground-inverse/50 sm:flex-row sm:items-center sm:justify-between">
          {/*
            This line used to claim two things that were not true, on every
            page of the site.

            It said the project was "built for the Sikkim Tourism Department",
            which asserts a commissioning relationship that does not exist.
            Nobody commissioned this. It is government-ready, which is a claim
            about the standard of the work rather than about who asked for it.

            And it said "photography and recordings are freely licensed
            Wikimedia Commons works", as a blanket statement covering the whole
            site. Most of the photography is exactly that — but the stay
            galleries are the hotels' own copyrighted promotional images, shown
            from their servers under no licence at all, and the audio guides
            are machine-narrated, not recordings of anyone. Both are disclosed
            correctly where they appear; the blanket claim in the footer
            contradicted those disclosures and, on the images, asserted a
            licence their owners never granted.
          */}
          <p>
            © 2026 {SITE.name} — an independent, government-ready prototype, not
            an official publication of any government or tourism authority. Most
            photography is freely licensed Wikimedia Commons work; each image and
            audio guide carries its own source and licence where it appears.
          </p>
          <p className="sm:shrink-0">
            Made by{" "}
            <a
              href="https://www.linkedin.com/in/ashutoshsharma1309/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact Ashutosh Sharma on LinkedIn"
              className="font-medium text-foreground-inverse/80 underline decoration-from-font underline-offset-2 transition-colors hover:text-accent"
            >
              Ashutosh Sharma
            </a>{" "}
            and team
          </p>
        </div>
      </div>
    </footer>
  );
}
