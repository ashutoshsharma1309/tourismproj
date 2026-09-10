/**
 * Does every photograph actually show the thing it is captioned as — and is
 * every vendored archive object a real, usable image?
 *
 * This suite existed as `media-integrity.mjs` (352 → 800 checks) and was
 * replaced under that name by a concurrent session's 7-check file. Both now
 * run; this one keeps the checks that caught this repository's own
 * "Thiksey in Ladakh" moments: Istanbul's Bosporus was a locator diagram,
 * and four "photographs" were transparent SVG logos flattened to solid black.
 *
 *   1. NOT A PHOTOGRAPH — the Commons file NAME says diagram, map, logo.
 *      Hard failure: such a file is never the right answer.
 *   2. NAME OVERLAP — file name shares no word with the place. Report only:
 *      transliteration variance is normal ("Fatehput Sikiri").
 *   3. ON DISK — every photograph a record points at exists.
 *   4. ARCHIVE TREE — vendored objects are ≥800px and not featureless
 *      (black frames measure stdev 0; a pale survey map measured 10.9 and is
 *      real, so the floor is 6).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = ".data/capsules";
let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed++; return; }
  failures.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

const NOT_A_PHOTOGRAPH =
  /\b(disambig\w*|diagram|map|locator|chart|graph|logo|icon|coat of arms|flag of|seal of|dialects|schematic|blank|outline)\b/i;
const STOP = new Set([
  "the","of","de","la","le","du","des","and","in","at","on","di","del","della",
  "il","st","saint","san","jpg","jpeg","png","svg","cropped","panoramio",
  "wikimedia","commons","file","image","photo","view","from","with","near",
]);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

let checked = 0;
const unmatched = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const capsule = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  for (const place of capsule.places ?? []) {
    if (!place.image?.commonsFilePage) continue;
    checked++;
    const raw = decodeURIComponent(place.image.commonsFilePage.split("/wiki/File:")[1] ?? "").replace(/_/g, " ");
    check(`${capsule.destinationId}/${place.id}: its image is a photograph, not a diagram`, !NOT_A_PHOTOGRAPH.test(raw), raw.slice(0, 70));
    const fileWords = new Set(norm(raw).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
    const placeWords = norm(place.title ?? place.name ?? "").split(" ").filter((w) => w.length > 2 && !STOP.has(w));
    if (placeWords.length && !placeWords.some((w) => [...fileWords].some((g) => g.includes(w) || w.includes(g)))) {
      unmatched.push(`${capsule.destinationId}/${place.id} <- ${raw.slice(0, 60)}`);
    }
  }
  for (const place of capsule.places ?? []) {
    if (!place.image) continue;
    const path = join("public/images/capsule", capsule.destinationId, `${place.id}.jpg`);
    check(`${capsule.destinationId}/${place.id}: its photograph is on disk`, existsSync(path), path);
  }
}

const ARCHIVE_DIR = "public/images/archive";
if (existsSync(ARCHIVE_DIR)) {
  const { default: sharp } = await import("sharp");
  for (const dest of readdirSync(ARCHIVE_DIR)) {
    for (const file of readdirSync(join(ARCHIVE_DIR, dest))) {
      const path = join(ARCHIVE_DIR, dest, file);
      const meta = await sharp(path).metadata();
      check(`archive ${dest}/${file}: large enough to catalogue`, (meta.width ?? 0) >= 800, `${meta.width}px`);
      const stats = await sharp(path).stats();
      const spread = stats.channels.slice(0, 3).reduce((n, c) => n + c.stdev, 0) / 3;
      check(`archive ${dest}/${file}: is not a featureless rectangle`, spread >= 6, `stdev ${spread.toFixed(1)}`);
    }
  }
}

console.log(`\nmedia provenance — ${checked} photographs checked`);
for (const line of failures) console.log(line);
console.log(`\nname overlap not established for ${unmatched.length} (report only):`);
for (const line of unmatched.slice(0, 12)) console.log(`  ${line}`);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
