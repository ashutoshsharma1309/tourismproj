import type { NextConfig } from "next";

/**
 * PHASE 11 — route migration compatibility.
 *
 * Sikkim's content moved from un-prefixed URLs to /destinations/sikkim/...
 * Those old URLs are in the published sitemap and may be indexed or
 * bookmarked, so every one redirects to its EXACT counterpart. A blanket
 * redirect to the destination homepage would keep the links alive while
 * destroying the specific-page equity the redirect exists to preserve.
 *
 * `statusCode: 301` is set explicitly rather than using `permanent: true`,
 * which emits 308. Both are permanent redirects and pass equity identically;
 * 301 is specified here because it is the status the migration plan calls for
 * and the one every SEO tool reports on without a footnote.
 *
 * Order matters: the more specific `/:path*` rules must precede the bare
 * ones, or `/monasteries` would swallow `/monasteries/rumtek`.
 *
 * Every entry redirects OLD -> NEW exactly once. Nothing here points at
 * another entry's source, so there are no chains and no loops.
 */
const MIGRATED_ROUTES = [
  "monasteries",
  "stories",
  "history",
  "places",
  "stays",
  "hotels",
  "culture",
  "archive",
  "explore",
  "planner",
  "permits",
  "responsible",
  "preservation",
  "industry",
] as const;

/**
 * Routes whose BARE index is now a global page across all fifteen
 * destinations, and therefore must not redirect to Sikkim any more.
 *
 * `/stories` and `/history` were Sikkim's own pages before Phase 11 and the
 * migration sent them to `/destinations/sikkim/...`, which was right while
 * Sikkim was the product. The navigation now names Stories and History as
 * global surfaces, and a top-level menu item that lands on one destination is
 * exactly the Sikkim-centricity this product has spent several phases
 * removing.
 *
 * The DEEP links still redirect: `/stories/the-throne-of-stone` is a real URL
 * that used to exist and still belongs to Sikkim. Only the index changes
 * owner.
 */
const GLOBAL_INDEX_ROUTES = new Set(["stories", "history"]);

const nextConfig: NextConfig = {
  async redirects() {
    return MIGRATED_ROUTES.flatMap((route) => [
      /*
       * Sub-paths first: /monasteries/rumtek -> /destinations/sikkim/monasteries/rumtek
       *
       * `:path+`, not `:path*`. A star matches ZERO or more segments, so
       * `/stories/:path*` also matched the bare `/stories` — which is why
       * dropping the index rule for the global pages below changed nothing
       * until this did. The two rules are meant to be disjoint: this one is
       * the sub-tree, the next one is the index.
       */
      {
        source: `/${route}/:path+`,
        destination: `/destinations/sikkim/${route}/:path+`,
        statusCode: 301,
      },
      /* Then the index: /monasteries -> /destinations/sikkim/monasteries */
      ...(GLOBAL_INDEX_ROUTES.has(route)
        ? []
        : [
            {
              source: `/${route}`,
              destination: `/destinations/sikkim/${route}`,
              statusCode: 301,
            },
          ]),
    ]);
  },

  // Pin the workspace root. Turbopack otherwise walks up looking for a
  // lockfile, finds an unrelated one in the home directory and warns that it
  // is ignoring it. This repo is the root; say so.
  turbopack: {
    root: __dirname,
  },
  images: {
    minimumCacheTTL: 2592000,
    // Phase 1 photography is freely licensed media hosted on Wikimedia Commons.
    // Phase 2+ swaps these for CDN assets referenced from the database.
    remotePatterns: [
      /* Supabase Storage — where the archive's media now lives. Part 1.2. */
      {
        protocol: "https",
        hostname: "iutldcffkphicnsthetu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      // Poster frames for the embedded monastery videos. Only the thumbnail is
      // fetched from here; playback stays inside YouTube's own iframe player.
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
