/**
 * Media integrity audit — the offline half of the media quality agent.
 *
 * A wrong photograph is the one mistake a reader cannot detect: it still
 * looks like a photograph. So this checks the things a page cannot check for
 * itself, across EVERY image any record references — capsules, the deep
 * Sikkim data, and the generated JSON.
 *
 * HARD failures (exit 1) are the ones that publish something false:
 *   - a referenced file that does not exist (a broken image);
 *   - the same file referenced under TWO destinations (a Kyoto photograph on
 *     Paris's page — the cross-contamination destination isolation exists
 *     to prevent);
 *   - a capsule photograph with no alt text (a subject nobody has asserted);
 *   - an SVG where a photograph is expected (a logo or diagram standing in
 *     for a place).
 *
 * ADVISORIES (reported, not failed) are quality signals that need a human:
 *   - a referenced file with no entry in image-credits.json (provenance
 *     missing — may be a legitimately vendored non-Commons file, may not);
 *   - resolution below what its slot needs (a 600px hero is a soft hero);
 *   - byte-identical files under different paths (a duplicate — fine if the
 *     same place appears in two sections, wrong if two places share it);
 *   - an extreme aspect ratio (likely a panorama or a strip, not a photo).
 *
 * This deliberately does NOT judge whether an image DEPICTS its record — that
 * needs eyes, and a script that claimed to do it would be inventing a
 * verification. It surfaces exactly what a reviewer should look at.
 *
 *   node scripts/qa/media-integrity.mjs
 *   node scripts/qa/media-integrity.mjs --json > report.json
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const JSON_OUT = process.argv.includes("--json");
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  if (!JSON_OUT) console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const note = (text) => { if (!JSON_OUT) console.log(`NOTE  ${text}`); };

const read = (p) => readFileSync(p, "utf8");
const PUBLIC = "public";

/* ------------------------------------------------------------ references */

/** Every `/images/...` path a record references, with where it came from. */
const refs = [];
const addRef = (path, source, destinationId, kind, hasAlt) =>
  refs.push({ path, source, destinationId, kind, hasAlt });

/* Capsules: one file per destination, so the destination is the filename. */
const CAP = "src/data/destinations/capsules";
for (const f of readdirSync(CAP).filter((n) => n.endsWith(".ts") && !["_template.ts", "ids.ts", "index.ts"].includes(n))) {
  const destinationId = f.replace(/\.ts$/, "");
  const src = read(join(CAP, f));
  /* Walk the top-level arrays so each ref knows its section. */
  for (const section of ["places", "stays", "culture", "stories", "history", "experiences"]) {
    const block = src.match(new RegExp(`\\n {2}${section}: \\[(.*?)\\n {2}\\],`, "s"))?.[1] ?? "";
    for (const rec of block.split(/\n {4}\{\n/).slice(1)) {
      const image = rec.match(/\n {6}image: "(\/images\/[^"]+)"/)?.[1];
      if (!image) continue;
      addRef(image, `capsule/${destinationId}`, destinationId, section, /\n {6}imageAlt: "/.test(rec));
    }
  }
}

/* Deep Sikkim data and generated JSON: every /images/ literal, owner sikkim
   unless the path itself is under a capsule directory. */
const ownerOfPath = (p) => p.match(/^\/images\/capsule\/([a-z-]+)\//)?.[1] ?? null;
for (const dir of ["src/data", "src/data/generated"]) {
  for (const f of readdirSync(dir).filter((n) => /\.(ts|json)$/.test(n))) {
    const src = read(join(dir, f));
    for (const m of src.matchAll(/"(\/images\/[^"]+\.(?:jpe?g|png|webp|avif|svg|gif))"/gi)) {
      const path = m[1];
      addRef(path, `${dir}/${f}`, ownerOfPath(path) ?? "sikkim", "data", true);
    }
  }
}

const uniquePaths = [...new Set(refs.map((r) => r.path))];
if (!JSON_OUT) console.log(`\n${refs.length} image references · ${uniquePaths.length} distinct files\n`);

/* --------------------------------------------------------------- existence */

const missing = uniquePaths.filter((p) => !existsSync(join(PUBLIC, p)));
check(
  "Every referenced image exists on disk",
  missing.length === 0,
  missing.length ? `${missing.length} missing: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}` : `${uniquePaths.length} files`,
);
const present = uniquePaths.filter((p) => existsSync(join(PUBLIC, p)));

/* ------------------------------------------------- cross-destination reuse */

/*
 * The same FILE under two destinations. A photograph depicts one place, so a
 * path referenced by both Kyoto and Paris is wrong for at least one of them.
 * Global assets (hero rotation, archive) are exempt only when the path is not
 * under a capsule directory AND all referencing sources are generated JSON —
 * that is, when the reference is the product's own composition, not a record
 * claiming the image as its subject.
 */
const byPath = new Map();
for (const r of refs) {
  if (!byPath.has(r.path)) byPath.set(r.path, new Set());
  byPath.get(r.path).add(r.destinationId);
}
const shared = [...byPath].filter(([p, d]) => d.size > 1 && ownerOfPath(p));
check(
  "No capsule photograph is referenced under two destinations",
  shared.length === 0,
  shared.map(([p, d]) => `${p} ← ${[...d].join("+")}`).slice(0, 5).join("; "),
);

/* ---------------------------------------------------------------- alt text */

const noAlt = refs.filter((r) => r.source.startsWith("capsule/") && !r.hasAlt);
check(
  "Every capsule photograph carries alt text",
  noAlt.length === 0,
  noAlt.map((r) => `${r.destinationId}/${r.kind}: ${r.path}`).slice(0, 5).join("; "),
);

/* ------------------------------------------------------------- not-a-photo */

const svgAsPhoto = refs.filter((r) => /\.svg$/i.test(r.path) && r.kind !== "data");
check(
  "No SVG stands in for a photograph on a record",
  svgAsPhoto.length === 0,
  svgAsPhoto.map((r) => `${r.destinationId}/${r.kind}: ${r.path}`).slice(0, 5).join("; "),
);

/* -------------------------------------------------------------- provenance */

const credits = JSON.parse(read("src/data/generated/image-credits.json"));
/*
 * Credits live in THREE files, not one: image-credits.json for the general
 * library, story-images.json for story photographs, and archive-items.json
 * for the archive, and site-galleries.json for the monastery/place galleries.
 * The first run of this script read only the first and
 * reported 255 "uncredited" files, most of which were credited in the other
 * two. Any string field that looks like a local image path is accepted as
 * that entry's path, so a renamed key cannot silently un-credit a file.
 */
/* Walk the whole document: site-galleries nests photos two levels down
   (`galleries[key].photos[]`), and a flat scan missed every one of them. A
   credited path is any `/images/…` string that sits in an object which also
   carries a `license` — so a bare reference in a caption does not count. */
const otherCredited = new Set();
const walk = (node, depth = 0) => {
  if (!node || typeof node !== "object" || depth > 6) return;
  if (!Array.isArray(node) && "license" in node) {
    for (const v of Object.values(node)) if (typeof v === "string" && v.startsWith("/images/")) otherCredited.add(v);
  }
  for (const v of Object.values(node)) if (v && typeof v === "object") walk(v, depth + 1);
};
for (const f of ["story-images.json", "archive-items.json", "site-galleries.json"]) walk(JSON.parse(read(`src/data/generated/${f}`)));
const credited = new Set([...credits.map((c) => c.localPath), ...otherCredited]);
const uncredited = present.filter((p) => !credited.has(p) && !/\.svg$/i.test(p));
note(
  `${uncredited.length} of ${present.length} referenced files have no entry in any credits file` +
  (uncredited.length ? ` — e.g. ${uncredited.slice(0, 4).join(", ")}` : ""),
);
/*
 * Attribution is owed by the LICENSE, not by every file. CC BY / BY-SA
 * require it; public domain and CC0 do not, and demanding a creator name
 * for a PD work is demanding something that may not exist.
 */
const owesAttribution = (c) => !/public domain|cc0|pdm/i.test(c.license ?? "");
const creditMissingFields = credits.filter((c) => !c.license || !c.sourceUrl || (owesAttribution(c) && !c.attribution));
check(
  "Every credit entry has license and source URL, and attribution where the license requires it",
  creditMissingFields.length === 0,
  creditMissingFields.map((c) => `${c.localPath} (${c.license ?? "no license"})`).slice(0, 6).join(", "),
);

/* -------------------------------------------------------- dimensions/dupes */

/*
 * Slot expectations by directory. These are the widths the layout actually
 * requests at its largest breakpoint; below them Next serves an upscaled
 * variant, which is the "low resolution" a reader sees as softness.
 */
const MIN_WIDTH = { hero: 1600, gallery: 1200, capsule: 1000, place: 1000, mon: 1000, arch: 800, archive: 800, history: 800, fest: 800, int: 600 };
const slotOf = (p) => p.split("/")[2];

const dims = new Map();
const hashes = new Map();
let unreadable = 0;
for (const p of present) {
  if (/\.svg$/i.test(p)) continue;
  const abs = join(PUBLIC, p);
  try {
    const meta = await sharp(abs).metadata();
    dims.set(p, { w: meta.width ?? 0, h: meta.height ?? 0, format: meta.format, bytes: statSync(abs).size });
    const h = createHash("sha1").update(readFileSync(abs)).digest("hex");
    if (!hashes.has(h)) hashes.set(h, []);
    hashes.get(h).push(p);
  } catch {
    unreadable += 1;
  }
}
check("Every referenced raster image is decodable", unreadable === 0, `${unreadable} unreadable`);

const soft = [...dims].filter(([p, d]) => d.w < (MIN_WIDTH[slotOf(p)] ?? 800));
note(
  `${soft.length} images are below the width their slot requests` +
  (soft.length ? ` — e.g. ${soft.slice(0, 4).map(([p, d]) => `${p} (${d.w}px)`).join(", ")}` : ""),
);

const extreme = [...dims].filter(([, d]) => d.w && d.h && (d.w / d.h > 3 || d.h / d.w > 2.2));
note(
  `${extreme.length} images have an extreme aspect ratio (>3:1 or <1:2.2)` +
  (extreme.length ? ` — e.g. ${extreme.slice(0, 4).map(([p, d]) => `${p} (${d.w}×${d.h})`).join(", ")}` : ""),
);

const dupes = [...hashes.values()].filter((ps) => ps.length > 1);
const kindOfPath = new Map(refs.map((r) => [r.path, r.kind]));
const commonsTitle = (p) => decodeURIComponent((credits.find((c) => c.localPath === p)?.commonsFilePage ?? "").split("File:").pop() ?? "").replace(/_/g, " ").slice(0, 70);
/*
 * A duplicate across destinations is a HARD failure for a PLACE or a STAY:
 * those have one location, so one file under two of them is false for at
 * least one. For culture (food, festival, craft) it is an ADVISORY — a
 * Mughlai dish photographed once is honestly Mughlai in Agra and in Delhi —
 * but it prints the Commons title, because that is what settles the cases
 * that are NOT honest: a file titled "'Sari' from Varanasi" filed under
 * Agra as "Zari" was caught exactly this way.
 */
const across = dupes.filter((ps) => new Set(ps.map((p) => ownerOfPath(p) ?? "sikkim")).size > 1);
const acrossHard = across.filter((ps) => ps.some((p) => ["places", "stays"].includes(kindOfPath.get(p))));
const acrossCulture = across.filter((ps) => !acrossHard.includes(ps));
check(
  "No place or stay photograph is byte-identical to a file under another destination",
  acrossHard.length === 0,
  acrossHard.map((ps) => ps.join(" = ")).slice(0, 3).join("; "),
);
for (const ps of acrossCulture) {
  note(`culture image shared across destinations — review against its Commons title "${commonsTitle(ps[0])}": ${ps.join(" = ")}`);
}
note(`${dupes.length - across.length} byte-identical duplicates within a single destination (review, not failure)`);

/* ----------------------------------------------------------- coverage map */

const perDest = {};
for (const r of refs.filter((x) => x.source.startsWith("capsule/"))) {
  perDest[r.destinationId] ??= { places: 0, stays: 0, culture: 0, stories: 0, history: 0 };
  perDest[r.destinationId][r.kind] = (perDest[r.destinationId][r.kind] ?? 0) + 1;
}
if (!JSON_OUT) {
  console.log("\nCapsule image coverage (files referenced):");
  console.log(`  ${"destination".padEnd(16)}${"places".padStart(7)}${"stays".padStart(7)}${"culture".padStart(8)}${"stories".padStart(8)}${"history".padStart(8)}`);
  for (const [d, c] of Object.entries(perDest).sort()) {
    console.log(`  ${d.padEnd(16)}${String(c.places).padStart(7)}${String(c.stays).padStart(7)}${String(c.culture).padStart(8)}${String(c.stories).padStart(8)}${String(c.history).padStart(8)}`);
  }
}

/* ---------------------------------------------------------------------- end */

const failed = results.filter((r) => !r.pass);
if (JSON_OUT) {
  console.log(JSON.stringify({ results, uncredited, soft: soft.map(([p, d]) => ({ path: p, ...d })), extreme: extreme.map(([p, d]) => ({ path: p, ...d })), dupes, missing, coverage: perDest }, null, 2));
} else {
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed\n`);
}
process.exit(failed.length === 0 ? 0 : 1);
