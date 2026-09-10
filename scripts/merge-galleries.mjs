#!/usr/bin/env node
/**
 * Merges sharded gallery-agent output into src/data/generated/site-galleries.json.
 *
 * The agent is network-bound on Wikimedia, not CPU-bound, so a full pass runs
 * far faster split across several processes. Each shard writes its own file;
 * this joins them back into the single document the app imports.
 *
 * Usage: node scripts/merge-galleries.mjs <shard-dir>
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/merge-galleries.mjs <shard-dir>");
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => /^g\d+\.json$/.test(f))
  .sort();

const galleries = {};
let generatedAt = new Date().toISOString().slice(0, 10);

for (const file of files) {
  const doc = JSON.parse(readFileSync(join(dir, file), "utf8"));
  generatedAt = doc.generatedAt ?? generatedAt;
  Object.assign(galleries, doc.galleries ?? {});
}

/**
 * One photograph, one subject.
 *
 * Subjects nest: Enchey Monastery is in Gangtok, the Buddha Park is in
 * Ravangla, Rabdentse is above Pelling. So the same Commons file legitimately
 * satisfies two subjects' evidence tests, and the shards each claim it — which
 * leaves the town gallery as a weaker copy of the site gallery next door, and
 * leaves a reader unsure which place they are actually looking at.
 *
 * The file goes to whichever claimant it is most specifically about, and is
 * dropped from the rest.
 */
function specificity(gallery, photo) {
  let score = 0;
  // "Lachen Monastery Gompa.jpg" is about the monastery, not about Lachen.
  const name = gallery.subject.toLowerCase().replace(/\s*\([^)]*\)/g, "");
  if (photo.file.toLowerCase().includes(name)) score += 6;
  // A named site beats the settlement that contains it.
  if (gallery.scope === "monastery") score += 3;
  score += { category: 2, named: 1, geo: 0 }[photo.evidence] ?? 0;
  // A subject with less photography keeps the contested frame.
  score += Math.max(0, 3 - gallery.photos.length) * 0.1;
  return score;
}

const claimants = new Map();
for (const gallery of Object.values(galleries)) {
  for (const photo of gallery.photos) {
    const list = claimants.get(photo.file) ?? [];
    list.push({ gallery, photo });
    claimants.set(photo.file, list);
  }
}

let dropped = 0;
for (const [file, list] of claimants) {
  if (list.length < 2) continue;
  const ranked = [...list].sort(
    (a, b) => specificity(b.gallery, b.photo) - specificity(a.gallery, a.photo),
  );
  const winner = ranked[0];
  for (const loser of ranked.slice(1)) {
    loser.gallery.photos = loser.gallery.photos.filter((p) => p.file !== file);
    dropped++;
  }
  console.log(
    `  ${file.replace(/^File:/, "")} → ${winner.gallery.key} ` +
      `(dropped from ${ranked.slice(1).map((l) => l.gallery.key).join(", ")})`,
  );
}

/* Stable key order so a re-run produces a reviewable diff rather than a
   reshuffled file. */
const ordered = Object.fromEntries(
  Object.entries(galleries).sort(([a], [b]) => a.localeCompare(b)),
);

mkdirSync("src/data/generated", { recursive: true });
writeFileSync(
  "src/data/generated/site-galleries.json",
  JSON.stringify(
    {
      generatedAt,
      note: "Written by scripts/heritage-gallery-agent.mjs. Do not hand-edit — re-run the agent.",
      galleries: ordered,
    },
    null,
    2,
  ) + "\n",
);

const total = Object.values(ordered).reduce((n, g) => n + g.photos.length, 0);
console.log(
  `Merged ${files.length} shards → ${Object.keys(ordered).length} subjects, ` +
    `${total} photographs (${dropped} duplicate claims resolved).`,
);
