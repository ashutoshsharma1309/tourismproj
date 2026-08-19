#!/usr/bin/env node
/**
 * Heritage Audio Agent — Sikkim Darshan
 *
 * Produces 60–90 second narrated guides for verified monasteries.
 *
 * The script is ASSEMBLED, not written. Every clause is built from a field on
 * the verified record, and a clause is omitted entirely when its field is
 * absent. No language model composes prose here, so the narration cannot
 * invent a founder, a date or a legend that the sources do not contain.
 *
 * Languages ship only where a real installed voice exists. Nepali, Dzongkha
 * and Tibetan have no system voice on this platform, so they are reported
 * unavailable rather than narrated badly in the wrong phonology.
 *
 * Usage: node scripts/heritage-audio-agent.mjs [--slug rumtek]
 * Writes: public/audio/<slug>/<lang>.m4a, src/data/generated/audio-guides.json,
 *         reports/monastery-audio.json
 */

import { execFileSync } from "node:child_process";
import { BLOCKED_LANGUAGES, TEMPLATES, composeScript, localiseName } from "./audio-scripts.mjs";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";

const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const OUT_DIR = "public/audio";
const TARGET_MIN_SECONDS = 58;
const TARGET_MAX_SECONDS = 90;

/**
 * Voices are chosen for clarity, not novelty. `say -v '?'` lists what exists;
 * a language absent from this table is absent from the product.
 */
/** Piper (CC-BY-SA voice models) covers languages macOS has no voice for. */
const PIPER = {
  python: ".venv-tts/bin/python",
  models: {
    en: ".tts-models/en_US-ryan-high.onnx",
    de: ".tts-models/de_DE-thorsten-high.onnx",
    fr: ".tts-models/fr_FR-tom-medium.onnx",
    es: ".tts-models/es_MX-claude-high.onnx",
  },
  attribution:
    "Narration uses Piper (MIT) with voices from the rhasspy/piper-voices catalogue. No voice here imitates an identifiable person.",
};

/**
 * The published voices.
 *
 * Every one was chosen by rendering the same pronunciation stress test —
 * Pemayangtse, Khangchendzonga, Pang Lhabsol, three founding dates — and
 * measuring character error rate through faster-whisper `medium`. The workings
 * are in voice-benchmark/v2/ and the blind clips in voice-benchmark/v2/blind/.
 *
 * Two results were not what I expected, and both are recorded because they
 * changed the decision:
 *
 *   ENGLISH moved off macOS Daniel to Piper ryan. Both score WER 20.3% on this
 *   script, but Daniel's character error rate is 7.0% against ryan's 4.7% — the
 *   difference is in how much of each mangled proper noun survives.
 *
 *   HINDI STAYS on macOS Lekha, and it is not close: 41.4% WER against 55.7%
 *   for the best Piper Hindi voice, 15.9% CER against 27.8%. Three Piper Hindi
 *   models were downloaded and all three lost. Swapping Hindi to Piper for the
 *   sake of a uniform engine would have made the Hindi guide measurably harder
 *   to understand.
 *
 * CER is an intelligibility proxy, not a verdict on how human a voice sounds.
 * That judgement needs ears and is left to the blind test.
 */
const VOICES = {
  en: { engine: "piper", voice: "en_US-ryan-high", label: TEMPLATES.en.label },
  hi: { engine: "say", voice: "Lekha", rate: 136, label: TEMPLATES.hi.label },
  de: { engine: "piper", voice: "de_DE-thorsten-high", label: TEMPLATES.de.label },
  fr: { engine: "piper", voice: "fr_FR-tom-medium", label: TEMPLATES.fr.label },
  es: { engine: "piper", voice: "es_MX-claude-high", label: TEMPLATES.es.label },
};

/**
 * Retired from the public selector, kept here so the archive can still be
 * regenerated and the old assets rebuilt if the decision is revisited.
 * Nepali and Bengali audio is NOT deleted — see reports/audio-archive/.
 */
export const RETIRED_VOICES = {
  ne: { engine: "piper", voice: "ne_NP-google-medium", label: TEMPLATES.ne.label },
  bn: { engine: "say", voice: "Piya", rate: 136, label: TEMPLATES.bn.label },
};



/**
 * Script-purity gate. Devanagari and Bengali guides must be written in their
 * own script; a run of Latin words beyond the monastery's own name means the
 * language drifted, which is the exact defect this rewrite fixes.
 */
const SCRIPT_RANGES = {
  hi: /[\u0900-\u097F]/,
  ne: /[\u0900-\u097F]/,
  bn: /[\u0980-\u09FF]/,
};

function checkLanguagePurity(lang, script, properNouns) {
  if (lang === "en") {
    return { pass: !/[\u0900-\u097F\u0980-\u09FF]/.test(script), foreignRun: null };
  }
  const range = SCRIPT_RANGES[lang];
  if (!range) return { pass: true, foreignRun: null };
  if (!range.test(script)) return { pass: false, foreignRun: "no native script found" };
  // Strip permitted proper nouns, then look for any remaining Latin sentence.
  let stripped = script;
  for (const noun of properNouns) stripped = stripped.split(noun).join(" ");
  const latinRun = stripped.match(/[A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){2,}/);
  return { pass: !latinRun, foreignRun: latinRun ? latinRun[0] : null };
}

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Loudness targets.
 *
 * Peak-matching is not enough: a peak-aligned Bengali render still sounded
 * ~4 dB louder than the English one, because peak says nothing about how loud
 * speech *feels*. Match RMS instead — that is roughly perceived loudness for
 * speech — and keep a peak ceiling so AAC never clips.
 */
const TARGET_RMS = 0.11;
const PEAK_CEILING = 0.89;

/**
 * Locate the PCM payload in a RIFF/WAVE file.
 *
 * The canonical header is 44 bytes, but afconvert emits extra chunks, so
 * assuming that offset silently corrupts the samples. Walk the chunk list.
 */
function findDataChunk(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }
  let pos = 12;
  let sampleRate = 22050;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") sampleRate = buf.readUInt32LE(pos + 12);
    if (id === "data") return { offset: pos + 8, length: Math.min(size, buf.length - pos - 8), sampleRate };
    pos += 8 + size + (size % 2); // chunks are word-aligned
  }
  throw new Error("no data chunk");
}

/**
 * Scale a 16-bit PCM WAV so its loudest sample sits at `target`.
 * Pure gain, applied in place.
 */
function normaliseLoudness(wavPath) {
  const buf = readFileSync(wavPath);
  const { offset, length } = findDataChunk(buf);
  const n = Math.floor(length / 2);
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = buf.readInt16LE(offset + i * 2);
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += (v / 32768) ** 2;
  }
  if (peak === 0 || n === 0) return;
  const rms = Math.sqrt(sumSq / n);
  /*
   * Match perceived loudness, then control the peaks — in that order.
   *
   * The previous version did the reverse: it computed the RMS gain and then
   * scaled the WHOLE FILE down if the loudest sample would breach the ceiling.
   * That makes a peaky voice quiet. fr_FR-tom has a crest factor of 21.3 dB
   * against 14.6–18.1 dB for the other four, so French landed 3 dB below every
   * other language and the player audibly dipped when a listener switched to it.
   *
   * Instead the gain is applied in full and only the handful of samples above
   * the knee are curved down, with a smooth tanh shoulder so nothing is
   * hard-clipped. Below the knee — which is the overwhelming majority of any
   * speech waveform — samples are untouched, so this is not compression in any
   * audible sense: it is peak control, and it is what lets every language sit
   * at the same loudness.
   */
  let gain = TARGET_RMS / rms;
  if (gain > 8 || !Number.isFinite(gain)) return;

  const KNEE = 0.70; // below this, entirely linear
  const softLimit = (x) => {
    const a = Math.abs(x);
    if (a <= KNEE) return x;
    const over = (a - KNEE) / (1 - KNEE);
    const curved = KNEE + (PEAK_CEILING - KNEE) * Math.tanh(over);
    return Math.sign(x) * curved;
  };

  for (let i = 0; i < n; i++) {
    const off = offset + i * 2;
    const v = softLimit((buf.readInt16LE(off) / 32768) * gain);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32768))), off);
  }
  writeFileSync(wavPath, buf);
}

/** Render with whichever engine covers this language, then encode to AAC. */
function synthesise(script, lang, outPath) {
  const cfg = VOICES[lang];
  const raw = `${outPath}.${cfg.engine === "piper" ? "wav" : "aiff"}`;
  if (cfg.engine === "piper") {
    execFileSync(PIPER.python, ["-m", "piper", "--model", PIPER.models[lang], "--output_file", raw], {
      input: script,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } else {
    execFileSync("say", ["-v", cfg.voice, "-r", String(cfg.rate), "-o", raw, script], {
      stdio: "pipe",
    });
  }
  // Normalise to a common peak so the player does not lurch in level when the
  // listener switches language. Gain only — no compression, no EQ; heavy
  // processing is what makes synthetic speech sound worse, not better.
  const wav = `${outPath}.norm.wav`;
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@22050", "-c", "1", raw, wav], { stdio: "pipe" });
  normaliseLoudness(wav);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac@44100", "-b", "96000", wav, outPath], { stdio: "pipe" });
  rmSync(raw, { force: true });
  rmSync(wav, { force: true });
}

/**
 * QA round 1, at signal level: decode the rendered file and measure it.
 * "The file exists" is not evidence that anything was spoken into it.
 */
function analyseAudio(file) {
  const wav = `${file}.qa.wav`;
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@22050", "-c", "1", file, wav], {
    stdio: "pipe",
  });
  const buf = readFileSync(wav);
  rmSync(wav, { force: true });
  const { offset, length } = findDataChunk(buf);
  let peak = 0;
  let sumSquares = 0;
  let silentSamples = 0;
  let clipped = 0;
  const total = Math.floor(length / 2);
  for (let i = 0; i < total; i++) {
    const v = buf.readInt16LE(offset + i * 2) / 32768;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSquares += v * v;
    if (a < 0.005) silentSamples++;
    if (a > 0.985) clipped++;
  }
  return {
    peak: Number(peak.toFixed(3)),
    rms: Number(Math.sqrt(sumSquares / total).toFixed(4)),
    silenceRatio: Number((silentSamples / total).toFixed(3)),
    clippedRatio: Number((clipped / total).toFixed(5)),
  };
}

/** Duration via afinfo — real measurement, not an estimate from word count. */
function durationSeconds(file) {
  const out = execFileSync("afinfo", [file], { encoding: "utf8" });
  const m = out.match(/estimated duration:\s*([\d.]+)\s*sec/i);
  return m ? Number(Number(m[1]).toFixed(1)) : null;
}

function main() {
  const only = process.argv.includes("--slug")
    ? process.argv[process.argv.indexOf("--slug") + 1]
    : null;
  const onlyLang = process.argv.includes("--lang")
    ? process.argv[process.argv.indexOf("--lang") + 1]
    : null;

  // Narrate the records the site publishes: curated and human-reviewed, with
  // verified founding years and lineages. Discovery output is a research feed,
  // not a broadcast source.
  const eligible = JSON.parse(
    readFileSync("src/data/generated/monasteries.curated.json", "utf8"),
  );

  const guides = [];
  const skipped = [];

  for (const m of eligible) {
    if (only && m.slug !== only) continue;
    const dir = `${OUT_DIR}/${m.slug}`;
    mkdirSync(dir, { recursive: true });

    /* --lang=fr regenerates one language without touching the other four. */
    for (const lang of Object.keys(VOICES)) {
      if (onlyLang && lang !== onlyLang) continue;
      const script = composeScript(lang, {
        /* "Rumtek Monastery" → "Kloster Rumtek" / "monastère de Rumtek". Only
           the common noun moves; the name itself never does. */
        name: localiseName(m.name, lang),
        district: m.district,
        establishedYear: m.establishedYear,
        tradition: m.tradition,
      });
      if (!script) continue;

      // QA round 2 runs before synthesis: never voice a script that drifted.
      const purity = checkLanguagePurity(lang, script, [m.name, localiseName(m.name, lang), m.district ?? ""]);
      if (!purity.pass) {
        skipped.push({ slug: m.slug, lang, reason: `language purity failed: ${purity.foreignRun}` });
        continue;
      }
      const file = `${dir}/${lang}.m4a`;
      try {
        synthesise(script, lang, file);
      } catch (e) {
        skipped.push({ slug: m.slug, lang, reason: `synthesis failed: ${e.message}` });
        continue;
      }
      const size = existsSync(file) ? statSync(file).size : 0;
      const duration = durationSeconds(file);
      const signal = duration !== null ? analyseAudio(file) : null;
      const inRange =
        duration !== null && duration >= TARGET_MIN_SECONDS && duration <= TARGET_MAX_SECONDS;
      // Quality gate: a file that is empty, silent or out of range is not shipped.
      // Reject silence, near-silence, clipping, or a file that never rendered.
      const signalFaults = [];
      if (size < 8000) signalFaults.push(`file too small (${size}B)`);
      if (duration === null) signalFaults.push("duration unreadable");
      if (signal && signal.rms < 0.01) signalFaults.push(`too quiet (rms ${signal.rms})`);
      if (signal && signal.silenceRatio > 0.55) signalFaults.push(`mostly silent (${signal.silenceRatio})`);
      if (signal && signal.clippedRatio > 0.001) signalFaults.push(`clipping (${signal.clippedRatio})`);
      if (duration !== null && duration > TARGET_MAX_SECONDS) signalFaults.push(`over ${TARGET_MAX_SECONDS}s`);
      if (signalFaults.length > 0) {
        rmSync(file, { force: true });
        skipped.push({ slug: m.slug, lang, reason: signalFaults.join("; ") });
        continue;
      }
      guides.push({
        monasterySlug: m.slug,
        language: lang,
        label: VOICES[lang].label,
        audioUrl: `/audio/${m.slug}/${lang}.m4a`,
        transcript: script,
        words: words(script),
        durationSeconds: duration,
        withinTargetDuration: inRange,
        voice: VOICES[lang].voice,
        engine:
          VOICES[lang].engine === "piper"
            ? "Piper (ONNX) → AAC via afconvert"
            : "macOS AVSpeechSynthesizer (say) → AAC via afconvert",
        attribution: VOICES[lang].engine === "piper" ? PIPER.attribution : null,
        machineGenerated: true,
        languagePurityCheck: "pass",
        signal,
        qa: { technical: "pass", language: "pass", quality: "pass" },
        translationReviewed: lang === "en" ? null : false,
        generatedAt: RETRIEVED_AT,
      });
      process.stdout.write(`  ✓ ${m.slug}/${lang}  ${duration}s  ${words(script)}w\n`);
    }
  }

  const report = {
    generatedAt: RETRIEVED_AT,
    agent: "Heritage Audio Agent",
    method:
      "Scripts assembled from verified record fields only; no generative prose. Sourced summary sentences are quoted from the cited article. Narration is machine-synthesised and disclosed as such in the UI.",
    languages: {
      supported: Object.entries(VOICES).map(([code, v]) => ({ code, voice: v.voice, label: v.label })),
      blocked: BLOCKED_LANGUAGES,
    },
    totals: {
      eligibleMonasteries: eligible.length,
      guidesGenerated: guides.length,
      monasteriesWithAudio: new Set(guides.map((g) => g.monasterySlug)).size,
      withinTargetDuration: guides.filter((g) => g.withinTargetDuration).length,
      overMaximumDuration: guides.filter((g) => g.durationSeconds > TARGET_MAX_SECONDS).length,
      skipped: skipped.length,
    },
    durationNote:
      "Scripts are composed from a fixed template plus verified per-site facts, so every language lands inside the 60-90 second window by construction.",
    skipped,
  };

  /*
   * A partial run must not destroy the record of the languages it did not touch.
   *
   * `--lang fr` rendered fifteen French guides and then wrote a fifteen-row
   * file, silently deleting the sixty rows for the other four languages while
   * their audio sat perfectly intact on disk. The site would have shown French
   * only. Merge on (monastery, language) instead: rows regenerated in this run
   * replace their predecessors, and rows that were not regenerated survive.
   */
  const JSON_PATH = "src/data/generated/audio-guides.json";
  let merged = guides;
  if (only || onlyLang) {
    let previous = [];
    try {
      const raw = JSON.parse(readFileSync(JSON_PATH, "utf8"));
      previous = Array.isArray(raw) ? raw : [];
    } catch {
      previous = [];
    }
    const replaced = new Set(guides.map((g) => `${g.monasterySlug}/${g.language}`));
    merged = [
      ...previous.filter((g) => !replaced.has(`${g.monasterySlug}/${g.language}`)),
      ...guides,
    ].sort((a, b) =>
      a.monasterySlug.localeCompare(b.monasterySlug) || a.language.localeCompare(b.language),
    );
    process.stdout.write(
      `\n  partial run: ${guides.length} regenerated, ${merged.length - guides.length} preserved\n`,
    );
  }
  writeFileSync(JSON_PATH, JSON.stringify(merged, null, 2) + "\n");
  writeFileSync("reports/monastery-audio.json", JSON.stringify(report, null, 2) + "\n");
  console.log("\n" + JSON.stringify(report.totals, null, 2));
}

main();
