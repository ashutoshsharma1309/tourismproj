import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TripGuide } from "@/components/guide/TripGuide";
import { Navbar } from "@/components/layout/Navbar";
import { JourneyProvider } from "@/lib/journey/JourneyProvider";
import { listDestinations } from "@/lib/destinations/registry";
import { ALL_INTERESTS } from "@/lib/planner/types";
import { destinationNavMap } from "@/lib/destinations/nav";
import { CommandPalette } from "@/components/search/CommandPalette";
import { Toaster } from "@/components/ui/Toast";
import { navigationIndex } from "@/lib/search-index";
import { SITE } from "@/lib/constants";
import { getPlaces } from "@/lib/destinations/content";
import { suitsWideFrame } from "@/lib/media/focal";


/**
 * WHY THE TITLE TEMPLATE LIVES HERE AND NOT AT THE ROOT
 * ----------------------------------------------------
 * The root template was flattened to "%s" so a v2 Darshan page would not be
 * titled "... · TerraStory". That silently stripped the product name from
 * every v1 page too: all fifteen destination tabs read "Sikkim", "Paris",
 * "Delhi" — a browser with ten tabs open showed ten anonymous city names and
 * no way to tell which product they belonged to.
 *
 * A route-group layout is the right home for it: the suffix follows v1's
 * pages exactly, and reaches nothing under (explore).
 */
export async function generateMetadata(): Promise<Metadata> {
  /*
   * THE ROOT SOCIAL CARD WAS RUMTEK MONASTERY.
   *
   * The root layout declares one openGraph block and metadata merges
   * shallowly, so every v1 page without a card of its own — the homepage,
   * /destinations, /discover, /stories — shared as a photograph of a Sikkim
   * monastery with alt text naming Sikkim. That is the product presenting
   * one destination as itself. Destination pages already derive their own
   * card; this gives the global pages one derived the same way: the first
   * destination in registry order that is NOT Sikkim, its first photograph
   * whose shape suits a wide frame. Deterministic, credited on the page it
   * comes from, and it moves the moment the registry does.
   */
  const global = listDestinations().find((d) => d.id !== "sikkim");
  const places = global ? await getPlaces(global.id) : [];
  const hero =
    places.filter((p) => p.image).find((p) => suitsWideFrame(p.image)) ??
    places.find((p) => p.image);
  return {
    title: {
      default: `${SITE.name} — ${SITE.tagline}`,
      template: `%s · ${SITE.name}`,
    },
    ...(hero?.image && global
      ? {
          openGraph: {
            siteName: SITE.name,
            title: `${SITE.name} — ${SITE.tagline}`,
            type: "website",
            images: [
              {
                url: hero.image,
                alt: hero.imageAlt ?? `${hero.name}, ${global.name}`,
              },
            ],
          },
        }
      : {}),
  };
}

/**
 * The v1 archive's chrome.
 *
 * WHY THIS MOVED OUT OF THE ROOT LAYOUT
 * -------------------------------------
 * A root layout wraps every route in the app, so once the v2 `(explore)`
 * surface existed, TerraStory's navbar, command palette, ambient audio and
 * trip guide were rendering on top of Darshan's destination pages. Three
 * surfaces with three different chromes is the whole point of route groups;
 * the root should own the document and nothing else.
 *
 * Route groups do not appear in URLs, so every v1 path is unchanged.
 */
export default async function V1Layout({ children }: { children: ReactNode }) {
  return (
    <>

        {/*
          Every page puts eight navigation links, a search button and a role
          switcher in front of its content. Without a skip link a keyboard or
          screen-reader visitor tabs through all of it on every single page.
          The header is `fixed`, so the target also needs scroll-margin — that
          is set on [id="main"] in globals.css.
        */}
        <a
          href="#main"
          className="sr-only rounded-lg bg-surface px-4 py-2 text-small font-medium text-foreground shadow-overlay focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-200"
        >
          Skip to content
        </a>
        {/*
          The journey a visitor is assembling lives here, above the whole tree,
          so a destination added on the homepage is still there on a
          destination page. The valid ids and interests are resolved on the
          SERVER and passed down as plain arrays — importing the registry into
          a client component ships the registry to the browser, which this
          repository has now done three times by accident.
        */}
        <JourneyProvider
          destinationIds={listDestinations().map((d) => d.id)}
          interestIds={ALL_INTERESTS as readonly string[]}
        >
        <Navbar destinationSections={await destinationNavMap()} />
        {children}
        {/*
          Bottom-right: the guide. The ambient-sound mixer that held the
          bottom-LEFT corner is gone — it was a background-noise toggle with
          no bearing on the archive, and on a 390px screen its two pills sat
          on top of whatever the page put in that corner. The heritage audio
          narration on monastery pages is a different component and stays.
        */}
        <TripGuide
          destinationNames={Object.fromEntries(listDestinations().map((d) => [d.id, d.name]))}
        />
        {/*
          Only the navigation entries are inlined. The corpus is fetched by
          the palette on first open — see src/lib/search-index.ts. This took
          301 KB of script off every page in the site.
        */}
        <CommandPalette seed={navigationIndex()} />
        <Toaster />
        </JourneyProvider>
    </>
  );
}
