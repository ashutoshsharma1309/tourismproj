import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";

/**
 * robots.txt.
 *
 * The curator review queue used to be disallowed here — it published
 * contributors' names and had no authentication. Both the queue and its
 * sign-in have been removed from the product entirely, so there is nothing
 * left to hide from a crawler and the disallow list is empty.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
