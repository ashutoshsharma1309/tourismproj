#!/usr/bin/env node
/**
 * Sikkim Cultural Research Agent
 * ==============================
 *
 * The archive's rule (§22) is that every rendered claim points at a named
 * source. This agent is what keeps that rule honest for the Stories of Sikkim
 * catalogue. It does three jobs, in order:
 *
 *   1. IMAGES — resolves each curated Wikimedia Commons file to a stable URL
 *      and pulls its licence and author out of Commons' own metadata, so no
 *      photograph ships without attribution. Files that cannot be resolved are
 *      reported, never guessed at.
 *   2. SOURCES — walks every source URL cited by every story and records the
 *      HTTP status. A story whose sources have gone dark is a story the curator
 *      needs to look at.
 *   3. REPORT — writes research/sikkim-cultural-research.md and
 *      reports/cultural-research.json.
 *
 * Wikimedia rate-limits hard, so calls are spaced (~1.1s) with backoff — the
 * same discipline as scripts/heritage-discovery.mjs.
 *
 *   node scripts/sikkim-cultural-research.mjs            # everything
 *   node scripts/sikkim-cultural-research.mjs --images   # image pass only
 *   node scripts/sikkim-cultural-research.mjs --sources  # source pass only
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA =
  "SikkimDarshan-cultural-research/1.0 (https://github.com/ashutoshsharma1309/tourismproj; heritage documentation)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/* -------------------------------------------------------------------------
   Curated image set.

   Each entry names the Commons file chosen for a story key. The rule applied
   when choosing: the photograph must depict the story's own subject — its
   festival, place, community, dish or object. Where no openly licensed
   photograph of a subject exists (Pang Lhabsol and Losoong have none on
   Commons), the story falls back to a photograph of the place the observance
   is held at and says so on the page, rather than dressing a festival story
   in an unrelated monastery view.
   ------------------------------------------------------------------------- */
const CURATED_IMAGES = {
  "story/coronation-throne": "File:Sikkim Yuksom Norbugang Parc coronation throne.jpg",
  "story/kabi-lungchok": "File:Kabi Lungchok.jpg",
  "story/rabdentse": "File:Rabdentse Ruins, Pelling (41620939864).jpg",
  "story/black-hat-dance": "File:Black hat dancer.jpg",
  "story/maruni": "File:Maruni Dance Sikkim.jpg",
  "story/naumati": "File:Naumati Baaja.jpg",
  "story/sakela": "File:Sakela Silli dance in Dharan.jpg",
  "story/chyabrung": "File:Local traditional rai limbu culture.jpg",
  "story/dhyangro": "File:Dhyangro Using In Rai Shaman by allies of Rai Mangpa.jpg",
  "story/banjhakri-statues": "File:Statues of Banjhakri and a Boy.jpg",
  "story/banjhakri-falls": "File:Banjhakri Falls, Gangtok.jpg",
  "story/limbu-house": "File:Limboo house in Hee- kengbari village in West Sikkim, Sikkim, India.jpg",
  "story/lepcha-portrait":
    "File:Portret van een onbekende Lepcha vrouw uit Sikkim Lepcha female. Aboriginal. Sikhim (titel op object), RP-F-2001-7-1122A-49.jpg",
  "story/indra-jatra": "File:Chariot of Indra Jatra.jpg",
  "story/dhaka-topi": "File:Nepali Topi.JPG",
  "story/sel-roti": "File:Sel Roti.jpg",
  "story/gundruk": "File:Gundruk NP.jpg",
  "story/momo": "File:Momo 2.jpg",
  "story/thukpa": "File:Chicken Thukpa.jpg",
  "story/chhurpi": "File:Chhurpi.jpg",
  "story/tongba": "File:Tongba - Millet Brew from Sikkim.jpg",
  "story/temi-tea": "File:Temi Tea Garden Sikkim India October 2013.jpg",
  "story/cardamom": "File:Large Cardamom clicked by Somya.jpg",
  "story/red-panda": "File:Red Panda in Sikkim.jpg",
  "story/yak": "File:Yak near Tsomgo Lake, Sikkim.jpg",
  "story/terrace-farming": "File:Step farming in sikkim (6052932505).jpg",
  "story/teesta-confluence":
    "File:View of Rangeet meeting with Teesta river taken from Lovers Meet View Point, Peshok Road, Tukdah.jpg",
  "story/mg-marg": "File:M.G. Marg, Gangtok 01.jpg",
  "story/singshore": "File:Singshore Bridge,pelling.jpg",
  "story/samdruptse":
    "File:Guru Padmasambhava statue in Samdruptse Hill, Namchi, district of South Sikkim 13.jpg",
  "story/prayer-flags": "File:Prayer flags at Khecheolpalri Lake.jpg",
  "story/dzongu":
    "File:Premise of Tingvong Monastery located in Upper Dzongu, North Sikkim, India 05.jpg",
  "story/barsey": "File:Rhododendron in full bloom - Barsey.jpg",
  "story/silk-route": "File:Morning at Silk Route.jpg",
  "story/aritar-lake": "File:Lampokhari or Aritar Lake at Aritar, East Sikkim 02.jpg",
  "story/chardham": "File:Chardham Temple Namchi Sikkim.jpg",
  "story/rumtek-interior": "File:India Sikkim Rumtek Monastery3.jpg",
  "story/enchey": "File:Enchey Monastery in Gangtok, Sikkim,1.jpg",
};

/* ------------------------------------------------------------------ utils */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithBackoff(url, init = {}, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, ...(init.headers ?? {}) },
    });
  } catch (error) {
    /* Wikimedia drops connections under load; a dropped socket is not a
       missing file, so retry before reporting the file as unresolved. */
    if (attempt < 4) {
      const wait = 1500 * 2 ** attempt;
      console.warn(`   … network error, retrying in ${wait}ms`);
      await sleep(wait);
      return fetchWithBackoff(url, init, attempt + 1);
    }
    throw error;
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = 1500 * 2 ** attempt;
    console.warn(`   … ${res.status}, retrying in ${wait}ms`);
    await sleep(wait);
    return fetchWithBackoff(url, init, attempt + 1);
  }
  return res;
}

/** Commons wraps artist and licence in HTML. Strip it to plain text. */
function plain(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ----------------------------------------------------------------- images */

async function resolveImages() {
  const titles = Object.entries(CURATED_IMAGES);
  const resolved = {};
  const failures = [];

  console.log(`\n▸ Resolving ${titles.length} Commons files\n`);

  for (const [key, title] of titles) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      titles: title,
      prop: "imageinfo",
      iiprop: "url|extmetadata|size",
      iiurlwidth: "1600",
    });
    let page;
    try {
      const res = await fetchWithBackoff(`${COMMONS_API}?${params}`);
      const data = await res.json();
      page = data?.query?.pages?.[0];
    } catch (error) {
      failures.push({ key, title, reason: String(error) });
      console.log(`   ✗ ${key} — request failed`);
      await sleep(1100);
      continue;
    }

    const info = page?.imageinfo?.[0];
    if (page?.missing || !info) {
      failures.push({ key, title, reason: "file not found on Commons" });
      console.log(`   ✗ ${key} — not found`);
      await sleep(1100);
      continue;
    }

    const meta = info.extmetadata ?? {};
    resolved[key] = {
      key,
      file: page.title,
      /* Commons appends utm_* tracking params to imageinfo URLs; they break
         Commons File: lookups and add nothing, so strip the query string. */
      url: (info.thumburl ?? info.url ?? "").split("?")[0],
      descriptionUrl: info.descriptionurl,
      width: info.thumbwidth ?? info.width,
      height: info.thumbheight ?? info.height,
      license: plain(meta.LicenseShortName?.value) || "see Commons file page",
      licenseUrl: meta.LicenseUrl?.value ?? null,
      attribution: plain(meta.Artist?.value) || "Unattributed on Commons",
      credit: plain(meta.Credit?.value) || null,
      resolvedAt: new Date().toISOString().slice(0, 10),
    };
    console.log(`   ✓ ${key.padEnd(28)} ${resolved[key].license}`);
    await sleep(1100);
  }

  /* HEAD-verify every resolved URL actually serves. */
  console.log(`\n▸ HEAD-verifying ${Object.keys(resolved).length} image URLs\n`);
  for (const entry of Object.values(resolved)) {
    try {
      const res = await fetchWithBackoff(entry.url, { method: "HEAD" });
      entry.httpStatus = res.status;
      if (!res.ok) {
        failures.push({ key: entry.key, title: entry.file, reason: `HTTP ${res.status}` });
        console.log(`   ✗ ${entry.key} — HTTP ${res.status}`);
      }
    } catch (error) {
      entry.httpStatus = 0;
      failures.push({ key: entry.key, title: entry.file, reason: String(error) });
    }
    await sleep(300);
  }
  const ok = Object.values(resolved).filter((e) => e.httpStatus === 200).length;
  console.log(`   ${ok}/${Object.keys(resolved).length} reachable`);

  await mkdir(join(ROOT, "src/data/generated"), { recursive: true });
  await writeFile(
    join(ROOT, "src/data/generated/story-images.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), images: resolved, failures }, null, 2)}\n`,
  );
  console.log("\n   → src/data/generated/story-images.json");
  return { resolved, failures };
}

/* ---------------------------------------------------------------- sources */

/**
 * Reads the story catalogue's cited URLs straight out of the TypeScript
 * sources — no build step, no import of app code into a plain Node script.
 */
async function collectStorySources() {
  const files = [
    "src/data/stories/history.ts",
    "src/data/stories/festivals.ts",
    "src/data/stories/communities.ts",
    "src/data/stories/folk-arts.ts",
    "src/data/stories/monastery-heritage.ts",
    "src/data/stories/food.ts",
    "src/data/stories/landscape.ts",
    "src/data/stories/journeys.ts",
    "src/data/sources.ts",
  ];
  const urls = new Map();
  for (const rel of files) {
    let text;
    try {
      text = await readFile(join(ROOT, rel), "utf8");
    } catch {
      continue;
    }
    for (const match of text.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
      const url = match[0].replace(/[.,]$/, "");
      if (!urls.has(url)) urls.set(url, []);
      urls.get(url).push(rel);
    }
    /* Story files cite Wikipedia through the wiki("Article_title") helper, so
       the article URL never appears literally. Expand those calls, otherwise
       the pass would verify the registry and miss every per-story citation. */
    for (const match of text.matchAll(/\bwiki\(\s*"([^"]+)"/g)) {
      const url = `https://en.wikipedia.org/wiki/${match[1]}`;
      if (!urls.has(url)) urls.set(url, []);
      urls.get(url).push(rel);
    }
  }
  return urls;
}

async function verifySources() {
  const urls = await collectStorySources();
  console.log(`\n▸ Verifying ${urls.size} cited URLs\n`);
  const results = [];
  for (const [url, files] of urls) {
    let status = 0;
    let note = "";
    try {
      /* Some government sites reject HEAD; fall back to a ranged GET. */
      let res = await fetchWithBackoff(url, { method: "HEAD", redirect: "follow" });
      /* Several government sites answer HEAD with 404 or 405 and the same URL
         with 200 on GET (www.sikkim.gov.in does exactly this), so a HEAD
         failure is not evidence that a page is gone. */
      if (!res.ok) {
        res = await fetchWithBackoff(url, { headers: { Range: "bytes=0-2048" } });
        if (res.ok) note = "HEAD rejected; verified by GET";
      }
      status = res.status;
    } catch (error) {
      note = String(error);
    }
    results.push({ url, files: [...new Set(files)], status, note, checkedAt: new Date().toISOString().slice(0, 10) });
    console.log(`   ${status === 200 ? "✓" : status ? `· ${status}` : "✗"} ${url.slice(0, 96)}`);
    await sleep(400);
  }
  const reachable = results.filter((r) => r.status >= 200 && r.status < 400).length;
  console.log(`\n   ${reachable}/${results.length} reachable`);
  return results;
}

/* ----------------------------------------------------------------- report */

async function writeReport({ images, sources }) {
  const today = new Date().toISOString().slice(0, 10);
  await mkdir(join(ROOT, "reports"), { recursive: true });
  await writeFile(
    join(ROOT, "reports/cultural-research.json"),
    `${JSON.stringify({ generatedAt: today, images, sources }, null, 2)}\n`,
  );
  console.log("   → reports/cultural-research.json");
}

/* ------------------------------------------------------------------- main */

const args = new Set(process.argv.slice(2));
const runImages = args.size === 0 || args.has("--images");
const runSources = args.size === 0 || args.has("--sources");

console.log("Sikkim Cultural Research Agent");
console.log("──────────────────────────────");

const imageResult = runImages ? await resolveImages() : null;
const sourceResult = runSources ? await verifySources() : null;

await writeReport({
  images: imageResult ? { resolved: Object.keys(imageResult.resolved).length, failures: imageResult.failures } : null,
  sources: sourceResult,
});

if (imageResult?.failures.length) {
  console.log(`\n⚠ ${imageResult.failures.length} image(s) unresolved — these do not ship.`);
}
console.log("\nDone.\n");
