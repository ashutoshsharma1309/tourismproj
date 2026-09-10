/**
 * Backfill licence and authorship onto the vendored photography registry.
 *
 * scripts/vendor-images.mjs downloads Commons files and records where each one
 * came from — key, local path, source URL, File: page — but it never recorded
 * WHO took the photograph or under WHICH licence. That is the half of the
 * obligation that matters: CC BY and CC BY-SA are satisfied by naming the
 * author and the licence, not by linking the file page alone.
 *
 * The consequence was visible in the product. 23 of 70 story pages rendered a
 * Commons photograph with no attribution line at all, because
 * src/app/stories/[slug]/page.tsx only prints a credit when one exists, and
 * stories built from `legacyImageKey` had none to print.
 *
 * This script reads the 39 entries already in image-credits.json, asks the
 * Commons API for each file's `extmetadata`, and writes `license`, `licenseUrl`
 * and `attribution` back beside the existing fields. It is additive: no
 * existing key is altered, so re-running it is safe.
 *
 * Where Commons itself records the author as "anonymous" or records nothing,
 * that is written through verbatim rather than replaced with a guess — an
 * unnamed author is a fact about the file, not a gap to be filled in.
 *
 *   node scripts/enrich-image-credits.mjs
 */

import fs from "node:fs";

const CREDITS = "src/data/generated/image-credits.json";
const API = "https://commons.wikimedia.org/w/api.php";

/** Commons returns HTML in extmetadata fields; the UI renders plain text. */
function plain(value) {
  if (!value) return null;
  const text = String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

/** "https://commons.wikimedia.org/wiki/File:X.jpg" -> "File:X.jpg" */
function titleFromFilePage(filePage) {
  if (!filePage) return null;
  const tail = filePage.split("/wiki/")[1];
  return tail ? decodeURIComponent(tail) : null;
}

/**
 * Commons normalises "File:A_b.jpg" to "File:A b.jpg" in its response, so a
 * response keyed by the title as sent will not match. Comparing on a canonical
 * form — underscores collapsed to spaces — matches either spelling.
 */
function canonical(title) {
  return decodeURIComponent(title).replace(/_/g, " ").trim();
}

async function fetchMetadata(titles) {
  const url = new URL(API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", titles.join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "extmetadata");
  url.searchParams.set("format", "json");

  const res = await fetch(url, {
    headers: { "User-Agent": "SikkimDarshan/1.0 (heritage archive; contact via repository)" },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status} for ${titles.join(", ")}`);
  const json = await res.json();

  const out = new Map();
  const pages = json?.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    const meta = page?.imageinfo?.[0]?.extmetadata;
    if (!meta) continue;
    out.set(canonical(page.title), {
      license: plain(meta.LicenseShortName?.value),
      licenseUrl: plain(meta.LicenseUrl?.value),
      attribution: plain(meta.Artist?.value),
    });
  }
  return out;
}

const credits = JSON.parse(fs.readFileSync(CREDITS, "utf8"));

/* Commons accepts up to 50 titles per query; these registries are far smaller
   than that, but batching keeps this to a couple of requests either way. */
const BATCH = 20;
const wanted = credits
  .map((c) => ({ credit: c, title: titleFromFilePage(c.commonsFilePage) }))
  .filter((entry) => entry.title);

let resolved = 0;
let missing = 0;

for (let i = 0; i < wanted.length; i += BATCH) {
  const slice = wanted.slice(i, i + BATCH);
  const meta = await fetchMetadata(slice.map((entry) => entry.title));

  for (const { credit, title } of slice) {
    const found = meta.get(canonical(title));
    if (!found) {
      missing++;
      process.stdout.write(`  ·  no metadata: ${credit.key}\n`);
      continue;
    }
    credit.license = found.license;
    credit.licenseUrl = found.licenseUrl;
    credit.attribution = found.attribution;
    resolved++;
    process.stdout.write(`  ok  ${credit.key} — ${found.attribution ?? "author not recorded"} · ${found.license ?? "licence not recorded"}\n`);
  }
}

fs.writeFileSync(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);

process.stdout.write(
  `\n${resolved} of ${credits.length} credits enriched, ${missing} without Commons metadata.\nWrote ${CREDITS}\n`,
);
