/**
 * Download Piper voice models for the public language set.
 *
 * Piper is MIT-licensed and runs entirely locally; the voices themselves carry
 * their own licences, recorded in MODEL_CARD beside the weights. Nothing here
 * clones a real person: these are released synthetic voices from the Piper
 * project's own catalogue.
 *
 * Quality tiers are the project's, not ours. Worth knowing before selection:
 * German has a `high` model, Spanish has two, and French has none — the best
 * French available is `medium`, which is a fact about the catalogue and is
 * reported rather than papered over.
 */
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

const BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main";
const DIR = ".tts-models";

/** Candidate set: 2–3 per language, mixed voice character where available. */
const VOICES = [
  ["de", "de_DE", "thorsten", "high"],
  ["de", "de_DE", "thorsten", "medium"],
  ["de", "de_DE", "eva_k", "x_low"],
  ["fr", "fr_FR", "tom", "medium"],
  ["fr", "fr_FR", "siwis", "medium"],
  ["fr", "fr_FR", "upmc", "medium"],
  ["es", "es_MX", "claude", "high"],
  ["es", "es_AR", "daniela", "high"],
  ["es", "es_ES", "davefx", "medium"],
];

await mkdir(DIR, { recursive: true });

for (const [lang, locale, name, quality] of VOICES) {
  const stem = `${locale}-${name}-${quality}`;
  for (const ext of [".onnx", ".onnx.json"]) {
    const target = `${DIR}/${stem}${ext}`;
    try {
      const s = await stat(target);
      if (s.size > 1000) { process.stdout.write(`  have ${stem}${ext}\n`); continue; }
    } catch { /* not present */ }
    const url = `${BASE}/${lang}/${locale}/${name}/${quality}/${stem}${ext}`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) { process.stdout.write(`  FAIL ${stem}${ext} (${res.status})\n`); continue; }
    await pipeline(res.body, createWriteStream(target));
    const s = await stat(target);
    process.stdout.write(`  got  ${stem}${ext}  ${(s.size / 1048576).toFixed(1)} MB\n`);
  }
}
process.stdout.write("\ndone\n");
