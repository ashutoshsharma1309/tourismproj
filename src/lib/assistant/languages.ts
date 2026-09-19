/**
 * What the TerraStory Guide can do in each language — measured, not assumed.
 *
 * FOUR SEPARATE QUESTIONS
 * -----------------------
 *   interface  — the product's own UI strings exist in this language
 *                (lib/i18n/dictionary.ts carries all twenty).
 *   answers    — the Guide can word an answer in it. English answers come
 *                straight from the records. Every other language is written
 *                by the language model FROM those English records, so it is
 *                marked as a model translation wherever it appears.
 *   voiceInput — speech-to-text accepts it. The configured recogniser is
 *                Whisper large-v3; Odia is not among its languages, so voice
 *                input is not offered for Odia rather than mis-transcribed.
 *   recorded   — a person-reviewed recorded audio guide exists (Sikkim's
 *                monasteries only, from data/audio.ts).
 *
 * Spoken answers are a fifth question that cannot be settled here: they use a
 * voice the traveller's own device provides, and whether one exists for Tamil
 * or Odia depends on that device. The interface asks the browser at runtime
 * and says "no voice on this device for this language" rather than reading
 * Tamil text with an English voice.
 *
 * Languages the product does not yet offer at all (Assamese, Urdu, Sanskrit)
 * are listed as such, not quietly mapped to a neighbour.
 */

export interface LanguageCapability {
  code: string;
  label: string;
  nativeLabel: string;
  interface: boolean;
  answers: "records" | "model-translation" | "none";
  voiceInput: boolean;
  recordedGuides: boolean;
  /** BCP-47 tag a device voice would be looked up by. */
  speechTag: string;
}

/** Whisper large-v3's languages, restricted to those that matter here. */
const WHISPER = new Set(["en", "hi", "bn", "ne", "ta", "te", "kn", "ml", "mr", "gu", "pa", "ja", "ko", "zh", "ar", "ru", "de", "fr", "es", "as", "ur", "sa"]);

/** Languages with a recorded monastery audio guide (data/audio.ts). */
const RECORDED = new Set(["ar", "bn", "de", "en", "es", "fr", "hi", "ja", "ko", "ne", "ru", "zh"]);

const PLATFORM: [code: string, label: string, native: string, tag: string][] = [
  ["en", "English", "English", "en-IN"],
  ["hi", "Hindi", "हिन्दी", "hi-IN"],
  ["bn", "Bengali", "বাংলা", "bn-IN"],
  ["ne", "Nepali", "नेपाली", "ne-NP"],
  ["ta", "Tamil", "தமிழ்", "ta-IN"],
  ["te", "Telugu", "తెలుగు", "te-IN"],
  ["kn", "Kannada", "ಕನ್ನಡ", "kn-IN"],
  ["ml", "Malayalam", "മലയാളം", "ml-IN"],
  ["mr", "Marathi", "मराठी", "mr-IN"],
  ["gu", "Gujarati", "ગુજરાતી", "gu-IN"],
  ["pa", "Punjabi", "ਪੰਜਾਬੀ", "pa-IN"],
  ["or", "Odia", "ଓଡ଼ିଆ", "or-IN"],
  ["ja", "Japanese", "日本語", "ja-JP"],
  ["ko", "Korean", "한국어", "ko-KR"],
  ["zh", "Chinese", "中文", "zh-CN"],
  ["ar", "Arabic", "العربية", "ar"],
  ["ru", "Russian", "Русский", "ru-RU"],
  ["de", "German", "Deutsch", "de-DE"],
  ["fr", "French", "Français", "fr-FR"],
  ["es", "Spanish", "Español", "es-ES"],
];

export const GUIDE_LANGUAGES: LanguageCapability[] = PLATFORM.map(([code, label, nativeLabel, speechTag]) => ({
  code,
  label,
  nativeLabel,
  interface: true,
  answers: code === "en" ? "records" : "model-translation",
  voiceInput: WHISPER.has(code),
  recordedGuides: RECORDED.has(code),
  speechTag,
}));

/** Asked for, not offered yet — listed so the gap is visible, not hidden. */
export const NOT_YET_OFFERED: { code: string; label: string; reason: string }[] = [
  { code: "as", label: "Assamese", reason: "The product's interface has no Assamese strings yet." },
  { code: "ur", label: "Urdu", reason: "The product's interface has no Urdu strings yet, and right-to-left layout is only verified for Arabic." },
  { code: "sa", label: "Sanskrit", reason: "The product's interface has no Sanskrit strings, and no device voice for it has been verified." },
];

export function capabilityFor(code: string): LanguageCapability {
  return GUIDE_LANGUAGES.find((l) => l.code === code) ?? GUIDE_LANGUAGES[0]!;
}

export function isGuideLanguage(code: string): boolean {
  return GUIDE_LANGUAGES.some((l) => l.code === code);
}
