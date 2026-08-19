/**
 * Find photographs that appear more than once inside the same gallery.
 *
 * Distinct from src/data/gallery-rejections.ts, which removes frames that show
 * the WRONG subject. These show the right subject — twice. Commons holds
 * several near-identical uploads of the same view (a photographer's burst, or
 * the same file re-uploaded under a second name), and the agent collected them
 * as separate photographs. The result is a "6 frames" gallery containing four
 * subjects, and a home-page rail offering the same courtyard twice.
 *
 * Comparison is an 8×8 difference hash on the decoded image, so it catches
 * re-encodes and crops that a byte checksum misses.
 *
 * THE THRESHOLD IS DELIBERATELY LOW, AND HAND-CONFIRMED PAIRS ARE LISTED.
 * Hamming distance does not cleanly separate "same photograph" from "same
 * building, different photograph". Two frames of the Kewzing shrine sit at
 * h=11 and are plainly the same shot; two frames of Tashiding sit at h=10 and
 * are a three-quarter view from the path and a frontal view from the courtyard
 * — different compositions, both worth keeping. Widening the threshold far
 * enough to catch the first discards the second.
 *
 * So the automatic cut is 6, where every pair found is unambiguous, and pairs
 * above it are added to CONFIRMED_DUPLICATES only after somebody has looked at
 * both images.
 *
 *   node scripts/dedupe-galleries.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const THRESHOLD = Number(process.env.DHASH_THRESHOLD ?? 6);
const doc = JSON.parse(readFileSync("src/data/generated/site-galleries.json", "utf8"));

/** Above-threshold pairs confirmed by eye. Each was opened and compared. */
const CONFIRMED_DUPLICATES = [
  {
    galleryKey: "monastery/kewzing",
    file: "File:Interiors of the Kewzing Monastery at Kewzing Village, South Sikkim 02.jpg",
    hamming: 11,
    note: "Same altar, same lighting, a step further back. Opened both.",
  },
  {
    galleryKey: "monastery/kewzing",
    file: "File:Kewzing Monastery at Kewzing Village, South Sikkim 02.jpg",
    hamming: 7,
    note: "Same facade, same day, same light, one step closer. Opened both.",
  },
];

/* dHash via Python/Pillow — no JS image decoder is available here. */
const hashes = JSON.parse(
  execFileSync(".venv-tts/bin/python", ["-c", `
import json, sys
from PIL import Image
out = {}
for path in json.load(sys.stdin):
    try:
        im = Image.open("public" + path).convert("L").resize((9, 8), Image.LANCZOS)
        px = list(im.getdata())
        bits = ""
        for r in range(8):
            for c in range(8):
                bits += "1" if px[r*9+c] > px[r*9+c+1] else "0"
        out[path] = bits
    except Exception:
        out[path] = None
print(json.dumps(out))
`], { input: JSON.stringify(Object.values(doc.galleries).flatMap(g => g.photos.map(p => p.localPath))), maxBuffer: 64 * 1024 * 1024 }).toString(),
);

const distance = (a, b) => {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
};

const dupes = [];
for (const [key, gal] of Object.entries(doc.galleries)) {
  const kept = [];
  for (const photo of gal.photos) {
    const h = hashes[photo.localPath];
    if (!h) { kept.push({ photo, h }); continue; }
    const twin = kept.find((k) => k.h && distance(k.h, h) <= THRESHOLD);
    if (twin) {
      dupes.push({
        galleryKey: key,
        file: photo.file,
        duplicateOf: twin.photo.file,
        hamming: distance(twin.h, h),
      });
    } else {
      kept.push({ photo, h });
    }
  }
}

for (const extra of CONFIRMED_DUPLICATES) {
  if (!dupes.some((d) => d.file === extra.file)) {
    dupes.push({ ...extra, duplicateOf: "(confirmed by inspection)" });
  }
}

writeFileSync("src/data/generated/gallery-duplicates.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), threshold: THRESHOLD, duplicates: dupes }, null, 2)}\n`);

const byGal = {};
for (const d of dupes) (byGal[d.galleryKey] ??= []).push(d);
for (const [k, rows] of Object.entries(byGal)) {
  console.log(`${k}  (${rows.length} duplicate${rows.length > 1 ? "s" : ""})`);
  rows.forEach(r => console.log(`    h=${r.hamming}  ${r.file.slice(0, 62)}`));
}
console.log(`\n${dupes.length} duplicate frames across ${Object.keys(byGal).length} galleries`);
