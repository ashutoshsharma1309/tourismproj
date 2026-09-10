/**
 * Gallery integrity audit — Sikkim Darshan.
 *
 * The photograph galleries are the one part of this archive where a mistake is
 * invisible to the reader: a wrong picture still looks like a picture. These
 * checks are the things a page cannot check for itself.
 *
 * The one that matters most is the LAST one. If a single Commons file is used
 * for two different monasteries, then at least one of those pages is telling a
 * visitor they are looking at somewhere they are not — which is precisely the
 * failure this project's data-integrity pass existed to remove.
 *
 *   node scripts/qa/gallery-integrity.mjs
 */

import { readFileSync, existsSync, statSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const doc = JSON.parse(read("src/data/generated/site-galleries.json"));
const galleries = Object.values(doc.galleries);
const photos = galleries.flatMap((g) => g.photos.map((p) => ({ ...p, gallery: g })));

const slugsIn = (file) => [...read(file).matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const monasterySlugs = new Set(slugsIn("src/data/monasteries.ts"));
const placeSlugs = new Set(slugsIn("src/data/places.ts"));

console.log(
  `\n${galleries.length} galleries · ${photos.length} photographs · generated ${doc.generatedAt}\n`,
);

/* --------------------------------------------------------------- structure */

const orphanKeys = galleries.filter((g) =>
  g.scope === "monastery" ? !monasterySlugs.has(g.slug) : !placeSlugs.has(g.slug),
);
check(
  "gallery: every gallery belongs to a real monastery or place",
  orphanKeys.length === 0,
  orphanKeys.map((g) => g.key).join(", "),
);

const badScope = galleries.filter((g) => !["monastery", "place"].includes(g.scope));
check("gallery: scopes are monastery or place", badScope.length === 0);

/* ----------------------------------------------------------------- licence */

const unattributed = photos.filter((p) => !p.attribution || !p.license || !p.descriptionUrl);
check(
  "gallery: every photograph carries author, licence and Commons page",
  unattributed.length === 0,
  unattributed.map((p) => p.file).join(", "),
);

const nonFree = photos.filter(
  (p) => !/^(cc|public domain|pd|no restrictions|attribution)/i.test(p.license),
);
check(
  "gallery: no photograph carries a non-free licence",
  nonFree.length === 0,
  nonFree.map((p) => `${p.file} (${p.license})`).join(", "),
);

/* ------------------------------------------------------------------ files */

const missing = photos.filter((p) => !existsSync(`public${p.localPath}`));
check(
  "gallery: every referenced file is vendored into public/",
  missing.length === 0,
  missing.slice(0, 8).map((p) => p.localPath).join(", "),
);

const tiny = photos.filter(
  (p) => existsSync(`public${p.localPath}`) && statSync(`public${p.localPath}`).size < 8192,
);
check(
  "gallery: no vendored file is a truncated download",
  tiny.length === 0,
  tiny.map((p) => p.localPath).join(", "),
);

const pathCounts = new Map();
for (const p of photos) pathCounts.set(p.localPath, (pathCounts.get(p.localPath) ?? 0) + 1);
const collisions = [...pathCounts].filter(([, n]) => n > 1);
check(
  "gallery: no two records claim the same local file",
  collisions.length === 0,
  collisions.map(([path]) => path).join(", "),
);

/* --------------------------------------------------------------- evidence */

const badEvidence = photos.filter((p) => !["category", "named", "geo"].includes(p.evidence));
check("gallery: every photograph records why it depicts its subject", badEvidence.length === 0);

const looseGeo = photos.filter(
  (p) => p.evidence === "geo" && (p.distanceM === null || p.distanceM > 250),
);
check(
  "gallery: coordinate-only evidence stays on the subject's own grounds",
  looseGeo.length === 0,
  looseGeo.map((p) => `${p.file} (${p.distanceM}m)`).join(", "),
);

/* ------------------------------------------- does it depict the subject? */

/*
 * Everything above this point checks the paperwork: licence, author, file on
 * disk, no duplicate use. None of it asks whether the photograph shows the
 * place, and that is the check whose absence let `place/soreng` fill up with
 * four photographs of Monchaux-Soreng in Seine-Maritime, France, and let
 * "Manganese Bacteria on rocks in Kilbirnie" be served on /hotels as Mangan
 * district, North Sikkim. All of it passed 11/11.
 *
 * `named` evidence is a substring match on the subject's name, so it is the
 * bucket where a foreign namesake lands. Commons captions state the location in
 * plain text, which is enough to catch the whole class.
 */

const REJECTIONS = new Set(
  [...read("src/data/gallery-rejections.ts").matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]),
);

/* Places that are unambiguously not Sikkim. Deliberately excludes the
   neighbours a genuine Sikkim photograph may legitimately name — a shot of
   Kangchenjunga taken from Darjeeling still depicts Kangchenjunga. */
const NOT_SIKKIM =
  /\b(france|seine-maritime|monchaux|guangzhou|kilbirnie|north ayrshire|new zealand|russell museum|scotland|normandy|phytokeys)\b/i;

const foreign = photos.filter((p) => {
  if (REJECTIONS.has(p.file)) return false; // already filtered out of the product
  return NOT_SIKKIM.test(`${p.file} ${p.caption ?? ""}`);
});
check(
  "gallery: no photograph is captioned to a place outside Sikkim",
  foreign.length === 0,
  foreign.map((p) => `${p.gallery.key} ← ${p.file}`).join("; "),
);

/* A frame collected on name evidence alone, whose caption never mentions the
   subject or Sikkim, is a namesake collision waiting to happen. Reported rather
   than failed: some genuine Commons files carry no caption at all. */
const unconfirmedNamed = photos.filter((p) => {
  if (REJECTIONS.has(p.file) || p.evidence !== "named") return false;
  const hay = `${p.file} ${p.caption ?? ""}`.toLowerCase();
  return !hay.includes("sikkim") && !hay.includes(p.gallery.subject.toLowerCase());
});
if (unconfirmedNamed.length) {
  console.log(
    `\n  note  ${unconfirmedNamed.length} name-matched photographs mention neither Sikkim nor their subject:`,
  );
  for (const p of unconfirmedNamed) console.log(`        ${p.gallery.key} ← ${p.file}`);
}

/* ------------------------------- does it depict THIS subject, or another? */

/*
 * The third variant of the same failure, and the hardest to see.
 *
 * The first was wrong-country (Monchaux-Soreng for Soreng). The second was
 * wrong-object (a butterfly for a wildlife sanctuary). This one is a
 * photograph that is genuinely of Sikkim, genuinely where it says it is — and
 * of something that has its own record. Every photograph filed under the town
 * of Ravangla was of the Buddha statue at Buddha Park, catalogued separately
 * 2.6 km away, so the home page rail showed the same statue twice as though it
 * were two destinations.
 *
 * The test: a photograph whose caption names another catalogued subject in full
 * while naming its own subject not at all. That asymmetry is what distinguishes
 * a genuine mis-file from a photograph that merely mentions its district.
 */

const SUBJECT_NAMES = [
  ...[...read("src/data/places.ts").matchAll(/slug: "([^"]+)"[\s\S]{0,200}?name: "([^"]+)"/g)]
    .map((m) => ({ key: `place/${m[1]}`, name: m[2] })),
  ...[...read("src/data/monasteries.ts").matchAll(/slug: "([^"]+)"[\s\S]{0,200}?name: "([^"]+)"/g)]
    .map((m) => ({ key: `monastery/${m[1]}`, name: m[2] })),
];

/* Words too generic to identify a subject on their own. */
const GENERIC =
  /^(monastery|gompa|lake|valley|pass|park|palace|ruins|falls|the|of|and|sikkim|india|west|east|north|south|national|centre|center|institute)$/i;
const distinctive = (name) =>
  name.split(/[\s,()]+/).filter((t) => t.length > 3 && !GENERIC.test(t));

/*
 * Sikkim's place names are transliterated from Tibetan and Nepali, so the same
 * place is spelled several ways across Commons and a strict match reports
 * legitimate photographs as misfiled: Phensang/Phensong, Ralang/Ralong,
 * Rabdentse/Rabdantse, Khangchendzonga/Kangchenjunga, Ban Jhakri/Banjhakri.
 * A couple of places also have a second name entirely — Tsomgo is Changu.
 *
 * So the "does it name its own subject" side of the test is deliberately
 * generous: spacing is ignored, one letter may differ, and known alternates
 * count. Being generous here only ever makes the check quieter, and a check
 * that cries wolf on eight good photographs is one nobody will keep running.
 */
const ALIASES = {
  "place/tsomgo-lake": ["changu"],
  "place/khangchendzonga-national-park": ["kangchenjunga", "khangchendzonga", "dzongri", "goecha"],
  "place/rangeet-teesta-confluence": ["rangeet", "rangit", "teesta"],
};

const squash = (t) => t.toLowerCase().replace(/[^a-z]/g, "");

/** True when `needle` occurs in `hay` allowing one substituted letter. */
function fuzzyIncludes(hay, needle) {
  if (needle.length < 5) return hay.includes(needle);
  if (hay.includes(needle)) return true;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let diff = 0;
    for (let j = 0; j < needle.length && diff < 2; j++) {
      if (hay[i + j] !== needle[j]) diff++;
    }
    if (diff < 2) return true;
  }
  return false;
}

const misfiled = photos.filter((p) => {
  if (REJECTIONS.has(p.file)) return false;
  const hay = `${p.file} ${p.caption ?? ""}`.toLowerCase();
  const squashed = squash(hay);
  const own = [
    ...distinctive(p.gallery.subject),
    ...(ALIASES[p.gallery.key] ?? []),
  ];
  /* If the photo names its own subject at all — however spelled — trust it. */
  if (own.some((t) => fuzzyIncludes(squashed, squash(t)))) return false;
  return SUBJECT_NAMES.some(
    (s) =>
      s.key !== p.gallery.key &&
      distinctive(s.name).length > 0 &&
      distinctive(s.name).every((t) => hay.includes(t.toLowerCase())),
  );
});
check(
  "gallery: no photograph depicts a different catalogued subject",
  misfiled.length === 0,
  misfiled.map((p) => `${p.gallery.key} ← ${p.file}`).join("; "),
);

/* --------------------------------------------------- the one that matters */

const byFile = new Map();
for (const p of photos) {
  const list = byFile.get(p.file) ?? [];
  list.push(p.gallery.key);
  byFile.set(p.file, list);
}
const reused = [...byFile].filter(([, keys]) => new Set(keys).size > 1);
check(
  "gallery: no photograph is used to depict two different places",
  reused.length === 0,
  reused.map(([file, keys]) => `${file} → ${[...new Set(keys)].join(" + ")}`).join("; "),
);

const dupeWithin = galleries.filter(
  (g) => new Set(g.photos.map((p) => p.file)).size !== g.photos.length,
);
check("gallery: no gallery repeats the same file", dupeWithin.length === 0);

/* ---------------------------------------------------------------- summary */

const failed = results.filter((r) => !r.pass);

/* The counts above are the agent's raw output. What the product serves is that
   minus src/data/gallery-rejections.ts, so report both — a subject whose whole
   gallery was rejected still has zero photographs on the site. */
const publishedPerGallery = galleries.map(
  (g) => g.photos.filter((p) => !REJECTIONS.has(p.file)).length,
);
const publishedPhotos = publishedPerGallery.reduce((n, c) => n + c, 0);
const withPhotos = publishedPerGallery.filter((n) => n > 0).length;

console.log(
  `\n${results.length - failed.length}/${results.length} checks passed. ` +
    `${withPhotos}/${galleries.length} subjects have photography.\n` +
    `${publishedPhotos} photographs published, ${photos.length - publishedPhotos} rejected as not depicting their subject.`,
);
if (failed.length) process.exitCode = 1;
