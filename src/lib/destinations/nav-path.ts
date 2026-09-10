/**
 * The destination id in a pathname, or null.
 *
 * WHY THIS IS ITS OWN FILE, WITH NO IMPORTS
 * -----------------------------------------
 * The navbar is a client component and it needs exactly this one function.
 * It first lived in `nav.ts` beside `destinationNavMap()`, which imports the
 * registry, the capability resolver and the section table — so importing one
 * pure string function pulled the destination registry and everything behind
 * it into the client bundle. Measured at the time: `.next/static/chunks` grew
 * from 3.2 MB to 3.9 MB.
 *
 * This is the same lesson `ids.ts` records for the capsule registry and
 * `search-index.ts` records for the search corpus, and it keeps being learned
 * the same way: a module is only as cheap as its heaviest import.
 *
 * `/destinations` and `/destinations/compare` are NOT destinations, and
 * returning "compare" for the second would have the navbar look up a
 * destination that does not exist. Excluded explicitly rather than caught by
 * the lookup failing, because a silent miss is how a bug like this survives.
 */
export function destinationIdFromPath(pathname: string): string | null {
  const match = /^\/destinations\/([^/]+)/.exec(pathname);
  if (!match) return null;
  const id = match[1] ?? null;
  return id === "compare" ? null : id;
}

/**
 * Whether this path has translated variants under `/l/<lang>/`.
 *
 * The language control is global, but the translations are not: destination
 * hubs are built in all twenty languages and nothing else is. Offering twenty
 * languages on a page that has one would be twenty links to a 404, so the
 * navbar asks this before rendering the switcher.
 *
 * Kept in this import-free module for the same reason `destinationIdFromPath`
 * is: the navbar is a client component, and a module is only as cheap as its
 * heaviest import.
 */
export function isTranslatablePath(pathname: string): boolean {
  const bare = pathname.replace(/^\/l\/[a-z]{2}(?=\/|$)/, "") || "/";
  return destinationIdFromPath(bare) !== null;
}

/** The language a path is already being served in, judged only by its prefix. */
export function languageFromPathname(pathname: string): string {
  return /^\/l\/([a-z]{2})(?=\/|$)/.exec(pathname)?.[1] ?? "en";
}
