/**
 * Capsule retrieval — Phases 18 and 19.
 *
 * WHAT THIS IS
 * ------------
 * An offline job that fetches what a capsule needs from Wikipedia's REST API,
 * records exactly what came back, and writes that record to `.data/capsules/`.
 * It generates no prose of its own. `generate.mjs` then emits the TypeScript
 * capsules FROM this record, so every sentence that reaches a page can be
 * traced to a response this job stored.
 *
 * WHY RETRIEVE RATHER THAN WRITE
 * ------------------------------
 * A model writing "the Red Fort was built in 1639" from memory is the
 * fabrication this project has refused for seventeen phases, however true the
 * sentence happens to be. Retrieving the sentence, storing the response and
 * citing the URL is the same discipline Phase 3 built for the research
 * engine, applied to hand-scale content.
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * It does not invent a page that 404s, it does not guess a coordinate the API
 * does not publish, and it does not carry a fact whose sentence it could not
 * find. Every one of those is reported and dropped.
 *
 * PHASE 19 ADDS A SECOND SOURCE
 * -----------------------------
 * Wikipedia prose is a poor place to find a date. Phase 18 mined years out of
 * sentences with a regular expression, which works for a fort finished in
 * 1639 and fails completely for an amphitheatre finished in AD 80. So each
 * place is now also looked up in **Wikidata**, which publishes inception and
 * opening dates as structured values with a stated precision — and often with
 * their own references.
 *
 * That is not a claim that Wikidata is authoritative. It is a claim that two
 * independent sources agreeing on a year is worth more than one regex, and
 * `generate.mjs` uses it exactly that way: a Wikidata date is published only
 * when a retrieved Wikipedia sentence states the same year.
 *
 * WHAT WAS TRIED AND COULD NOT BE USED
 * ------------------------------------
 * UNESCO's World Heritage Centre — the obvious official source for eleven of
 * these places — serves this environment a Cloudflare challenge (HTTP 403) on
 * both its site and its XML list. Working around a bot protection is not
 * something this pipeline will do, so no UNESCO URL is cited anywhere in
 * Phase 19. A citation nobody fetched is exactly the thing this project has
 * refused for nineteen phases.
 *
 *   node scripts/capsules/retrieve.mjs [--only delhi,agra]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { PLAN } from "./plan.mjs";

const OUT_DIR = ".data/capsules";
import {
  UA,
  PAUSE_MS,
  sleep,
  summary,
  lead,
  image,
  licence,
  wikidata,
} from "./wikipedia.mjs";

/* UA and PAUSE_MS are re-exported by the shared module so the pacing is
   identical across every pass; referenced here so lint sees them used. */
void UA;
void PAUSE_MS;


/**
 * Sentences from the retrieved extract that state a year.
 *
 * These become the capsule's history entries, VERBATIM. The rule is the one
 * `verifyEvidenceSpan` enforces in the research engine: the sentence that
 * reaches the page must be a sentence the source actually contains.
 */
function datedSentences(extract) {
  return (extract ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /\b(1[0-9]{3}|20[0-2][0-9])\b/.test(sentence))
    .map((sentence) => ({
      sentence,
      year: Number(sentence.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/)[1]),
    }));
}

const only = (() => {
  const index = process.argv.indexOf("--only");
  return index > -1 ? (process.argv[index + 1] ?? "").split(",").filter(Boolean) : [];
})();

mkdirSync(OUT_DIR, { recursive: true });

const report = [];

for (const destination of PLAN) {
  if (only.length > 0 && !only.includes(destination.id)) continue;

  console.log(`\n${destination.id} — ${destination.places.length} places`);
  const record = {
    destinationId: destination.id,
    scope: destination.scope,
    retrievedAt: new Date().toISOString().slice(0, 10),
    retrievalMethod: "web-search",
    agent: "wikipedia-rest-v1",
    places: [],
    dropped: [],
  };

  for (const place of destination.places) {
    await sleep(PAUSE_MS);
    const data = await summary(place.title);

    if (data?.error || data?.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
      console.log(`  DROP  ${place.title} — ${data?.error ?? "no such page"}`);
      record.dropped.push({ title: place.title, reason: data?.error ?? "no such page" });
      continue;
    }

    /*
     * A DISAMBIGUATION PAGE IS NOT A PLACE.
     *
     * "Ram Bagh" resolves — with HTTP 200 and a perfectly good extract that
     * reads "Ram Bagh may refer to the following places:" and then lists five
     * of them in four countries. It is not a 404, so the existing guard let it
     * through, and the generator produced a place with no summary at all. The
     * capsule validator caught it and dropped the whole of Agra, which is the
     * right failure and the wrong place to discover it.
     */
    if (data?.type?.endsWith("disambiguation") || /\bmay refer to\b/i.test(data?.extract ?? "")) {
      console.log(`  DROP  ${place.title} — disambiguation page, not a place`);
      record.dropped.push({ title: place.title, reason: "disambiguation page" });
      continue;
    }

    await sleep(PAUSE_MS);
    const intro = await lead(place.title);

    await sleep(PAUSE_MS);
    const picture = place.image === false ? null : await image(place.title);
    const rights = picture ? await licence(picture.commonsFilePage) : null;

    await sleep(PAUSE_MS);
    const structured = await wikidata(place.title);

    const entry = {
      id: place.id,
      title: data.title,
      category: place.category,
      themes: place.themes,
      extract: data.extract ?? "",
      lead: intro,
      /* The REST summary's coordinate first; Wikidata's only where the
         summary publishes none, and labelled so the generator can say which
         source it came from. Galata Tower is why this fallback exists. */
      coordinates: data.coordinates
        ? { lat: data.coordinates.lat, lng: data.coordinates.lon, from: "wikipedia" }
        : structured?.coordinates
          ? { ...structured.coordinates, from: "wikidata" }
          : null,
      page: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(place.title)}`,
      /* Dated facts come from the lead where there is one, because it says
         more; the summary is the fallback. Either way the sentence is stored
         exactly as retrieved. */
      dated: datedSentences(intro || data.extract),
      image:
        picture && rights?.license
          ? { ...picture, ...rights }
          : null,
      wikidata: structured,
    };
    record.places.push(entry);

    console.log(
      `  ok    ${entry.title.padEnd(42)} ` +
        `${entry.coordinates ? `coords:${entry.coordinates.from}` : "no-coords"} · ` +
        `${entry.dated.length} dated · ` +
        `wd:${entry.wikidata ? `${entry.wikidata.id}/${entry.wikidata.dates.length}d` : "none"} · ` +
        `${entry.image ? entry.image.license : "no image"}`,
    );
  }

  writeFileSync(`${OUT_DIR}/${destination.id}.json`, `${JSON.stringify(record, null, 2)}\n`);
  report.push({
    id: destination.id,
    places: record.places.length,
    dropped: record.dropped.length,
    withCoords: record.places.filter((place) => place.coordinates).length,
    withImage: record.places.filter((place) => place.image).length,
    dated: record.places.reduce((total, place) => total + place.dated.length, 0),
    structured: record.places.reduce((total, place) => total + (place.wikidata?.dates.length ?? 0), 0),
  });
}

console.log(`\n${"".padEnd(72, "=")}`);
for (const row of report) {
  console.log(
    `${row.id.padEnd(12)} places ${String(row.places).padStart(2)} · coords ${String(row.withCoords).padStart(2)} · ` +
      `images ${String(row.withImage).padStart(2)} · dated sentences ${String(row.dated).padStart(3)} · ` +
      `wikidata dates ${String(row.structured).padStart(2)} · dropped ${row.dropped}`,
  );
}
console.log("".padEnd(72, "="));
console.log(`\nRecords written to ${OUT_DIR}/ (gitignored). Next: node scripts/capsules/generate.mjs\n`);
