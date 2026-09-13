/**
 * A catalogued archive for the fourteen destinations that have none.
 *
 * WHY THIS IS NOT THE MEDIA PIPELINE AGAIN
 * ----------------------------------------
 * The media pipeline collects photographs OF PLACES — what a visitor would
 * stand in front of. An archive object is a catalogued THING: a photograph
 * taken in 1890, a map drawn in 1740, a painting, a manuscript page. The
 * difference between the two is the whole difference between an archive and
 * a gallery, and it is why this retrieves against different criteria.
 *
 * WHAT MAKES AN OBJECT ADMISSIBLE
 * -------------------------------
 * Wikimedia Commons publishes licence, author and description as structured
 * metadata (`extmetadata`), so an object is admitted only when Commons itself
 * states:
 *
 *   - a licence, and
 *   - an author, and
 *   - a description or a date
 *
 * A file with no author or no licence is rejected however good the picture
 * is: "never use an image merely because a search engine returned it" is the
 * rule, and an unattributed file cannot satisfy it. Nothing here infers a
 * date, a maker or an institution that Commons does not print.
 *
 * TWO STEPS, DELIBERATELY
 * -----------------------
 * Categories are DISCOVERED first rather than guessed. Writing
 * "Category:Historical images of Kochi" from memory produces a 404 and an
 * empty archive that looks like an absence of heritage; asking Commons which
 * categories exist for a destination produces the ones that do.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = ".data/archive";
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";
const PAUSE_MS = 700;
const PER_DESTINATION = 24;
const API = "https://commons.wikimedia.org/w/api.php";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The archival subjects worth asking for, in the order they are asked. */
const SUBJECTS = [
  { probe: "historical images", category: "Historical photographs" },
  { probe: "old photographs", category: "Historical photographs" },
  { probe: "old maps", category: "Maps" },
  { probe: "history", category: "Historical documents" },
  { probe: "paintings", category: "Paintings" },
];

/** Files whose NAME says they are not an archival object. */
const NOT_AN_OBJECT =
  /\b(disambig\w*|diagram|locator|chart|graph|logo|icon|coat of arms|flag of|seal of|schematic|blank|outline|template|banner|button)\b/i;

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  for (let attempt = 0; attempt <= 3; attempt++) {
    let res;
    try { res = await fetch(url, { headers: { "User-Agent": UA } }); }
    catch { await sleep(2000 * 2 ** attempt); continue; }
    if (res.ok) return res.json();
    if (attempt === 3) { console.log(`    ! ${res.status}`); return null; }
    const after = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 2000 * 2 ** attempt);
  }
  return null;
}

/** Which of the categories we hoped for actually exist for this destination. */
async function categoriesFor(name) {
  const found = [];
  for (const subject of SUBJECTS) {
    const data = await api({
      action: "query", list: "search", srnamespace: "14",
      srsearch: `${name} ${subject.probe}`, srlimit: "3",
    });
    await sleep(PAUSE_MS);
    for (const hit of data?.query?.search ?? []) {
      /* The category must name the destination, or it is somewhere else's. */
      if (!new RegExp(`\\b${name.split(" ")[0]}`, "i").test(hit.title)) continue;
      found.push({ title: hit.title, category: subject.category });
    }
  }
  return found.slice(0, 6);
}

/** Files in a category, with the metadata that makes them admissible. */
async function filesIn(categoryTitle) {
  const data = await api({
    action: "query", generator: "categorymembers",
    gcmtitle: categoryTitle, gcmtype: "file", gcmlimit: "30",
    prop: "imageinfo", iiprop: "url|size|extmetadata",
  });
  return Object.values(data?.query?.pages ?? {});
}

const plain = (html) =>
  typeof html === "string"
    ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";

mkdirSync(OUT, { recursive: true });

/* `--only=a,b` limits the run to those destinations. Added for the India-only
   expansion so the eight new cities could be retrieved without re-fetching —
   and re-dating — the records the other destinations already publish. */
const ONLY = (process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const wanted = (id) => ONLY.length === 0 || ONLY.includes(id);

const REGISTRY = JSON.parse(readFileSync(".data/history-manifest.json", "utf8"));
/* The name Commons categories use. Mysuru's categories are still titled
   "Mysore", which is the register's own spelling and not a claim of ours. */
const NAMES = {
  agra: "Agra", delhi: "Delhi", goa: "Goa", hyderabad: "Hyderabad",
  jaipur: "Jaipur", kochi: "Kochi", kolkata: "Kolkata", mumbai: "Mumbai",
  varanasi: "Varanasi", amritsar: "Amritsar", ahmedabad: "Ahmedabad",
  lucknow: "Lucknow", pune: "Pune", mysuru: "Mysore", madurai: "Madurai",
  bhubaneswar: "Bhubaneswar", srinagar: "Srinagar",
};

let grand = 0;
for (const id of Object.keys(REGISTRY)) {
  if (!wanted(id)) continue;
  const name = NAMES[id];
  if (!name) continue;

  const categories = await categoriesFor(name);
  const objects = [];
  const rejected = [];
  const seen = new Set();

  /*
   * Round-robin, not first-come.
   *
   * Filling the budget from the first category let one collection dominate:
   * Istanbul's whole allowance went to the Hallwyl Museum's files, which are
   * titled "Fotografier" to a file, and its "Old maps of Istanbul" and
   * "15th-century maps" categories were never reached. Taking a few from each
   * category in turn gives a catalogue that reflects what a destination holds
   * rather than which category the search happened to rank first.
   */
  const PER_CATEGORY = Math.max(4, Math.ceil(PER_DESTINATION / Math.max(1, categories.length)));
  for (const category of categories) {
    if (objects.length >= PER_DESTINATION) break;
    const files = await filesIn(category.title);
    await sleep(PAUSE_MS);

    let takenHere = 0;
    for (const page of files) {
      if (objects.length >= PER_DESTINATION) break;
      if (takenHere >= PER_CATEGORY) break;
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const file = page.title.replace(/^File:/, "");
      if (seen.has(file)) continue;
      seen.add(file);

      if (NOT_AN_OBJECT.test(file.replace(/_/g, " "))) { rejected.push({ file, why: "not an object" }); continue; }

      const licence = plain(meta.LicenseShortName?.value);
      const creator = plain(meta.Artist?.value);
      const description = plain(meta.ImageDescription?.value);
      const date = plain(meta.DateTimeOriginal?.value) || plain(meta.DateTime?.value);

      /* The admissibility rule, stated once. */
      if (!licence) { rejected.push({ file, why: "no licence stated" }); continue; }
      if (!creator) { rejected.push({ file, why: "no author stated" }); continue; }
      if (!description && !date) { rejected.push({ file, why: "no description or date" }); continue; }
      if ((info.width ?? 0) < 800) { rejected.push({ file, why: `only ${info.width}px` }); continue; }

      objects.push({
        id: file.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase().slice(0, 70),
        destinationId: id,
        title: plain(meta.ObjectName?.value) || file.replace(/\.[^.]+$/, "").replace(/_/g, " "),
        category: category.category,
        /* Verbatim from Commons. Never inferred, never tidied into a claim. */
        description: description.slice(0, 600) || null,
        date: date || null,
        creator,
        licence,
        licenceUrl: plain(meta.LicenseUrl?.value) || null,
        credit: plain(meta.Credit?.value) || null,
        permission: plain(meta.Permission?.value) || null,
        commonsFile: page.title,
        commonsFilePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        mediaUrl: info.url,
        width: info.width,
        height: info.height,
        sourceCategory: category.title,
      });
      takenHere++;
    }
  }

  writeFileSync(
    join(OUT, `${id}.json`),
    `${JSON.stringify({ destinationId: id, retrievedAt: new Date().toISOString().slice(0, 10), categories: categories.map((c) => c.title), objects, rejected }, null, 2)}\n`,
  );
  grand += objects.length;
  console.log(
    `${id.padEnd(15)} ${String(objects.length).padStart(3)} objects from ${categories.length} categories  ${rejected.length} rejected`,
  );
}
console.log(`\n${grand} archive objects retrieved`);
