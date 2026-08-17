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
  return audioGuides.filter((g) => g.monasterySlug === slug);
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
 * Bengali is offered for visitors, not as a language of Sikkim.
 *
 * Sikkim's own languages are Nepali, Bhutia, Lepcha and Limbu. Bengali is
 * spoken in neighbouring West Bengal, through which most domestic visitors
 * arrive. Labelling it a "local" language would be wrong, so the UI says
 * plainly what it is.
 */
export const VISITOR_LANGUAGES = ["bn"] as const;
