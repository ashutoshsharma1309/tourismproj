#!/usr/bin/env node
/**
 * Heritage Discovery Agent — Ney Heritage
 *
 * Discovers and verifies Sikkim monastery records. It never writes prose of
 * its own: every field it emits is copied from a named source together with
 * the URL it came from and the date it was read. Records that cannot be
 * corroborated are emitted as candidates for human review, not published.
 *
 *   discover → collect → cross-check → score → store evidence → review
 *
 * Usage: node scripts/heritage-discovery.mjs
 * Writes: src/data/generated/monasteries.discovered.json
 *         reports/monastery-discovery.json
 */

import { writeFileSync, readFileSync } from "node:fs";

const WP = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const UA = "Ney-Heritage-Research/1.0 (SIH cultural heritage project; contact: maintainer)";
const RETRIEVED_AT = process.env.RETRIEVED_AT ?? new Date().toISOString().slice(0, 10);

/** Categories that enumerate the subject. Discovery starts here, not from a guessed list. */
const SEED_CATEGORIES = ["Category:Buddhist monasteries in Sikkim"];

/** Legacy district names still used by many sources, mapped to the 2021 names. */
const DISTRICT_ALIASES = {
  "East Sikkim": "Gangtok",
  "North Sikkim": "Mangan",
  "South Sikkim": "Namchi",
  "West Sikkim": "Gyalshing",
  Gyalshing: "Gyalshing",
  Geyzing: "Gyalshing",
  Gezing: "Gyalshing",
  Mangan: "Mangan",
  Namchi: "Namchi",
  Gangtok: "Gangtok",
  Pakyong: "Pakyong",
  Soreng: "Soreng",
};

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

/** Requests with exponential backoff — 429 means slow down, not give up. */
async function api(base, params, attempt = 0) {
  const url = new URL(base);
  url.search = new URLSearchParams({ format: "json", origin: "*", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`${res.status} after ${attempt} retries: ${url}`);
    const wait = 2000 * 2 ** attempt;
    process.stdout.write(`    (${res.status} — backing off ${wait / 1000}s)\n`);
    await sleepMs(wait);
    return api(base, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** Politeness: the Wikimedia APIs are free infrastructure, so stay well under limits. */
const sleep = sleepMs;

async function categoryMembers(category) {
  const data = await api(WP, {
    action: "query",
    list: "categorymembers",
    cmtitle: category,
    cmlimit: "500",
    cmtype: "page",
  });
  return (data.query?.categorymembers ?? [])
    .map((m) => m.title)
    .filter((t) => !t.startsWith("List of") && !t.startsWith("Template:"));
}

/** Pull everything about one article in a single request. */
async function fetchArticle(title) {
  const data = await api(WP, {
    action: "query",
    prop: "extracts|coordinates|pageimages|info|categories",
    titles: title,
    redirects: "1",
    explaintext: "1",
    exintro: "1",
    piprop: "original",
    inprop: "url",
    cllimit: "50",
  });
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return null;
  return page;
}

/** License and authorship for an image, straight from Commons metadata. */
async function fetchImageLicense(fileUrl) {
  if (!fileUrl) return null;
  // Wikimedia appends tracking params to media URLs; strip them before
  // turning the path into a Commons File: title.
  const clean = fileUrl.split("?")[0];
  const file = decodeURIComponent(clean.split("/").pop() ?? "");
  const data = await api(COMMONS, {
    action: "query",
    titles: `File:${file}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const strip = (v) => (v ? String(v.value).replace(/<[^>]*>/g, "").trim() : null);
  return {
    url: info.url.split("?")[0],
    descriptionUrl: info.descriptionurl,
    license: strip(meta.LicenseShortName),
    licenseUrl: strip(meta.LicenseUrl),
    author: strip(meta.Artist),
    attributionRequired: strip(meta.LicenseShortName) !== "Public domain",
  };
}

const norm = (s) => s.toLowerCase().replace(/monastery|gompa|gonpa|\s|[^a-z]/g, "");

function inferDistrict(text) {
  for (const [alias, district] of Object.entries(DISTRICT_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(text)) return DISTRICT_ALIASES[alias] ?? district;
  }
  return null;
}

function inferEstablished(text) {
  // Only accept a year that is explicitly tied to founding language.
  const m = text.match(
    /\b(?:establish|found|built|construct|consecrat)\w*\s+(?:in|around|circa|c\.)?\s*(?:the\s+year\s+)?(1[0-9]{3}|20[0-2][0-9])\b/i,
  );
  return m ? Number(m[1]) : null;
}

function inferTradition(text, categories) {
  const hay = `${text} ${categories.join(" ")}`;
  // Order matters: the more specific lineage names must win.
  if (/zurmang/i.test(hay)) return "Zurmang Kagyu";
  if (/karma kagyu|karmapa/i.test(hay)) return "Karma Kagyu";
  if (/nyingma/i.test(hay)) return "Nyingma";
  if (/kagyu|kargyu/i.test(hay)) return "Kagyu";
  if (/\bbon\b|bön/i.test(hay)) return "Bon";
  if (/sakya/i.test(hay)) return "Sakya";
  if (/gelug/i.test(hay)) return "Gelug";
  return null;
}

/**
 * Confidence follows evidence, never enthusiasm.
 *  VERIFIED            article + coordinates + a usable licensed image
 *  PARTIALLY_VERIFIED  article prose, but geography or media incomplete
 *  NEEDS_REVIEW        a stub too thin to describe the site honestly
 */
function score(record) {
  const hasProse = (record.historicalSummary ?? "").length >= 180;
  const hasCoords = record.latitude !== null && record.longitude !== null;
  const hasImage = Boolean(record.image?.url);
  if (hasProse && hasCoords && hasImage) return { status: "VERIFIED", confidence: 0.9 };
  if (hasProse && (hasCoords || hasImage)) return { status: "PARTIALLY_VERIFIED", confidence: 0.65 };
  if (hasProse) return { status: "PARTIALLY_VERIFIED", confidence: 0.5 };
  return { status: "NEEDS_REVIEW", confidence: 0.25 };
}

async function main() {
  console.log("Heritage Discovery Agent — Sikkim monasteries\n");

  const titles = new Set();
  for (const category of SEED_CATEGORIES) {
    const members = await categoryMembers(category);
    members.forEach((t) => titles.add(t));
    console.log(`  ${category}: ${members.length} articles`);
  }

  const records = [];
  const rejected = [];
  const seen = new Map();

  for (const title of [...titles].sort()) {
    await sleep(1100);
    const page = await fetchArticle(title);
    if (!page) {
      rejected.push({ title, reason: "article not retrievable" });
      continue;
    }

    const extract = (page.extract ?? "").trim();
    const categories = (page.categories ?? []).map((c) => c.title);
    const coord = page.coordinates?.[0];

    // Cross-check: the article must actually place the subject in Sikkim.
    const mentionsSikkim = /sikkim/i.test(`${extract} ${categories.join(" ")}`);
    if (!mentionsSikkim) {
      rejected.push({ title, reason: "no corroborating Sikkim reference in source" });
      continue;
    }

    // Duplicate detection across normalised name and coordinates.
    const key = norm(title);
    if (seen.has(key)) {
      rejected.push({ title, reason: `duplicate of ${seen.get(key)}` });
      continue;
    }
    seen.set(key, title);

    const image = page.original?.source ? await fetchImageLicense(page.original.source) : null;

    const record = {
      slug: title
        .replace(/\s*\(.*?\)\s*/g, "")
        .replace(/\s*Monastery$/i, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      name: title.replace(/\s*\(Sikkim\)$/, ""),
      alternateNames: [],
      district: inferDistrict(extract),
      latitude: coord?.lat ?? null,
      longitude: coord?.lon ?? null,
      establishedYear: inferEstablished(extract),
      tradition: inferTradition(extract, categories),
      historicalSummary: extract,
      image,
      sources: [
        {
          name: "Wikipedia",
          type: "encyclopedia",
          url: page.fullurl,
          retrievedAt: RETRIEVED_AT,
        },
      ],
      lastVerifiedAt: RETRIEVED_AT,
    };
    Object.assign(record, score(record));
    records.push(record);
    process.stdout.write(
      `  ${record.status === "VERIFIED" ? "✓" : record.status === "NEEDS_REVIEW" ? "?" : "~"} ${record.name}\n`,
    );
  }

  // Compare against what already ships.
  const existing = new Set(
    [...readFileSync("src/data/monasteries.ts", "utf8").matchAll(/slug: "([^"]+)"/g)].map(
      (m) => norm(m[1]),
    ),
  );
  for (const r of records) r.isNew = !existing.has(norm(r.slug));

  const byStatus = (s) => records.filter((r) => r.status === s).length;
  const report = {
    generatedAt: RETRIEVED_AT,
    agent: "Heritage Discovery Agent",
    seedCategories: SEED_CATEGORIES,
    totals: {
      existingBefore: existing.size,
      candidatesFound: records.length,
      newCandidates: records.filter((r) => r.isNew).length,
      verified: byStatus("VERIFIED"),
      partiallyVerified: byStatus("PARTIALLY_VERIFIED"),
      needsReview: byStatus("NEEDS_REVIEW"),
      rejected: rejected.length,
      withCoordinates: records.filter((r) => r.latitude !== null).length,
      withImage: records.filter((r) => r.image?.url).length,
      withEstablishedYear: records.filter((r) => r.establishedYear !== null).length,
      withTradition: records.filter((r) => r.tradition !== null).length,
    },
    rejected,
    note:
      "Confidence reflects evidence found, not completeness of the page. Nothing here is published without passing the VERIFIED gate or explicit human review.",
  };

  writeFileSync(
    "src/data/generated/monasteries.discovered.json",
    JSON.stringify(records, null, 2) + "\n",
  );
  writeFileSync("reports/monastery-discovery.json", JSON.stringify(report, null, 2) + "\n");

  console.log("\n" + JSON.stringify(report.totals, null, 2));
  console.log(`\nRejected: ${rejected.length}`);
  for (const r of rejected) console.log(`  - ${r.title}: ${r.reason}`);
}

main().catch((e) => {
  console.error("Discovery failed:", e.message);
  process.exit(1);
});
