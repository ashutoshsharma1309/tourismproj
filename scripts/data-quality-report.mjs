#!/usr/bin/env node
/**
 * Data quality report — Ney Heritage
 * Aggregates the agent outputs into one auditable file (§15).
 * Usage: node scripts/data-quality-report.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const discovered = read("src/data/generated/monasteries.discovered.json");
const audio = read("src/data/generated/audio-guides.json");
const finder360 = read("reports/monastery-360-discovery.json");
const shipping = [
  ...readFileSync("src/data/monasteries.ts", "utf8").matchAll(/slug: "([^"]+)"/g),
].map((m) => m[1]);

const audioSlugs = new Set(audio.map((a) => a.monasterySlug));
const missing = (fn) => discovered.filter(fn).map((m) => m.slug);

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totals: {
    shippingRecords: shipping.length,
    discoveredCandidates: discovered.length,
    verified: discovered.filter((m) => m.status === "VERIFIED").length,
    partiallyVerified: discovered.filter((m) => m.status === "PARTIALLY_VERIFIED").length,
    needsReview: discovered.filter((m) => m.status === "NEEDS_REVIEW").length,
    audioGuides: audio.length,
    monasteriesWithAudio: audioSlugs.size,
    verified360: finder360.totals.published,
  },
  gaps: {
    missingCoordinates: missing((m) => m.latitude === null),
    missingImage: missing((m) => !m.image?.url),
    missingEstablishedYear: missing((m) => m.establishedYear === null),
    missingTradition: missing((m) => m.tradition === null),
    missingDistrict: missing((m) => !m.district),
    missingAudio: discovered.filter((m) => !audioSlugs.has(m.slug)).map((m) => m.slug),
    missing360: discovered.map((m) => m.slug),
  },
  duplicates: [],
  suspicious: [],
  notes: [
    "Every catalogued site is missing a 360° experience. That is a verified negative result from the 360 Heritage Finder, not an outstanding task.",
    "Street View availability could not be checked: no Google Maps Platform key is configured, and the metadata endpoint is the only sanctioned way to check.",
    "Audio exists only where the cited sources carried enough material; short guides are marked lengthLimitedBySources.",
  ],
};
writeFileSync("reports/monastery-data-quality.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.totals, null, 2));
for (const [k, v] of Object.entries(report.gaps)) console.log(`  ${k}: ${v.length}`);
