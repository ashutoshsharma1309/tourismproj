/**
 * The twelve languages the interface is offered in.
 *
 * WHY THESE TWELVE
 * ----------------
 * Twelve of them are not a new decision: Sikkim's audio guides have been
 * produced in exactly that set since Phase 11 (`LANGUAGE_ORDER` in
 * `src/data/audio.ts`), and the order here is the one its guide selector
 * uses. A product that narrates in twelve languages and renders its buttons
 * in one was only ever half translated.
 *
 * Eight more Indian languages bring the interface to twenty. They carry NO
 * audio — the audio registry is still the twelve, and the UI must say which
 * is which rather than implying a guide exists in Tamil because the buttons
 * are in Tamil.
 *
 * WHAT A LANGUAGE CHOICE DOES AND DOES NOT CHANGE
 * -----------------------------------------------
 * It changes the interface — navigation, headings, buttons, labels, and the
 * product's own explanatory prose. It does **not** change the archive. Every
 * summary, story and historical claim in this product is quoted from a named
 * source, and a machine translation of a quotation is no longer a quotation:
 * it is a paraphrase with a citation attached to it, which is precisely the
 * thing this project refuses to publish. So sourced text stays in the
 * language its source published it in, and the interface says so in the
 * reader's own language rather than letting them discover it.
 */

/** A language code the interface can be rendered in. */
export type LanguageCode =
  | "en" | "hi" | "bn" | "ne"
  | "ta" | "te" | "kn" | "ml" | "mr" | "gu" | "pa" | "or"
  | "ja" | "ko" | "zh" | "ar" | "ru"
  | "de" | "fr" | "es";

export interface LanguageMeta {
  code: LanguageCode;
  /** The name in the language itself — what a speaker looks for in a list. */
  endonym: string;
  /** The English name, for the `lang` attribute's benefit and for QA. */
  english: string;
  /** Writing direction. Arabic is the reason this field exists. */
  dir: "ltr" | "rtl";
}

/**
 * Fixed order, regional first, then international — the same order the audio
 * guide selector uses, so a reader never meets two different orderings of the
 * same twelve languages.
 */
export const LANGUAGES: readonly LanguageMeta[] = [
  { code: "en", endonym: "English",  english: "English",   dir: "ltr" },
  { code: "hi", endonym: "हिन्दी",     english: "Hindi",     dir: "ltr" },
  { code: "bn", endonym: "বাংলা",     english: "Bengali",   dir: "ltr" },
  { code: "ne", endonym: "नेपाली",    english: "Nepali",    dir: "ltr" },
  /* The eight added to reach twenty. India is the product's primary tourism
     market and ten of the fifteen destinations are Indian, so the languages
     its visitors actually read come before the international set. */
  { code: "ta", endonym: "தமிழ்",     english: "Tamil",     dir: "ltr" },
  { code: "te", endonym: "తెలుగు",    english: "Telugu",    dir: "ltr" },
  { code: "kn", endonym: "ಕನ್ನಡ",     english: "Kannada",   dir: "ltr" },
  { code: "ml", endonym: "മലയാളം",   english: "Malayalam", dir: "ltr" },
  { code: "mr", endonym: "मराठी",     english: "Marathi",   dir: "ltr" },
  { code: "gu", endonym: "ગુજરાતી",   english: "Gujarati",  dir: "ltr" },
  { code: "pa", endonym: "ਪੰਜਾਬੀ",    english: "Punjabi",   dir: "ltr" },
  { code: "or", endonym: "ଓଡ଼ିଆ",     english: "Odia",      dir: "ltr" },
  { code: "ja", endonym: "日本語",     english: "Japanese", dir: "ltr" },
  { code: "ko", endonym: "한국어",     english: "Korean",   dir: "ltr" },
  { code: "zh", endonym: "中文",       english: "Chinese",  dir: "ltr" },
  { code: "ar", endonym: "العربية",   english: "Arabic",   dir: "rtl" },
  { code: "ru", endonym: "Русский",   english: "Russian",  dir: "ltr" },
  { code: "de", endonym: "Deutsch",   english: "German",   dir: "ltr" },
  { code: "fr", endonym: "Français",  english: "French",   dir: "ltr" },
  { code: "es", endonym: "Español",   english: "Spanish",  dir: "ltr" },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]));

/** Whether a string is one of the twelve. */
export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && BY_CODE.has(value as LanguageCode);
}

/**
 * The language for a request.
 *
 * Unknown, absent and malformed all resolve to English rather than throwing:
 * a mistyped `?lang=` in a shared URL should show the reader a page, not an
 * error.
 */
export function resolveLanguage(value: unknown): LanguageCode {
  return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

export function languageMeta(code: LanguageCode): LanguageMeta {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LANGUAGE)!;
}
