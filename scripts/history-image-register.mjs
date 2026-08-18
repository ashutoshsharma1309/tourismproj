#!/usr/bin/env node
/**
 * Registers Commons files for the colonial-era timeline entries.
 *
 * Takes each curated subject's Wikipedia article, reads the article's own lead
 * image, derives the Commons file page, and appends it to the credits registry
 * that vendor-images.mjs and the archive agent both read. Using the article's
 * own lead image means the picture is the one the encyclopedia itself uses for
 * that subject — not a keyword-search guess.
 *
 * Usage: node scripts/history-image-register.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const WP = "https://en.wikipedia.org/w/api.php";
const UA = "Ney-Heritage-Research/1.0 (SIH cultural heritage project)";
const CREDITS = "src/data/generated/image-credits.json";

/** key → Wikipedia article whose lead image illustrates the subject. */
const SUBJECTS = {
  "history/punakha-dzong": "Punakha Dzong",
  "history/anglo-nepalese-war": "Anglo-Nepalese War",
  "history/kingdom-of-sikkim": "Kingdom of Sikkim",
  "history/darjeeling": "Darjeeling",
  "history/joseph-hooker": "Joseph Dalton Hooker",
  "history/tumlong": "Tumlong",
  "history/sikkim-expedition": "Sikkim expedition",
  "history/palden-thondup-namgyal": "Palden Thondup Namgyal",
  "history/tsuklakhang-palace": "Tsuklakhang Palace",
  "history/chogyal": "Chogyal",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params, attempt = 0) {
  const url = new URL(WP);
  url.search = new URLSearchParams({ format: "json", origin: "*", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`${res.status}`);
    await sleep(2000 * 2 ** attempt);
    return api(params, attempt + 1);
  }
  return res.json();
}

/** Commons file page from an upload.wikimedia URL. */
function commonsFilePage(url) {
  const decoded = decodeURIComponent(url.split("?")[0]);
  const thumb = decoded.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  const direct = decoded.match(/\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)$/);
  const file = thumb?.[1] ?? direct?.[1];
  return file ? `https://commons.wikimedia.org/wiki/File:${file}` : null;
}

const credits = JSON.parse(readFileSync(CREDITS, "utf8"));
const existing = new Set(credits.map((c) => c.key));
let added = 0;

for (const [key, title] of Object.entries(SUBJECTS)) {
  if (existing.has(key)) {
    console.log(`  = ${key.padEnd(34)} already registered`);
    continue;
  }
  await sleep(1100);
  const data = await api({
    action: "query",
    prop: "pageimages",
    piprop: "original",
    titles: title,
    redirects: "1",
  });
  const page = Object.values(data.query?.pages ?? {})[0];
  const source = page?.original?.source;
  if (!source) {
    console.log(`  ✗ ${key.padEnd(34)} no lead image on "${title}"`);
    continue;
  }
  const filePage = commonsFilePage(source);
  if (!filePage) {
    console.log(`  ✗ ${key.padEnd(34)} lead image is not hosted on Commons`);
    continue;
  }
  const ext = (source.split("?")[0].match(/\.(jpe?g|png|webp)$/i)?.[1] ?? "jpg").toLowerCase();
  credits.push({
    key,
    localPath: `/images/${key}.${ext === "jpeg" ? "jpg" : ext}`,
    sourceUrl: source.split("?")[0],
    commonsFilePage: filePage,
  });
  added++;
  console.log(`  ✓ ${key.padEnd(34)} ${filePage.split("File:")[1].slice(0, 52)}`);
}

writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + "\n");
console.log(`\n  ${added} registered · ${credits.length} total in ${CREDITS}`);
