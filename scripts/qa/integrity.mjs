/**
 * Cross-contamination and broken-asset audit — Sikkim Darshan.
 *
 * The failure this exists for is the one a page renders happily and a reader
 * cannot see. A photograph filed under two places still looks like a
 * photograph. A video reused for a second monastery still plays. An audio file
 * borrowed from the gompa next door still speaks. Nothing throws, nothing looks
 * broken, and the archive quietly says something untrue about a real place.
 *
 * The other half is cheaper and just as damaging: a record pointing at a file
 * that is not on disk. In dev the image optimiser hides it behind a retry; in
 * production it is a 404 in the middle of the page.
 *
 * Everything here reads the generated JSON in src/data/generated/ directly, or
 * pattern-matches the TypeScript sources. Nothing is imported: those files use
 * the `@/` path alias, which plain node cannot resolve.
 *
 * A false alarm costs as much as a miss — a check nobody trusts is a check
 * nobody runs — so where a reuse can be legitimate it is REPORTED as a note
 * rather than failed, and the reasoning is written down beside it.
 *
 *   node scripts/qa/integrity.mjs        (npm run qa:integrity)
 *
 * Exits non-zero on any failure, so it can gate a release.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const at = (p) => join(ROOT, p);
const read = (p) => readFileSync(at(p), "utf8");
const json = (p) => JSON.parse(read(p));
const hasFile = (p) => existsSync(at(p));
const publicFile = (p) => join(ROOT, "public", p.replace(/^\//, ""));

const results = [];

/**
 * Severity travels with the check rather than being decided by whoever reads
 * the output, so the same defect is graded the same way on every run.
 *
 *   CRITICAL  the archive states something false about a real place
 *   HIGH      a visitor sees a wrong, broken or missing asset
 *   MEDIUM    an identifier or field is unsound; a later run may corrupt data
 *   LOW       an inconsistency with no reader-visible effect yet
 */
const check = (severity, name, pass, detail = "") => {
  results.push({ severity, name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${pass ? "" : `[${severity}] `}${name}` +
      `${!pass && detail ? ` — ${detail}` : ""}`,
  );
};
const note = (line) => console.log(`  note  ${line}`);

/** Trims a long list so one bad dataset cannot bury the rest of the report. */
const brief = (items, n = 8) =>
  items.length > n ? `${items.slice(0, n).join("; ")} … +${items.length - n} more` : items.join("; ");

/** Groups rows by key, returning only the keys claimed by more than one owner. */
function shared(rows, keyOf, ownerOf) {
  const byKey = new Map();
  for (const row of rows) {
    const k = keyOf(row);
    if (k === null || k === undefined) continue;
    byKey.set(k, [...(byKey.get(k) ?? []), ownerOf(row)]);
  }
  return [...byKey]
    .map(([key, owners]) => [key, [...new Set(owners)]])
    .filter(([, owners]) => owners.length > 1);
}

/*
 * Sikkim's place names are transliterated from Tibetan, Nepali and Lepcha, so
 * one place is spelled several ways across the data — Khecheopalri Lake is
 * `place/khecheopalri-lake` in the galleries and `place/khecheopalri` in the
 * image registry, Kangchenjunga is Kanchenjunga in the photography keys. A
 * strict string compare would report every one of those as contamination.
 * These two helpers are what keep the checks below off legitimate records.
 */
const squash = (t) => `${t}`.toLowerCase().replace(/[^a-z0-9]/g, "");

/** True when `needle` occurs in `hay`, allowing one substituted letter. */
function fuzzyIncludes(hay, needle) {
  if (!needle) return false;
  if (needle.length < 5) return hay.includes(needle);
  if (hay.includes(needle)) return true;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let diff = 0;
    for (let j = 0; j < needle.length && diff < 2; j++) if (hay[i + j] !== needle[j]) diff++;
    if (diff < 2) return true;
  }
  return false;
}

/** Two subject keys naming the same thing, however each registry spells it. */
function sameSubject(a, b) {
  const x = squash(a.replace(/^[a-z-]+\//, ""));
  const y = squash(b.replace(/^[a-z-]+\//, ""));
  if (!x || !y) return false;
  return fuzzyIncludes(x, y) || fuzzyIncludes(y, x);
}

/* --------------------------------------------------------------- datasets */

const stayImages = json("src/data/generated/stay-images.json");
const monasteryVideos = json("src/data/generated/monastery-videos.json");
const cultureVideos = json("src/data/generated/culture-videos.json");
const audioGuides = json("src/data/generated/audio-guides.json");
const galleries = json("src/data/generated/site-galleries.json");
const imageCredits = json("src/data/generated/image-credits.json");
const storyImages = json("src/data/generated/story-images.json");
const archive = json("src/data/generated/archive-items.json");
const curatedStays = json("src/data/generated/curated-stays.json");
const registeredHotels = json("src/data/generated/registered-hotels.json");
const monCurated = json("src/data/generated/monasteries.curated.json");
const monDiscovered = json("src/data/generated/monasteries.discovered.json");
const permits = hasFile("src/data/generated/permits.json")
  ? json("src/data/generated/permits.json")
  : null;
const responsible = hasFile("src/data/generated/responsible-tourism.json")
  ? json("src/data/generated/responsible-tourism.json")
  : null;

const placesSrc = read("src/data/places.ts");
const monasteriesSrc = read("src/data/monasteries.ts");
const imagesSrc = read("src/data/images.ts");
const panoramasSrc = read("src/data/panoramas.ts");

/* Photographs already struck from the product. A rejected frame is not served
   to anyone, so holding it against a gallery would be a false alarm. */
const REJECTED = new Set(
  [...read("src/data/gallery-rejections.ts").matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]),
);

const galleryList = Object.values(galleries.galleries);
const galleryPhotos = galleryList
  .flatMap((g) => g.photos.map((p) => ({ ...p, gallery: g })))
  .filter((p) => !REJECTED.has(p.file));
const stayImageRows = Object.entries(stayImages.images).flatMap(([slug, list]) =>
  list.map((i) => ({ ...i, slug })),
);

/** Reads one `const NAME: T[] = [ … ];` literal into per-record text blocks. */
function seedBlocks(src, declaration) {
  const start = src.indexOf(declaration);
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf("\n];", start));
  return body.split(/\n  \{\n/).slice(1);
}
const field = (block, name) => block.match(new RegExp(`\\b${name}: "([^"]+)"`))?.[1];
const numField = (block, name) => {
  const m = block.match(new RegExp(`\\b${name}: (-?[\\d.]+)`));
  return m ? Number(m[1]) : undefined;
};

const placeSeeds = seedBlocks(placesSrc, "const SEEDS: Seed[] = [").map((b) => ({
  slug: field(b, "slug"),
  name: field(b, "name"),
  district: field(b, "district"),
  lat: numField(b, "lat"),
  lng: numField(b, "lng"),
  imageKey: field(b, "imageKey"),
  storyImageKey: field(b, "storyImageKey"),
}));

const monasterySeeds = seedBlocks(monasteriesSrc, "const SEEDS: MonasterySeed[] = [").map((b) => ({
  slug: field(b, "slug"),
  name: field(b, "name"),
  district: field(b, "district"),
}));

const coordBlock = monasteriesSrc.slice(
  monasteriesSrc.indexOf("const VERIFIED_COORDS"),
  monasteriesSrc.indexOf("const WIKI_TITLES"),
);
const monasteryCoords = [
  ...coordBlock.matchAll(/"?([a-z0-9-]+)"?: \{ lat: (-?[\d.]+), lng: (-?[\d.]+) \}/g),
].map((m) => ({ slug: m[1], lat: +m[2], lng: +m[3] }));

/** The vendored-photograph registry in images.ts: key → public path. */
const registryBlock = imagesSrc.slice(imagesSrc.indexOf("const IMAGES"));
const imageRegistry = [
  ...registryBlock.slice(0, registryBlock.indexOf("};")).matchAll(/"([^"]+)":\s*"([^"]+)"/g),
].map((m) => ({ key: m[1], path: m[2] }));
const registryKeys = new Set(imageRegistry.map((r) => r.key));

console.log(
  `\n${placeSeeds.length} places · ${monasterySeeds.length} monasteries · ` +
    `${galleryPhotos.length} published gallery photographs · ${audioGuides.length} audio guides · ` +
    `${Object.keys(monasteryVideos).length + cultureVideos.videos.length} videos · ` +
    `${registeredHotels.hotels.length} registered hotels\n`,
);

/* ==========================================================================
   1. NO ASSET SHARED BETWEEN ENTITIES THAT SHOULD NOT SHARE ONE
   ========================================================================== */

console.log("— cross-contamination —");

/* Stays. Two properties illustrated by one photograph is the hotel equivalent
   of the reused-panorama failure: one of them is showing a building that is
   not theirs, to someone deciding where to sleep. */
const stayUrlClash = shared(stayImageRows, (r) => r.url, (r) => r.slug);
check(
  "CRITICAL",
  "stays: no image serves two properties",
  stayUrlClash.length === 0,
  brief(stayUrlClash.map(([url, slugs]) => `${slugs.join(" + ")} ← ${url}`)),
);

/* Monastery video reuse — the rule src/data/videos.ts exposes as
   duplicateVideos(), replicated here so a release can be gated on it. */
const monVideoClash = shared(
  Object.entries(monasteryVideos).map(([slug, v]) => ({ slug, ...v })),
  (r) => r.videoId,
  (r) => r.slug,
);
check(
  "CRITICAL",
  "monastery videos: no videoId serves two monasteries",
  monVideoClash.length === 0,
  brief(monVideoClash.map(([id, slugs]) => `${id} → ${slugs.join(" + ")}`)),
);

const cultureIds = cultureVideos.videos.map((v) => v.videoId);
const cultureDupes = [...new Set(cultureIds.filter((v, i) => cultureIds.indexOf(v) !== i))];
check("HIGH", "culture videos: no duplicate videoId", cultureDupes.length === 0, brief(cultureDupes));

/* A culture film doubling as a monastery's own footage would present a
   thematic clip as a record of one specific gompa. */
const monVideoIds = new Set(Object.values(monasteryVideos).map((v) => v.videoId));
const videoOverlap = cultureVideos.videos.filter((v) => monVideoIds.has(v.videoId));
check(
  "CRITICAL",
  "videos: the culture set does not overlap the monastery set",
  videoOverlap.length === 0,
  brief(videoOverlap.map((v) => `${v.videoId} (${v.id})`)),
);

/* Audio. */
const guidePairClash = shared(
  audioGuides,
  (g) => `${g.monasterySlug}|${g.language}`,
  (g) => g.audioUrl,
);
check(
  "MEDIUM",
  "audio: every monastery+language pair appears exactly once",
  guidePairClash.length === 0,
  brief(guidePairClash.map(([pair, urls]) => `${pair} → ${urls.join(" + ")}`)),
);

const guideLanguages = new Map();
for (const g of audioGuides) {
  guideLanguages.set(g.monasterySlug, [...(guideLanguages.get(g.monasterySlug) ?? []), g.language]);
}
const languageSets = new Map();
for (const [slug, langs] of guideLanguages) {
  const key = [...new Set(langs)].sort().join(",");
  languageSets.set(key, [...(languageSets.get(key) ?? []), slug]);
}
check(
  "MEDIUM",
  "audio: every monastery offers the same language set",
  languageSets.size <= 1,
  [...languageSets].map(([set, slugs]) => `${slugs.join("/")}: ${set}`).join(" | "),
);

/* The failure that would make an audio guide lie outright: one recording
   narrating two different monasteries. */
const audioFileClash = shared(audioGuides, (g) => g.audioUrl, (g) => g.monasterySlug);
check(
  "CRITICAL",
  "audio: no recording serves two monasteries",
  audioFileClash.length === 0,
  brief(audioFileClash.map(([url, slugs]) => `${url} → ${slugs.join(" + ")}`)),
);

/* ---------------------------------------------------------- photographs */

/*
 * Every registry that files a photograph against a subject, flattened. The
 * comparison is on the Commons original as well as the vendored path, because
 * the same upstream file downloaded twice lands at two different local paths
 * and a path-only check would miss it entirely.
 */
const subjectImages = [
  ...galleryPhotos.map((p) => ({
    path: p.localPath,
    remote: p.sourceUrl,
    subject: p.gallery.key,
    entity: true, // a gallery key IS a catalogued place or monastery
    registry: "site-galleries",
  })),
  ...imageCredits.map((c) => ({
    path: c.localPath,
    remote: c.sourceUrl,
    subject: c.key,
    entity: false, // a registry key is a photograph slot, not a place
    registry: "image-credits",
  })),
  ...Object.values(storyImages.images).map((s) => ({
    path: s.localPath,
    remote: s.url,
    subject: s.key,
    entity: false, // a story key is a theme
    registry: "story-images",
  })),
];

/** A collision only counts when the two owners are genuinely different subjects. */
const unrelated = ([, owners]) =>
  owners.some((a) => owners.some((b) => a !== b && !sameSubject(a.split(" ")[1], b.split(" ")[1])));
const ownerOf = (r) => `${r.registry} ${r.subject}`;

const entityImages = subjectImages.filter((r) => r.entity);
const fileClash = shared(entityImages, (r) => r.path, ownerOf).filter(unrelated);
const originClash = shared(entityImages, (r) => r.remote?.split("?")[0], ownerOf).filter(unrelated);
check(
  "CRITICAL",
  "photographs: no published photograph depicts two different catalogued subjects",
  fileClash.length === 0 && originClash.length === 0,
  brief([
    ...fileClash.map(([p, o]) => `${p} → ${o.join(" + ")}`),
    ...originClash.map(([u, o]) => `${decodeURIComponent(u).split("/").pop()} → ${o.join(" + ")}`),
  ]),
);

/* Cross-registry reuse — one photograph illustrating a place AND a thematic
   story. Both usages can be perfectly truthful (the Chardham temple genuinely
   stands in Namchi), so this is reported, not failed: what it costs the reader
   is repetition, not a false claim. */
const crossRegistry = shared(
  subjectImages,
  (r) => r.remote?.split("?")[0],
  ownerOf,
).filter(unrelated);
for (const [url, owners] of crossRegistry) {
  note(`one photograph serves ${owners.join(" and ")} — ${decodeURIComponent(url).split("/").pop()}`);
}

const registryClash = shared(imageRegistry, (r) => r.path, (r) => r.key);
check(
  "MEDIUM",
  "photographs: no two registry keys point at the same file",
  registryClash.length === 0,
  brief(registryClash.map(([path, keys]) => `${path} → ${keys.join(" + ")}`)),
);

/*
 * The hardest variant, and the one the gallery audit cannot see: contamination
 * that lives in the *consumer*, not in the photograph data. places.ts picks a
 * photograph by key, and nothing stops two places picking the same key. When
 * the key is named after one of them, the other place's card, its map popup and
 * its detail page all show somewhere else's photograph under its own name.
 */
const placeImageGroups = shared(
  placeSeeds.filter((p) => p.imageKey || p.storyImageKey),
  (p) => p.imageKey ?? p.storyImageKey,
  (p) => p.slug,
);
const borrowed = [];
for (const [key, slugs] of placeImageGroups) {
  const named = key.split("/").pop();
  const owner = slugs.filter((s) => fuzzyIncludes(squash(s), squash(named)));
  if (owner.length && owner.length < slugs.length) {
    borrowed.push(
      `${slugs.filter((s) => !owner.includes(s)).join(", ")} illustrated with ${key} (${owner.join(", ")})`,
    );
  } else {
    /* A thematic key — red pandas, prayer flags, the silk route — carries no
       claim about a named site, so sharing it is editorial repetition. */
    note(`thematic image ${key} shared by ${slugs.join(", ")}`);
  }
}
check(
  "HIGH",
  "places: no place is illustrated with a photograph named for another place",
  borrowed.length === 0,
  brief(borrowed),
);

const monasteryImageGaps = monasterySeeds.filter((m) => !registryKeys.has(`mon/${m.slug}`));
check(
  "HIGH",
  "monasteries: every monastery has its own registry photograph",
  monasteryImageGaps.length === 0,
  brief(monasteryImageGaps.map((m) => `${m.slug} → falls back to the placeholder`)),
);

/* ==========================================================================
   2. EVERY REFERENCED LOCAL ASSET EXISTS ON DISK
   ========================================================================== */

console.log("\n— broken assets —");

const localAssets = [
  ...imageRegistry.map((r) => ({ path: r.path, owner: `images.ts ${r.key}` })),
  ...imageCredits.map((c) => ({ path: c.localPath, owner: `image-credits ${c.key}` })),
  ...Object.values(storyImages.images).map((s) => ({
    path: s.localPath,
    owner: `story-images ${s.key}`,
  })),
  ...galleryPhotos.map((p) => ({ path: p.localPath, owner: `gallery ${p.gallery.key}` })),
  ...archive.items.map((i) => ({ path: i.mediaUrl, owner: `archive ${i.id}` })),
  ...audioGuides.map((g) => ({ path: g.audioUrl, owner: `audio ${g.monasterySlug}/${g.language}` })),
  ...[...panoramasSrc.matchAll(/(?:previewUrl|viewerUrl): "(\/[^"]+)"/g)].map((m) => ({
    path: m[1],
    owner: "panoramas.ts",
  })),
  ...stayImageRows
    .filter((r) => r.url.startsWith("/"))
    .map((r) => ({ path: r.url, owner: `stay ${r.slug}` })),
].filter((a) => a.path);

/* Plus every asset path written as a literal anywhere in src/ — the ones no
   generator owns, typed by hand into a component and never checked again. */
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(join(dir, e.name))
      : /\.(ts|tsx|mjs|js)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}
const srcFiles = sourceFiles(at("src"));
for (const file of srcFiles) {
  for (const m of readFileSync(file, "utf8").matchAll(
    /["'`](\/(?:images|audio|panoramas|video)\/[^"'`\n]+)["'`]/g,
  )) {
    if (m[1].includes("${") || m[1].includes("*")) continue; // built at runtime, not a literal
    localAssets.push({ path: m[1], owner: file.slice(ROOT.length + 1) });
  }
}

const missing = localAssets.filter((a) => !existsSync(publicFile(a.path)));
check(
  "HIGH",
  "assets: every referenced local file exists under public/",
  missing.length === 0,
  brief([...new Set(missing.map((a) => `${a.path} (${a.owner})`))]),
);

const empty = localAssets.filter(
  (a) => existsSync(publicFile(a.path)) && statSync(publicFile(a.path)).size < 1024,
);
check(
  "HIGH",
  "assets: no referenced file is empty or a truncated download",
  empty.length === 0,
  brief([...new Set(empty.map((a) => a.path))]),
);

const audioExt = audioGuides.filter((g) => !g.audioUrl.endsWith(".m4a"));
check("LOW", "assets: every audio guide is an .m4a", audioExt.length === 0, brief(audioExt.map((g) => g.audioUrl)));

/* img() answers an unknown key with the drawn placeholder rather than throwing,
   so a mistyped key is invisible at runtime. Reported rather than failed: the
   only unresolved key today is the deliberate `?? "editorial/map"` fallback,
   which is unreachable while every seed carries an image. */
const unknownImgKeys = new Set();
for (const file of srcFiles.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
  for (const m of readFileSync(file, "utf8").matchAll(/\bimg\(\s*["']([^"']+)["']\s*\)/g)) {
    if (!registryKeys.has(m[1])) unknownImgKeys.add(`${m[1]} (${file.slice(ROOT.length + 1)})`);
  }
}
for (const p of placeSeeds) {
  if (p.imageKey && !registryKeys.has(p.imageKey)) unknownImgKeys.add(`${p.imageKey} (places.ts ${p.slug})`);
}
if (unknownImgKeys.size) {
  note(`img() keys not in the registry, so they render the placeholder: ${brief([...unknownImgKeys])}`);
}

console.log(
  `  ${new Set(localAssets.map((a) => a.path)).size} distinct local assets referenced by ` +
    `${new Set(localAssets.map((a) => a.owner)).size} owners.`,
);

/* ==========================================================================
   3. STABLE, UNIQUE IDENTIFIERS
   ========================================================================== */

console.log("\n— identifiers —");

const idSets = [
  ["places", placeSeeds.map((p) => p.slug)],
  ["monasteries", monasterySeeds.map((m) => m.slug)],
  ["monasteries.curated", monCurated.map((m) => m.slug)],
  ["monasteries.discovered", monDiscovered.map((m) => m.slug)],
  ["archive items", archive.items.map((i) => i.id)],
  ["culture videos", cultureVideos.videos.map((v) => v.id)],
  ["stay images", stayImageRows.map((i) => i.id)],
  ["curated stays", curatedStays.properties.map((p) => p.slug)],
  ["registered hotels", registeredHotels.hotels.map((h) => h.slug)],
  ["registered hotels (registration no.)", registeredHotels.hotels.map((h) => h.registrationNo)],
  ["galleries", galleryList.map((g) => g.key)],
  ["image credits", imageCredits.map((c) => c.key)],
  ["story images", Object.values(storyImages.images).map((s) => s.key)],
  ["audio guides", audioGuides.map((g) => `${g.monasterySlug}/${g.language}`)],
  ...(permits ? [["permit destinations", permits.destinations.map((d) => d.slug)]] : []),
  ...(responsible ? [["responsible sections", responsible.sections.map((s) => s.slug)]] : []),
];

for (const [name, ids] of idSets) {
  const blank = ids.filter((id) => id === null || id === undefined || `${id}`.trim() === "");
  const dupes = [...new Set(ids.filter((id, i) => id != null && ids.indexOf(id) !== i))];
  check(
    "MEDIUM",
    `ids: ${name} — every record has one, and no two share it`,
    blank.length === 0 && dupes.length === 0,
    [blank.length ? `${blank.length} blank` : "", dupes.length ? `duplicate: ${brief(dupes)}` : ""]
      .filter(Boolean)
      .join("; "),
  );
}

/* An id is only stable if it is a slug. An id that is really a display name
   changes the day the name is corrected, and every deep link into it breaks. */
const badSlugs = [
  ...placeSeeds.map((p) => ({ set: "places", id: p.slug })),
  ...monasterySeeds.map((m) => ({ set: "monasteries", id: m.slug })),
  ...curatedStays.properties.map((p) => ({ set: "curated stays", id: p.slug })),
  ...galleryList.map((g) => ({ set: "galleries", id: g.slug })),
].filter((r) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id ?? ""));
check(
  "LOW",
  "ids: every routed slug is URL-safe",
  badSlugs.length === 0,
  brief(badSlugs.map((r) => `${r.set}: ${r.id}`)),
);

/* Cross-dataset: a gallery, a video or an audio guide filed against a slug no
   catalogue defines renders nothing at all, silently. */
const knownSubjects = new Set([
  ...placeSeeds.map((p) => `place/${p.slug}`),
  ...monasterySeeds.map((m) => `monastery/${m.slug}`),
]);
const orphanGalleries = galleryList.filter((g) => !knownSubjects.has(g.key));
check(
  "MEDIUM",
  "ids: every gallery resolves to a catalogued place or monastery",
  orphanGalleries.length === 0,
  brief(orphanGalleries.map((g) => g.key)),
);

const monSlugs = new Set(monasterySeeds.map((m) => m.slug));
const orphanMedia = [
  ...Object.keys(monasteryVideos).filter((s) => !monSlugs.has(s)).map((s) => `video ${s}`),
  ...[...new Set(audioGuides.map((g) => g.monasterySlug))]
    .filter((s) => !monSlugs.has(s))
    .map((s) => `audio ${s}`),
];
check(
  "MEDIUM",
  "ids: every video and audio guide resolves to a catalogued monastery",
  orphanMedia.length === 0,
  brief(orphanMedia),
);

const stayImageOrphans = Object.keys(stayImages.images).filter(
  (s) => !curatedStays.properties.some((p) => p.slug === s),
);
check(
  "MEDIUM",
  "ids: every stay-image property resolves to a curated stay",
  stayImageOrphans.length === 0,
  brief(stayImageOrphans),
);

/* ==========================================================================
   4. COORDINATE SANITY
   ========================================================================== */

console.log("\n— coordinates —");

/* Sikkim's own extent, rounded outwards. Anything beyond this is not in the
   state, whatever the record says it is. */
const BBOX = { minLat: 27.0, maxLat: 28.2, minLng: 88.0, maxLng: 89.0 };
const inBox = (c) =>
  c.lat >= BBOX.minLat && c.lat <= BBOX.maxLat && c.lng >= BBOX.minLng && c.lng <= BBOX.maxLng;

/* Split by whether the coordinate is published. monasteries.discovered.json is
   a research feed no page imports; holding its leads to the same gate as a
   plotted pin would fail a release over a note-to-self. */
const published = [
  ...placeSeeds.map((p) => ({ key: `place/${p.slug}`, lat: p.lat, lng: p.lng })),
  ...monasteryCoords.map((m) => ({ key: `monastery/${m.slug}`, lat: m.lat, lng: m.lng })),
  ...curatedStays.properties
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({ key: `stay/${p.slug}`, lat: p.latitude, lng: p.longitude })),
];
const research = monDiscovered
  .filter((m) => m.latitude != null && m.longitude != null)
  .map((m) => ({ key: `discovered/${m.slug}`, lat: m.latitude, lng: m.longitude }));

const malformed = [...published, ...research].filter(
  (c) => !Number.isFinite(c.lat) || !Number.isFinite(c.lng),
);
check(
  "HIGH",
  "coordinates: every coordinate is a finite number",
  malformed.length === 0,
  brief(malformed.map((c) => c.key)),
);

const outside = published.filter((c) => Number.isFinite(c.lat) && !inBox(c));
check(
  "CRITICAL",
  "coordinates: every plotted coordinate falls inside Sikkim",
  outside.length === 0,
  brief(outside.map((c) => `${c.key} (${c.lat}, ${c.lng})`)),
);

const outsideResearch = research.filter((c) => Number.isFinite(c.lat) && !inBox(c));
check(
  "MEDIUM",
  "coordinates: every research-feed coordinate falls inside Sikkim",
  outsideResearch.length === 0,
  brief(outsideResearch.map((c) => `${c.key} (${c.lat}, ${c.lng})`)),
);

/* Two plotted entities on one pin is either a duplicate record or a coordinate
   copied from a neighbour. The map can only draw one, so the other vanishes. */
const coordClash = shared(published, (c) => `${c.lat},${c.lng}`, (c) => c.key);
check(
  "HIGH",
  "coordinates: no two plotted entities share an identical coordinate",
  coordClash.length === 0,
  brief(coordClash.map(([pos, keys]) => `${pos} → ${keys.join(" + ")}`)),
);

/* A research lead sitting on a published pin is almost always the same site
   under a second slug — a merge to make, not a defect to ship. */
const publishedPins = new Map(published.map((c) => [`${c.lat},${c.lng}`, c.key]));
for (const c of research) {
  const twin = publishedPins.get(`${c.lat},${c.lng}`);
  if (twin) note(`${c.key} sits on the same coordinate as ${twin} — likely the same site, two slugs`);
}

/* Reported, not asserted: a coordinate given to two decimal places is a ~1 km
   pin. Fine for a lake, poor for a doorway, and worth knowing which is which. */
const coarse = published.filter(
  (c) => (`${c.lat}`.split(".")[1]?.length ?? 0) <= 2 && (`${c.lng}`.split(".")[1]?.length ?? 0) <= 2,
);
if (coarse.length) {
  note(`${coarse.length} coordinates are rounded to ≤2dp (~1 km): ${brief(coarse.map((c) => c.key), 6)}`);
}

console.log(
  `  ${published.length} plotted and ${research.length} research coordinates checked ` +
    `against lat ${BBOX.minLat}–${BBOX.maxLat}, lng ${BBOX.minLng}–${BBOX.maxLng}.`,
);

/* ==========================================================================
   5. DISTRICT VALIDITY
   ========================================================================== */

console.log("\n— districts —");

/* The six districts as they have stood since the 2021 reorganisation. */
const DISTRICTS = new Set(["Gangtok", "Gyalshing", "Soreng", "Mangan", "Namchi", "Pakyong"]);

/*
 * The pre-2021 names, allowed by documentation rather than by silence. The
 * government's own pages still publish them — the permit register lists its
 * destinations by "East District", not Pakyong — and rewriting a government
 * source's wording would be worse than carrying it through unchanged.
 */
const LEGACY_DISTRICTS = new Map([
  ["East Sikkim", "Gangtok / Pakyong"],
  ["West Sikkim", "Gyalshing / Soreng"],
  ["North Sikkim", "Mangan"],
  ["South Sikkim", "Namchi"],
  ["East District", "Gangtok / Pakyong"],
  ["West District", "Gyalshing / Soreng"],
  ["North District", "Mangan"],
  ["South District", "Namchi"],
]);

const districtRows = [
  ...placeSeeds.map((p) => ({ key: `place/${p.slug}`, value: p.district })),
  ...monasterySeeds.map((m) => ({ key: `monastery/${m.slug}`, value: m.district })),
  ...monCurated.map((m) => ({ key: `curated/${m.slug}`, value: m.district })),
  ...monDiscovered
    .filter((m) => m.district != null)
    .map((m) => ({ key: `discovered/${m.slug}`, value: m.district })),
  ...curatedStays.properties.map((p) => ({ key: `stay/${p.slug}`, value: p.district })),
  ...registeredHotels.hotels.map((h) => ({ key: `hotel/${h.slug}`, value: h.district })),
  ...(permits ? permits.destinations.map((d) => ({ key: `permit/${d.slug}`, value: d.region })) : []),
];

const unknownDistricts = districtRows.filter(
  (r) => !DISTRICTS.has(r.value) && !LEGACY_DISTRICTS.has(r.value),
);
check(
  "MEDIUM",
  "districts: every value is a real Sikkim district or a documented legacy name",
  unknownDistricts.length === 0,
  brief([...new Set(unknownDistricts.map((r) => `${r.key}: ${JSON.stringify(r.value)}`))]),
);

/* A curated record must not quietly regress to the old four. Reported per
   dataset, so a government feed that legitimately reproduces them is not
   confused with a hand-typed record that should have been migrated. */
const legacyByDataset = new Map();
for (const r of districtRows.filter((r) => LEGACY_DISTRICTS.has(r.value))) {
  const p = r.key.split("/")[0];
  legacyByDataset.set(p, [...(legacyByDataset.get(p) ?? []), r.value]);
}
for (const [dataset, values] of legacyByDataset) {
  note(
    `${values.length} ${dataset} records use pre-2021 district names (${[...new Set(values)].join(", ")})`,
  );
}

/* A record whose district contradicts the district of the same site in another
   dataset is a wrong fact in one of the two. Split by whether the disagreeing
   record is published: monasteries.discovered.json is a research feed no page
   imports, so a wrong district in it is a lead to fix, not a release blocker. */
const RESEARCH_PREFIX = "discovered";
const districtBySlug = new Map();
for (const r of districtRows) {
  const slug = r.key.split("/").slice(1).join("/");
  districtBySlug.set(slug, [...(districtBySlug.get(slug) ?? []), r]);
}
const disagreeing = [...districtBySlug].filter(
  ([, rows]) =>
    new Set(rows.map((r) => r.value)).size > 1 && rows.every((r) => DISTRICTS.has(r.value)),
);
const publishedConflict = disagreeing.filter(([, rows]) => {
  const shipped = rows.filter((r) => !r.key.startsWith(`${RESEARCH_PREFIX}/`));
  return new Set(shipped.map((r) => r.value)).size > 1;
});
check(
  "HIGH",
  "districts: no published site is filed under two different districts",
  publishedConflict.length === 0,
  brief(
    publishedConflict.map(
      ([slug, rows]) => `${slug}: ${rows.map((r) => `${r.key}=${r.value}`).join(" vs ")}`,
    ),
  ),
);
for (const [slug, rows] of disagreeing.filter((d) => !publishedConflict.includes(d))) {
  const shipped = rows.find((r) => !r.key.startsWith(`${RESEARCH_PREFIX}/`));
  const lead = rows.find((r) => r.key.startsWith(`${RESEARCH_PREFIX}/`));
  if (!shipped || !lead) continue;
  note(`research feed disagrees on ${slug}: ${lead.key}=${lead.value}, published ${shipped.value}`);
}

const noDistrict = monDiscovered.filter((m) => m.district == null).map((m) => `discovered/${m.slug}`);
if (noDistrict.length) {
  note(`${noDistrict.length} research-feed monasteries carry no district: ${brief(noDistrict, 6)}`);
}

console.log(`  ${districtRows.length} district values checked.`);

/* ==========================================================================
   verdict
   ========================================================================== */

const failed = results.filter((r) => !r.pass);
const ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("\nFailures, worst first:");
  for (const sev of ORDER) {
    for (const f of failed.filter((r) => r.severity === sev)) {
      console.log(`  [${sev}] ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
    }
  }
  process.exitCode = 1;
}
