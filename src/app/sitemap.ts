import type { MetadataRoute } from "next";

import { archiveItems } from "@/data/archive";
import { historyTimeline } from "@/data/history";
import { monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { publicStays } from "@/data/curated-stays";
import { stories } from "@/data/stories";
import { SITE_URL } from "@/lib/constants";

/**
 * The sitemap.
 *
 * The build prerenders 201 pages, 188 of which are detail pages reachable only
 * by following a link from an index. Without this file a crawler has to
 * discover all of them by traversal, and the archive — the largest single body
 * of work here — is the deepest and least linked.
 *
 * Every published route is here. There are no private pages to leave out.
 */

const STATIC_ROUTES = [
  { path: "", priority: 1 },
  { path: "/monasteries", priority: 0.9 },
  { path: "/stories", priority: 0.9 },
  { path: "/explore", priority: 0.8 },
  { path: "/history", priority: 0.8 },
  { path: "/archive", priority: 0.8 },
  { path: "/permits", priority: 0.8 },
  { path: "/responsible", priority: 0.8 },
  { path: "/planner", priority: 0.7 },
  { path: "/culture", priority: 0.8 },
  { path: "/hotels", priority: 0.6 },
  { path: "/preservation", priority: 0.6 },
  { path: "/archive/contribute", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  /* The archive records a resolution date per item; the rest of the corpus is
     typed data with no per-record timestamp, so those entries carry none rather
     than a build time pretending to be an edit time. */
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: route.priority,
    })),
    ...monasteries.map((monastery) => ({
      url: `${SITE_URL}/monasteries/${monastery.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
    ...places.map((place) => ({
      url: `${SITE_URL}/places/${place.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...stories.map((story) => ({
      url: `${SITE_URL}/stories/${story.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...historyTimeline.map((event) => ({
      url: `${SITE_URL}/history/${event.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    /* One page per state-graded stay that can be shown in its own
       photographs. The rest keep their pages — the register entry is public
       information and nothing is deleted — but a page with no picture of its
       subject is not something to put forward for indexing. */
    ...publicStays.map((stay) => ({
      url: `${SITE_URL}/stays/${stay.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    ...archiveItems.map((item) => ({
      url: `${SITE_URL}/archive/${item.id}`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
