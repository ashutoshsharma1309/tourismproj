import { deferredSearchIndex } from "@/lib/search-index";

/**
 * The search corpus, as a cacheable static asset.
 *
 * `force-static` means this is generated during `next build` and served like
 * a file — no server work per request, and a browser or CDN can cache it. The
 * palette fetches it once, the first time a visitor opens search, instead of
 * every page carrying it.
 *
 * WHY A ROUTE HANDLER AND NOT A FILE IN public/
 * ---------------------------------------------
 * Because the index is DERIVED from the same modules the pages render from.
 * A checked-in JSON file in `public/` would be a second copy of the corpus,
 * free to drift from it the moment a record changed — and this project has
 * already learned what a second copy of a dataset costs. Building it from
 * `buildSearchIndex()` at build time keeps one source of truth.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(deferredSearchIndex(), {
    headers: {
      /* Immutable within a deployment: the payload is rebuilt with the site. */
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
