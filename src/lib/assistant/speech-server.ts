import "server-only";

import { createHash } from "node:crypto";

import { cachedSpeechUrl, hasSpeechStorage, storeSpeech } from "@/db/storage";

import { metric } from "./metrics";

/**
 * Server-side text-to-speech, behind one function, with a content-addressed
 * cache.
 *
 * The configured adapter is Groq's Orpheus English voice. It is OFF unless
 * `ASSISTANT_TTS_PROVIDER=groq` and `ASSISTANT_TTS_VOICE` are set — the model
 * requires its terms to be accepted in the Groq console first, and a voice
 * name is not something to guess. Until then every spoken answer uses the
 * traveller's own device voice (components/guide/GuideSpeech.tsx), and the
 * capabilities endpoint says server speech is not configured.
 *
 * Generated audio is stored once per (text, language, voice) under
 * `<language>/<sha256>.wav` in the private `assistant-audio` bucket and served
 * through a short-lived signed link, so an answer read aloud twice is
 * synthesised once. The spoken text is never logged.
 */

export type SpeechOutcome =
  | { ok: true; url: string; cached: boolean; provider: string; voice: string; language: string }
  | { ok: false; reason: "not-configured" | "unsupported-language" | "unavailable" };

export function serverSpeechConfigured(): { provider: string; voice: string; languages: string[] } | null {
  if (process.env.ASSISTANT_TTS_PROVIDER !== "groq" || !process.env.ASSISTANT_TTS_VOICE || !process.env.GROQ_API_KEY) return null;
  return { provider: "groq-orpheus", voice: process.env.ASSISTANT_TTS_VOICE, languages: ["en"] };
}

/** The cache key: the same words, language and voice always map to the same file. */
export function speechCacheKey(text: string, language: string, voice: string): string {
  return createHash("sha256").update(JSON.stringify([language, voice, text])).digest("hex");
}

export async function generateSpeech(input: { text: string; language: string }): Promise<SpeechOutcome> {
  const configured = serverSpeechConfigured();
  if (!configured) return { ok: false, reason: "not-configured" };
  if (!configured.languages.includes(input.language)) return { ok: false, reason: "unsupported-language" };
  if (!hasSpeechStorage) return { ok: false, reason: "not-configured" };

  const hash = speechCacheKey(input.text, input.language, configured.voice);
  const path = `${input.language}/${hash}.wav`;
  const started = performance.now();
  const existing = await cachedSpeechUrl(path);
  if (existing) {
    metric({ event: "tts", provider: configured.provider, cache: "hit", ok: true, ms: Math.round(performance.now() - started) });
    return { ok: true, url: existing, cached: true, provider: configured.provider, voice: configured.voice, language: input.language };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice: configured.voice, input: input.text.slice(0, 1200), response_format: "wav" }),
    });
    if (!response.ok) {
      metric({ event: "tts", provider: configured.provider, cache: "miss", ok: false, reason: `http-${response.status}` });
      return { ok: false, reason: "unavailable" };
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength < 1000) return { ok: false, reason: "unavailable" };
    const url = await storeSpeech(path, audio, "audio/wav");
    metric({ event: "tts", provider: configured.provider, cache: "miss", ok: Boolean(url), ms: Math.round(performance.now() - started) });
    return url
      ? { ok: true, url, cached: false, provider: configured.provider, voice: configured.voice, language: input.language }
      : { ok: false, reason: "unavailable" };
  } catch {
    metric({ event: "tts", provider: configured.provider, ok: false, reason: "error" });
    return { ok: false, reason: "unavailable" };
  }
}
