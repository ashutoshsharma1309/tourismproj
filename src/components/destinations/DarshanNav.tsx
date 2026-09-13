import Link from "next/link";

import {
  getCapsuleCulture,
  getCapsuleStays,
  getHistory,
  getPlaces,
  getStories,
} from "@/lib/destinations/content";
import { translator, type LanguageCode } from "@/lib/i18n";

/**
 * The Darshan's own navigation — what THIS destination actually holds.
 *
 * WHY IT IS DERIVED, NOT A FIXED LIST
 * -----------------------------------
 * A constant list of twenty section names would be the same on all fifteen
 * destinations, and eleven of them would be links to sections that never
 * rendered. Every entry here is gated on the same accessor the section itself
 * is gated on, so a link exists only where the section exists. Agra, with one
 * story and no stays, gets a shorter bar than Sikkim — which is the honest
 * result and needs no per-destination code.
 *
 * WHY IT IS SEPARATE FROM THE GLOBAL NAVBAR
 * -----------------------------------------
 * The global bar answers "where do you want to go" — Destinations, Discover,
 * Stories, History, Plan, Compare. This one answers "what is in this place".
 * Merging them would produce a bar of twenty-odd items where the two questions
 * are indistinguishable, which is what the reference product's navigation does
 * and is the one thing about it worth not copying.
 *
 * IT IS PLAIN ANCHORS, NO CLIENT JAVASCRIPT. In-page links to sections that
 * are already server-rendered, and route links to sub-pages that exist. A
 * scroll-spy would need a client component on every destination page to
 * highlight a heading the reader can already see.
 */
export async function DarshanNav({
  destinationId,
  language,
  hasKnowledge,
  sections,
}: {
  destinationId: string;
  language: LanguageCode;
  /** Whether reviewed research rendered, which owns the evidence anchor. */
  hasKnowledge: boolean;
  /** Sub-routes this destination actually has, from the derived section map. */
  sections: { href: string; label: string }[];
}) {
  const t = translator(language);

  const [places, stories, history, culture, stays] = await Promise.all([
    getPlaces(destinationId),
    getStories(destinationId),
    getHistory(destinationId),
    getCapsuleCulture(destinationId),
    getCapsuleStays(destinationId),
  ]);

  /*
   * THE MAP GATES ON COORDINATES, NOT ON `getMappableSites`.
   *
   * The first version of this used `getMappableSites`, which is Sikkim-only —
   * so Paris rendered a map section and got no link to it. The section itself
   * gates on how many places carry a coordinate, and this now asks the same
   * question. Getting the gate wrong is exactly the failure this component's
   * whole design is meant to prevent, so it is worth naming.
   */
  const plotted = places.filter((place) => place.coordinates).length;

  /* Each entry is gated on the same data its section is gated on. */
  const anchors: { hash: string; label: string }[] = [
    ...(places.length > 0 ? [{ hash: "featured-places", label: t("section.places") }] : []),
    ...(plotted > 0 ? [{ hash: "map", label: t("dest.openMap") }] : []),
    /* The audio section ALWAYS renders — its honest "no narration yet" state is
       the point of it — so the link is always valid. */
    { hash: "audio", label: "Audio" },
    ...(stories.length > 0 ? [{ hash: "destination-stories", label: t("section.stories") }] : []),
    ...(history.length > 0 ? [{ hash: "historical-snapshot", label: t("section.history") }] : []),
    ...(culture.some((c) => c.kind === "food") ? [{ hash: "food", label: t("section.food") }] : []),
    ...(culture.some((c) => c.kind === "festival")
      ? [{ hash: "festival", label: t("section.festivals") }]
      : []),
    ...(culture.some((c) => c.kind === "craft") ? [{ hash: "craft", label: t("section.crafts") }] : []),
    ...(stays.length > 0 ? [{ hash: "stays", label: t("section.stays") }] : []),
    ...(hasKnowledge ? [{ hash: "evidence", label: "Sources" }] : []),
  ];

  /*
   * Sub-route links whose label an anchor already carries are dropped. Sikkim
   * has both an in-page Stories section and a /stories route, and the bar read
   * "Stories · History · … · Stories · History" — the same word twice in one
   * row, which teaches a reader that the words do not mean anything.
   * The anchor wins: it is on this page, and it is cheaper to reach.
   */
  const used = new Set(anchors.map((entry) => entry.label.toLowerCase()));
  const routes = sections.filter((entry) => !used.has(entry.label.toLowerCase()));

  /* Nothing to navigate is not a navigation bar. */
  if (anchors.length + routes.length < 2) return null;

  return (
    <nav
      aria-label="Sections of this destination"
      /*
        Constrained to the page column, not full-bleed.

        A `w-screen relative left-1/2 -translate-x-1/2` attempt failed for a
        reason worth recording: `relative` and `sticky` are both position
        utilities and conflict, so adding `relative` silently stopped the bar
        sticking. Cancelling the main column's padding with negative margins is
        enough — the border-b reads as a bar, and it keeps `sticky` intact.
      */
      className="sticky top-16 z-40 -mx-4 border-b border-border bg-surface/90 backdrop-blur md:-mx-6"
    >
      {/*
        `overflow-x-auto` with `min-w-0`: at 320px this bar can hold ten items
        and must scroll rather than wrap into three lines that push the page
        content below the fold.
      */}
      <ul className="flex min-w-0 items-center gap-1 overflow-x-auto px-4 py-2 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {anchors.map(({ hash, label }) => (
          <li key={hash} className="shrink-0">
            <a
              href={`#${hash}`}
              className="block rounded-full px-3 py-1.5 text-caption font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {label}
            </a>
          </li>
        ))}
        {routes.map(({ href, label }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              prefetch={false}
              className="block rounded-full px-3 py-1.5 text-caption font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
