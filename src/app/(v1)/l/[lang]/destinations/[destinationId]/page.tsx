import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DestinationHubPage } from "@/components/destinations/DestinationHubPage";
import { getDestination, listDestinations } from "@/lib/destinations";
import { DEFAULT_LANGUAGE, LANGUAGES, isLanguageCode, languageMeta } from "@/lib/i18n";

/**
 * A destination hub in one of the eleven non-English interface languages.
 *
 * WHY A SEPARATE ROUTE AND NOT `?lang=`
 * -------------------------------------
 * Because a static page is one file per path. Reading a search parameter, a
 * cookie or a header makes a route render per request — measured on this
 * page, 2ms of prerendered HTML became 78ms of server render — and it would
 * have removed the prerendered files that `qa:destination` checks all fifteen
 * destinations by.
 *
 * Putting the language in the path keeps every page static. English stays on
 * `/destinations/<id>` with no prefix, so canonical URLs, sitemaps, existing
 * links and the prerender check are all untouched; the other eleven are built
 * here, 15 × 11 = 165 additional static pages.
 *
 * `dynamicParams = false` means an unknown language is a 404 rather than an
 * on-demand render of an untranslated page.
 */
export function generateStaticParams() {
  return LANGUAGES.filter((language) => language.code !== DEFAULT_LANGUAGE).flatMap((language) =>
    listDestinations().map((destination) => ({
      lang: language.code,
      destinationId: destination.id,
    })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; destinationId: string }>;
}): Promise<Metadata> {
  const { lang, destinationId } = await params;
  const destination = getDestination(destinationId);
  if (!destination || !isLanguageCode(lang)) return {};

  return {
    title: `${destination.name} — ${destination.country.name}`,
    /*
     * The canonical URL is the English page. These eleven differ only in
     * interface language — the archive text on them is identical, because it
     * is quoted from sources and quotations are not translated — so pointing
     * search engines at one of them is the honest signal.
     */
    alternates: {
      canonical: `/destinations/${destination.id}`,
      languages: Object.fromEntries(
        LANGUAGES.map((language) => [
          language.code,
          language.code === DEFAULT_LANGUAGE
            ? `/destinations/${destination.id}`
            : `/l/${language.code}/destinations/${destination.id}`,
        ]),
      ),
    },
  };
}

export default async function TranslatedDestinationPage({
  params,
}: {
  params: Promise<{ lang: string; destinationId: string }>;
}) {
  const { lang, destinationId } = await params;
  if (!isLanguageCode(lang) || lang === DEFAULT_LANGUAGE) notFound();

  const { dir } = languageMeta(lang);

  /*
   * `dir` is set here rather than on <html>, because the root layout is shared
   * with the English pages and a document-level direction would follow a
   * reader back to a page that is not in their language. Arabic is the only
   * one of the twelve that needs it, and it needs it properly.
   */
  return (
    <div lang={lang} dir={dir}>
      <DestinationHubPage destinationId={destinationId} language={lang} />
    </div>
  );
}
