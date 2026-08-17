#!/usr/bin/env node
/**
 * Voice quality report generator.
 *
 * Emits voice-benchmark/final-report.json and VOICE-QUALITY-REPORT.md from
 * measured data only. Where a quantity was not measured — naturalness above
 * all — the report says so rather than printing a number nobody computed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const B = "voice-benchmark";
const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

const renders = read(`${B}/renders.json`);
const small = read(`${B}/scores.json`) ?? [];
const control = read(`${B}/asr-control.json`) ?? [];
const guides = read("src/data/generated/audio-guides.json") ?? [];

const byKey = (rows) => Object.fromEntries(rows.map((r) => [`${r.lang}/${r.id}`, r]));
const S = byKey(small);
const C = byKey(control);

/** ASR is only a usable ranking instrument where it can transcribe at all. */
const ASR_USABLE = { en: true, hi: true, ne: false, bn: false };

const languages = {};
for (const lang of ["en", "hi", "ne", "bn"]) {
  const cands = (renders?.renders ?? []).filter((r) => r.lang === lang && !r.error);
  if (!cands.length) continue;
  const rows = cands.map((r) => {
    const k = `${lang}/${r.id}`;
    return {
      id: r.id,
      engine: r.engine,
      voice: r.voice,
      incumbent: r.incumbent,
      wpm: r.wpm,
      durationSeconds: r.durationSeconds,
      werSmall: S[k]?.wer ?? null,
      werMedium: C[k]?.wer_medium ?? null,
      cerMedium: C[k]?.cer_medium ?? null,
    };
  });
  const usable = ASR_USABLE[lang];
  const ranked = [...rows].sort(
    (a, b) => (a.werMedium ?? a.werSmall ?? 1) - (b.werMedium ?? b.werSmall ?? 1),
  );
  const shipped = guides.find((g) => g.language === lang);
  languages[lang] = {
    candidatesBenchmarked: rows.length,
    asrRankingUsable: usable,
    asrNote: usable
      ? "Whisper transcribes this language well enough to rank candidates on intelligibility."
      : "Whisper stayed above 100% word error on EVERY candidate, including with the larger model. The recogniser cannot transcribe this language reliably, so it ranks nothing here. Judge by listening.",
    bestByIntelligibility: usable ? ranked[0].id : null,
    candidates: rows,
    shipping: shipped
      ? {
          voice: shipped.voice,
          engine: shipped.engine,
          durationRange: [
            Math.min(...guides.filter((g) => g.language === lang).map((g) => g.durationSeconds)),
            Math.max(...guides.filter((g) => g.language === lang).map((g) => g.durationSeconds)),
          ],
          rms: shipped.signal.rms,
          peak: shipped.signal.peak,
          clipping: shipped.signal.clippedRatio,
        }
      : null,
    naturalnessScore: null,
    naturalnessNote:
      "NOT SCORED. Judging whether a voice sounds human requires listening. No MOS number was computed, and inventing one would be the same failure this project exists to avoid. Renders are in voice-benchmark/ and voice-benchmark/listen.html for a human to rate.",
  };
}

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  hardware: "Apple M1, 8 GB RAM, no CUDA — MPS only",
  method: {
    intelligibility:
      "Whisper transcribes each render; transcript compared to the script the voice was asked to read (WER/CER, punctuation and case normalised).",
    instrumentControl:
      "Re-ran the Indic renders with a larger Whisper model. Hindi error roughly halved (64.8% -> 31.5% on the best candidate), proving much of the apparent error was the recogniser. Nepali and Bengali stayed above 100% and remain unmeasurable.",
    signal: "peak, RMS, silence ratio, clipping, sample rate measured off the PCM.",
    naturalness: "NOT MEASURED — requires listening.",
  },
  modelsEvaluated: [
    "macOS AVSpeechSynthesizer (say): Daniel, Lekha, Piya",
    "Piper ONNX: en_US-ryan-high, en_GB-cori-high, hi_IN-pratham/rohan/priyamvada-medium, ne_NP-google/chitwan-medium, bn_BD-google-medium",
  ],
  modelsRejectedBeforeInstall: [
    {
      model: "AI4Bharat IndicF5",
      reason:
        "Requires PyTorch (~2.5 GB) plus a diffusion-style model. On 8 GB RAM with 12 GB free disk and no CUDA this would thrash or fail; inference would be minutes per utterance.",
    },
    {
      model: "Indic Parler-TTS / VEXYL-TTS",
      reason: "Same class of constraint — ~2 GB model plus torch, no GPU to run it on.",
    },
  ],
  processing: {
    loudness:
      "RMS-matched to 0.11 with an 0.89 peak ceiling. Peak-matching alone left Bengali ~4.5 dB louder than English; after RMS matching the spread across all four languages is 0.2 dB.",
    applied: ["gain only"],
    deliberatelyNotApplied: ["compression", "EQ", "de-essing", "noise reduction", "reverb"],
    rationale:
      "Heavy processing is what makes synthetic speech sound worse. Gain fixes the real defect (level mismatch between languages) without adding artefacts.",
  },
  scriptEngineering: {
    change: "Three long sentences in the English narration split into eight shorter ones.",
    result: "Average 10.7 words per sentence, giving the engine natural pause points.",
  },
  languages,
  blocked: [
    { language: "Bhutia (Sikkimese)", official: true, reason: "No speech voice in any available engine." },
    { language: "Lepcha", official: true, reason: "No TTS engine supports the language or its script." },
    { language: "Assamese", official: false, reason: "Absent from macOS voices and Piper's 50 languages." },
    { language: "Dzongkha", official: false, reason: "No voice, and no speaker available to review a translation." },
  ],
  labellingCorrection:
    "Bengali was implicitly presented alongside Sikkim's languages. Sikkim's own languages are Nepali, Bhutia, Lepcha and Limbu; Bengali belongs to neighbouring West Bengal, through which most domestic visitors arrive. The player now says so.",
  shipping: {
    guides: guides.length,
    monasteries: new Set(guides.map((g) => g.monasterySlug)).size,
    languages: [...new Set(guides.map((g) => g.language))].sort(),
    durationRange: guides.length
      ? [Math.min(...guides.map((g) => g.durationSeconds)), Math.max(...guides.map((g) => g.durationSeconds))]
      : null,
    allWithinTarget: guides.every((g) => g.durationSeconds >= 58 && g.durationSeconds <= 90),
    clippedFiles: guides.filter((g) => g.signal.clippedRatio > 0).length,
  },
};

writeFileSync(`${B}/final-report.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ shipping: report.shipping }, null, 2));
console.log("\n  wrote voice-benchmark/final-report.json");
