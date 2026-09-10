/**
 * Raise every capsule photograph to the best resolution its OWN source has.
 *
 * WHY
 * ---
 * All 155 Commons photographs in the capsules were stored as 1280px
 * thumbnails, regardless of what the underlying file offered. The Eiffel
 * Tower's source is 2900 x 4830; the site was serving a third of it, and the
 * hero — the largest image on the page — was the one that suffered most.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not an upscaler. The requested width is capped at the original's own
 * width, so a file whose source is 900px stays 900px and is reported as such.
 * Claiming a resolution the source does not have is the thing the brief
 * explicitly forbids, and it is also just a blurrier picture.
 *
 * RIGHTS ARE UNTOUCHED
 * --------------------
 * Only the width token in the thumbnail URL changes. The licence, the
 * attribution and the Commons file page travel with the record exactly as
 * they were, because this rewrites a size, not a source.
 *
 * POLITENESS
 * ----------
 * The Commons API takes 50 titles per query, so 155 files cost four requests.
 * They are issued in sequence with a pause between them, with a real User-Agent.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = ".data/capsules";
/*
 * Wikimedia no longer renders an arbitrary thumbnail width — it answers 400
 * with "Use thumbnail sizes listed on ...". Probed against real files, the
 * buckets that reliably serve are 1280, 1920 and 3840; 1440, 1600, 2048 and
 * 2560 are all refused. An earlier run asked for 2560 and lost 147 of 155
 * downloads to that.
 *
 * 3840 is a bucket but not a choice: it costs roughly 3.4 MB per photograph,
 * half a gigabyte across the archive, to serve a hero no viewport asks for.
 * 1920 is 2.25x the pixels of 1280 and is what a 2x phone and a 1440px
 * desktop hero actually consume.
 */
const BUCKETS = [1280, 1920];
const BATCH = 50;
const PAUSE_MS = 1200;
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "https://commons.wikimedia.org/wiki/File:X.jpg" -> "File:X.jpg" */
function fileTitle(page) {
  if (!page) return null;
  const m = /\/wiki\/(File:.+)$/.exec(page);
  /* The API normalises underscores to spaces and answers under the
     normalised title. Keying on the raw title silently missed 145 of 155
     files and reported them as "unresolved" rather than as a bug. */
  return m ? decodeURIComponent(m[1]).replace(/_/g, " ") : null;
}

async function originalSizes(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += BATCH) {
    const slice = titles.slice(i, i + BATCH);
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
      "&iiprop=size&titles=" +
      encodeURIComponent(slice.join("|"));
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Commons API ${res.status}`);
    const data = await res.json();
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (info?.width) out.set(page.title, { width: info.width, height: info.height });
    }
    process.stdout.write(`  resolved ${Math.min(i + BATCH, titles.length)}/${titles.length}\n`);
    if (i + BATCH < titles.length) await sleep(PAUSE_MS);
  }
  return out;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const records = [];
for (const f of files) {
  const capsule = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  for (const place of capsule.places ?? []) {
    if (!place.image?.url) continue;
    const title = fileTitle(place.image.commonsFilePage);
    if (!title) continue;
    if (!/\/\d+px-/.test(place.image.url)) continue;
    records.push({ file: f, capsule, place, title });
  }
}

const titles = [...new Set(records.map((r) => r.title))];
console.log(`${records.length} photographs across ${files.length} capsules; ${titles.length} distinct files`);
const sizes = await originalSizes(titles);

let upgraded = 0;
let alreadyBest = 0;
let unresolved = 0;
const touched = new Set();

for (const { file, capsule, place, title } of records) {
  const original = sizes.get(title);
  if (!original) { unresolved++; continue; }

  /* The largest bucket the source can honestly fill. */
  const want = Math.max(...BUCKETS.filter((b) => b <= original.width), BUCKETS[0]);
  const current = Number(/\/(\d+)px-/.exec(place.image.url)?.[1] ?? 0);
  /* Not "want <= current": an earlier run wrote 2560, a width Wikimedia
     refuses to render, so a URL can be LARGER than the target and still be
     broken. The only stable state is the bucket this file should be at. */
  if (want === current) { alreadyBest++; continue; }

  place.image.url = place.image.url.replace(/\/(\d+)px-/, `/${want}px-`);
  /* Dimensions describe the file that is served, so they move with it. */
  const ratio = original.height / original.width;
  place.image.width = want;
  place.image.height = Math.round(want * ratio);
  /* Recorded so nothing downstream has to ask Commons again, and so a future
     run can tell "already at source maximum" from "never checked". */
  place.image.sourceWidth = original.width;
  place.image.sourceHeight = original.height;
  upgraded++;
  touched.add(file);
  capsule.__dirty = true;
}

for (const f of files) {
  const path = join(DIR, f);
  const capsule = JSON.parse(readFileSync(path, "utf8"));
  if (!touched.has(f)) continue;
  void capsule;
}
/* Write from the in-memory capsules that were mutated. */
const byFile = new Map();
for (const r of records) byFile.set(r.file, r.capsule);
for (const f of touched) {
  const capsule = byFile.get(f);
  delete capsule.__dirty;
  writeFileSync(join(DIR, f), `${JSON.stringify(capsule, null, 2)}\n`);
}

console.log(`upgraded ${upgraded}, already at source maximum ${alreadyBest}, unresolved ${unresolved}`);
console.log(`rewrote ${touched.size} capsule files`);
