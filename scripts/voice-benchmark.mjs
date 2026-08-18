#!/usr/bin/env node
/**
 * Voice Benchmark Harness — Sikkim Darshan
 *
 * Renders one standard narration per candidate voice, then scores each render
 * on measurements rather than opinion:
 *
 *   INTELLIGIBILITY  Whisper transcribes the rendered audio; the transcript is
 *                    compared to the script it was asked to say. Word and
 *                    character error rate. This is the load-bearing metric —
 *                    if an ASR model cannot recover the words, a listener in a
 *                    monastery courtyard will not either.
 *   SIGNAL           peak, RMS, silence ratio, clipping, sample rate.
 *   PACE             words per minute against a 130-160 target.
 *
 * NATURALNESS IS NOT SCORED HERE, and no MOS number is invented. Judging
 * whether a voice sounds human requires listening, which this harness cannot
 * do. It renders every candidate to voice-benchmark/<lang>/<version>.wav so a
 * person can listen and rate them, and it reports what it can actually
 * measure.
 *
 * Usage: node scripts/voice-benchmark.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "voice-benchmark";
const PY = ".venv-tts/bin/python";
const MODELS = ".tts-models";

/**
 * The standard passage. Same content in every language so scores compare, and
 * written the way the production scripts are written — short sentences, real
 * punctuation, no run-ons — because script shape drives prosody as much as the
 * model does.
 */
const PASSAGE = {
  en: "Welcome to Rumtek Monastery. It stands in Gangtok district, in the Indian state of Sikkim, in the eastern Himalaya. It was established in 1966, and belongs to the Karma Kagyu lineage. A Sikkimese gompa is a working community as much as a monument. Behind its painted doors are prayer halls, a library of block printed texts, and quarters where monks study and debate.",
  hi: "रुमटेक मठ में आपका स्वागत है। यह पूर्वी हिमालय में स्थित भारतीय राज्य सिक्किम के गंगटोक ज़िले में है। इसकी स्थापना 1966 में हुई थी, और यह कर्म काग्यू परंपरा से जुड़ा हुआ है। सिक्किम का गोम्पा केवल एक स्मारक नहीं, बल्कि एक जीवित समुदाय है। इसके चित्रित द्वारों के पीछे प्रार्थना कक्ष हैं।",
  ne: "रुमटेक गुम्बामा तपाईंलाई स्वागत छ। यो पूर्वी हिमालयको भारतीय राज्य सिक्किमको गान्तोक जिल्लामा अवस्थित छ। यसको स्थापना 1966 मा भएको थियो, र यो कर्म काग्यू परम्परासँग सम्बन्धित छ। सिक्किमको गुम्बा केवल एउटा स्मारक होइन, बरु एउटा जीवित समुदाय हो।",
  bn: "রুমটেক মঠে আপনাকে স্বাগতম। এটি পূর্ব হিমালয়ের ভারতীয় রাজ্য সিকিমের গ্যাংটক জেলায় অবস্থিত। এটি 1966 সালে প্রতিষ্ঠিত হয়েছিল, এবং কর্ম কাগ্যু ধারার সঙ্গে যুক্ত। সিকিমের একটি গোম্পা কেবল স্মারক নয়, একটি জীবন্ত সম্প্রদায়।",
};

/** Every candidate, including the incumbent, so improvement is demonstrable. */
const CANDIDATES = {
  en: [
    { id: "v0-say-daniel", engine: "say", voice: "Daniel", rate: 128, incumbent: true },
    { id: "v1-piper-ryan-high", engine: "piper", model: "en_US-ryan-high" },
    { id: "v2-piper-cori-high", engine: "piper", model: "en_GB-cori-high" },
  ],
  hi: [
    { id: "v0-say-lekha", engine: "say", voice: "Lekha", rate: 136, incumbent: true },
    { id: "v1-piper-pratham", engine: "piper", model: "hi_IN-pratham-medium" },
    { id: "v2-piper-rohan", engine: "piper", model: "hi_IN-rohan-medium" },
    { id: "v3-piper-priyamvada", engine: "piper", model: "hi_IN-priyamvada-medium" },
  ],
  ne: [
    { id: "v0-piper-google", engine: "piper", model: "ne_NP-google-medium", incumbent: true },
    { id: "v1-piper-chitwan", engine: "piper", model: "ne_NP-chitwan-medium" },
  ],
  bn: [
    { id: "v0-say-piya", engine: "say", voice: "Piya", rate: 136, incumbent: true },
    { id: "v1-piper-google", engine: "piper", model: "bn_BD-google-medium" },
  ],
};

/** Whisper language codes for the ASR check. */
const ASR_LANG = { en: "en", hi: "hi", ne: "ne", bn: "bn" };

function render(lang, cand, outWav) {
  if (cand.engine === "piper") {
    execFileSync(PY, ["-m", "piper", "--model", `${MODELS}/${cand.model}.onnx`, "--output_file", outWav], {
      input: PASSAGE[lang],
      stdio: ["pipe", "pipe", "pipe"],
    });
  } else {
    const aiff = `${outWav}.aiff`;
    execFileSync("say", ["-v", cand.voice, "-r", String(cand.rate), "-o", aiff, PASSAGE[lang]], { stdio: "pipe" });
    execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@22050", "-c", "1", aiff, outWav], { stdio: "pipe" });
    execFileSync("rm", ["-f", aiff]);
  }
}

/** Signal measurements straight off the PCM. */
function signal(wav) {
  const buf = readFileSync(wav);
  let peak = 0, sumSq = 0, silent = 0, clipped = 0;
  const n = Math.floor((buf.length - 44) / 2);
  for (let i = 0; i < n; i++) {
    const v = buf.readInt16LE(44 + i * 2) / 32768;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += v * v;
    if (a < 0.005) silent++;
    if (a > 0.985) clipped++;
  }
  const sr = buf.readUInt32LE(24);
  return {
    peak: +peak.toFixed(3),
    rms: +Math.sqrt(sumSq / n).toFixed(4),
    silenceRatio: +(silent / n).toFixed(3),
    clippedRatio: +(clipped / n).toFixed(5),
    sampleRate: sr,
    durationSeconds: +(n / sr).toFixed(1),
  };
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const manifest = [];

  for (const [lang, cands] of Object.entries(CANDIDATES)) {
    const dir = `${OUT}/${lang}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/script.txt`, PASSAGE[lang] + "\n");

    for (const cand of cands) {
      const wav = `${dir}/${cand.id}.wav`;
      process.stdout.write(`  rendering ${lang}/${cand.id} … `);
      try {
        render(lang, cand, wav);
      } catch (e) {
        console.log(`FAILED (${e.message.split("\n")[0]})`);
        manifest.push({ lang, ...cand, error: e.message.split("\n")[0] });
        continue;
      }
      const sig = signal(wav);
      const words = PASSAGE[lang].trim().split(/\s+/).length;
      const wpm = +(words / (sig.durationSeconds / 60)).toFixed(0);
      console.log(`${sig.durationSeconds}s ${wpm}wpm`);
      manifest.push({
        lang,
        id: cand.id,
        engine: cand.engine,
        voice: cand.voice ?? cand.model,
        incumbent: Boolean(cand.incumbent),
        file: wav,
        words,
        wpm,
        ...sig,
      });
    }
  }

  writeFileSync(`${OUT}/renders.json`, JSON.stringify({ passage: PASSAGE, asrLang: ASR_LANG, renders: manifest }, null, 2) + "\n");
  console.log(`\n  ${manifest.filter((m) => !m.error).length} renders written to ${OUT}/`);
  console.log("  next: node scripts/voice-score.mjs  (runs ASR and scores intelligibility)");
}

main();
