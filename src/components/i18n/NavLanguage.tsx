"use client";

import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
/*
 * `languages.ts`, NEVER the `@/lib/i18n` barrel — the same rule
 * `LanguageSwitcher` states and for the same reason. This is a client
 * component mounted in the Navbar, so it is on every page; the barrel
 * re-exports `dictionary.ts` (35 KB of interface copy in twenty languages),
 * and importing it from here shipped all of it to every visitor to obtain
 * two constants. `qa:global-intelligence` caught the weight as a payload
 * ceiling breach on /destinations and /discover.
 */
import { DEFAULT_LANGUAGE, resolveLanguage } from "@/lib/i18n/languages";

/**
 * The language selector, in the global navigation.
 *
 * WHY THIS EXISTS AS A SEPARATE COMPONENT
 * ---------------------------------------
 * `LanguageSwitcher` renders twelve links to `withLanguage(path, code)` and
 * trusts that the translated path is a real page. On the destination hub —
 * the one place it was mounted before — that is true. Everywhere else it is
 * not: `/l/<lang>/destinations/<id>` is the ONLY translated route family that
 * exists, so `withLanguage("/discover", "hi")` yields `/l/hi/discover`, which
 * is a 404. A selector that 404s is worse than one that is hidden.
 *
 * So this component resolves a target that is guaranteed to exist before it
 * renders anything, and renders nothing at all when none does.
 *
 * WHAT THAT MEANS FOR THE READER
 * ------------------------------
 * The selector now appears on every destination-scoped page — the hub, and
 * also discover, places, stories, history and the rest, which had no selector
 * at all — and switching from any of them lands on that destination's hub in
 * the chosen language. It stays hidden on the homepage, `/discover` and
 * `/destinations`, because those pages have no translated counterpart to send
 * anyone to. Building those routes is what would make it universal; claiming
 * to be universal by linking at 404s would not.
 */
export function NavLanguage({ className }: { className?: string }) {
  const pathname = usePathname();
  const target = translatableDestination(pathname);
  if (!target) return null;

  return (
    <LanguageSwitcher
      language={target.language}
      /*
       * The hub path, deliberately not the current path. `withLanguage` will
       * turn this into `/l/<code>/destinations/<id>`, which is a page that
       * exists for all fifteen destinations and all eleven non-English
       * languages. Handing it `pathname` would produce the 404 above.
       */
      path={`/destinations/${target.destinationId}`}
      className={className}
    />
  );
}

/**
 * The destination a path belongs to, and the language it is being read in.
 *
 * Returns null for any path that is not destination-scoped, which is the
 * signal to render no selector.
 */
function translatableDestination(pathname: string) {
  /* A path already carrying a language prefix: /l/<lang>/destinations/<id>. */
  const translated = /^\/l\/([a-z]{2})\/destinations\/([^/]+)/.exec(pathname);
  if (translated) {
    return {
      language: resolveLanguage(translated[1]),
      destinationId: translated[2]!,
    };
  }

  /* An English destination path: /destinations/<id>/anything. */
  const english = /^\/destinations\/([^/]+)/.exec(pathname);
  if (english) {
    const destinationId = english[1]!;
    /*
     * `/destinations/compare` is a product page that happens to sit under the
     * same segment, not a destination. It has no hub and no translation.
     */
    if (destinationId === "compare") return null;
    return { language: DEFAULT_LANGUAGE, destinationId };
  }

  return null;
}
