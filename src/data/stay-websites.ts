/**
 * Verified official websites for the graded properties.
 *
 * This overlay exists because the websites stored in the generated register
 * data were checked once and never re-checked, and three of them were wrong by
 * the time anyone looked:
 *
 *   - Sobralia Residency pointed at a Summit Hotels page that returns 404. The
 *     string "sobralia" appears nowhere in that chain's 626-URL sitemap. Summit
 *     no longer has a Sobralia property, so the correct value is no value.
 *   - Norkhill Hotel pointed at a URL that 301s onto Elgin's business and
 *     conferences page rather than the property page.
 *   - The Bamboo Retreat pointed at the apex domain, whose TLS certificate
 *     does not carry the apex name — so the handshake fails outright and no
 *     browser can load it. Adding "www" fixes it.
 *
 * A dead link on a government-facing tourism page is worse than no link, so
 * every URL below was fetched and returned HTTP 200 with the property's own
 * page, on the date recorded in VERIFIED_AT.
 *
 * Not listed, and deliberately so — each was found and each failed:
 *   tashilingresidency.com and yarlamresorts.com both resolve to one dead
 *   shared host and never return a status; hoteltamarind.in returns 521, its
 *   origin down behind Cloudflare; theroyalplazahotel.com serves an "Account
 *   Suspended" page with a 200; terracevalleyhotel.com has lapsed entirely;
 *   ravonglastar.com presents a certificate for the wrong hostname and, forced
 *   past it, a page whose whole content is its own name. A domain that
 *   resolves is not a website.
 */

export const VERIFIED_AT = "2026-08-21";

/**
 * Domains that must never be linked, whatever a future pass finds.
 *
 * Two of these hotels' former domains have lapsed and been re-registered by
 * other people. They still rank for the hotel's name, so a later search for
 * "Yarlam Resort official site" will surface one of them and it will answer
 * HTTP 200 — the exact shape of a successful verification.
 *
 * A government-facing tourism page sending a visitor to a betting affiliate
 * because a domain changed hands is the worst failure available here, and it
 * would be invisible in every check that only asks whether a URL responds. So
 * the block list is explicit rather than relying on anyone re-checking.
 */
export const BLOCKED_DOMAINS: Record<string, string> = {
  "yarlamresort.com":
    "Lapsed and re-registered; serves a 4rabet betting-affiliate site as of 2026-08-21. Yarlam Resort's own content survives only in the Internet Archive.",
  "sobraliahotels.com":
    "Lapsed and re-registered as a scraped-content spam site. The hotel's real address survives on archived captures.",
};

/**
 * slug → verified property page, or null to suppress a stored value that is
 * broken. Absent slugs keep whatever the register data holds.
 */
export const VERIFIED_WEBSITES: Record<string, string | null> = {
  /* 404 — Summit has no Sobralia property any more. */
  "sobralia-residency": null,

  /* Stored URL 301s onto the conferences page; this is the property page. */
  "norkhill-hotel":
    "https://www.elginhotels.com/hotels-in-gangtok-elgin-nor-khill-spa-resort-since-1934/",

  /* Apex certificate does not match; www does. */
  "the-bamboo-retreat": "https://www.bambooretreat.in/",

  /* Newly found and verified. */
  "may-fair-resort": "https://www.mayfairhotels.com/spa-resort-casino-gangtok/",
  "chumbi-mountain-retreat":
    "https://www.clubmahindra.com/our-resorts/chumbi-mountain-retreat-resort-spa",
  "denzong-regency": "https://www.denzongregency.com/",
  "lemon-tree": "https://www.lemontreehotels.com/lemon-tree-hotel/gangtok/hotel-gangtok",
  "gangtok-drift": "https://hotelgangtokdrift.com/",
  "golden-crest": "https://www.thegoldencrest.com/",
  "planter-s-home": "https://www.hotelsonamdelek.com/",
  "bamboo-grove-retreat": "https://bamboogroveretreathotel.vivehotels.com/en/",
};

/**
 * Notes shown on a property page where the website needs one. Kept honest:
 * a working URL that behaves oddly should say so rather than surprise someone.
 */
export const WEBSITE_NOTES: Record<string, string> = {
  "planter-s-home":
    "The property's own domain now redirects to hotelsonamdelek.com, which serves two hotels — Sonam Delek and Planters Home. Only the Planters Home pages describe this property.",
  "bamboo-grove-retreat":
    "This is the property's booking-engine microsite rather than a hotel-owned domain; it publishes no photographs.",
  "denzong-regency":
    "The domain responds but is behind a bot check, so its contents could not be read here. It is recorded as this property's site because the hotel publishes reservations@denzongregency.com and the register's telephone number matches exactly.",
};
