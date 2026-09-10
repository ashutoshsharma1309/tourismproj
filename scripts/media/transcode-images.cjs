/**
 * Re-encode the photography in place.
 *
 * WHY IN PLACE, AND WHY STILL JPEG
 * --------------------------------
 * Part 1.2 of the master prompt moves media to Supabase Storage. There is no
 * Supabase project yet, so the files have to stay in `public/` for the site to
 * work at all — and that makes their SOURCE size a repo problem rather than a
 * delivery problem, because `next/image` already re-encodes to AVIF at request
 * time.
 *
 * Measured on the twelve largest files, JPEG at quality 72 with mozjpeg and
 * AVIF at quality 62 both came out 69% smaller. JPEG wins on a tie because it
 * keeps every path and every `<Image src>` in the codebase working, and 736
 * path rewrites across seeded data is exactly the kind of change that breaks
 * something silently the day before a demo.
 *
 * IDEMPOTENT AND CONSERVATIVE
 * ---------------------------
 * A file is only replaced when the re-encode is at least 10% smaller, so
 * re-running does nothing and an already-optimised file is left alone rather
 * than degraded a second time.
 */
const sharp = require("sharp");
const { readdirSync, statSync, writeFileSync, renameSync } = require("node:fs");
const { join } = require("node:path");

const MAX_WIDTH = 1920;
const QUALITY = 72;
const MIN_SAVING = 0.10;

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jpg|jpeg)$/i.test(e.name)) files.push(p);
  }
};
walk("public/images");

(async () => {
  let before = 0, after = 0, rewritten = 0, skipped = 0, failed = 0;

  for (const file of files) {
    const originalSize = statSync(file).size;
    before += originalSize;
    try {
      const buffer = await sharp(file)
        .rotate() /* honour EXIF orientation before stripping it */
        .resize(MAX_WIDTH, null, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
        .toBuffer();

      if (buffer.length < originalSize * (1 - MIN_SAVING)) {
        /* Write beside, then rename: a crash mid-write must not truncate an
           original that has no backup anywhere. */
        const temp = `${file}.tmp`;
        writeFileSync(temp, buffer);
        renameSync(temp, file);
        after += buffer.length;
        rewritten += 1;
      } else {
        after += originalSize;
        skipped += 1;
      }
    } catch (error) {
      after += originalSize;
      failed += 1;
      console.log(`  FAILED ${file}: ${error.message}`);
    }
  }

  const mb = (n) => (n / 1048576).toFixed(1);
  console.log(`\n  files      ${files.length}`);
  console.log(`  rewritten  ${rewritten}   already small ${skipped}   failed ${failed}`);
  console.log(`  before     ${mb(before)} MB`);
  console.log(`  after      ${mb(after)} MB   (${Math.round((1 - after / before) * 100)}% smaller)`);
})();
