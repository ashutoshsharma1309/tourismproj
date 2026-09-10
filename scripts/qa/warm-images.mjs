/**
 * Warm — and audit — the image pipeline before a demo or a QA battery.
 *
 * WHY THIS EXISTS
 * ---------------
 * Next optimises images on demand and caches the result in
 * `.next/cache/images`. On this machine, under sustained concurrent load, a
 * single cache key can wedge: the URL then returns **zero bytes and never
 * completes**, while every other variant of the same photograph serves in
 * milliseconds and the same URL serves in ~280 ms the moment the cache is
 * cleared. Measured repeatedly in Phase 16, on a clean build, with `sharp`
 * installed. When it lands on a hero image the page's `load` event never
 * fires, and a visitor sees an empty frame.
 *
 * Requesting every variant ONCE, SEQUENTIALLY, before anyone browses avoids
 * the contention entirely: each encode runs alone, is written to the cache,
 * and every later request is a cache hit of a couple of milliseconds.
 *
 * It is also the image audit. Every URL is reported with its status, its
 * size and its time, and anything that fails, returns zero bytes or takes
 * longer than the stall threshold is listed at the end.
 *
 *   npm run start &                       # or an already-running server
 *   node scripts/qa/warm-images.mjs [--base http://localhost:3000]
 */

const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

/** Longer than this and the entry is treated as stalled, not slow. */
const STALL_MS = 15_000;

const ACCEPT = "image/webp,image/apng,image/*,*/*;q=0.8";

async function routes() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+/, ""))
    .filter(Boolean);
  /* Plus the pages the sitemap does not list, which still carry images. */
  return [...new Set([...paths, "/", "/discover", "/destinations", "/destinations/compare"])];
}

const imageUrls = new Set();

for (const path of await routes()) {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) continue;
  const html = await response.text();
  for (const [, src] of html.matchAll(/src="(\/_next\/image\?[^"]+)"/g)) {
    imageUrls.add(src.replace(/&amp;/g, "&"));
  }
  /* srcset carries the variants a real browser will actually pick. */
  for (const [, set] of html.matchAll(/srcSet="([^"]+)"|srcset="([^"]+)"/g)) {
    for (const candidate of (set ?? "").split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url?.startsWith("/_next/image")) imageUrls.add(url.replace(/&amp;/g, "&"));
    }
  }
}

console.log(`\nImage pipeline warm-up — ${imageUrls.size} distinct optimizer URLs\n`);

const failures = [];
const stalled = [];
let bytes = 0;
let slowest = { url: "", ms: 0 };
let done = 0;

for (const url of [...imageUrls].sort()) {
  const started = Date.now();
  let status = 0;
  let size = 0;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STALL_MS);
    const response = await fetch(`${BASE}${url}`, {
      headers: { accept: ACCEPT },
      signal: controller.signal,
    });
    clearTimeout(timer);
    status = response.status;
    size = (await response.arrayBuffer()).byteLength;
  } catch {
    status = 0;
  }
  const ms = Date.now() - started;
  bytes += size;
  done += 1;

  if (status !== 200 || size === 0) {
    (ms >= STALL_MS ? stalled : failures).push({ url, status, size, ms });
  }
  if (ms > slowest.ms) slowest = { url, ms };
  if (done % 50 === 0) process.stdout.write(`  ${done}/${imageUrls.size}\n`);
}

console.log(`\n${"".padEnd(70, "=")}`);
console.log(`URLS         ${imageUrls.size}`);
console.log(`OK           ${imageUrls.size - failures.length - stalled.length}`);
console.log(`FAILED       ${failures.length}`);
console.log(`STALLED      ${stalled.length}  (no response within ${STALL_MS / 1000}s)`);
console.log(`BYTES        ${(bytes / 1024 / 1024).toFixed(1)} MB served`);
console.log(`SLOWEST      ${slowest.ms}ms  ${slowest.url.slice(0, 60)}`);
console.log("".padEnd(70, "="));

for (const entry of [...failures, ...stalled].slice(0, 10)) {
  console.log(`  ${entry.status || "stall"}  ${entry.ms}ms  ${entry.url.slice(0, 100)}`);
}

if (stalled.length > 0) {
  console.log(
    "\nA stalled entry is a wedged image-optimizer cache key. Stop the server," +
      "\nremove .next/cache/images, restart, and run this again.",
  );
}

process.exit(failures.length + stalled.length === 0 ? 0 : 1);
