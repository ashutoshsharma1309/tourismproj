/**
 * The Archive module, checked as data and as routes.
 *
 * An archive is a claim about objects, so this is stricter than the other
 * suites in one respect: an entry with no stated licence, no stated maker or
 * no source is not a weak record, it is an inadmissible one. The retrieval
 * enforces that; this asserts the retrieval did.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const DIR = "src/data/generated/archive";

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed++; return; }
  failures.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* Titles that name a medium rather than an object. */
const UNINFORMATIVE =
  /^(fotografier|photographs?|photos?|images?|pictures?|untitled|unknown|no title|album|collection|item|object)$/i;
/* Wikidata syntax that must never reach a reader. */
const MACHINE_SYNTAX = /\bQS:P\d+|\+\d{4}-\d{2}-\d{2}T/;

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
/* Counted from ids.ts, not typed: 14 became 17 in the India-only expansion. */
const CAPSULE_COUNT = (readFileSync("src/data/destinations/capsules/ids.ts", "utf8").match(/^\s+"[a-z-]+",$/gm) ?? []).length;
check("Every capsule destination has a catalogue", files.length === CAPSULE_COUNT, `${files.length}`);

let total = 0;
const allIds = new Set();
for (const file of files) {
  const id = file.replace(/\.json$/, "");
  const objects = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  total += objects.length;

  check(`${id}: has catalogued objects`, objects.length > 0, `${objects.length}`);

  const seen = new Set();
  const titles = new Set();
  for (const object of objects) {
    const where = `${id}/${object.id}`;

    check(`${where}: names its destination`, object.destinationId === id, object.destinationId);
    check(`${where}: is not duplicated here`, !seen.has(object.id), object.id);
    seen.add(object.id);
    check(`${where}: its id is unique across destinations`, !allIds.has(`${id}/${object.id}`));
    allIds.add(`${id}/${object.id}`);

    /* Cataloguing. */
    check(`${where}: has a title`, typeof object.title === "string" && object.title.length > 2);
    check(`${where}: its title names an object, not a medium`,
      !UNINFORMATIVE.test(object.title.trim()), object.title);
    check(`${where}: its title is not repeated here`, !titles.has(object.title.toLowerCase()), object.title);
    titles.add(object.title.toLowerCase());
    check(`${where}: declares an object type`, typeof object.objectType === "string" && object.objectType.length > 0);

    /* RIGHTS — the admissibility rule, asserted. */
    check(`${where}: states its rights`, typeof object.rights === "string" && object.rights.length > 0, object.rights);
    check(`${where}: names a maker`, typeof object.creator === "string" && object.creator.length > 0, object.creator);
    check(`${where}: links its source record`, /^https:\/\/commons\.wikimedia\.org\//.test(object.originalUrl ?? ""), object.originalUrl);
    check(`${where}: names its source`, object.source === "Wikimedia Commons", object.source);
    check(`${where}: records its provenance`, typeof object.provenance === "string" && object.provenance.length > 20);
    check(`${where}: states when it was verified`, /^\d{4}-\d{2}-\d{2}$/.test(object.lastVerifiedAt ?? ""));

    /* Media must be a real remote file at a usable size. */
    /*
     * VENDORED, NOT REMOTE. The first build served archive media straight
     * from upload.wikimedia.org through the image optimiser; warming 9,191
     * variants produced 2,086 HTTP 429s — Wikimedia throttling a burst of
     * full-size fetches, which is exactly the hammering this project forbids.
     * Every other module's photographs are local files; the archive's are now
     * too, fetched once at a bounded width with the source URL kept.
     */
    check(`${where}: its media is vendored under this destination`,
      (object.mediaUrl ?? "").startsWith(`/images/archive/${id}/`), object.mediaUrl);
    check(`${where}: its vendored media is on disk`,
      existsSync(join("public", (object.mediaUrl ?? "/x").slice(1))), object.mediaUrl);
    check(`${where}: its original source URL is kept`,
      /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//.test(object.sourceUrl ?? ""), object.sourceUrl);
    check(`${where}: its media is large enough to catalogue`, (object.width ?? 0) >= 800, `${object.width}px`);

    /* NO MACHINE SYNTAX, NO INVENTED FIELDS. */
    if (object.date) {
      check(`${where}: its date is readable, not Wikidata syntax`, !MACHINE_SYNTAX.test(object.date), object.date);
      /* The scanner's clock is not the object's date. */
      check(`${where}: its date is not a scan timestamp`, !/\d{1,2}:\d{2}/.test(object.date), object.date);
      const year = Number((/\b(\d{4})\b/.exec(object.date) ?? [])[1]);
      check(`${where}: a historical object is not dated to the scan`,
        !(Number.isFinite(year) && year >= 1990 && /Postcards|Maps|Prints|Paintings|Drawings|Historical|Photographs|Manuscripts/.test(object.objectType)),
        `${object.objectType} dated ${object.date}`);
    }
    check(`${where}: claims no dimensions`, !("dimensions" in object), "dimensions present");
    check(`${where}: claims no materials`, !("materials" in object), "materials present");
    check(`${where}: names no holding institution it cannot evidence`,
      object.institution === null || object.institution === undefined, String(object.institution));

    /* Relationships resolve, and stay inside this destination. */
    const capsule = existsSync(join("src/data/destinations/capsules", `${id}.ts`))
      ? readFileSync(join("src/data/destinations/capsules", `${id}.ts`), "utf8")
      : "";
    for (const place of object.relatedPlaces ?? []) {
      check(`${where}: related place "${place}" exists here`, capsule.includes(`id: "${place}"`), place);
    }
    let ownStories = new Set(), ownEvents = new Set();
    try { ownStories = new Set(JSON.parse(readFileSync(`src/data/generated/stories/${id}.json`, "utf8")).map((s) => s.slug)); } catch { /* none */ }
    try { ownEvents = new Set(JSON.parse(readFileSync(`src/data/generated/history/${id}.json`, "utf8")).map((e) => e.slug)); } catch { /* none */ }
    for (const slug of object.relatedStories ?? []) {
      check(`${where}: related story "${slug}" is this destination's`, ownStories.has(slug), slug);
    }
    for (const slug of object.relatedHistory ?? []) {
      check(`${where}: related event "${slug}" is this destination's`, ownEvents.has(slug), slug);
    }
  }
}

check("The catalogue is substantial", total >= 150, `${total} objects`);

/*
 * OWNERSHIP OF THE BUILT PAGES.
 *
 * `archive/[id]` generated its params as (every destination with an archive)
 * x (Sikkim's 77 objects) — the same cross-product the stories route once
 * had. The moment fourteen destinations gained an archive capability, Paris
 * prerendered 77 pages of Sikkim's objects at Paris URLs and the build grew
 * from 1,014 pages to 2,120. A prerendered archive page under a destination
 * must be that destination's own object.
 */
const OUT = ".next/server/app/destinations";
if (existsSync(OUT)) {
  /* archive-items.json is an object wrapping the list, not a bare array —
     `.map` on it threw and took the whole suite down as 0/1. */
  const rawItems = JSON.parse(readFileSync("src/data/generated/archive-items.json", "utf8"));
  const itemList = Array.isArray(rawItems) ? rawItems : (rawItems.items ?? Object.values(rawItems).find(Array.isArray) ?? []);
  const sikkimIds = new Set(itemList.map((item) => item.id));
  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const dir = join(OUT, id, "archive");
    if (!existsSync(dir)) continue;
    const own = new Set(JSON.parse(readFileSync(join(DIR, file), "utf8")).map((o) => o.id));
    const built = readdirSync(dir).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
    const borrowed = built.filter((slug) => sikkimIds.has(slug) && !own.has(slug));
    check(`${id}: prerenders none of Sikkim's archive objects`, borrowed.length === 0, `${borrowed.length} borrowed`);
    const strangers = built.filter((slug) => !own.has(slug) && !sikkimIds.has(slug));
    check(`${id}: every built archive page is its own object`, strangers.length === 0, strangers.slice(0, 3).join(", "));
  }
}

if (!process.argv.includes("--no-server")) {
  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const res = await fetch(`${BASE}/destinations/${id}/archive`, { redirect: "manual" });
    check(`${id}: its archive serves`, res.status === 200, `HTTP ${res.status}`);
    if (res.status === 200) {
      const html = await res.text();
      check(`${id}: the page prints a licence`, /Rights|Public domain|CC BY/i.test(html));
      check(`${id}: the page links Wikimedia Commons`, /commons\.wikimedia\.org/.test(html));
      /* Sikkim's archive vocabulary must not appear on another catalogue. */
      check(`${id}: borrows no Sikkim vocabulary`, !/Lepcha|Bhutia|Namgyal/.test(html));
    }
  }
  const sikkim = await fetch(`${BASE}/destinations/sikkim/archive`, { redirect: "manual" });
  check("sikkim: its own archive still serves", sikkim.status === 200, `HTTP ${sikkim.status}`);
}

for (const line of failures.slice(0, 25)) console.log(line);
if (failures.length > 25) console.log(`… and ${failures.length - 25} more`);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
