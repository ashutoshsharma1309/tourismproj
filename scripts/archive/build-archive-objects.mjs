/**
 * Shape retrieved Commons files into archive objects.
 *
 * THREE THINGS THE RETRIEVAL GOT WRONG, FIXED HERE
 * ------------------------------------------------
 * 1. OBJECT TYPE. The retrieval labelled an object by the SUBJECT IT ASKED
 *    FOR, not by the category that answered — so an 1820 watercolour out of
 *    "Category:Paintings of Delhi" was catalogued as a photograph. In an
 *    archive that is not a cosmetic error: it is a false statement about what
 *    the object is. The type now comes from the category title itself.
 *
 * 2. DATES. Commons returns `1820 date QS:P571,+1820-00-00T00:00:00Z/9` —
 *    a human date with a Wikidata qualifier glued on. The qualifier is
 *    machine syntax, not a date a reader should see.
 *
 * 3. CREATORS. "Anonymous Unknown author" is two ways of saying nobody knows,
 *    concatenated. An unknown maker is recorded as unknown, once.
 *
 * Nothing here invents a field. Dimensions, materials and the holding
 * institution are absent because Commons does not publish them for these
 * files, and an invented "42 x 30 cm" would be worse than a blank.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = ".data/archive";
const OUT_DIR = "src/data/generated/archive";
const STORIES = "src/data/generated/stories";
const HISTORY = "src/data/generated/history";

/**
 * What a category title says the object IS. Ordered: the first match wins,
 * so "Black and white photographs" is a photograph before it is anything else.
 */
const TYPE_FROM_CATEGORY = [
  [/\bmaps?\b/i, "Maps"],
  [/\bpostcards?\b/i, "Postcards"],
  [/\bpaintings?\b/i, "Paintings"],
  [/\bdrawings?|watercolou?rs?\b/i, "Drawings"],
  [/\bengravings?|lithographs?|prints?\b/i, "Prints"],
  [/\bmanuscripts?\b/i, "Manuscripts"],
  [/\bposters?\b/i, "Posters"],
  [/\bphotographs?|photos?\b/i, "Photographs"],
  [/\bsculptures?\b/i, "Sculpture"],
  [/\btextiles?\b/i, "Textiles"],
  [/\bcoins?|currency\b/i, "Coins"],
  [/\bdocuments?|records?\b/i, "Documents"],
  /*
   * "Historical images of X" is Commons's own phrase and by far the commonest
   * category these destinations have. It was falling through to the default,
   * so eleven of fourteen destinations catalogued everything as one type.
   * The category says "images", not "photographs" — a lithograph and a
   * daguerreotype are both in there — so the label says images too, rather
   * than asserting a medium the source did not.
   */
  [/\bhistorical images?\b/i, "Historical images"],
  [/\bhistory\b/i, "Historical material"],
];

/**
 * Titles that name a category rather than an object.
 *
 * The Hallwyl Museum's files on Commons are titled "Fotografier" — Swedish
 * for "photographs" — so Istanbul retrieved a dozen objects all called the
 * same generic word. Deduplicating by title hid them (24 objects became 5)
 * instead of reporting the real problem: an archive entry titled
 * "Photographs" tells a reader nothing about what they are looking at.
 */
const UNINFORMATIVE_TITLE =
  /^(fotografier|photographs?|photos?|images?|pictures?|untitled|unknown|no title|drawings?|prints?|maps?|postcards?|album|collection|item|object|scan|img[\s_-]?\d*|dsc[\s_-]?\d*)$/i;

function typeOf(categoryTitle) {
  for (const [re, label] of TYPE_FROM_CATEGORY) {
    if (re.test(categoryTitle)) return label;
  }
  return "Historical material";
}

/**
 * "1820 date QS:P571,+1820-…/9" -> "1820". Never invents precision — and
 * never reports the scanner's clock as the object's date.
 *
 * Commons' `DateTimeOriginal` for a scanned print is very often the EXIF
 * timestamp of the SCAN: a Charles Pinet postcard of Sacré-Cœur was rendered
 * with "Date 2013-04-20 14:16:25". Anything carrying a time of day is a
 * machine timestamp, not a catalogue date, and is dropped. A bare year at or
 * after 1990 on a postcard, map, print or painting is treated the same way:
 * no source in this catalogue holds a 2013 postcard.
 */
const HISTORICAL_TYPES = new Set(["Postcards", "Maps", "Prints", "Paintings", "Drawings", "Historical images", "Historical material", "Photographs", "Manuscripts"]);
function cleanDate(raw, objectType) {
  if (!raw) return null;
  const stripped = raw.replace(/\bdate\s+QS:[^\s]*/gi, "").replace(/\s+/g, " ").trim();
  if (!stripped) return null;
  if (/\d{1,2}:\d{2}/.test(stripped)) return null;
  const iso = /^\+?(\d{3,4})-\d{2}-\d{2}T/.exec(stripped);
  const text = iso ? iso[1] : stripped.slice(0, 60);
  const year = Number((/\b(\d{4})\b/.exec(text) ?? [])[1]);
  if (Number.isFinite(year) && year >= 1990 && HISTORICAL_TYPES.has(objectType)) return null;
  return text;
}

/** "Anonymous Unknown author" -> "Maker unknown". */
function cleanCreator(raw) {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (/^(anonymous|unknown)(\s+(anonymous|unknown|author|artist|photographer))*$/i.test(text)) {
    return "Maker unknown";
  }
  return text.slice(0, 120);
}

mkdirSync(OUT_DIR, { recursive: true });
const written = [];
let grand = 0;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const store = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  const id = store.destinationId;

  const places = (() => {
    try {
      const source = readFileSync(join("src/data/destinations/capsules", `${id}.ts`), "utf8");
      const block = source.slice(source.indexOf("places: ["));
      return [...block.matchAll(/id:\s*"([^"]+)",\s*\n\s*name:\s*"([^"]+)"/g)]
        .map((m) => ({ slug: m[1], name: m[2] }));
    } catch { return []; }
  })();
  const stories = (() => {
    try { return JSON.parse(readFileSync(join(STORIES, `${id}.json`), "utf8")); }
    catch { return []; }
  })();
  const events = (() => {
    try { return JSON.parse(readFileSync(join(HISTORY, `${id}.json`), "utf8")); }
    catch { return []; }
  })();

  const seenTitles = new Set();
  const seenIds = new Set();
  let uninformative = 0;
  const objects = [];
  for (const raw of store.objects) {
    const title = raw.title.replace(/\s+/g, " ").trim();
    /* An object whose title names its medium is not catalogued, whatever else
       is true of it. Rejected rather than deduplicated, so the count reports
       what was admissible instead of hiding it. */
    if (UNINFORMATIVE_TITLE.test(title)) { uninformative++; continue; }
    /* Two files of the same subject are two objects; two files with the same
       TITLE are a duplicate in a catalogue, which is a cataloguing error. */
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());

    const haystack = `${title} ${raw.description ?? ""}`;
    /* Connections, from ids that already exist. A place is linked when the
       object's own title or description names it. */
    const relatedPlaces = places
      .filter((place) => new RegExp(`\\b${place.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(haystack))
      .slice(0, 3)
      .map((place) => place.slug);
    const relatedStories = stories
      .filter((story) => story.relatedPlaces?.some((p) => relatedPlaces.includes(p)))
      .slice(0, 2)
      .map((story) => story.slug);
    const relatedHistory = events
      .filter((event) => (event.relatedPlaces ?? []).some((p) => relatedPlaces.includes(p)))
      .slice(0, 2)
      .map((event) => event.slug);

    /*
     * Ids are slugged from the file name and truncated, so two long titles
     * can slug to the same string — "Old Mission Church, a heritage building
     * at R.N. Mukherjee Road in Kolkat…" collided with itself. Two objects
     * sharing an id means one URL for two records and the second silently
     * wins, which in a catalogue is losing an object.
     */
    let objectId = raw.id;
    if (seenIds.has(objectId)) {
      objectId = `${objectId.slice(0, 62)}-${createHash("sha1").update(raw.commonsFile).digest("hex").slice(0, 6)}`;
    }
    seenIds.add(objectId);

    /*
     * VENDORING-AWARE. The vendoring script writes each object's photograph
     * to public/images/archive/<destination>/<id>.jpg and points `mediaUrl`
     * at it. Regenerating from the retrieval records must not undo that, and
     * must not bring back the objects Commons would not serve — so a record
     * with no local file is omitted here, exactly as the vendoring left it.
     */
    const localMedia = `/images/archive/${id}/${objectId}.jpg`;
    const vendored = existsSync(join("public", localMedia.slice(1)));
    if (!vendored && existsSync(join("public/images/archive", id))) continue;

    objects.push({
      id: objectId,
      destinationId: id,
      title,
      objectType: typeOf(raw.sourceCategory),
      category: typeOf(raw.sourceCategory),
      date: cleanDate(raw.date, typeOf(raw.sourceCategory)),
      creator: cleanCreator(raw.creator),
      /* Commons does not publish a holding institution for these files, and
         naming one would be inventing provenance. */
      institution: null,
      description: raw.description,
      rights: raw.licence,
      rightsUrl: raw.licenceUrl,
      credit: raw.credit,
      source: "Wikimedia Commons",
      originalUrl: raw.commonsFilePage,
      mediaUrl: vendored ? localMedia : raw.mediaUrl,
      sourceUrl: raw.mediaUrl.split("?")[0],
      width: raw.width,
      height: raw.height,
      relatedPlaces,
      relatedStories,
      relatedHistory,
      provenance: `Retrieved from ${raw.sourceCategory} on Wikimedia Commons, ${store.retrievedAt}.`,
      verificationStatus: "verified",
      lastVerifiedAt: store.retrievedAt,
    });
  }

  writeFileSync(join(OUT_DIR, `${id}.json`), `${JSON.stringify(objects, null, 2)}\n`);
  written.push(id);
  grand += objects.length;
  const types = [...new Set(objects.map((o) => o.objectType))];
  const linked = objects.filter((o) => o.relatedPlaces.length > 0).length;
  console.log(
    `${id.padEnd(15)} ${String(objects.length).padStart(3)} objects  ${types.length} types (${types.join(", ")})  ` +
      `${linked} place-linked  ${uninformative} untitled`,
  );
}

const index =
  `/* GENERATED by scripts/archive/build-archive-objects.mjs — do not edit. */\n` +
  `const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {\n` +
  written.map((id) => `  "${id}": () => import("./${id}.json"),`).join("\n") +
  `\n};\n\n` +
  `export function hasArchive(destinationId: string): boolean {\n` +
  `  return destinationId in LOADERS;\n}\n\n` +
  `export async function archiveObjects(destinationId: string): Promise<unknown[]> {\n` +
  `  const load = LOADERS[destinationId];\n` +
  `  if (!load) return [];\n` +
  `  return (await load()).default as unknown[];\n}\n`;
writeFileSync(join(OUT_DIR, "index.ts"), index);
console.log(`\n${grand} objects -> ${OUT_DIR} (${written.length} destinations)`);
