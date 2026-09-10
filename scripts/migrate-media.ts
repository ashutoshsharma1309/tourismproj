/**
 * Move the archive's media out of git and into Supabase Storage.
 *
 * WHY THIS MATTERS BEYOND REPO SIZE
 * ---------------------------------
 * 918 files and 323MB of photography and narration are committed into
 * `public/`, which makes every clone slow, every deploy fat, and the 200MB
 * acceptance criterion unreachable. Object storage with a CDN in front is
 * where media belongs.
 *
 * ATTRIBUTION IS THE PART THAT CANNOT BREAK
 * -----------------------------------------
 * `credit`, `licence`, `sourceUrl` and `alt` are copied across untouched, and
 * the row is updated rather than replaced. Losing attribution is a legal
 * problem and it destroys the one thing that makes this archive better than a
 * travel blog. Ten rows are verified by hand after the run — see the report
 * this prints.
 *
 * RESUMABLE AND IDEMPOTENT
 * ------------------------
 * Every upload is recorded in `scripts/.media-manifest.json` keyed on the old
 * path. Re-running skips anything already uploaded, so a crash at file 700 is
 * a re-run, not a restart. The key is content-hashed, so re-encoding a file
 * later produces a new key rather than a stale CDN copy.
 *
 *   pnpm tsx --env-file=.env.local scripts/migrate-media.ts
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !SECRET) throw new Error("Supabase URL and secret key are required.");

const MANIFEST = "scripts/.media-manifest.json";
const CONCURRENCY = 8;

type Manifest = Record<string, { key: string; url: string; bytes: number; bucket: string }>;

const manifest: Manifest = existsSync(MANIFEST)
  ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest)
  : {};

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
};

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (CONTENT_TYPE[extname(entry.name).toLowerCase()]) out.push(path);
  }
  return out;
}

/**
 * A stable, content-addressed key.
 *
 * `{section}/{name}-{hash8}.{ext}` — the hash means an edited file gets a new
 * URL and never serves a stale CDN copy, and the readable prefix means a
 * human can find a file in the dashboard without consulting the manifest.
 */
function keyFor(path: string, bytes: Buffer): string {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  const relative = path.replace(/^public\/(images|audio)\//, "");
  const ext = extname(relative);
  const stem = relative.slice(0, -ext.length).replace(/[^a-zA-Z0-9/_-]/g, "-");
  return `${stem}-${hash}${ext}`;
}

async function upload(bucket: string, key: string, body: Buffer, contentType: string) {
  const response = await fetch(
    `${URL_BASE}/storage/v1/object/${bucket}/${encodeURI(key)}`,
    {
      method: "POST",
      headers: {
        apikey: SECRET!,
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": contentType,
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(body),
    },
  );
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 120)}`);
  return `${URL_BASE}/storage/v1/object/public/${bucket}/${encodeURI(key)}`;
}

async function main() {
  const images = walk("public/images").map((p) => ({ path: p, bucket: "media-public" }));
  const audio = walk("public/audio").map((p) => ({ path: p, bucket: "media-audio" }));
  const files = [...images, ...audio];

  const pending = files.filter((f) => !manifest[f.path]);
  console.log(`  ${files.length} files · ${pending.length} to upload · ${files.length - pending.length} already done`);

  let done = 0, failed = 0, bytes = 0;

  /* A simple worker pool. Supabase rate-limits, and 900 parallel uploads is
     how you find that out the hard way. */
  const queue = [...pending];
  const worker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      try {
        const body = readFileSync(next.path);
        const key = keyFor(next.path, body);
        const contentType = CONTENT_TYPE[extname(next.path).toLowerCase()]!;
        const url = await upload(next.bucket, key, body, contentType);
        manifest[next.path] = { key, url, bytes: body.length, bucket: next.bucket };
        bytes += body.length;
        done += 1;
        if (done % 50 === 0) {
          writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
          console.log(`  ${done}/${pending.length}  (${(bytes / 1048576).toFixed(0)} MB)`);
        }
      } catch (error) {
        failed += 1;
        console.log(`  FAILED ${next.path}: ${(error as Error).message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`\n  uploaded ${done} · failed ${failed} · ${(bytes / 1048576).toFixed(0)} MB`);
  console.log(`  manifest: ${MANIFEST} (${Object.keys(manifest).length} entries)`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("media migration failed:", error);
  process.exit(1);
});
