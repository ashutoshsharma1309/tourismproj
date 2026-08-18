#!/usr/bin/env node
/**
 * Heritage Gallery Agent — Ney Heritage
 *
 * Every monastery and every place on this site had exactly ONE photograph. One
 * frame cannot carry a place: it shows a facade and hides the courtyard, the
 * murals, the light at altitude, the thing that makes somebody want to go.
 *
 * This agent builds a real gallery for each subject out of freely licensed
 * Wikimedia Commons photography, and it refuses to pad. A photograph enters a
 * gallery only when there is EVIDENCE it depicts that subject:
 *
 *   strong   — the file sits in that subject's own Commons category
 *   named    — the file's title or Commons description names the subject
 *   geo      — the file carries a coordinate within GEO_STRICT_M of the
 *              subject's own verified coordinate
 *
 * Proximity alone is not enough to be interesting: a geosearch around Rumtek
 * returns the fast-food shop by the gate. So a geo-only candidate must also
 * survive the subject-noise blocklist, and every candidate is scored for
 * whether it is the kind of photograph a visitor would want to look at.
 *
 * What it will not do:
 *   - publish a photograph it cannot attribute (no licence, no author → drop)
 *   - publish twenty frames of one wall (series and per-author caps)
 *   - guess. A subject with no qualifying photograph gets an empty gallery,
 *     and the UI then shows nothing rather than something misleading.
 *
 * Usage:
 *   node scripts/heritage-gallery-agent.mjs [--force] [--only=<slug>] [--dry]
 *
 * Writes:
 *   src/data/generated/site-galleries.json   the galleries the app reads
 *   public/images/gallery/<scope>/<slug>/N.jpg   the vendored, recompressed files
 *   reports/gallery-agent.json               what it considered and rejected
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const UA =
  "NeyHeritage/0.1 (SIH 2026 cultural heritage archive; https://github.com/ashutoshsharma1309/tourismproj) node-fetch";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry");
/* Comma-separated, so a run can be sharded across several processes. Commons
   is the bottleneck here, not the CPU: a serial pass over 53 subjects spends
   most of its wall-clock waiting on the API and on downloads. */
const ONLY = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .filter(Boolean);
/* Shards write their own file; merge-galleries.mjs joins them. */
const OUT_JSON =
  process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ??
  "src/data/generated/site-galleries.json";
const OUT_DIR = "public/images/gallery";
const REPORT =
  process.argv.find((a) => a.startsWith("--report="))?.slice("--report=".length) ??
  "reports/gallery-agent.json";

/* How many frames a gallery may hold. More than this and the page becomes a
   contact sheet; fewer and it is still a single-photograph page. */
const MAX_PER_MONASTERY = 6;
const MAX_PER_PLACE = 4;
/* Series cap: "Exterior decorations … 01" through "… 22" is one wall shot
   twenty-two times. Two frames from any one series is plenty. */
const MAX_PER_SERIES = 2;
const MAX_PER_AUTHOR = 3;

/* A photograph below this width cannot fill a hero-width slot without smearing. */
const MIN_WIDTH = 1100;
const MIN_PIXELS = 1100 * 700;
/* Extreme crops break a mosaic. Stitched panoramas are handled by the 360 agent. */
const ASPECT_MIN = 0.45;
const ASPECT_MAX = 3.0;

/* Distance at which a coordinate alone establishes that a photograph is OF a
   subject rather than merely NEAR it. */
const GEO_STRICT_M = 220;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------------------------------- Commons API */

async function api(params, attempt = 0) {
  const url = new URL(COMMONS);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  }).toString();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 4) throw new Error(`HTTP ${res.status} after retries`);
      await sleep(1500 * 2 ** attempt);
      return api(params, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (attempt >= 4) throw err;
    await sleep(1500 * 2 ** attempt);
    return api(params, attempt + 1);
  }
}

/** The imageinfo props every lookup needs, in one place. */
const IMAGE_PROPS = {
  prop: "imageinfo|categories",
  iiprop: "url|size|mime|extmetadata|user",
  iiurlwidth: "1800",
  /* All categories, not just the assessment ones. Commons files carry no
     machine-readable "this is a photograph of a sign" flag, and the title
     rarely says so either — "Rumtek Monastery 01.jpg" turned out to be the
     nameplate by the door. Its CATEGORIES say so. */
  cllimit: "max",
};

async function categoryMembers(category) {
  const doc = await api({
    action: "query",
    generator: "categorymembers",
    gcmtitle: category,
    gcmtype: "file",
    gcmlimit: "100",
    ...IMAGE_PROPS,
  });
  return doc.query?.pages ?? [];
}

async function geosearch(lat, lng, radiusM) {
  const doc = await api({
    action: "query",
    generator: "geosearch",
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(Math.min(Math.max(radiusM, 10), 10000)),
    ggsnamespace: "6",
    ggslimit: "100",
    ...IMAGE_PROPS,
  });
  return doc.query?.pages ?? [];
}

async function fileSearch(term) {
  const doc = await api({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: "6",
    gsrlimit: "60",
    ...IMAGE_PROPS,
  });
  return doc.query?.pages ?? [];
}

/** Coordinates a Commons file carries, if any. */
async function coordinatesFor(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const doc = await api({
      action: "query",
      titles: titles.slice(i, i + 40).join("|"),
      prop: "coordinates",
      colimit: "max",
    });
    for (const page of doc.query?.pages ?? []) {
      const c = page.coordinates?.[0];
      if (c) out.set(page.title, { lat: c.lat, lng: c.lon });
    }
    await sleep(150);
  }
  return out;
}

/* ------------------------------------------------------------------ scoring */

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const stripHtml = (v) =>
  String(v ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Subjects a heritage gallery should never show even when the photograph was
 * taken on the doorstep: the parked taxi, the hotel sign, the map board.
 */
const NOISE = [
  /\bhotel\b/i, /\bresort\b/i, /\brestaurant\b/i, /\bfast food\b/i, /\bcafe\b/i,
  /\bshop\b/i, /\bstall\b/i, /\bmarket stall\b/i, /\bbus\b/i, /\btaxi\b/i,
  /\bcar\b/i, /\bjeep\b/i, /\bnumber plate\b/i, /\bsignboard\b/i, /\bsign board\b/i,
  /\bnotice board\b/i, /\bmap\b/i, /\bdiagram\b/i, /\blogo\b/i, /\bflag of\b/i,
  /\bcoat of arms\b/i, /\bscreenshot\b/i, /\bposter\b/i, /\bbrochure\b/i,
  /\bticket\b/i, /\bbanner\b/i, /\bconstruction\b/i, /\bgarbage\b/i, /\bdustbin\b/i,
  /\btoilet\b/i, /\bparking\b/i, /\bselfie\b/i, /\bcollage\b/i, /\bpanorama\b/i,
];

/**
 * Commons categories that describe the SUBJECT as documentation rather than
 * as the place: signage, plaques, maps, vehicles, people-portraits. A file in
 * one of these is dropped however good the photograph is.
 */
const CATEGORY_NOISE = [
  /\bsigns\b|\bsignage\b|\bsignboards?\b|\bname ?plates?\b|\bnotice boards?\b/i,
  /\bplaques\b|\binscriptions in\b|\bmemorial plaques\b/i,
  /\bmaps\b|\bdiagrams\b|\bcharts\b|\blogos\b|\bcoats of arms\b/i,
  /\bvehicles\b|\bbuses\b|\bautomobiles\b|\bnumber plates\b/i,
  /\bhotels\b|\brestaurants\b|\bshops\b|\bmarkets\b/i,
  /\bpanoramics?\b|\b360°\b/i,
];

/** Words that mark a frame worth looking at rather than a record shot. */
const APPEAL = [
  [/\bsunrise\b|\bsunset\b|\bgolden hour\b|\bdawn\b|\bdusk\b/i, 14],
  [/\bkangchenjunga\b|\bkanchenjunga\b|\bhimalaya|\bsnow\b|\bsnow-?capped\b/i, 12],
  [/\bcham\b|\bmask dance\b|\bfestival\b|\blosar\b|\bbhumchu\b|\bpang lhabsol\b/i, 12],
  [/\bmonk|\blama\b|\bnovice\b|\bpilgrim/i, 10],
  [/\bmural|\bfresco|\bthangka\b|\bpainting|\bstatue\b|\bbuddha\b|\bdeity\b/i, 9],
  [/\bprayer (flag|wheel)|\bchorten\b|\bstupa\b|\bmani\b/i, 8],
  [/\bcourtyard\b|\bprayer hall\b|\binterior|\bshrine\b|\bassembly hall\b/i, 8],
  [/\bview\b|\bvalley\b|\blandscape\b|\baerial\b|\bfrom above\b/i, 6],
  [/\bfacade\b|\bmain (temple|building)\b/i, 4],
  /* The gate shot is the frame every visitor takes from the car park: wires,
     a parked taxi, the road. It is genuinely OF the site, so it stays in the
     gallery — but it should never be the frame that opens one. */
  [/\bgate\b|\bentrance\b|\bwelcome\b|\broad to\b|\bapproach\b/i, -14],
];

/**
 * Score a candidate. This decides ORDER, not admission — admission is decided
 * by evidence. A high score on an unevidenced file still gets dropped.
 */
function scoreCandidate(cand) {
  let score = 0;
  const text = `${cand.title} ${cand.description}`;

  if (cand.evidence === "category") score += 30;
  else if (cand.evidence === "named") score += 22;
  else score += 8; // geo

  if (cand.assessment === "featured") score += 40;
  else if (cand.assessment === "quality") score += 26;
  else if (cand.assessment === "valued") score += 16;

  // Resolution, with strongly diminishing returns past ~4000px.
  score += Math.min(18, Math.round(Math.log2(cand.width / MIN_WIDTH) * 9));

  for (const [re, points] of APPEAL) if (re.test(text)) score += points;

  /* "Rumtek Monastery 04.jpg" is somebody's establishing shot of the whole
     place; "Chains buried into solid concrete below.jpg" is a detail they
     took while they were there. A title that opens with the subject's own
     name is the closest thing Commons has to "this is the building". */
  if (cand.subjectName && cand.title.toLowerCase().startsWith(`file:${cand.subjectName.toLowerCase()}`)) {
    score += 12;
  }

  // A described photograph is a curated one; a bare IMG_1234 rarely is.
  if (cand.description.length > 40) score += 6;
  if (/^File:(IMG|DSC|P\d|_?\d+)[\s_-]*\d*\.\w+$/i.test(cand.title)) score -= 10;

  // Landscape reads best in a mosaic; extreme portrait needs a reason.
  const aspect = cand.width / cand.height;
  if (aspect >= 1.2 && aspect <= 2.0) score += 6;
  else if (aspect < 0.7) score -= 4;

  if (cand.distanceM != null && cand.distanceM < 60) score += 6;

  return score;
}

/**
 * Series key — "…Monastery 03.jpg" and "…Monastery 11.jpg" collapse to one
 * key so a single uploader's twenty-frame sweep cannot fill a gallery.
 */
function seriesKey(title) {
  return title
    .replace(/^File:/, "")
    .replace(/\.\w+$/, "")
    .replace(/[\s_-]*\d+$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .toLowerCase()
    .trim();
}

/* ------------------------------------------------------- candidate building */

const FREE_LICENCE = /^(cc|public domain|pd|no restrictions|attribution)/i;

function toCandidate(page, { evidence, subject, distanceM }) {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(ii.mime ?? "")) return null;

  const meta = ii.extmetadata ?? {};
  const licence = stripHtml(meta.LicenseShortName?.value);
  const artist = stripHtml(meta.Artist?.value);

  // Unattributable or non-free → it does not exist for our purposes.
  if (!licence || !FREE_LICENCE.test(licence)) return null;
  if (!artist) return null;
  if (stripHtml(meta.Restrictions?.value)) return null;

  const width = ii.width ?? 0;
  const height = ii.height ?? 0;
  if (width < MIN_WIDTH || width * height < MIN_PIXELS) return null;
  const aspect = width / height;
  if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) return null;

  const description = stripHtml(meta.ImageDescription?.value) || stripHtml(meta.ObjectName?.value);
  const haystack = `${page.title} ${description}`;
  if (NOISE.some((re) => re.test(haystack))) return null;

  const categories = (page.categories ?? []).map((c) => c.title);

  /* What Commons itself says the picture is OF. A nameplate can be a
     technically excellent photograph — Commons will even award it Quality —
     and still be the worst possible frame to open a monastery's gallery
     with. The categories are the only reliable way to tell. */
  if (categories.some((c) => CATEGORY_NOISE.some((re) => re.test(c)))) return null;

  const assessment = categories.some((c) => c.includes("Featured pictures"))
    ? "featured"
    : categories.some((c) => c.includes("Quality images"))
      ? "quality"
      : categories.some((c) => c.includes("Valued images"))
        ? "valued"
        : null;

  return {
    subject: subject.key,
    subjectName: subject.name,
    title: page.title,
    file: page.title,
    descriptionUrl: ii.descriptionurl,
    sourceUrl: ii.thumburl ?? ii.url,
    originalUrl: ii.url,
    width,
    height,
    mime: ii.mime,
    license: licence,
    licenseUrl: stripHtml(meta.LicenseUrl?.value) || null,
    attribution: artist,
    credit: stripHtml(meta.Credit?.value) || null,
    description,
    uploader: ii.user ?? null,
    assessment,
    evidence,
    distanceM: distanceM ?? null,
  };
}

/** Does this file's own text name the subject? */
function namesSubject(page, subject) {
  const ii = page.imageinfo?.[0];
  const text = `${page.title} ${stripHtml(ii?.extmetadata?.ImageDescription?.value)}`.toLowerCase();
  return subject.tokens.some((t) => text.includes(t));
}

/* ---------------------------------------------------------------- subjects */

/** Pull the monastery seeds straight out of the app's own source of truth. */
function readMonasteries() {
  const src = readFileSync("src/data/monasteries.ts", "utf8");
  const seedBlock = src.slice(src.indexOf("const SEEDS"), src.indexOf("const REPORTED_HOURS"));
  const seeds = [...seedBlock.matchAll(/slug: "([^"]+)",\s*\n\s*name: "([^"]+)",/g)].map((m) => ({
    slug: m[1],
    name: m[2],
  }));

  const coordBlock = src.slice(src.indexOf("const VERIFIED_COORDS"));
  const coords = Object.fromEntries(
    [...coordBlock.matchAll(/^\s{2}"?([a-z-]+)"?: \{ lat: ([\d.-]+), lng: ([\d.-]+) \},$/gm)].map(
      (m) => [m[1], { lat: Number(m[2]), lng: Number(m[3]) }],
    ),
  );

  return seeds.map((s) => ({
    key: `monastery/${s.slug}`,
    scope: "monastery",
    slug: s.slug,
    name: s.name,
    // "Lingdum (Ranka) Monastery" → search on the distinctive words only.
    tokens: subjectTokens(s.name),
    categories: categoryGuesses(s.name),
    searches: [`"${s.name}"`, `${s.name.replace(/\s*\([^)]*\)/, "")} Sikkim`],
    coords: coords[s.slug],
    radiusM: 400,
    limit: MAX_PER_MONASTERY,
  }));
}

function readPlaces() {
  const src = readFileSync("src/data/places.ts", "utf8");
  const block = src.slice(src.indexOf("const SEEDS"));
  const seeds = [
    ...block.matchAll(
      /slug: "([^"]+)",\s*\n\s*name: "([^"]+)",\s*\n\s*category: "([^"]+)",\s*\n\s*district: "([^"]+)",\s*\n\s*lat: ([\d.-]+),\s*\n\s*lng: ([\d.-]+),\s*\n\s*wiki: "([^"]+)",/g,
    ),
  ].map((m) => ({
    slug: m[1],
    name: m[2],
    category: m[3],
    lat: Number(m[5]),
    lng: Number(m[6]),
    wiki: m[7],
  }));

  /* A lake is a point; a national park and a town are not. Search radius has
     to follow the subject or a town gallery becomes one street corner. */
  const radiusFor = (category) =>
    ({
      Lake: 1200,
      Waterfall: 600,
      River: 2500,
      Heritage: 700,
      Monument: 500,
      Museum: 400,
      Sanctuary: 6000,
      "National Park": 8000,
      Peak: 6000,
      Valley: 5000,
      Pass: 1500,
      Trek: 4000,
      Town: 2500,
      Village: 2000,
      Garden: 2000,
      Viewpoint: 800,
    })[category] ?? 1500;

  return seeds.map((s) => ({
    key: `place/${s.slug}`,
    scope: "place",
    slug: s.slug,
    name: s.name,
    tokens: subjectTokens(s.name),
    categories: categoryGuesses(s.name).concat(`Category:${s.wiki.replace(/_/g, " ")}`),
    searches: [`"${s.name}"`, `${s.name} Sikkim`],
    coords: { lat: s.lat, lng: s.lng },
    radiusM: radiusFor(s.category),
    limit: MAX_PER_PLACE,
  }));
}

/** The distinctive words of a name, lowercased — what a title match tests. */
function subjectTokens(name) {
  const cleaned = name.replace(/[()–—-]/g, " ").toLowerCase();
  const stop = new Set([
    "monastery", "lake", "the", "of", "and", "sikkim", "valley", "falls", "park",
    "national", "sanctuary", "garden", "institute", "river", "pass", "la",
    "rhododendron", "wildlife", "alpine", "tea", "confluence", "ruins",
  ]);
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  // Fall back to the whole name when every word was a stop word (e.g. "Nathu La").
  return words.length ? words : [cleaned.trim()];
}

function categoryGuesses(name) {
  const bare = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const guesses = new Set([`Category:${bare}`]);
  // Commons files sit under the plain name as often as the qualified one.
  const withoutSuffix = bare.replace(/\s+(Monastery|Lake|Falls|Valley)$/i, "");
  if (withoutSuffix !== bare) guesses.add(`Category:${withoutSuffix}`);
  if (!/sikkim/i.test(bare)) guesses.add(`Category:${bare}, Sikkim`);
  return [...guesses];
}

/* ------------------------------------------------------------- the gathering */

async function gather(subject) {
  const seen = new Map(); // title → page, with the STRONGEST evidence kept
  const record = (page, evidence, distanceM) => {
    const rank = { category: 3, named: 2, geo: 1 };
    const prev = seen.get(page.title);
    if (prev && rank[prev.evidence] >= rank[evidence]) {
      if (distanceM != null && prev.distanceM == null) prev.distanceM = distanceM;
      return;
    }
    seen.set(page.title, { page, evidence, distanceM });
  };

  // 1. The subject's own Commons category — the strongest statement Commons
  //    makes about what a photograph is of.
  for (const category of subject.categories) {
    let pages = [];
    try {
      pages = await categoryMembers(category);
    } catch {
      pages = [];
    }
    for (const page of pages) record(page, "category", null);
    await sleep(200);
  }

  // 2. Name search — the file or its description says what it shows.
  for (const term of subject.searches) {
    let pages = [];
    try {
      pages = await fileSearch(term);
    } catch {
      pages = [];
    }
    for (const page of pages) {
      if (namesSubject(page, subject)) record(page, "named", null);
    }
    await sleep(200);
  }

  // 3. Coordinates — for subjects whose Commons naming is thin.
  if (subject.coords) {
    let pages = [];
    try {
      pages = await geosearch(subject.coords.lat, subject.coords.lng, subject.radiusM);
    } catch {
      pages = [];
    }
    const titles = pages.map((p) => p.title);
    const coordMap = titles.length ? await coordinatesFor(titles) : new Map();
    for (const page of pages) {
      const c = coordMap.get(page.title);
      const d = c ? haversine(subject.coords, c) : null;
      // A named file anywhere in the radius is about the subject; an unnamed
      // one has to be standing on top of it.
      if (namesSubject(page, subject)) record(page, "named", d);
      else if (d != null && d <= GEO_STRICT_M) record(page, "geo", d);
    }
  }

  return [...seen.values()];
}

/** Admission, ranking, and the diversity caps. */
function curate(subject, raw) {
  const rejected = [];
  const candidates = [];
  for (const { page, evidence, distanceM } of raw) {
    const cand = toCandidate(page, { evidence, subject, distanceM });
    if (!cand) {
      rejected.push({ title: page.title, reason: "filtered (licence, size, aspect or subject)" });
      continue;
    }
    cand.score = scoreCandidate(cand);
    candidates.push(cand);
  }

  candidates.sort((a, b) => b.score - a.score);

  const chosen = [];
  const perSeries = new Map();
  const perAuthor = new Map();
  for (const cand of candidates) {
    if (chosen.length >= subject.limit) break;
    const series = seriesKey(cand.title);
    const author = cand.attribution.toLowerCase();
    if ((perSeries.get(series) ?? 0) >= MAX_PER_SERIES) {
      rejected.push({ title: cand.title, reason: `series cap (${series})` });
      continue;
    }
    if ((perAuthor.get(author) ?? 0) >= MAX_PER_AUTHOR) {
      rejected.push({ title: cand.title, reason: `author cap (${cand.attribution})` });
      continue;
    }
    perSeries.set(series, (perSeries.get(series) ?? 0) + 1);
    perAuthor.set(author, (perAuthor.get(author) ?? 0) + 1);
    chosen.push(cand);
  }

  return { chosen, rejected, considered: candidates.length };
}

/* ------------------------------------------------------------- vendoring */

/* 1600px is the widest rendition any layout here asks for (the lightbox at
   85vw on a 1920 screen). Vendoring the Commons original instead would put
   ~1.4 MB per frame into the repo for pixels nothing ever renders. */
const VENDOR_MAX_EDGE = 1600;
const VENDOR_QUALITY = 75;

/**
 * A stable, readable, collision-free basename for a Commons file: a slug of
 * its own title, plus a short digest so two files that slugify alike cannot
 * overwrite one another.
 */
function fileKey(commonsTitle) {
  const slug = commonsTitle
    .replace(/^File:/, "")
    .replace(/\.\w+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const digest = createHash("sha1").update(commonsTitle).digest("hex").slice(0, 6);
  return `${slug || "photo"}-${digest}`;
}

async function vendor(cand, localPath) {
  if (!FORCE && existsSync(localPath) && statSync(localPath).size > 4096) return "skipped";
  mkdirSync(dirname(localPath), { recursive: true });

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(cand.sourceUrl, {
        headers: { "User-Agent": UA, Accept: "image/*" },
      });
      if (res.status === 429) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 4096) throw new Error(`suspiciously small (${buf.length}b)`);

      // Recompress on the way in rather than leaving it to optimize-images:
      // the gallery multiplies the file count by an order of magnitude and an
      // un-capped Commons original is up to 1.4 MB.
      await sharp(buf)
        .rotate()
        .resize({
          width: VENDOR_MAX_EDGE,
          height: VENDOR_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: VENDOR_QUALITY, progressive: true, mozjpeg: true })
        .toFile(localPath);
      return "downloaded";
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(1200 * attempt);
    }
  }
  throw new Error("unreachable");
}

/* -------------------------------------------------------------------- main */

const subjects = [...readMonasteries(), ...readPlaces()].filter(
  (s) => !ONLY || ONLY.includes(s.slug) || ONLY.includes(s.key),
);

console.log(`Heritage Gallery Agent — ${subjects.length} subjects\n`);

const galleries = {};
const report = { generatedAt: RETRIEVED_AT, subjects: [] };
let downloaded = 0;
let reused = 0;
const failures = [];

for (const subject of subjects) {
  process.stdout.write(`${subject.key.padEnd(44)}`);
  let raw = [];
  try {
    raw = await gather(subject);
  } catch (err) {
    console.log(`ERROR ${err.message}`);
    failures.push({ subject: subject.key, error: err.message });
    continue;
  }

  const { chosen, rejected, considered } = curate(subject, raw);
  const photos = [];

  for (const cand of chosen) {
    /* Named after the Commons file, not after its rank.
       Ranking is not stable across runs — tune the scoring and the photo that
       was 3rd becomes 1st. With index names, the vendor step's "already on
       disk, skip it" would then leave OLD pixels sitting under NEW metadata,
       and the page would print one photographer's name over another
       photographer's work. Content-addressed names make that impossible and
       make re-runs nearly free. */
    const localPath = join(OUT_DIR, subject.scope, subject.slug, `${fileKey(cand.file)}.jpg`);
    const publicPath = `/${localPath.replace(/^public\//, "")}`;
    if (!DRY) {
      try {
        const outcome = await vendor(cand, localPath);
        if (outcome === "downloaded") downloaded++;
        else reused++;
      } catch (err) {
        failures.push({ subject: subject.key, file: cand.title, error: err.message });
        continue;
      }
      await sleep(250);
    }
    const dims = DRY ? null : await sharp(localPath).metadata();
    photos.push({
      file: cand.file,
      localPath: publicPath,
      sourceUrl: cand.sourceUrl,
      descriptionUrl: cand.descriptionUrl,
      width: dims?.width ?? cand.width,
      height: dims?.height ?? cand.height,
      license: cand.license,
      licenseUrl: cand.licenseUrl,
      attribution: cand.attribution,
      credit: cand.credit,
      caption: cand.description.slice(0, 240) || null,
      assessment: cand.assessment,
      evidence: cand.evidence,
      distanceM: cand.distanceM == null ? null : Math.round(cand.distanceM),
      resolvedAt: RETRIEVED_AT,
    });
  }

  galleries[subject.key] = {
    key: subject.key,
    scope: subject.scope,
    slug: subject.slug,
    subject: subject.name,
    photos,
  };
  report.subjects.push({
    key: subject.key,
    considered,
    chosen: photos.length,
    rejected: rejected.slice(0, 12),
  });

  const marks = photos
    .map((p) => (p.assessment ? p.assessment[0].toUpperCase() : p.evidence[0]))
    .join("");
  console.log(`${String(photos.length).padStart(2)} of ${String(considered).padStart(3)}  ${marks}`);
}

if (!DRY) {
  mkdirSync("src/data/generated", { recursive: true });
  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: RETRIEVED_AT,
        note: "Written by scripts/heritage-gallery-agent.mjs. Do not hand-edit — re-run the agent.",
        galleries,
      },
      null,
      2,
    ) + "\n",
  );
  mkdirSync("reports", { recursive: true });
  writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
}

const total = Object.values(galleries).reduce((n, g) => n + g.photos.length, 0);
const empty = Object.values(galleries).filter((g) => g.photos.length === 0);
console.log(
  `\n${total} photographs across ${Object.keys(galleries).length} subjects — ` +
    `${downloaded} downloaded, ${reused} already present, ${failures.length} failed.`,
);
if (empty.length) {
  console.log(`No qualifying photograph for: ${empty.map((g) => g.key).join(", ")}`);
}
if (failures.length) {
  failures.slice(0, 20).forEach((f) => console.log(`  FAIL ${f.subject} ${f.file ?? ""} — ${f.error}`));
  process.exitCode = 1;
}
