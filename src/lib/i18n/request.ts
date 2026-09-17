import "server-only";

import { headers } from "next/headers";

import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from "./languages";

/**
 * The language of a per-request page that has no language in its path — the
 * partner workspace, search, checkout. These pages are never prerendered or
 * shared as translated links, so the browser's own preference decides;
 * English when it names nothing this product speaks.
 */
export async function requestLanguage(): Promise<LanguageCode> {
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (code && isLanguageCode(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}
