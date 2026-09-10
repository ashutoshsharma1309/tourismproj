/**
 * Re-fetch every capsule photograph at the resolution its source actually has.
 *
 * Measured before this ran: 414 files under `public/images/capsule`, EVERY one
 * below 1600px, median 1280, max 1280. The retrieval had pinned Commons
 * thumbnails at 1280px and the downloads inherited that ceiling, so the
 * largest photograph on a destination page — its hero — was a third of the
 * pixels its own source offered.
 *
 * `upgrade-capsule-images.mjs` has already rewritten each record's URL to
 * min(2560, original width). This fetches those, re-encodes once at a quality
 * that survives a 2560px hero, and refuses to write anything SMALLER than
 * what is already on disk — a source that turns out to be 900px keeps the
 * file it has rather than regressing it.
 *
 * Sequential, with a pause and a real User-Agent. 155 files is not a load to
 * put on Commons in parallel.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = ".data/capsules";
const OUT = "public/images/capsule";
const PAUSE_MS = 400;
const QUALITY = 82;
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fetched = 0, kept = 0, missing = 0, failed = 0;
let bytesBefore = 0, bytesAfter = 0;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const capsule = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  const dest = capsule.destinationId;
  for (const place of capsule.places ?? []) {
    if (!place.image?.url) continue;
    const target = join(OUT, dest, `${place.id}.jpg`);
    if (!existsSync(target)) { missing++; continue; }

    const current = await sharp(target).metadata();
    if ((place.image.width ?? 0) <= current.width) { kept++; continue; }

    try {
      const res = await fetch(place.image.url, { headers: { "User-Agent": UA } });
      if (!res.ok) { console.log(`  ${res.status} ${dest}/${place.id}`); failed++; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const out = await sharp(buf).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
      const after = await sharp(out).metadata();
      /* Never regress a file. A source that resolved smaller than what is
         already on disk is a source we should not have followed. */
      if (after.width <= current.width) { kept++; continue; }
      bytesBefore += statSync(target).size;
      await writeFile(target, out);
      bytesAfter += out.length;
      fetched++;
      if (fetched % 25 === 0) process.stdout.write(`  ${fetched} refetched\n`);
    } catch (error) {
      console.log(`  failed ${dest}/${place.id}: ${error.message}`);
      failed++;
    }
    await sleep(PAUSE_MS);
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`refetched ${fetched}, kept ${kept}, absent ${missing}, failed ${failed}`);
console.log(`those files: ${mb(bytesBefore)} -> ${mb(bytesAfter)}`);
