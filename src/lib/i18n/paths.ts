import { DEFAULT_LANGUAGE, resolveLanguage, type LanguageCode } from "./languages";

/**
 * Path helpers, split out so client components can use them without the
 * dictionary. `index.ts` re-exports these; importing THIS file is what keeps
 * twenty languages of copy out of the browser bundle.
 */
/**
 * The same page in another language.
 *
 * The language lives in the PATH, not in a query parameter, because the pages
 * are statically generated and a search parameter would make every one of
 * them render per request. English is the default and carries no prefix, so
 * the canonical URL of every page stays exactly what it has always been and a
 * shared English link never grows a marker.
 *
 *   withLanguage("/destinations/jaipur", "hi")  ->  "/l/hi/destinations/jaipur"
 *   withLanguage("/l/hi/destinations/jaipur", "en")  ->  "/destinations/jaipur"
 *
 * Any query string on the way in is preserved, so switching language on a
 * filtered discovery page keeps the filter.
 */
export function withLanguage(path: string, language: LanguageCode): string {
  const [rawPath = path, query = ""] = path.split("?");
  /* Strip an existing prefix first, so switching twice does not nest them. */
  const bare = rawPath.replace(/^\/l\/[a-z]{2}(?=\/|$)/, "") || "/";
  const next = language === DEFAULT_LANGUAGE ? bare : `/l/${language}${bare}`;
  return query ? `${next}?${query}` : next;
}

/** The language a path is already in, judged only by its prefix. */
export function languageFromPath(path: string): LanguageCode {
  return resolveLanguage(/^\/l\/([a-z]{2})(?=\/|$)/.exec(path)?.[1]);
}
