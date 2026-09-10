/**
 * The same resolution upgrade, for the culture and stay photographs.
 *
 * These were retrieved differently from the place photographs: their records
 * point at the ORIGINAL Commons file rather than a thumbnail, and the
 * downloader resized to 1280 on the way in. Measured: food 84, festival 53,
 * craft 40, stay 56 — 233 photographs, every one 1280px, while the sources
 * behind them run to several thousand.
 *
 * A Commons original at /commons/6/6a/X.jpg has its thumbnails at
 * /commons/thumb/6/6a/X.jpg/<width>px-X.jpg, so the derived URL needs no
 * extra lookup — only the width cap, which comes from the API in batches of
 * fifty, and the bucket rule those thumbnails are actually rendered at.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = ".data/culture";
const OUT = "public/images/capsule";
const BUCKETS = [1280, 1920];
const BATCH = 50, QUALITY = 82;
/*
 * 2.5s, not 400ms. Asking for a width Commons has not rendered before is a
 * THUMBNAIL GENERATION request, which is throttled far harder than serving a
 * cached file: at 400ms this run took 429 on 152 of 197 photographs. The
 * place images did not hit it because most of their 1920px renders already
 * existed in Wikimedia's cache.
 */
const PAUSE_MS = 2500;
const RETRIES = 3;
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fileTitle(page) {
  const m = /\/wiki\/(File:.+)$/.exec(page ?? "");
  return m ? decodeURIComponent(m[1]).replace(/_/g, " ") : null;
}

/**
 * This store holds BOTH shapes: 58 records point at the original file and 195
 * at an existing thumbnail. Handling only the first silently skipped the 195
 * and reported them as "kept", which read as "already at best resolution"
 * when it meant "not attempted".
 */
function thumbUrl(source, width) {
  if (/\/commons\/thumb\//.test(source)) {
    return /\/\d+px-/.test(source) ? source.replace(/\/\d+px-/, `/${width}px-`) : null;
  }
  const m = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/.exec(source);
  if (!m) return null;
  const [, base, a, b, name] = m;
  return `${base}/thumb/${a}/${b}/${name}/${width}px-${name}`;
}

const items = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const store = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  for (const record of [...(store.culture ?? []), ...(store.stays ?? [])]) {
    if (!record.image?.url) continue;
    const target = join(OUT, store.destinationId, `${record.kind}-${record.id}.jpg`);
    if (!existsSync(target)) continue;
    const title = fileTitle(record.image.commonsFilePage);
    if (!title) continue;
    items.push({ target, url: record.image.url, title });
  }
}
console.log(`${items.length} culture and stay photographs on disk`);

const sizes = new Map();
const titles = [...new Set(items.map((i) => i.title))];
for (let i = 0; i < titles.length; i += BATCH) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=size&titles=" +
    encodeURIComponent(titles.slice(i, i + BATCH).join("|"));
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const data = await res.json();
  for (const page of Object.values(data.query?.pages ?? {})) {
    if (page.imageinfo?.[0]?.width) sizes.set(page.title, page.imageinfo[0].width);
  }
  process.stdout.write(`  resolved ${Math.min(i + BATCH, titles.length)}/${titles.length}\n`);
  if (i + BATCH < titles.length) await sleep(1200);
}

let done = 0, kept = 0, failed = 0, before = 0, after = 0;
for (const { target, url, title } of items) {
  const source = sizes.get(title);
  const current = (await sharp(target).metadata()).width;
  const want = Math.max(...BUCKETS.filter((b) => b <= (source ?? 0)), BUCKETS[0]);
  if (!source || want <= current) { kept++; continue; }
  const thumb = thumbUrl(url, want);
  if (!thumb) { kept++; continue; }
  try {
    let res = null;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      res = await fetch(thumb, { headers: { "User-Agent": UA } });
      if (res.status !== 429) break;
      /* Honour Retry-After when it is sent; otherwise back off geometrically
         rather than retrying into the same wall. */
      const after = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 4000 * 2 ** attempt);
    }
    if (!res?.ok) { if (failed < 5) console.log(`  ${res?.status} ${thumb.slice(0, 110)}`); failed++; continue; }
    const out = await sharp(Buffer.from(await res.arrayBuffer()))
      .jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    if ((await sharp(out).metadata()).width <= current) { kept++; continue; }
    before += statSync(target).size;
    await writeFile(target, out);
    after += out.length;
    done++;
    if (done % 25 === 0) process.stdout.write(`  ${done} refetched\n`);
  } catch { failed++; }
  await sleep(PAUSE_MS);
}
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`refetched ${done}, kept ${kept}, failed ${failed}`);
console.log(`those files: ${mb(before)} -> ${mb(after)}`);
