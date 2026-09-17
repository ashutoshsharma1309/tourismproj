import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";

/**
 * robots.txt.
 *
 * The partner programme's private surfaces — sign-in, the partner
 * dashboard, the review console — are authenticated and carry `noindex`
 * too; listing them here keeps a crawler from even requesting them. The
 * public partner page (/partner) stays crawlable: it is the pitch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/login", "/signup", "/forgot-password", "/reset-password", "/account", "/partner/dashboard", "/auth/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
