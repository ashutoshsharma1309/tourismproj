import type { MetadataRoute } from "next";

import {
  getArchive,
  getHistory,
  getPlaces,
  getSites,
  getStays,
  getStories,
} from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, resolveDestinationOrNull } from "@/lib/destinations/resolve";
import { CAPABILITY_SECTION } from "@/lib/destinations/sections";
import { SITE_URL } from "@/lib/constants";
import type { DestinationCapability } from "@/types/destination";

/**
 * The sitemap.
 *
 * Most of these pages are detail pages reachable only by following a link
 * from an index. Without this file a crawler has to discover them by
 * traversal, and the archive — the largest single body of work here — is the
 * deepest and least linked.
 *
 * WHY IT ITERATES DESTINATIONS
 * ----------------------------
 * It used to list twelve literal `/destinations/sikkim/...` paths and six
 * literal Sikkim content modules. The output was correct, because Sikkim is
 * the only destination with sections today — and it would have stayed
 * "correct" in exactly the same silent way on the day a second destination
 * gained content, emitting nothing for it. A sitemap that cannot be wrong
 * only because there is one destination is not a global sitemap.
 *
 * Now every entry is derived: destinations come from the registry, sections
 * from the capabilities that destination actually resolves, and detail pages
 * from the same content accessors the pages themselves read. A destination
 * with no content contributes its hub page and nothing else — the capability
 * model already guarantees the sections do not exist.
 *
 * There are no private pages to leave out. `/review` is the one route
 * excluded, and it excludes itself: it declares `robots: { index: false }`
 * and 404s in production.
 */

/** Crawl priority per section. Sections not listed fall back to 0.6. */
const SECTION_PRIORITY: Partial<Record<DestinationCapability, number>> = {
  experiences: 0.9,
  sites: 0.9,
  stories: 0.9,
  map: 0.8,
  history: 0.8,
  archive: 0.8,
  culture: 0.8,
  permits: 0.8,
  responsible: 0.8,
  tripPlanner: 0.7,
  stays: 0.6,
  trade: 0.6,
  preservation: 0.6,
};

/**
 * Sub-pages that belong to a section rather than to a capability of their
 * own. `archive/contribute` is a form, not a body of content, so it has no
 * capability — it exists wherever the archive does.
 */
const SECTION_CHILDREN: Partial<Record<DestinationCapability, { path: string; priority: number }[]>> = {
  /*
   * `contribute` is Sikkim's submission form and now generates for Sikkim
   * alone (see archive/contribute/page.tsx). Advertising it here for every
   * archive-capable destination put fourteen dead URLs in the sitemap the
   * moment the capsules gained archives — caught by qa:route-migration's
   * "every advertised section resolves". The child is attached below only
   * where the route exists.
   */
  archive: [],
};

/**
 * Detail routes, keyed by the capability that gates them.
 *
 * Each entry names the accessor that lists the items and the URL segment
 * they live under, so a detail page appears in the sitemap for precisely the
 * destinations whose content accessor returns something.
 */
const DETAIL_ROUTES: {
  capability: DestinationCapability;
  segment: string;
  priority: number;
  load: (destinationId: string) => Promise<readonly { slug?: string; id?: string; detailHref?: string }[]>;
}[] = [
  { capability: "sites", segment: "monasteries", priority: 0.8, load: getSites },
  { capability: "places", segment: "places", priority: 0.7, load: getPlaces },
  { capability: "stories", segment: "stories", priority: 0.7, load: getStories },
  { capability: "history", segment: "history", priority: 0.6, load: getHistory },
  /* One page per state-graded stay that can be shown in its own photographs.
     The rest keep their pages — the register entry is public information and
     nothing is deleted — but a page with no picture of its subject is not
     something to put forward for indexing. `getStays` returns exactly that
     public subset. */
  { capability: "stays", segment: "stays", priority: 0.5, load: getStays },
  { capability: "archive", segment: "archive", priority: 0.5, load: getArchive },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* The archive records a resolution date per item; the rest of the corpus is
     typed data with no per-record timestamp, so those entries carry none rather
     than a build time pretending to be an edit time. */
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE_URL}/destinations`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    /* The partner programme's public door. Its private surfaces (sign-in,
       dashboard, review console) are noindex and disallowed in robots.ts. */
    { url: `${SITE_URL}/partner`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const registered of listDestinations()) {
    const resolved = await resolveDestinationOrNull(registered.id);
    if (!resolved) continue;
    const { destinationId, capabilities } = resolved;

    entries.push({
      url: `${SITE_URL}${destinationPath(destinationId)}`,
      lastModified: now,
      changeFrequency: "monthly",
      /*
       * Equal priority. This gave Sikkim 0.9 and every other destination 0.7
       * — a stated preference for one destination in the one file search
       * engines read for exactly that signal. All of them are documented;
       * none is the product's preferred one.
       */
      priority: 0.8,
    });

    for (const [capability, segments] of Object.entries(CAPABILITY_SECTION) as [
      DestinationCapability,
      string[],
    ][]) {
      if (!capabilities[capability]) continue;
      /* A capability can own several routes — `experiences` owns both
         `discover` and `plan`. Each is emitted; the primary keeps the
         capability's priority and the rest sit just below it. */
      segments.forEach((segment, index) => {
        entries.push({
          url: `${SITE_URL}${destinationPath(destinationId, segment)}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: (SECTION_PRIORITY[capability] ?? 0.6) - (index === 0 ? 0 : 0.1),
        });
        /* Children belong to the primary section only — `contribute` is a
           child of `archive`, not of every route the capability owns. */
        const children = [
          ...(index === 0 ? (SECTION_CHILDREN[capability] ?? []) : []),
          /* Sikkim's submission form is the one archive child that exists. */
          ...(index === 0 && capability === "archive" && destinationId === "sikkim"
            ? [{ path: "contribute", priority: 0.5 }]
            : []),
        ];
        for (const child of children) {
          entries.push({
            url: `${SITE_URL}${destinationPath(destinationId, segment, child.path)}`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: child.priority,
          });
        }
      });
    }

    for (const route of DETAIL_ROUTES) {
      if (!capabilities[route.capability]) continue;
      const items = await route.load(destinationId);
      for (const item of items) {
        const key = item.slug ?? item.id;
        if (!key) continue;
        /*
         * PHASE 18 — a record that names its own link has no page here.
         *
         * A capsule place lives as an anchored card on its destination's
         * discovery page, which is already listed above. Emitting
         * `/destinations/delhi/places/red-fort` put a 404 in the sitemap —
         * caught by qa:route-migration, which now resolves every advertised
         * URL against the build output instead of matching a pattern.
         */
        if ("detailHref" in item && item.detailHref) continue;
        entries.push({
          url: `${SITE_URL}${destinationPath(destinationId, route.segment, key)}`,
          changeFrequency: "yearly",
          priority: route.priority,
        });
      }
    }
  }

  return entries;
}
