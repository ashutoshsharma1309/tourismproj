import type { LanguageCode } from "./languages";

/**
 * The two strings the language control itself needs, and nothing else.
 *
 * WHY THIS DUPLICATES TWO ENTRIES FROM THE DICTIONARY
 * ---------------------------------------------------
 * The switcher lives in the navbar, which is a client component. Importing
 * `@/lib/i18n` for its labels pulled the WHOLE dictionary into the browser —
 * twenty languages of interface copy, Tamil and Malayalam paragraphs included,
 * shipped to every visitor so that one button could read "Language".
 *
 * That is the same lesson `nav-path.ts` records for the destination registry
 * and `ids.ts` for the capsule registry: a module is only as cheap as its
 * heaviest import. Two strings per language is about a kilobyte; the
 * dictionary is not.
 *
 * `qa:culture` asserts these stay in step with the dictionary they mirror.
 */
export const NAV_LANGUAGE_LABELS: Record<LanguageCode, { label: string; change: string }> = {
  en: { label: "Language", change: "Change language" },
  hi: { label: "भाषा", change: "भाषा बदलें" },
  bn: { label: "ভাষা", change: "ভাষা পরিবর্তন করুন" },
  ne: { label: "भाषा", change: "भाषा परिवर्तन गर्नुहोस्" },
  ja: { label: "言語", change: "言語を変更" },
  ko: { label: "언어", change: "언어 변경" },
  zh: { label: "语言", change: "更改语言" },
  ar: { label: "اللغة", change: "تغيير اللغة" },
  ru: { label: "Язык", change: "Сменить язык" },
  de: { label: "Sprache", change: "Sprache wechseln" },
  fr: { label: "Langue", change: "Changer de langue" },
  es: { label: "Idioma", change: "Cambiar idioma" },
  ta: { label: "மொழி", change: "மொழியை மாற்று" },
  te: { label: "భాష", change: "భాష మార్చండి" },
  kn: { label: "ಭಾಷೆ", change: "ಭಾಷೆ ಬದಲಾಯಿಸಿ" },
  ml: { label: "ഭാഷ", change: "ഭാഷ മാറ്റുക" },
  mr: { label: "भाषा", change: "भाषा बदला" },
  gu: { label: "ભાષા", change: "ભાષા બદલો" },
  pa: { label: "ਭਾਸ਼ਾ", change: "ਭਾਸ਼ਾ ਬਦਲੋ" },
  or: { label: "ଭାଷା", change: "ଭାଷା ବଦଳାନ୍ତୁ" },
};
