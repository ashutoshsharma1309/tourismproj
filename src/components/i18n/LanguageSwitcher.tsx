import Link from "next/link";

import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";
import { NAV_LANGUAGE_LABELS } from "@/lib/i18n/nav-labels";
import { withLanguage } from "@/lib/i18n/paths";

/**
 * The twelve-language selector.
 *
 * NO CLIENT JAVASCRIPT
 * --------------------
 * Twelve ordinary links, one per language, each pointing at the current path
 * with a different `?lang=`. That is the same URL-as-state contract the
 * planner and discovery already keep, and it buys three things a `<select>`
 * with an onChange handler would have cost: a translated page is a shareable
 * link, the control works before hydration, and the homepage does not gain a
 * client component for the sake of a dropdown.
 *
 * It renders as a `<details>` so twelve languages do not occupy the header —
 * which is a disclosure widget the browser opens natively, not a menu this
 * project had to implement.
 *
 * IT IMPORTS `languages.ts` AND `nav-labels.ts`, NEVER `@/lib/i18n`.
 * The barrel re-exports the dictionary, and pulling it in shipped twenty
 * languages of interface copy to every visitor so one button could say
 * "Language".
 *
 * Each option is labelled with its own endonym and carries `lang` and `dir`,
 * so a screen reader announces "日本語" in Japanese rather than reading the
 * characters as though they were the page's language.
 */
export function LanguageSwitcher({
  language,
  path,
  className,
}: {
  language: LanguageCode;
  /** The current path, so every option returns the reader to this page. */
  path: string;
  className?: string;
}) {
  const current = LANGUAGES.find((entry) => entry.code === language) ?? LANGUAGES[0]!;

  return (
    <details className={`group relative ${className ?? ""}`}>
      <summary
        className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border-strong px-3 text-label font-medium transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [&::-webkit-details-marker]:hidden"
        aria-label={NAV_LANGUAGE_LABELS[language].change}
      >
        <span aria-hidden>🌐</span>
        <span lang={current.code} dir={current.dir}>{current.endonym}</span>
      </summary>

      <ul
        className="absolute end-0 z-50 mt-2 grid w-56 grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-2 shadow-soft"
        aria-label={NAV_LANGUAGE_LABELS[language].label}
      >
        {LANGUAGES.map((entry) => (
          <li key={entry.code}>
            <Link
              href={withLanguage(path, entry.code)}
              /*
               * NEVER prefetch these. Twelve links to twelve full destination
               * hubs, prefetched on load, is twelve page payloads nobody
               * asked for — and once this control moved from one page body
               * into the global navigation it became twelve on EVERY page.
               * Measured: it pushed `/destinations/sikkim/monasteries/dubdi`
               * past a 30s `domcontentloaded` in `qa:discovery`, which is how
               * it was found. A reader opens this list deliberately; the one
               * language they then click is the only one worth fetching.
               */
              prefetch={false}
              hrefLang={entry.code}
              lang={entry.code}
              dir={entry.dir}
              aria-current={entry.code === language ? "true" : undefined}
              className={`block rounded-lg px-2.5 py-1.5 text-caption transition-colors hover:bg-surface-muted ${
                entry.code === language ? "bg-surface-muted font-medium text-primary" : "text-muted"
              }`}
            >
              {entry.endonym}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
