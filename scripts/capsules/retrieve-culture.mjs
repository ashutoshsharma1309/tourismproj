/**
 * Retrieve food, festivals, arts and crafts, and documented stays.
 *
 * WHAT THIS PASS IS FOR
 * ---------------------
 * A tourism product that lists monuments and says nothing about what a place
 * eats, celebrates or makes is a monuments product. This pass adds the other
 * three, plus the places a visitor can stay that have a published record.
 *
 * WHERE THE TITLES CAME FROM
 * --------------------------
 * Not from this file. `candidates.mjs` proposes titles, `check-titles.mjs`
 * resolves each against Wikipedia and throws away the ones that are
 * redirects to nowhere, disambiguation pages or nothing at all, and
 * `discover-stays.mjs` reads Category:Hotels in <place> rather than guessing
 * hotel names — after the first attempt guessed 31 and missed all 31.
 *
 * THE STAYS RULE
 * --------------
 * A stay is retrieved exactly like a monument: what the article says, when it
 * opened, where it stands, and a photograph if one is freely licensed. No
 * phone number, no rate, no availability, no booking link, because no source
 * here publishes those and inventing them would send real people to a wrong
 * number. Three destinations get no stays at all, because Wikipedia documents
 * none for them, and that is the honest output rather than a filled grid.
 *
 *   node scripts/capsules/retrieve-culture.mjs [--only paris,rome]
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PAUSE_MS, sleep, summary, lead, image, licence, wikidata } from "./wikipedia.mjs";

const OUT_DIR = ".data/culture";
mkdirSync(OUT_DIR, { recursive: true });

const only = (process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const titles = JSON.parse(readFileSync(".data/culture-titles.json", "utf8"));
const stays = JSON.parse(readFileSync(".data/stays-final.json", "utf8"));

/** Every destination that has anything to retrieve in this pass. */
const destinationIds = [...new Set([
  ...titles.map((t) => t.destinationId),
  ...Object.keys(stays),
])].filter((id) => only.length === 0 || only.includes(id));

/** A slug that is stable across runs and unique inside its destination. */
const slugOf = (title) =>
  title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/**
 * A recurring season stated in prose, or nothing.
 *
 * Deliberately narrow. It matches "celebrated in July" and "an autumn
 * festival"; it does not match, and must never return, a specific date — the
 * capsule validator rejects one, because this product has no feed that could
 * keep a date true.
 */
function seasonOf(text) {
  const months = "January|February|March|April|May|June|July|August|September|October|November|December";
  const m = new RegExp(`\\b(?:in|during|each|every)\\s+(?:the\\s+month\\s+of\\s+)?(${months})\\b`, "i").exec(text ?? "");
  if (m) return `In ${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}`;
  const s = /\b(?:in|during)\s+(?:the\s+)?(spring|summer|autumn|fall|winter|monsoon)\b/i.exec(text ?? "");
  if (s) return `In ${s[1].toLowerCase()}`;
  return null;
}

/** Retrieve one article into the shape the generator expects. */
async function retrieveOne(title, extra = {}) {
  await sleep(PAUSE_MS);
  const data = await summary(title);
  if (data?.error || data?.type?.endsWith("not_found")) {
    return { dropped: { title, reason: data?.error ?? "no such page" } };
  }
  if (data?.type?.endsWith("disambiguation") || /\bmay refer to\b/i.test(data?.extract ?? "")) {
    return { dropped: { title, reason: "disambiguation page" } };
  }

  await sleep(PAUSE_MS);
  const intro = await lead(title);
  await sleep(PAUSE_MS);
  const picture = await image(title);
  const rights = picture ? await licence(picture.commonsFilePage) : null;
  await sleep(PAUSE_MS);
  const structured = await wikidata(title);

  return {
    entry: {
      id: slugOf(data.title),
      title: data.title,
      extract: data.extract ?? "",
      lead: intro,
      page: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      coordinates: data.coordinates
        ? { lat: data.coordinates.lat, lng: data.coordinates.lon, from: "wikipedia" }
        : structured?.coordinates
          ? { ...structured.coordinates, from: "wikidata" }
          : null,
      image: picture && rights?.license ? { ...picture, ...rights } : null,
      wikidata: structured,
      ...extra,
    },
  };
}

const report = [];

for (const destinationId of destinationIds) {
  const mine = titles.filter((t) => t.destinationId === destinationId);
  const myStays = stays[destinationId] ?? [];
  console.log(`\n${destinationId} — ${mine.length} cultural, ${myStays.length} stays`);

  const record = {
    destinationId,
    retrievedAt: new Date().toISOString().slice(0, 10),
    retrievalMethod: "web-search",
    agent: "wikipedia-rest-v1",
    culture: [],
    stays: [],
    dropped: [],
  };

  /*
   * `culture-titles.json` also holds the stay candidates that the first,
   * guessed list happened to resolve — but stays are retrieved from
   * `stays-final.json`, which merges those with what the hotel categories
   * actually contain. Taking them from both would retrieve each twice and
   * publish it as a dish.
   */
  for (const candidate of mine.filter((c) => c.kind !== "stay")) {
    const { entry, dropped } = await retrieveOne(candidate.final, { kind: candidate.kind });
    if (dropped) {
      console.log(`  DROP  ${dropped.title} — ${dropped.reason}`);
      record.dropped.push(dropped);
      continue;
    }
    entry.season = entry.kind === "festival" ? seasonOf(entry.lead || entry.extract) : null;
    record.culture.push(entry);
    console.log(
      `  ok    ${entry.kind.padEnd(8)} ${entry.title.padEnd(38)} ` +
        `${entry.season ? entry.season.padEnd(14) : "".padEnd(14)} ${entry.image ? entry.image.license : "no image"}`,
    );
  }

  for (const title of myStays) {
    const { entry, dropped } = await retrieveOne(title);
    if (dropped) {
      console.log(`  DROP  stay ${dropped.title} — ${dropped.reason}`);
      record.dropped.push(dropped);
      continue;
    }
    /* An opening year, only where Wikidata publishes an inception or opening. */
    const opened = entry.wikidata?.dates?.find((d) => /inception|opening/i.test(d.label));
    entry.openedYear = opened?.year ?? null;
    record.stays.push(entry);
    console.log(
      `  ok    stay     ${entry.title.padEnd(38)} ` +
        `${entry.openedYear ? String(entry.openedYear).padEnd(14) : "".padEnd(14)} ${entry.image ? entry.image.license : "no image"}`,
    );
  }

  writeFileSync(`${OUT_DIR}/${destinationId}.json`, `${JSON.stringify(record, null, 2)}\n`);
  const by = (k) => record.culture.filter((c) => c.kind === k).length;
  report.push({
    id: destinationId,
    food: by("food"), festival: by("festival"), craft: by("craft"),
    stays: record.stays.length,
    images: [...record.culture, ...record.stays].filter((e) => e.image).length,
    dropped: record.dropped.length,
  });
}

console.log(`\n${"".padEnd(78, "=")}`);
for (const r of report) {
  console.log(
    `${r.id.padEnd(15)} food ${String(r.food).padStart(2)} · festival ${String(r.festival).padStart(2)} · ` +
      `craft ${String(r.craft).padStart(2)} · stays ${String(r.stays).padStart(2)} · ` +
      `images ${String(r.images).padStart(2)} · dropped ${r.dropped}`,
  );
}
const total = (k) => report.reduce((n, r) => n + r[k], 0);
console.log("".padEnd(78, "="));
console.log(
  `TOTAL           food ${total("food")} · festival ${total("festival")} · craft ${total("craft")} · ` +
    `stays ${total("stays")} · images ${total("images")}`,
);
console.log(`\nRecords written to ${OUT_DIR}/ (gitignored).\n`);
