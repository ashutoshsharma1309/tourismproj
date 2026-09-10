/**
 * Render every candidate voice reading the same standardised script.
 *
 * Fairness is the whole point: one script per language, identical text, identical
 * post-processing, so anything that differs between two renders is the voice.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";

const OUT = "voice-benchmark/v2/renders";
const MODELS = ".tts-models";
const PIPER = ".venv-tts/bin/piper";
const scripts = JSON.parse(readFileSync("voice-benchmark/v2/test-scripts.json", "utf8"));

/** Candidates. Piper quality tier is the project's own label, carried through. */
const CANDIDATES = [
  /* The seven languages added in the expansion. Piper is thin for several of
     them — one voice only for Bengali, Japanese and Korean — so the macOS
     voices are entered as genuine candidates rather than as fallbacks. */
  ["bn", "bn_BD-google-medium", "female", "medium", "piper"],
  ["bn", "say-Piya", "female", "system", "say"],
  ["ne", "ne_NP-chitwan-medium", "male", "medium", "piper"],
  ["ne", "ne_NP-google-medium", "female", "medium", "piper"],
  ["ja", "ja_JA-hi_fi_captain-medium", "male", "medium", "piper"],
  ["ja", "say-Kyoko", "female", "system", "say"],
  ["ko", "ko_KR-kss-medium", "female", "medium", "piper"],
  ["ko", "say-Yuna", "female", "system", "say"],
  ["zh", "zh_CN-huayan-medium", "female", "medium", "piper"],
  ["zh", "zh_CN-chaowen-medium", "female", "medium", "piper"],
  ["zh", "zh_CN-xiao_ya-medium", "female", "medium", "piper"],
  ["zh", "say-Tingting", "female", "system", "say"],
  ["ar", "ar_JO-kareem-medium", "male", "medium", "piper"],
  ["ar", "say-Majed", "male", "system", "say"],
  ["ru", "ru_RU-denis-medium", "male", "medium", "piper"],
  ["ru", "ru_RU-dmitri-medium", "male", "medium", "piper"],
  ["ru", "ru_RU-irina-medium", "female", "medium", "piper"],
  ["ru", "say-Milena", "female", "system", "say"],
];

mkdirSync(OUT, { recursive: true });
const results = [];

for (const [lang, model, character, quality, engine] of CANDIDATES) {
  const text = scripts[lang];
  const wav = `${OUT}/${lang}__${model}.wav`;
  const started = Date.now();
  try {
    if (engine === "say") {
      const voice = model.replace(/^say-/, "");
      const aiff = `${wav}.aiff`;
      execFileSync("say", ["-v", voice, "-r", "135", "-o", aiff, text], { stdio: "pipe", timeout: 180000 });
      execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@22050", "-c", "1", aiff, wav], { stdio: "pipe" });
      rmSync(aiff, { force: true });
    } else {
      execFileSync(PIPER, ["-m", `${MODELS}/${model}.onnx`, "-f", wav], {
        input: text,
        stdio: ["pipe", "ignore", "pipe"],
        timeout: 180000,
      });
    }
  } catch (error) {
    process.stdout.write(`  FAIL ${lang} ${model}: ${String(error).slice(0, 90)}\n`);
    results.push({ lang, model, character, quality, engine, ok: false });
    continue;
  }
  const ms = Date.now() - started;
  const bytes = statSync(wav).size;
  /* 16-bit mono PCM: 44-byte header, then 2 bytes per sample. */
  const rate = engine === "say" ? 22050 : (JSON.parse(readFileSync(`${MODELS}/${model}.onnx.json`, "utf8")).audio?.sample_rate ?? 22050);
  const seconds = (bytes - 44) / 2 / rate;
  const words = /^(ja|zh|ko)$/.test(lang) ? text.length / 2 : text.split(/\s+/).length;
  results.push({
    lang, model, character, quality, engine, ok: true,
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
