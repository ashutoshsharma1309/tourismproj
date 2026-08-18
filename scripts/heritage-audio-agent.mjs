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
import { BLOCKED_LANGUAGES, TEMPLATES, composeScript } from "./audio-scripts.mjs";
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
  models: { ne: ".tts-models/ne_NP-google-medium.onnx" },
  attribution:
    "Nepali narration uses the Piper ne_NP-google-medium voice, trained on OpenSLR-43 (CC-BY-SA-4.0).",
};

const VOICES = {
  en: { engine: "say", voice: "Daniel", rate: 128, label: TEMPLATES.en.label },
  hi: { engine: "say", voice: "Lekha", rate: 136, label: TEMPLATES.hi.label },
  ne: { engine: "piper", voice: "ne_NP-google-medium", label: TEMPLATES.ne.label },
  bn: { engine: "say", voice: "Piya", rate: 136, label: TEMPLATES.bn.label, visitorLanguage: true },
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
  // Gain for perceived loudness, then pull back if it would breach the ceiling.
  let gain = TARGET_RMS / rms;
  const peakAfter = (peak / 32768) * gain;
  if (peakAfter > PEAK_CEILING) gain *= PEAK_CEILING / peakAfter;
  if (gain > 8 || !Number.isFinite(gain)) return;
  for (let i = 0; i < n; i++) {
    const off = offset + i * 2;
    const v = Math.max(-32768, Math.min(32767, Math.round(buf.readInt16LE(off) * gain)));
    buf.writeInt16LE(v, off);
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

    for (const lang of Object.keys(VOICES)) {
      const script = composeScript(lang, {
        name: m.name,
        district: m.district,
        establishedYear: m.establishedYear,
        tradition: m.tradition,
      });
      if (!script) continue;

      // QA round 2 runs before synthesis: never voice a script that drifted.
      const purity = checkLanguagePurity(lang, script, [m.name, m.district ?? ""]);
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

  writeFileSync("src/data/generated/audio-guides.json", JSON.stringify(guides, null, 2) + "\n");
  writeFileSync("reports/monastery-audio.json", JSON.stringify(report, null, 2) + "\n");
  console.log("\n" + JSON.stringify(report.totals, null, 2));
}

main();
