/**
 * Data-integrity audit — history timeline + digital heritage archive.
 *
 * Checks the things a page cannot check for itself: that every cross-link
 * resolves, that no record ships without a source or a licence, that no two
 * records are duplicates, and that nothing carries a verification state it has
 * not earned. A broken link here degrades silently in the UI (the section just
 * disappears), which is exactly why it needs a test.
 *
 *   node scripts/qa/heritage-integrity.mjs
 */

import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* Slugs are pulled out of the TypeScript sources by pattern rather than by
   importing them — this script runs under plain node, with no TS loader. */
const slugsIn = (file, field = "slug") =>
  [...read(file).matchAll(new RegExp(`${field}: "([^"]+)"`, "g"))].map((m) => m[1]);

const archive = JSON.parse(read("src/data/generated/archive-items.json"));
const history = read("src/data/history.ts");

const storyFiles = [
  "communities", "festivals", "folk-arts", "food", "history",
  "journeys", "landscape", "monastery-heritage",
].map((f) => `src/data/stories/${f}.ts`).filter(existsSync);
const storySlugs = new Set(storyFiles.flatMap((f) => slugsIn(f)));
const monasterySlugs = new Set(slugsIn("src/data/monasteries.ts"));
const placeSlugs = new Set(slugsIn("src/data/places.ts"));

/* Event slugs: the `slug:` fields inside the historyEvents array. */
const eventBlock = history.slice(history.indexOf("export const historyEvents"));
const eventSlugs = [...eventBlock.matchAll(/^    slug: "([^"]+)",$/gm)].map((m) => m[1]);
const eventSlugSet = new Set(eventSlugs);

console.log(
  `\n${eventSlugs.length} events · ${archive.items.length} archive items · ` +
    `${storySlugs.size} stories · ${monasterySlugs.size} monasteries · ${placeSlugs.size} places\n`,
);

/* ------------------------------------------------------------------ history */

check("history: no duplicate event slugs", new Set(eventSlugs).size === eventSlugs.length);

const arrayField = (block, field) => {
  const m = block.match(new RegExp(`${field}: \\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
};

/* Split the events array into per-event blocks on the `slug:` boundary. */
const eventBlocks = eventBlock.split(/\n    slug: "/).slice(1).map((b, i) => ({
  slug: eventSlugs[i],
  text: b,
}));

const badStory = [];
const badMonastery = [];
const badPlace = [];
const noSources = [];
const badVerification = [];
const VALID_STATES = new Set([
  "verified", "source-backed", "oral tradition", "community contribution", "unverified",
]);

for (const block of eventBlocks) {
  for (const s of arrayField(block.text, "relatedStories"))
    if (!storySlugs.has(s)) badStory.push(`${block.slug} → ${s}`);
  for (const m of arrayField(block.text, "relatedMonasteries"))
    if (!monasterySlugs.has(m)) badMonastery.push(`${block.slug} → ${m}`);
  for (const p of arrayField(block.text, "relatedPlaces"))
    if (!placeSlugs.has(p)) badPlace.push(`${block.slug} → ${p}`);
  if (!/sources: \[\s*\n?\s*[a-zA-Z{]/.test(block.text)) noSources.push(block.slug);
  const v = block.text.match(/verification: "([^"]+)"/);
  if (!v || !VALID_STATES.has(v[1])) badVerification.push(block.slug);
}

check("history: every relatedStories slug resolves", badStory.length === 0, badStory.join(", "));
check("history: every relatedMonasteries slug resolves", badMonastery.length === 0, badMonastery.join(", "));
check("history: every relatedPlaces slug resolves", badPlace.length === 0, badPlace.join(", "));
check("history: every event cites at least one source", noSources.length === 0, noSources.join(", "));
check("history: every event has a valid verification state", badVerification.length === 0, badVerification.join(", "));

/* A timeline event may only be "verified" if it cites a government or
   institutional source. Two encyclopedia articles are not two independent
   sources — they are one tertiary publication — so corroboration inside the
   same reference work never earns the top state. This is the discipline the
   monastery records already follow (they cap Wikipedia at "medium"). */
const overclaimed = eventBlocks.filter((b) => {
  if (!/verification: "verified"/.test(b.text)) return false;
  const sources = b.text.slice(b.text.indexOf("sources: ["), b.text.indexOf("relatedMonasteries"));
  return !/govSikkim\(|govIndiaUtsav\(|SOURCES\[/.test(sources);
});
check(
  "history: nothing marked verified without a government or institutional source",
  overclaimed.length === 0,
  overclaimed.map((b) => b.slug).join(", "),
);

/* Image keys must resolve to a real archive item. */
const archiveKeys = new Set(archive.items.map((i) => i.key));
const badImages = [...history.matchAll(/imageKey: "([^"]+)"/g)]
  .map((m) => m[1])
  .filter((k) => !archiveKeys.has(k));
check("history: every imageKey resolves to an archive item", badImages.length === 0, badImages.join(", "));

/* ------------------------------------------------------------------ archive */

const ids = archive.items.map((i) => i.id);
check("archive: no duplicate ids", new Set(ids).size === ids.length);

const titles = archive.items.map((i) => i.title.toLowerCase());
const dupTitles = titles.filter((t, i) => titles.indexOf(t) !== i);
check("archive: no duplicate titles", dupTitles.length === 0, [...new Set(dupTitles)].join(", "));

const files = archive.items.map((i) => i.commonsFile);
const dupFiles = files.filter((f, i) => files.indexOf(f) !== i);
check("archive: no image used by two records", dupFiles.length === 0, [...new Set(dupFiles)].join(", "));

check(
  "archive: every item has a licence",
  archive.items.every((i) => i.license && i.license.length > 0),
);
check(
  "archive: every item has a source URL",
  archive.items.every((i) => /^https?:\/\//.test(i.sourceUrl)),
);
check(
  "archive: every item has a Commons file page",
  archive.items.every((i) => /^https?:\/\//.test(i.commonsFilePage)),
);
check(
  "archive: every media file exists on disk",
  archive.items.every((i) => existsSync(`public${i.mediaUrl}`)),
  archive.items.filter((i) => !existsSync(`public${i.mediaUrl}`)).map((i) => i.mediaUrl).join(", "),
);
check(
  "archive: every item photographed outside Sikkim states where",
  archive.items.every((i) => i.sikkimSubject || (i.captureNote && i.captureNote.length > 20)),
  archive.items.filter((i) => !i.sikkimSubject && !i.captureNote).map((i) => i.id).join(", "),
);

const badArchiveStories = archive.items.flatMap((i) =>
  i.relatedStories.filter((s) => !storySlugs.has(s)).map((s) => `${i.id} → ${s}`),
);
const badArchiveMon = archive.items.flatMap((i) =>
  i.relatedMonasteries.filter((m) => !monasterySlugs.has(m)).map((m) => `${i.id} → ${m}`),
);
const badArchiveEvents = archive.items.flatMap((i) =>
  i.relatedEvents.filter((e) => !eventSlugSet.has(e)).map((e) => `${i.id} → ${e}`),
);
check("archive: every relatedStories slug resolves", badArchiveStories.length === 0, badArchiveStories.join(", "));
check("archive: every relatedMonasteries slug resolves", badArchiveMon.length === 0, badArchiveMon.join(", "));
check("archive: every relatedEvents slug resolves", badArchiveEvents.length === 0, badArchiveEvents.join(", "));

check("archive: agent reported no unresolved items", archive.failures.length === 0,
  archive.failures.map((f) => f.key).join(", "));

/* ---------------------------------------------------------------- integration */

const linkedMonasteries = new Set(archive.items.flatMap((i) => i.relatedMonasteries));
check(
  "integration: every catalogued monastery has at least one archive object",
  [...monasterySlugs].every((s) => linkedMonasteries.has(s)),
  [...monasterySlugs].filter((s) => !linkedMonasteries.has(s)).join(", "),
);

/* Reported, not asserted. Most events without archive material are treaties
   and political turning points that have no openly licensed imagery at all —
   there is no target number here that would mean anything, and inventing one
   would only pressure a future run to attach a decorative photograph. Those
   events render "Documentation currently unavailable", which is the point. */
const eventsWithArchive = new Set(archive.items.flatMap((i) => i.relatedEvents));
console.log(
  `\nCOVERAGE  ${eventsWithArchive.size}/${eventSlugs.length} timeline events have archive material.`,
);
console.log(
  `COVERAGE  events without any: ${eventSlugs.filter((s) => !eventsWithArchive.has(s)).join(", ")}`,
);

/* -------------------------------------------------------------------- verdict */

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  process.exitCode = 1;
}
