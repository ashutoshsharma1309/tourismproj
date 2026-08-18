import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";

/**
 * robots.txt.
 *
 * The disallow list is the point of this file. /preservation/review is the
 * curator queue: it renders every pending contribution together with the
 * contributor's name and a mailto: link to the address they submitted it from,
 * and this build has no curator authentication. It is linked from the global
 * navbar and footer, so it was fully crawlable — an indexed page of volunteers'
 * email addresses.
 *
 * Excluding it from search is the containment step, not the fix. The route
 * still needs an authentication gate; until it has one it also carries
 * `robots: { index: false }` in its own metadata, because a robots.txt entry is
 * a request that well-behaved crawlers honour and nothing else does.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/preservation/review", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
