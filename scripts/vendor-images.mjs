/**
 * Vendors the Commons photography into public/images/ — Ney Heritage.
 *
 * The app previously hotlinked every photograph from upload.wikimedia.org and
 * ran it through the Next image optimizer at request time. Wikimedia rate-limits
 * hotlinking, so a cold visit fired ~30 optimizer fetches at once and Wikimedia
 * answered a share of them with 429. Those images rendered broken on the FIRST
 * load and only appeared once a later reload found them in .next/cache/images —
 * the "works after refresh" bug.
 *
 * Downloading once at build-authoring time removes the runtime dependency
 * entirely: no rate limit, no third-party latency, no cold-cache stall.
 *
 * The licence obligation does not change — these remain Commons files, and the
 * source URL and Commons file page for each is written to
 * src/data/generated/image-credits.json so the UI can keep crediting them.
 *
 * Usage: node scripts/vendor-images.mjs [--force]
 */

import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";

const FORCE = process.argv.includes("--force");
const OUT_DIR = "public/images";
// The Commons URLs are the source of truth for re-fetching. src/data/images.ts
// holds only the local paths it serves, so the upstream list lives here.
const CREDITS = "src/data/generated/image-credits.json";

// Wikimedia requires a descriptive User-Agent that identifies the client and a
// contact. Anonymous or browser-spoofing agents get blocked outright.
const UA =
  "NeyHeritage/0.1 (SIH 2026 cultural heritage archive; https://github.com/ashutoshsharma1309/tourismproj) node-fetch";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The key → Commons URL pairs this project vendors. */
async function readRegistry() {
  const raw = JSON.parse(await readFile(CREDITS, "utf8"));
  return raw.map(({ key, sourceUrl }) => ({ key, url: sourceUrl }));
}

/** The Commons File: page behind a thumb or original URL, for attribution. */
function commonsFilePage(url) {
  const decoded = decodeURIComponent(url);
  const thumb = decoded.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  const direct = decoded.match(/\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)$/);
  const file = thumb?.[1] ?? direct?.[1];
  return file ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` : null;
}

/**
 * The Stories archive resolves its photography through a second, agent-written
 * file. Those entries shipped as upload.wikimedia.org URLs, which reintroduced
 * the exact 429 breakage this script exists to prevent — so they are vendored
 * too, and the local path is written back into the JSON for the resolver.
 */
const STORY_IMAGES = "src/data/generated/story-images.json";

async function readStoryRegistry() {
  try {
    const doc = JSON.parse(await readFile(STORY_IMAGES, "utf8"));
    return Object.entries(doc.images ?? {})
      .filter(([, v]) => typeof v?.url === "string" && v.url.startsWith("https://upload.wikimedia.org"))
      // Keys already carry their own namespace (e.g. "story/red-panda"); only
      // prefix the ones that do not, so nothing lands in images/story/story/.
      .map(([key, v]) => ({
        key: key.startsWith("story/") ? key : `story/${key}`,
        url: v.url,
        storyKey: key,
      }));
  } catch {
    return [];
  }
}

const entries = [...(await readRegistry()), ...(await readStoryRegistry())];
console.log(`${entries.length} images in the registry\n`);

const credits = [];
let downloaded = 0;
let skipped = 0;
const failures = [];

for (const { key, url } of entries) {
  const localPath = join(OUT_DIR, `${key}.jpg`);
  const publicPath = `/images/${key}.jpg`;
  const filePage = commonsFilePage(url);

  if (!FORCE && existsSync(localPath) && statSync(localPath).size > 1024) {
    skipped++;
    credits.push({ key, localPath: publicPath, sourceUrl: url, commonsFilePage: filePage });
    continue;
  }

  mkdirSync(dirname(localPath), { recursive: true });

  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
      if (res.status === 429) {
        const wait = 2000 * attempt;
        console.log(`  429 on ${key} — backing off ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`unexpected content-type ${type}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length}b)`);
      writeFileSync(localPath, buf);
      console.log(`  ok  ${key.padEnd(24)} ${(buf.length / 1024).toFixed(0).padStart(5)} KB  ${type}`);
      credits.push({ key, localPath: publicPath, sourceUrl: url, commonsFilePage: filePage });
      downloaded++;
      ok = true;
    } catch (err) {
      if (attempt === 4) {
        console.log(`  FAIL ${key}: ${err.message}`);
        failures.push({ key, url, error: err.message });
      } else {
        await sleep(1200 * attempt);
      }
    }
  }
  // Stay well inside Wikimedia's tolerance for a sequential client.
  await sleep(350);
}

mkdirSync("src/data/generated", { recursive: true });
writeFileSync(
  "src/data/generated/image-credits.json",
  JSON.stringify(
    credits
      .filter((c) => !c.key.startsWith("story/"))
      .sort((a, b) => a.key.localeCompare(b.key)),
    null,
    2,
  ) + "\n",
);

// Write each vendored story photograph's local path back beside its credit, so
// storyImage() can serve from this origin while keeping licence and author.
try {
  const doc = JSON.parse(await readFile(STORY_IMAGES, "utf8"));
  let wired = 0;
  for (const c of credits) {
    if (!c.key.startsWith("story/")) continue;
    // The credit key is the story key itself when it was already namespaced.
    const storyKey = doc.images?.[c.key] ? c.key : c.key.slice("story/".length);
    if (doc.images?.[storyKey]) {
      doc.images[storyKey].localPath = c.localPath;
      wired++;
    }
  }
  writeFileSync(STORY_IMAGES, JSON.stringify(doc, null, 2) + "\n");
  console.log(`Wired ${wired} local paths into ${STORY_IMAGES}`);
} catch (err) {
  console.log(`Could not update ${STORY_IMAGES}: ${err.message}`);
}

console.log(
  `\n${downloaded} downloaded, ${skipped} already present, ${failures.length} failed.`,
);
if (failures.length) {
  console.log("Failures:");
  failures.forEach((f) => console.log(`  ${f.key} — ${f.error}`));
  process.exitCode = 1;
}
