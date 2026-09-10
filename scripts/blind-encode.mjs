/**
 * Encode the candidate renders as blind clips.
 *
 * Two things happen here, and both matter for a fair comparison:
 *
 * 1. LOUDNESS IS MATCHED FIRST. Raw Piper output ranged over 7.1 dB RMS across
 *    the fourteen candidates, and every one of them peaked at full scale with a
 *    handful of clipped samples. A listener comparing a louder render against a
 *    quieter one reliably prefers the louder one regardless of its quality, so
 *    comparing them unmatched would measure level, not voice. Gain only — no
 *    compression, EQ or de-essing, which is what makes synthetic speech worse.
 *
 * 2. LABELS REVEAL NOTHING. Clips are named by letter within a language. The
 *    listener cannot see the model, the quality tier or the voice's gender, all
 *    of which bias judgement. The mapping is written to blind-key.json, to be
 *    opened after listening and not before.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const TARGET_RMS = 0.11;  // matches the level the existing production audio was set to
const PEAK_CEILING = 0.89; // headroom so AAC encoding never clips

function findDataChunk(buf) {
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") return { start: off + 8, size };
    off += 8 + size + (size % 2);
  }
  throw new Error("no data chunk");
}

function normalise(src, dst) {
  const buf = readFileSync(src);
  const { start, size } = findDataChunk(buf);
  const n = Math.floor(size / 2);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(start + i * 2);

  let sumsq = 0;
  for (let i = 0; i < n; i++) { const v = samples[i] / 32768; sumsq += v * v; }
  const rms = Math.sqrt(sumsq / n);
  let gain = rms > 0 ? TARGET_RMS / rms : 1;

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(samples[i]) / 32768);
  if (peak * gain > PEAK_CEILING) gain = PEAK_CEILING / peak;

  const out = Buffer.from(buf);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-32768, Math.min(32767, Math.round(samples[i] * gain)));
    out.writeInt16LE(v, start + i * 2);
  }
  writeFileSync(dst, out);
  return { gain: Number(gain.toFixed(3)), rmsBefore: Number((20 * Math.log10(rms)).toFixed(2)) };
}

const ONLY = process.env.BLIND_LANGS ? new Set(process.env.BLIND_LANGS.split(",")) : null;
const scores = JSON.parse(readFileSync("voice-benchmark/v2/scores.json", "utf8"))
  .filter((r) => !ONLY || ONLY.has(r.lang));
mkdirSync("voice-benchmark/v2/blind", { recursive: true });

const byLang = {};
for (const row of scores) (byLang[row.lang] ??= []).push(row);

const key = {};
for (const [lang, rows] of Object.entries(byLang)) {
  rows.sort((a, b) => a.model.localeCompare(b.model)); // deterministic, NOT quality order
  rows.forEach((row, i) => {
    const label = String.fromCharCode(65 + i);
    const src = `voice-benchmark/v2/renders/${lang}__${row.model}.wav`;
    const tmp = `${src}.norm.wav`;
    const dst = `voice-benchmark/v2/blind/${lang}-${label}.m4a`;
    const { gain, rmsBefore } = normalise(src, tmp);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac@44100", "-b", "96000", tmp, dst], { stdio: "pipe" });
    key[`${lang}-${label}`] = {
      model: row.model, character: row.character, quality: row.quality,
      cer: row.cer, wer: row.wer, wpm: row.wordsPerMinute,
      rmsBeforeDbfs: rmsBefore, gainApplied: gain,
    };
    process.stdout.write(`  ${lang}-${label}  ${row.model.padEnd(26)} gain ×${gain}\n`);
  });
}
writeFileSync("voice-benchmark/v2/blind-key.json", `${JSON.stringify(key, null, 2)}\n`);
process.stdout.write(`\n${Object.keys(key).length} blind clips encoded\n`);
