/**
 * Where each photograph should be cropped from.
 *
 * THE DEFECT
 * ----------
 * The destination hero is a 16:9 box filled with `object-cover`, which crops
 * from the centre. A destination's hero is whatever its first catalogued
 * record happens to be, and a great many of those are towers, spires, domes
 * and minarets photographed in portrait — the Eiffel Tower's source is
 * 1920 x 3198. Centre-cropping a 0.6 ratio image into a 1.78 box discards the
 * top and bottom thirds, so the page opened on the tower's midsection with
 * its top cut off. The aspect ratio had already been widened once for this
 * reason and it did not fix it, because the problem is the crop ORIGIN, not
 * the box.
 *
 * WHY A RATIO AND NOT A HAND-PLACED POINT
 * ---------------------------------------
 * A true focal point is a per-image editorial judgement, and there are 414
 * photographs. Hand-placing them is not work that stays done — the archive
 * grows. What is derivable is the shape: an image far taller than its box
 * loses its subject at the top, and that is exactly the case that was broken.
 * So the origin comes from the source's own dimensions, every image is
 * covered, and a new photograph is handled the day it lands.
 *
 * A per-image override can be layered on top later without changing consumers.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";

const ROOTS = ["public/images/capsule"];
const OUT = "src/data/generated/image-focal.json";

/**
 * Vertical crop origin, as a percentage.
 *
 * 50 is the browser default and is right for anything roughly as wide as its
 * box. Below that, the taller the source the higher the origin moves, because
 * the subject of a tall photograph is its top.
 */
function focalY(width, height) {
  const ratio = width / height;
  if (ratio >= 1.2) return 50;
  if (ratio >= 0.95) return 42;
  if (ratio >= 0.7) return 33;
  return 25;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(jpe?g|png|webp|avif)$/i.test(entry)) yield path;
  }
}

const focal = {};
let count = 0;
const buckets = {};
for (const root of ROOTS) {
  for (const path of walk(root)) {
    const meta = await sharp(path).metadata();
    if (!meta.width || !meta.height) continue;
    const key = `/${relative("public", path)}`;
    const y = focalY(meta.width, meta.height);
    focal[key] = { w: meta.width, h: meta.height, y };
    buckets[y] = (buckets[y] ?? 0) + 1;
    count++;
  }
}

mkdirSync("src/data/generated", { recursive: true });
writeFileSync(OUT, `${JSON.stringify(focal, null, 0)}\n`);
console.log(`${count} photographs measured -> ${OUT}`);
console.log("crop origin distribution:", JSON.stringify(buckets));
