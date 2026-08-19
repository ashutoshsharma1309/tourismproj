import guidesJson from "@/data/generated/audio-guides.json";

/**
 * Audio guides produced by the Heritage Audio Agent (scripts/heritage-audio-agent.mjs).
 *
 * Scripts are assembled from verified record fields — no generative prose — and
 * narrated by a system speech engine. Both facts are disclosed in the player.
 */
export interface AudioGuide {
  monasterySlug: string;
  language: string;
  label: string;
  audioUrl: string;
  transcript: string;
  words: number;
  durationSeconds: number;
  withinTargetDuration: boolean;
  languagePurityCheck: string;
  signal: { peak: number; rms: number; silenceRatio: number; clippedRatio: number };
  qa: { technical: string; language: string; quality: string };
  voice: string;
  engine: string;
  machineGenerated: boolean;
  /** Voice-model credit, where the licence requires it. */
  attribution: string | null;
  translationReviewed: boolean | null;
  generatedAt: string;
}

export const audioGuides = guidesJson as AudioGuide[];

export function getAudioGuides(slug: string): AudioGuide[] {
  /*
   * Ordered, and filtered to the published set. Sorting here rather than in the
   * player means every monastery lists its languages in the same order, and a
   * retired language whose audio is still on disk can never reappear in the
   * selector just because its row survived in the generated JSON.
   */
  const rank = new Map<string, number>(LANGUAGE_ORDER.map((code, i) => [code, i]));
  return audioGuides
    .filter((g) => g.monasterySlug === slug && rank.has(g.language))
    .sort((a, b) => (rank.get(a.language) ?? 99) - (rank.get(b.language) ?? 99));
}

/**
 * Languages requested for the platform that cannot yet be produced, with the
 * specific blocker. Surfaced in the UI so the gap is visible, not hidden.
 */
export const BLOCKED_AUDIO_LANGUAGES = [
  {
    code: "bh",
    label: "Bhutia (Sikkimese)",
    blocker:
      "An official language of Sikkim with no speech voice in any engine available to this project.",
  },
  {
    code: "lep",
    label: "Lepcha",
    blocker:
      "The language of Sikkim's earliest inhabitants. No TTS engine supports it, and its script has no synthesis support.",
  },
  {
    code: "as",
    label: "Assamese",
    blocker:
      "No Assamese voice exists in macOS speech or in Piper's 50 languages. Reaching it needs a multi-gigabyte model this 8 GB machine cannot run.",
  },
  {
    code: "dz",
    label: "Dzongkha",
    blocker:
      "No voice available, and no Dzongkha speaker to review a translation about Buddhist practice.",
  },
] as const;

/**
 * Languages offered to visitors from outside the region, rather than languages
 * of Sikkim.
 *
 * Sikkim's own languages are Nepali, Bhutia, Lepcha and Limbu. English and
 * Hindi serve domestic visitors; German, French and Spanish serve the
 * international ones. None of the five is a language of Sikkim, and the UI says
 * so rather than implying the archive speaks in the region's own voice.
 */
export const VISITOR_LANGUAGES = ["de", "fr", "es"] as const;

/**
 * The order languages appear in the selector.
 *
 * Fixed rather than derived from the data, so the guide for one monastery does
 * not list its languages in a different order from the next.
 */
export const LANGUAGE_ORDER = ["en", "hi", "de", "fr", "es"] as const;

/**
 * Retired from the public selector on 2026-08-19.
 *
 * Nepali and Bengali guides were generated and shipped, and their audio is
 * archived under reports/audio-archive/ together with the records that
 * described them. They are listed here so the removal is a documented decision
 * rather than a gap someone later mistakes for an oversight.
 */
export const RETIRED_LANGUAGES = [
  {
    code: "ne",
    label: "नेपाली",
    retiredAt: "2026-08-19",
    reason:
      "Nepali is a language of Sikkim and its removal is a real loss. It was retired because the platform's language set was refocused on the visitors it actually receives — domestic and international — and no Nepali speaker was available to review the narration. The audio is archived, not deleted.",
  },
  {
    code: "bn",
    label: "বাংলা",
    retiredAt: "2026-08-19",
    reason:
      "Bengali served visitors arriving through West Bengal. Retired in the same pass; the benchmark could never measure it, since no speech recogniser available here transcribes Bengali reliably enough to score.",
  },
] as const;
