import "server-only";

import { allCoverage, themeIndex } from "@/lib/global";
import type { Knowledge } from "@/lib/personalization/engine";

/**
 * Destination knowledge for personalization, built once per server process.
 *
 * `allCoverage()` reads every destination's records and is what the
 * prerendered /discover page ranks with. Its inputs are build-time data, so
 * the result cannot change while the process lives; computing it per request
 * would make every recommendation pay for eighteen destinations of content.
 */
let pending: Promise<Knowledge> | null = null;

export function knowledge(): Promise<Knowledge> {
  if (!pending) {
    pending = allCoverage()
      .then((coverage) => ({ coverage, themes: themeIndex(coverage) }))
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
