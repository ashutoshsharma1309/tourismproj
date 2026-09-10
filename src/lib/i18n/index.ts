import { DICTIONARIES, type MessageKey } from "./dictionary";
import { DEFAULT_LANGUAGE, resolveLanguage, type LanguageCode } from "./languages";

export { LANGUAGES, DEFAULT_LANGUAGE, resolveLanguage, isLanguageCode, languageMeta } from "./languages";
export type { LanguageCode, LanguageMeta } from "./languages";
export type { MessageKey } from "./dictionary";

/**
 * One interface string, in one language.
 *
 * Falls back to English rather than to the key. A reader who has chosen
 * Korean and meets an English button has met a small gap; one who meets
 * `section.stays` has met a bug, and the whole page stops looking trustworthy
 * over one missing entry.
 */
export function translate(key: MessageKey, language: LanguageCode): string {
  return DICTIONARIES[language]?.[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key];
}

/**
 * A bound translator, so a component reads `t("section.food")` instead of
 * threading the language through every call.
 */
export function translator(language: LanguageCode) {
  return (key: MessageKey) => translate(key, language);
}

/**
 * The language a page was asked for.
 *
 * URL-as-state, matching the planner and discovery: the language lives in the
 * query string, so a translated page is a shareable link and no client
 * JavaScript is needed to hold the choice. A cookie would have been invisible
 * in a URL and would have made every static page vary by request.
 */
export function languageFromParams(
  params: Record<string, string | string[] | undefined> | undefined,
): LanguageCode {
  const raw = params?.lang;
  return resolveLanguage(Array.isArray(raw) ? raw[0] : raw);
}

export { withLanguage, languageFromPath } from "./paths";
