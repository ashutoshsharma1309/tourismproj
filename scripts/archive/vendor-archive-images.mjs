/**
 * Bring the archive's photographs home.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * The catalogue's `mediaUrl` pointed at the original file on
 * upload.wikimedia.org, and next/image fetched each original on demand to
 * make every variant. Warming 9,191 variants produced 2,086 HTTP 429s —
 * Wikimedia throttling a burst of full-size fetches. That is the hammering
 * the project's own rules forbid, and it is also a page of broken images for
 * any visitor who arrives before the cache is warm.
 *
 * Every other module's photographs are local files under public/images,
 * transcoded by next/image from disk. The archive's are now the same: one
 * fetch per object, at the largest thumbnail bucket Commons will render
 * (1920, or 1280 where the source is smaller), re-encoded once, and stored
 * under public/images/archive/<destination>/<id>.jpg. The original URL is
 * kept on the record as `sourceUrl` — provenance moves with the file.
 *
 * Paced at 2.5s with Retry-After backoff, because a thumbnail Commons has
 * not rendered before is a GENERATION request and is throttled hard.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIR = "src/data/generated/archive";
const OUT = "public/images/archive";
const CREDITS = "src/data/generated/image-credits.json";
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";
const PAUSE_MS = 2500;
const QUALITY = 82;
const BUCKETS = [1280, 1920];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** /commons/a/ab/File.jpg -> /commons/thumb/a/ab/File.jpg/<w>px-File.jpg */
function thumbUrl(original, width) {
  /*
   * The Commons API's `url` carries a tracking query —
   * `?utm_source=commons.wikimedia.org&utm_campaign=imageinfo…` — and the
   * first run glued it into the file name, producing a thumbnail URL that
   * Commons answered with 400 for every one of Agra's twelve objects. The
   * script then "dropped" them. Strip it before deriving anything.
   */
  const clean = original.split("?")[0];
  const m = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/.exec(clean);
  if (!m) return null;
  const [, base, a, b, name] = m;
  /* Commons renders SVG/TIFF/PDF thumbnails as PNG/JPG with a suffix; keep
     it simple and only vendor the raster formats the retrieval admitted. */
  return `${base}/thumb/${a}/${b}/${name}/${width}px-${name}`;
}

class Throttled extends Error {}

async function fetchWithBackoff(url) {
  for (let attempt = 0; attempt <= 3; attempt++) {
    let res;
    try { res = await fetch(url, { headers: { "User-Agent": UA } }); }
    catch { await sleep(3000 * 2 ** attempt); continue; }
    if (res.ok) return res;
    if (res.status !== 429) return res;
    if (attempt === 3) {
      /*
       * STILL THROTTLED AFTER BACKOFF: STOP, DO NOT DROP.
       * A 429 says nothing about the object; it says Commons is refusing us
       * right now. Treating it as "this file cannot be served" emptied Agra's
       * catalogue on the first run. The whole run aborts, nothing is written,
       * and the operator is told how long Commons asked us to wait.
       */
      throw new Throttled(`429 after ${attempt + 1} attempts; Retry-After ${res.headers.get("retry-after") ?? "unstated"}`);
    }
    const after = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 4000 * 2 ** attempt);
  }
  return null;
}

const credits = JSON.parse(readFileSync(CREDITS, "utf8"));
const creditPaths = new Set(credits.filter((c) => c.localPath).map((c) => c.localPath));

let vendored = 0, kept = 0, failed = 0, dropped = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const id = file.replace(/\.json$/, "");
  const path = join(DIR, file);
  const objects = JSON.parse(readFileSync(path, "utf8"));
  mkdirSync(join(OUT, id), { recursive: true });
  const survivors = [];

  for (const object of objects) {
    const local = `/images/archive/${id}/${object.id}.jpg`;
    const target = join("public", local.slice(1));
    const source = (object.sourceUrl ?? object.mediaUrl).split("?")[0];

    if (existsSync(target)) {
      object.sourceUrl = source; object.mediaUrl = local; survivors.push(object); kept++;
    } else {
      const want = Math.max(...BUCKETS.filter((b) => b <= (object.width ?? 0)), BUCKETS[0]);
      const url = thumbUrl(source, want);
      let res = null;
      try {
        res = url ? await fetchWithBackoff(url) : null;
      } catch (error) {
        if (error instanceof Throttled) {
          console.log(`\nABORTED before writing ${id}: Commons is throttling (${error.message}). Nothing was changed. Wait and re-run.`);
          process.exit(2);
        }
        throw error;
      }
      await sleep(PAUSE_MS);
      if (!res?.ok) {
        /* A file Commons will not serve is a file this catalogue cannot show.
           Dropped, and counted, rather than left as a broken frame. */
        dropped++; failed++; continue;
      }
      try {
        const buf = Buffer.from(await res.arrayBuffer());
        const out = await sharp(buf).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
        const meta = await sharp(out).metadata();
        writeFileSync(target, out);
        object.sourceUrl = source;
        object.mediaUrl = local;
        object.width = meta.width; object.height = meta.height;
        survivors.push(object); vendored++;
      } catch { dropped++; failed++; continue; }
    }

    /* Provenance travels with the file: a credit row keyed by localPath, the
       shape every other photograph in the project already uses. */
    if (!creditPaths.has(local)) {
      credits.push({
        key: `archive/${id}/${object.id}`,
        localPath: local,
        sourceUrl: object.sourceUrl,
        commonsFilePage: object.originalUrl,
        license: object.rights,
        licenseUrl: object.rightsUrl,
        attribution: object.creator,
      });
      creditPaths.add(local);
    }
  }

  writeFileSync(path, `${JSON.stringify(survivors, null, 2)}\n`);
  console.log(`${id.padEnd(15)} ${String(survivors.length).padStart(3)} objects vendored (${objects.length - survivors.length} dropped)`);
}

writeFileSync(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);
console.log(`\nvendored ${vendored}, already local ${kept}, dropped ${dropped} (${failed} fetch failures)`);
