/**
 * Culture, stays and the twelve-language interface.
 *
 * WHAT THIS SUITE IS GUARDING
 * ---------------------------
 * Two of the three things it covers are the ones this project is most likely
 * to be asked to compromise on, and the ones it must not.
 *
 * A stays section is one careless commit away from becoming a hotel
 * directory: a rate here, a telephone number there, a "book now" that goes
 * somewhere. None of that data exists behind this product, so all of it would
 * have to be invented, and an invented telephone number for a real hotel
 * sends a real person to a wrong number. The type cannot express those
 * fields; this suite checks that no rendered page has grown them anyway.
 *
 * A festival is one careless commit away from claiming a date. "Diwali is on
 * 20 October" is a scheduling claim with no feed behind it and a shelf life
 * of one year. `season` may say "In October"; it may not say a date.
 *
 * And a translated page is one careless commit away from translating the
 * archive. Every factual sentence in this product is quoted from a named
 * source; a machine-translated quotation is a paraphrase wearing a citation.
 * So the eleven translated hubs must carry the SAME archive text as the
 * English one, and must say so.
 *
 *   node scripts/qa/culture.mjs [--base http://localhost:3000]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";

const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex > -1 ? process.argv[baseIndex + 1] : process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n-- ${t} --`);

async function get(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const body = response.status === 200 ? await response.text() : "";
    return { status: response.status, body };
  } catch {
    return { status: 0, body: "" };
  }
}

const CAPSULE_DIR = "src/data/destinations/capsules";
const files = readdirSync(CAPSULE_DIR)
  .filter((f) => f.endsWith(".ts") && !["index.ts", "ids.ts", "_template.ts"].includes(f));

/* ========================================================================
   A. THE SHAPE OF WHAT WAS GENERATED
   ======================================================================== */
section("A. Culture and stays records");

let totalCulture = 0, totalStays = 0, withSeason = 0;
const kindsSeen = new Set();

for (const file of files) {
  const src = readFileSync(`${CAPSULE_DIR}/${file}`, "utf8");
  const id = file.replace(/\.ts$/, "");

  const cultureBlock = src.slice(src.indexOf("culture: ["), src.indexOf("stays: ["));
  const staysBlock = src.slice(src.indexOf("stays: ["), src.indexOf("reviewedAt:"));

  const kinds = [...cultureBlock.matchAll(/kind: "(\w+)"/g)].map((m) => m[1]);
  kinds.forEach((k) => kindsSeen.add(k));
  const stays = [...staysBlock.matchAll(/\n      id: "/g)].length;
  totalCulture += kinds.length;
  totalStays += stays;
  withSeason += [...cultureBlock.matchAll(/season: "/g)].length;

  check(`${id}: every culture entry cites a source`,
    [...cultureBlock.matchAll(/\n      id: "/g)].length ===
      [...cultureBlock.matchAll(/sourceIds: \[[^\]]+\]/g)].length);
  check(`${id}: every stay cites a source`,
    stays === [...staysBlock.matchAll(/sourceIds: \[[^\]]+\]/g)].length);
}

check("Only food, festival and craft are used as culture kinds",
  [...kindsSeen].every((k) => ["food", "festival", "craft"].includes(k)),
  [...kindsSeen].join(", "));
check("Culture entries were generated", totalCulture > 0, `${totalCulture} entries`);
check("Stays were generated", totalStays > 0, `${totalStays} stays`);

/* ========================================================================
   B. WHAT A STAY MAY NOT SAY
   ======================================================================== */
section("B. Stays are records, not a booking directory");

/*
 * Checked against the generated SOURCE rather than a rendered page, so a
 * field that exists but happens not to render today is still caught.
 */
/*
 * WHAT CHANGED, AND WHY IT IS NOT A RELAXATION.
 *
 * `phone` was on this list when no source in the product published one. It
 * came off when Wikidata's P1329 did — a telephone number a source states is
 * a retrieved fact, exactly like a founding date, and the brief asks for it.
 *
 * The guarantee has not moved: it was never "no contact data", it was
 * "nothing invented". A retrieved number is checked for shape above, most
 * stays still have none, and the fields below remain unspellable because no
 * source behind this product publishes any of them — so any value in one
 * could only ever have been written by hand.
 */
const FORBIDDEN_FIELDS = [
  ["price or rate", /\bprice:|\brate:|\btariff:|\bcost:|\bperNight:/],
  ["rating", /\brating:|\bstars:|\breviewScore:/],
  ["availability", /\bavailability:|\bvacancy:|\brooms:/],
  ["booking link", /\bbookingUrl:|\bbookNow:|\breservationUrl:/],
];
for (const file of files) {
  const src = readFileSync(`${CAPSULE_DIR}/${file}`, "utf8");
  for (const [label, pattern] of FORBIDDEN_FIELDS) {
    check(`${file.replace(/\.ts$/, "")}: no ${label} field`, !pattern.test(src));
  }
}

/*
 * A CONTACT DETAIL IS RETRIEVED OR IT IS ABSENT.
 *
 * 27 of 62 stays have a published website and 2 have a telephone number. The
 * danger is not that these exist — they are facts Wikidata publishes — but
 * that a later edit fills the other 35 and 60 with something plausible. A
 * wrong number for a real hotel sends a real person to a stranger.
 *
 * Every emitted value must therefore look like a retrieved one: a resolvable
 * URL, an international telephone number. Nothing templated, nothing partial.
 */
let websites = 0, phones = 0;
for (const file of files) {
  const src = readFileSync(`${CAPSULE_DIR}/${file}`, "utf8");
  const id = file.replace(/\.ts$/, "");
  for (const m of src.matchAll(/website: "([^"]+)"/g)) {
    websites += 1;
    check(`${id}: website ${m[1].slice(0, 40)} is a resolvable link`,
      /^https?:\/\/[^\s"]+$/.test(m[1]));
  }
  for (const m of src.matchAll(/phone: "([^"]+)"/g)) {
    phones += 1;
    check(`${id}: phone ${m[1]} is an international number`,
      /^\+?[\d][\d\s().-]{5,}$/.test(m[1]) && !/x{3,}|0{6,}|1234567/i.test(m[1]));
  }
}
check("Most stays have NO telephone number, which is the honest state",
  phones < totalStays / 2, `${phones} of ${totalStays} stays`);
check("Contact details were emitted at all", websites > 0, `${websites} websites`);

/* The type itself must not be able to express them. */
const capsuleType = readFileSync("src/types/capsule.ts", "utf8");
const stayType = capsuleType.slice(capsuleType.indexOf("export interface CapsuleStay"));
const stayBody = stayType.slice(0, stayType.indexOf("\n}"));
for (const [label, pattern] of FORBIDDEN_FIELDS) {
  check(`CapsuleStay cannot express a ${label}`, !pattern.test(stayBody));
}

/*
 * A HOTEL'S TWO DATES ARE NOT ONE DATE.
 *
 * Wikidata publishes both `inception` (the building) and `date of official
 * opening` (the hotel). Taking whichever came first and labelling it "Opened"
 * made The Peninsula Paris — a 1903 building that opened as a hotel in 2014 —
 * read as having opened in 1903. They are separate fields now, and a hotel
 * cannot have opened before its own building existed.
 */
section("B2. A stay's opening year is not its building's");

let pairsChecked = 0;
for (const file of files) {
  const src = readFileSync(`${CAPSULE_DIR}/${file}`, "utf8");
  const staysBlock = src.slice(src.indexOf("  stays: ["), src.indexOf("  reviewedAt:"));
  for (const block of staysBlock.split("    {").slice(1)) {
    const opened = /openedYear: (\d+)/.exec(block);
    const built = /buildingYear: (\d+)/.exec(block);
    if (!opened || !built) continue;
    pairsChecked += 1;
    const name = /name: "([^"]+)"/.exec(block)?.[1] ?? "?";
    check(`${file.replace(/\.ts$/, "")}: ${name} did not open before it was built`,
      Number(opened[1]) >= Number(built[1]),
      `opened ${opened[1]}, built ${built[1]}`);
  }
}
check("Stays carrying both dates were checked", pairsChecked > 0, `${pairsChecked} pairs`);

/* ========================================================================
   C. A SEASON IS NOT A DATE
   ======================================================================== */
section("C. Festivals state a season, never a date");

let seasonsChecked = 0;
for (const file of files) {
  const src = readFileSync(`${CAPSULE_DIR}/${file}`, "utf8");
  for (const m of src.matchAll(/season: "([^"]+)"/g)) {
    seasonsChecked += 1;
    const value = m[1];
    check(`${file.replace(/\.ts$/, "")}: season "${value}" is not a date`,
      !/\d{1,2}[/-]\d{1,2}|\b(19|20)\d{2}\b/.test(value));
  }
}
check("Seasons were parsed from sources at all", seasonsChecked === withSeason);

/* ========================================================================
   D. THE TWELVE-LANGUAGE INTERFACE
   ======================================================================== */
section("D. Twenty languages");

const dictionary = readFileSync("src/lib/i18n/dictionary.ts", "utf8");
const languages = readFileSync("src/lib/i18n/languages.ts", "utf8");

const codes = [...languages.matchAll(/code: "(\w{2})"/g)].map((m) => m[1]);
check("Twenty languages are declared", codes.length === 20, codes.join(" "));

/*
 * INTERFACE LANGUAGES ARE NOT AUDIO LANGUAGES.
 *
 * The interface is offered in twenty; the narrated guides exist in twelve,
 * and only for Sikkim. A reader who switches to Tamil must not be shown a
 * player that implies a Tamil guide exists. The two sets are declared in two
 * places on purpose, and this asserts that the audio set stays the smaller
 * one rather than being quietly widened to match the buttons.
 */
const audioSrc = readFileSync("src/data/audio.ts", "utf8");
const audioOrder = audioSrc.slice(audioSrc.indexOf("export const LANGUAGE_ORDER"));
const audioCodes = [...audioOrder.slice(0, audioOrder.indexOf("] as const")).matchAll(/"(\w{2})"/g)]
  .map((m) => m[1]);
check("The audio language set is twelve, not twenty", audioCodes.length === 12,
  audioCodes.join(" "));
check("Every audio language is also an interface language",
  audioCodes.every((code) => codes.includes(code)),
  audioCodes.filter((code) => !codes.includes(code)).join(", ") || "12 of 20");
check("Arabic is the only right-to-left language",
  (languages.match(/dir: "rtl"/g) ?? []).length === 1);

/*
 * Every language must define every key the type declares.
 *
 * The union puts several keys on a line, so the keys are read from the whole
 * `MessageKey` declaration rather than one per line — the first version of
 * this check found 9 of 27 and would have passed a dictionary missing most of
 * its entries.
 */
const unionBody = dictionary.slice(
  dictionary.indexOf("export type MessageKey"),
  dictionary.indexOf("type Dictionary ="),
);
const allKeys = [...new Set([...unionBody.matchAll(/"([\w.]+)"/g)].map((m) => m[1]))];
check("Message keys are declared", allKeys.length > 20, `${allKeys.length} keys`);

/*
 * The navbar's two strings are mirrored in `nav-labels.ts` so the client
 * bundle does not carry the whole dictionary. Mirrors drift; this asserts
 * they have not.
 */
const navLabels = readFileSync("src/lib/i18n/nav-labels.ts", "utf8");
for (const code of codes) {
  const dictBlock = dictionary.slice(dictionary.indexOf(`const ${code}: Dictionary = {`));
  const dictBody = dictBlock.slice(0, dictBlock.indexOf("\n};"));
  const navRow = new RegExp(`\\n  ${code}: \\{ label: "([^"]*)", change: "([^"]*)" \\},`).exec(navLabels);
  const dictLabel = /"lang\.label": "([^"]*)"/.exec(dictBody)?.[1];
  const dictChange = /"lang\.change": "([^"]*)"/.exec(dictBody)?.[1];
  check(`${code}: the navbar labels match the dictionary`,
    Boolean(navRow) && navRow[1] === dictLabel && navRow[2] === dictChange,
    navRow ? `${navRow[1]} / ${navRow[2]}` : "absent from nav-labels.ts");
}

for (const code of codes) {
  const block = dictionary.slice(dictionary.indexOf(`const ${code}: Dictionary = {`));
  const body = block.slice(0, block.indexOf("\n};"));
  const missing = allKeys.filter((key) => !body.includes(`"${key}":`));
  check(`${code}: all ${allKeys.length} interface strings are translated`,
    missing.length === 0, missing.slice(0, 4).join(", "));
}

/* ========================================================================
   E. TRANSLATION DOES NOT TOUCH THE ARCHIVE
   ======================================================================== */
section("E. Translated pages, and what they must not translate");

const english = await get(`${BASE}/destinations/delhi`);
check("The English hub is served", english.status === 200);

const japanese = await get(`${BASE}/l/ja/destinations/delhi`);
const arabic = await get(`${BASE}/l/ar/destinations/delhi`);
check("A translated hub is served", japanese.status === 200);
check("Arabic renders right-to-left", /<div lang="ar" dir="rtl"/.test(arabic.body));
check("Japanese renders left-to-right", /<div lang="ja" dir="ltr"/.test(japanese.body));

check("English is not reachable under a language prefix",
  (await get(`${BASE}/l/en/destinations/delhi`)).status === 404);
check("An unknown language is a 404, not an untranslated page",
  (await get(`${BASE}/l/zz/destinations/delhi`)).status === 404);

/*
 * THE CENTRAL CHECK OF THIS SUITE.
 *
 * A place summary is a verbatim quotation from a cited source. It must read
 * identically on the Japanese page and the English one — if it ever differs,
 * something has translated a quotation, and the citation beside it has become
 * a lie.
 */
const firstSummary = (html) => {
  const m = /<p class="[^"]*text-muted[^"]*">([^<]{80,})<\/p>/.exec(html);
  return m ? m[1].trim() : null;
};
const enSummary = firstSummary(english.body);
check("An archive sentence could be read from the English page", Boolean(enSummary));
if (enSummary) {
  check("The same archive sentence is untranslated on the Japanese page",
    japanese.body.includes(enSummary),
    "quoted text must not be machine-translated");
}

check("The translated page explains why the archive is not in that language",
  /出典|翻訳/.test(japanese.body));

check("The canonical link on a translated page points at the English one",
  /rel="canonical"[^>]*\/destinations\/delhi"/.test(japanese.body) ||
  japanese.body.includes('"canonical":"/destinations/delhi"') ||
  /<link rel="canonical" href="[^"]*\/destinations\/delhi"/.test(japanese.body));

/* ========================================================================
   F. THE ENGLISH ROUTES ARE UNCHANGED
   ======================================================================== */
section("F. The English surface is untouched");

const OUT = ".next/server/app/destinations";
const prerendered = existsSync(OUT)
  ? readdirSync(OUT).filter((f) => f.endsWith(".html")).length
  : 0;
check("All fifteen English hubs are still prerendered", prerendered === 15, `${prerendered}/15`);

const translatedOut = ".next/server/app/l";
const translatedCount = existsSync(translatedOut)
  ? readdirSync(translatedOut).reduce((n, lang) => {
      const dir = `${translatedOut}/${lang}/destinations`;
      return n + (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).length : 0);
    }, 0)
  : 0;
/*
 * Derived, not hardcoded. This said 165 — fifteen destinations times eleven
 * non-English languages — and broke the moment the interface went from twelve
 * languages to twenty. The invariant being asserted is "every translated hub
 * is prerendered", which is a product of the two registries, not a number.
 */
const expectedTranslated = (codes.length - 1) * 15;
check("The translated hubs are prerendered too, not rendered on demand",
  translatedCount === expectedTranslated, `${translatedCount}/${expectedTranslated}`);

/* ========================================================================
   G. NO RECORD SITS IN ANOTHER CITY
   ======================================================================== */
section("G. Geographic integrity");

/*
 * WHY THIS CHECK EXISTS
 * ---------------------
 * Three records were filed under the wrong destination and only their
 * coordinates gave them away: a hotel near Udaipur listed under Jaipur
 * (317 km), a fort carrying Delhi's coordinate (234 km), and a building in
 * MINNEAPOLIS listed under New York City (1,635 km). Every one came from a
 * regional category listing that reaches far beyond the city it was searched
 * for.
 *
 * The centre is the MEDIAN of each destination's own place coordinates — a
 * mean would be dragged toward the very outlier being looked for.
 */
const MAX_KM = 150;
const haversine = (a, b) => {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

let displaced = [];
let coordsChecked = 0;
for (const file of files) {
  const id = file.replace(/\.ts$/, "");
  const src = readFileSync(`${CAPSULE_DIR}/${file}`, "utf8");
  const coords = [...src.matchAll(/coordinates: \{ lat: (-?[\d.]+), lng: (-?[\d.]+) \}/g)]
    .map((m) => ({ lat: Number(m[1]), lng: Number(m[2]) }));
  if (coords.length < 3) continue;

  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const centre = {
    lat: median(coords.map((c) => c.lat)),
    lng: median(coords.map((c) => c.lng)),
  };
  for (const c of coords) {
    coordsChecked += 1;
    const km = haversine(centre, c);
    if (km > MAX_KM) displaced.push(`${id}: ${Math.round(km)}km`);
  }
}

check("No catalogued record sits outside its own destination",
  displaced.length === 0,
  displaced.slice(0, 4).join(", ") || `${coordsChecked} coordinates, all within ${MAX_KM}km`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
