/**
 * Render every candidate voice reading the same standardised script.
 *
 * Fairness is the whole point: one script per language, identical text, identical
 * post-processing, so anything that differs between two renders is the voice.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

const OUT = "voice-benchmark/v2/renders";
const MODELS = ".tts-models";
const PIPER = ".venv-tts/bin/piper";
const scripts = JSON.parse(readFileSync("voice-benchmark/v2/test-scripts.json", "utf8"));

/** Candidates. Piper quality tier is the project's own label, carried through. */
const CANDIDATES = [
  ["en", "en_US-ryan-high", "male", "high"],
  ["en", "en_GB-cori-high", "female", "high"],
  ["hi", "hi_IN-pratham-medium", "male", "medium"],
  ["hi", "hi_IN-priyamvada-medium", "female", "medium"],
  ["hi", "hi_IN-rohan-medium", "male", "medium"],
  ["de", "de_DE-thorsten-high", "male", "high"],
  ["de", "de_DE-thorsten-medium", "male", "medium"],
  ["de", "de_DE-eva_k-x_low", "female", "x_low"],
  ["fr", "fr_FR-tom-medium", "male", "medium"],
  ["fr", "fr_FR-siwis-medium", "female", "medium"],
  ["fr", "fr_FR-upmc-medium", "mixed", "medium"],
  ["es", "es_MX-claude-high", "male", "high"],
  ["es", "es_AR-daniela-high", "female", "high"],
  ["es", "es_ES-davefx-medium", "male", "medium"],
];

mkdirSync(OUT, { recursive: true });
const results = [];

for (const [lang, model, character, quality] of CANDIDATES) {
  const text = scripts[lang];
  const wav = `${OUT}/${lang}__${model}.wav`;
  const started = Date.now();
  try {
    execFileSync(PIPER, ["-m", `${MODELS}/${model}.onnx`, "-f", wav], {
      input: text,
      stdio: ["pipe", "ignore", "pipe"],
      timeout: 180000,
    });
  } catch (error) {
    process.stdout.write(`  FAIL ${lang} ${model}: ${String(error).slice(0, 90)}\n`);
    results.push({ lang, model, character, quality, ok: false });
    continue;
  }
  const ms = Date.now() - started;
  const bytes = statSync(wav).size;
  /* 16-bit mono PCM: 44-byte header, then 2 bytes per sample. */
  const rate = JSON.parse(readFileSync(`${MODELS}/${model}.onnx.json`, "utf8")).audio?.sample_rate ?? 22050;
  const seconds = (bytes - 44) / 2 / rate;
  const words = text.split(/\s+/).length;
  results.push({
    lang, model, character, quality, ok: true,
    seconds: Number(seconds.toFixed(2)),
    wordsPerMinute: Number(((words / seconds) * 60).toFixed(1)),
    generationMs: ms,
    realtimeFactor: Number((ms / 1000 / seconds).toFixed(2)),
    sampleRate: rate,
  });
  process.stdout.write(
    `  ok  ${lang}  ${model.padEnd(26)} ${seconds.toFixed(1)}s  ${((words/seconds)*60).toFixed(0)} wpm  gen ${(ms/1000).toFixed(1)}s\n`,
  );
}

writeFileSync("voice-benchmark/v2/renders.json", `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`\n${results.filter(r => r.ok).length}/${results.length} rendered\n`);
