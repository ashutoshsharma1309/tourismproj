/**
 * Recompresses the vendored photography — Ney Heritage.
 *
 * The Commons originals arrive at up to 1.4 MB each. Next optimizes them per
 * request and caches the result, so the FIRST visitor pays the decode-resize
 * cost on every variant — and the hero is a `priority` image, which puts that
 * cost straight on LCP.
 *
 * Capping the long edge at 2048px and re-encoding as progressive mozjpeg keeps
 * every size the layout actually asks for (the widest `sizes` hint is 100vw)
 * while cutting the bytes the optimizer has to chew through.
 *
 * Idempotent: re-encoding an already-processed file is a no-op in practice
 * because the cap and quality are fixed, but it will not run unless the file is
 * larger than TARGET_MAX_BYTES or wider than MAX_EDGE.
 *
 * Usage: node scripts/optimize-images.mjs [--force]
 */

import sharp from "sharp";
import { readdirSync, statSync, renameSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "public/images";
const MAX_EDGE = 2048;
const QUALITY = 78;
const FORCE = process.argv.includes("--force");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : extname(e.name).toLowerCase() === ".jpg" ? [p] : [];
  });
}

const files = walk(ROOT);
let before = 0;
let after = 0;
let changed = 0;

for (const file of files) {
  const startSize = statSync(file).size;
  before += startSize;

  const meta = await sharp(file).metadata();
  const needsResize = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_EDGE;

  if (!FORCE && !needsResize && startSize < 400_000) {
    after += startSize;
    continue;
  }

  const tmp = `${file}.tmp`;
  await sharp(file)
    .rotate() // honour EXIF orientation before we strip it
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toFile(tmp);

  const endSize = statSync(tmp).size;
  if (endSize < startSize) {
    renameSync(tmp, file);
    after += endSize;
    changed++;
    const pct = (100 * (1 - endSize / startSize)).toFixed(0);
    console.log(
      `  ${file.replace(`${ROOT}/`, "").padEnd(26)} ${(startSize / 1024).toFixed(0).padStart(5)} KB -> ${(endSize / 1024).toFixed(0).padStart(5)} KB  (-${pct}%)  ${meta.width}x${meta.height}`,
    );
  } else {
    // Re-encoding made it bigger — keep the original.
    renameSync(tmp, `${tmp}.discard`);
    after += startSize;
  }
}

console.log(
  `\n${changed}/${files.length} recompressed. ${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(1)} MB`,
);
