/**
 * Propose MORE culture subjects — the dishes, festivals and crafts a
 * destination's own Wikipedia categories name.
 *
 * WHY THIS EXISTS
 * ---------------
 * `candidates.mjs` was written by hand, seven to twenty subjects per
 * destination, and stories are built from those subjects: a destination with
 * eleven culture records cannot hold twenty-five stories. Rather than guess
 * more titles, this reads the categories the encyclopedia already maintains
 * for that city and its state — "Category:Cuisine of Rajasthan",
 * "Category:Festivals in Kerala" — and proposes their members.
 *
 * It asserts nothing about the world. `check-titles.mjs` resolves what this
 * proposes, `retrieve-culture.mjs` reads the resolved articles, and every
 * sentence a visitor sees is quoted from one of them with its source named.
 *
 * WHAT IT REFUSES TO PROPOSE
 * --------------------------
 *   - anything already in candidates.mjs for that destination
 *   - list, index, category and disambiguation pages
 *   - an article under MIN_CHARS: a story needs 220 words of prose, and a
 *     two-line stub cannot supply them
 *   - anything with coordinates: that is a place, and places are catalogued
 *     by the capsule pass, not as culture
 *
 *   node scripts/capsules/discover-culture.mjs [destinationId…] [--per 18]
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { CANDIDATES } from "./candidates.mjs";

const WIKI = "https://en.wikipedia.org/w/api.php";
const UA = "TerraStory/1.0 (cultural tourism archive; contact via repository)";
/* Wikitext bytes: about 700 words of prose, comfortably over the 220 a story needs. */
const MIN_BYTES = 6000;
const PER_DESTINATION = 18;
const PACE_MS = 5000;

/**
 * Which categories to read for each destination, as city and state names.
 * `{city}` and `{state}` are filled from the registry; a category that does
 * not exist simply returns nothing.
 */
/**
 * What to SEARCH the category namespace for, per kind. The real names are
 * irregular — "Category:Rajasthani cuisine", "Category:Cuisine of Kerala",
 * "Category:Festivals in Delhi" — so they are found rather than guessed. An
 * earlier version assumed the names and returned almost nothing.
 */
const CATEGORY_SEARCHES = {
  food: ["{state} cuisine", "cuisine of {state}", "{city} cuisine", "cuisine of {city}"],
  festival: ["festivals in {state}", "festivals in {city}", "{state} festivals"],
  craft: [
    "{state} art", "art of {state}", "{state} clothing", "textile arts {state}",
    "handicrafts {state}", "music of {state}", "dances of {state}", "culture of {city}",
  ],
};

/** Categories whose names promise the wrong thing whatever the search said. */
const CATEGORY_REFUSED = /stub|wikipedia|template|redirect|image|people|writer|singer|politician|film|album|song|actor|cricket|sport|award|company|university|school|district|village|building|monument|temple|museum|park|street|road|railway/i;

const args = process.argv.slice(2);
const perIndex = args.indexOf("--per");
const per = perIndex > -1 ? Number(args[perIndex + 1]) : PER_DESTINATION;
const only = args.filter((value, index) => !value.startsWith("--") && index !== perIndex + 1);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextSlot = 0;
async function paced() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + PACE_MS;
  if (wait > 0) await sleep(wait);
}

async function api(params) {
  const url = new URL(WIKI);
  for (const [key, value] of Object.entries({ format: "json", ...params })) url.searchParams.set(key, String(value));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await paced();
    const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    if (response.status === 429) {
      const backoff = 60_000 * (attempt + 1);
      console.log(`  (rate limited, waiting ${backoff / 1000}s)`);
      await sleep(backoff);
      continue;
    }
    if (response.status >= 500) {
      await sleep(5_000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
  }
  throw new Error(`gave up after retries on ${url}`);
}

/** The real category names for one search phrase, best match first. */
async function findCategories(phrase) {
  const data = await api({
    action: "query",
    list: "search",
    srsearch: phrase,
    srnamespace: 14,
    srlimit: 5,
  });
  return (data.query?.search ?? [])
    .map((result) => result.title)
    .filter((title) => !CATEGORY_REFUSED.test(title.replace(/^Category:/, "")));
}

async function membersOf(category) {
  const data = await api({
    action: "query",
    list: "categorymembers",
    cmtitle: category,
    cmlimit: 200,
    cmnamespace: 0,
    cmtype: "page",
  });
  return (data.query?.categorymembers ?? []).map((page) => ({ pageid: page.pageid, title: page.title }));
}

/**
 * Article SIZE, coordinates and the disambiguation flag, fifty at a time.
 *
 * Size, not the opening paragraph: the stories pass reads the WHOLE article
 * and needs 220 words from it, and plenty of dishes and festivals open with
 * two lines above a long body. Filtering on the intro threw those away.
 */
async function inspect(pages) {
  const out = [];
  for (let i = 0; i < pages.length; i += 50) {
    const batch = pages.slice(i, i + 50);
    const data = await api({
      action: "query",
      prop: "pageprops|coordinates|revisions",
      ppprop: "disambiguation",
      rvprop: "size",
      pageids: batch.map((page) => page.pageid).join("|"),
    });
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.pageprops?.disambiguation !== undefined) continue;
      /* A thing with a coordinate is a place; places are catalogued by the
         capsule pass, not as culture. */
      if (page.coordinates) continue;
      const size = page.revisions?.[0]?.size ?? 0;
      if (size < MIN_BYTES) continue;
      out.push({ title: page.title, chars: size });
    }
  }
  return out;
}

const { listDestinations } = await import("../../src/lib/destinations/registry.ts");
const destinations = listDestinations().filter(
  (destination) => destination.id !== "sikkim" && (only.length === 0 || only.includes(destination.id)),
);

const output = {};
for (const destination of destinations) {
  const city = destination.name;
  const state = destination.region?.name ?? destination.country.name;
  const existing = new Set(Object.values(CANDIDATES[destination.id] ?? {}).flat());
  const proposals = { food: [], festival: [], craft: [] };
  const seen = new Set();

  for (const [kind, searches] of Object.entries(CATEGORY_SEARCHES)) {
    const pages = [];
    const categories = new Set();
    for (const search of searches) {
      const phrase = search.replace("{city}", city).replace("{state}", state);
      for (const category of await findCategories(phrase)) categories.add(category);
    }
    for (const category of [...categories].slice(0, 6)) {
      const members = await membersOf(category);
      for (const member of members) {
        if (seen.has(member.title) || existing.has(member.title)) continue;
        if (/^(List|Index|Outline|Timeline|Category)\b/i.test(member.title)) continue;
        seen.add(member.title);
        pages.push({ ...member, category });
      }
    }
    const usable = await inspect(pages);
    proposals[kind] = usable.sort((a, b) => b.chars - a.chars).slice(0, per).map((page) => page.title);
  }

  output[destination.id] = proposals;
  const counts = Object.entries(proposals).map(([kind, list]) => `${kind} ${list.length}`).join(", ");
  console.log(`${destination.id.padEnd(13)} ${counts}`);
}

mkdirSync(".data", { recursive: true });
writeFileSync(".data/culture-proposals.json", `${JSON.stringify(output, null, 2)}\n`);
const total = Object.values(output).flatMap((entry) => Object.values(entry).flat()).length;
console.log(`\nWrote .data/culture-proposals.json (${total} proposals)`);
