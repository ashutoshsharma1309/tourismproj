import { SITE, SITE_URL } from "@/lib/constants";

/**
 * Structured data.
 *
 * The archive publishes 15 catalogued monasteries with coordinates, founding
 * years and lineages, 26 dated historical events and 77 catalogued objects —
 * exactly the material schema.org describes — and none of it was machine
 * readable. A search engine had no way to know that /monasteries/rumtek is a
 * place at a coordinate rather than an article that mentions one.
 *
 * Everything emitted here is already rendered on the page it describes. Nothing
 * is asserted in structured data that a visitor cannot also read, which is the
 * same rule the rest of the archive follows: a field with no source is omitted
 * rather than guessed.
 */

/**
 * Renders a JSON-LD block.
 *
 * The payload is serialised with `<` escaped, so a stray `</script>` inside any
 * data value cannot close the tag and inject markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** A monastery, as a place a visitor can travel to. */
export function monasterySchema(monastery: {
  name: string;
  slug: string;
  description: string;
  district: string;
  image: string;
  establishedYear: number | string;
  tradition: string;
  coordinates?: { lat: number; lng: number };
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["TouristAttraction", "PlaceOfWorship"],
    name: monastery.name,
    description: monastery.description,
    url: `${SITE_URL}/monasteries/${monastery.slug}`,
    image: `${SITE_URL}${monastery.image}`,
    address: {
      "@type": "PostalAddress",
      addressRegion: "Sikkim",
      addressCountry: "IN",
      addressLocality: monastery.district,
    },
    /* Omitted entirely when the coordinate is not published — 7 of the 15
       catalogued sites have none, and §16 forbids inventing one. */
    ...(monastery.coordinates
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: monastery.coordinates.lat,
            longitude: monastery.coordinates.lng,
          },
        }
      : {}),
    foundingDate: String(monastery.establishedYear),
    keywords: [monastery.tradition, "Buddhist monastery", "Sikkim", "Himalaya"].join(", "),
  };
}

/** A story or a historical event, as a piece of writing with sources. */
export function articleSchema(article: {
  title: string;
  description: string;
  url: string;
  image?: string;
  section?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: `${SITE_URL}${article.url}`,
    ...(article.image ? { image: `${SITE_URL}${article.image}` } : {}),
    ...(article.section ? { articleSection: article.section } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE_URL,
    },
  };
}

/** A catalogued archive object. */
export function creativeWorkSchema(item: {
  title: string;
  description: string;
  id: string;
  mediaUrl: string;
  license?: string | null;
  creator?: string | null;
  period?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: item.title,
    description: item.description,
    url: `${SITE_URL}/archive/${item.id}`,
    image: `${SITE_URL}${item.mediaUrl}`,
    ...(item.license ? { license: item.license } : {}),
    ...(item.creator ? { creator: { "@type": "Person", name: item.creator } } : {}),
    ...(item.period ? { temporalCoverage: item.period } : {}),
    isPartOf: {
      "@type": "Collection",
      name: "Ney Heritage Digital Archive",
      url: `${SITE_URL}/archive`,
    },
  };
}

/** The site itself, with its search endpoint. */
export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.tagline,
    description: SITE.description,
    url: SITE_URL,
    inLanguage: "en",
    about: {
      "@type": "Thing",
      name: "Buddhist monasteries and cultural heritage of Sikkim, India",
    },
  };
}

/** Breadcrumbs, so a result shows its place in the archive rather than a URL. */
export function breadcrumbSchema(
  trail: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.url}`,
    })),
  };
}
