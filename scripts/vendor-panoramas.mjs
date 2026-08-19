#!/usr/bin/env node
/**
 * Vendor verified panoramas into public/panoramas.
 *
 * The viewer used to fetch its renditions from upload.wikimedia.org on every
 * request. That broke twice in testing: Wikimedia only serves thumbnail widths
 * it has already generated (1280 and 1920 exist for the Rumtek panorama; 1600,
 * 2000, 2048 and 2560 all answer 400), and it rate-limits repeated fetches with
 * 429. Neither is Wikimedia misbehaving — it is a media repository, not a CDN
 * for someone else's product.
 *
 * So the file is copied once, at build-prep time, and served from this origin.
 * CC BY-SA 4.0 permits that; what it requires is attribution, which the viewer
 * renders beneath every panorama along with the licence and a link back to the
 * Commons file page.
 *
 * Usage: node scripts/vendor-panoramas.mjs
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const UA = "SikkimDarshan-Research/1.0 (SIH cultural heritage project)";
const OUT = "public/panoramas";

/** Mirrors src/data/panoramas.ts. Widths here are ones Commons actually holds. */
const ASSETS = [
  {
    slug: "rumtek",
    remote:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Rumtek_Monastery_03.jpg/1920px-Rumtek_Monastery_03.jpg",
    local: "rumtek-courtyard-1920.jpg",
  },
  {
    slug: "rumtek",
    remote:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Rumtek_Monastery_03.jpg/1280px-Rumtek_Monastery_03.jpg",
    local: "rumtek-courtyard-1280.jpg",
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const asset of ASSETS) {
    const path = `${OUT}/${asset.local}`;
    if (existsSync(path) && !process.env.FORCE) {
      console.log(`  = ${asset.local} (already vendored)`);
      continue;
    }
    const res = await fetch(asset.remote, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      console.error(`  ! ${asset.local} — ${res.status} from Commons`);
      process.exitCode = 1;
      continue;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buffer);
    console.log(`  + ${asset.local} — ${(buffer.length / 1024).toFixed(0)} KB`);
  }
}

main().catch((e) => {
  console.error("vendor failed:", e.message);
  process.exit(1);
});
