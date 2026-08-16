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
  { code: "as", label: "Assamese", blocker: "No Assamese speech voice available." },
  { code: "dz", label: "Dzongkha", blocker: "No Dzongkha voice, and no Dzongkha speaker to review a translation about Buddhist practice." },
] as const;
