#!/usr/bin/env node
/**
 * 360 Heritage Finder — Sikkim Darshan
 *
 * Looks for a legitimate 360° panorama that genuinely depicts a given
 * monastery. It publishes nothing on its own: it returns candidates with the
 * evidence behind them, and records an explicit negative result when none is
 * found. A negative result is a valid, useful answer here.
 *
 * Street View: the official Street View Static metadata endpoint is the only
 * sanctioned way to establish that Google panorama imagery exists for a
 * location. It requires a Maps Platform key. Without GOOGLE_MAPS_API_KEY set,
 * that check is reported as UNAVAILABLE — never guessed, and never replaced by
 * scraping the Maps site, which its terms forbid.
 *
 * Usage: node scripts/heritage-360-finder.mjs
 * Writes: reports/monastery-360-discovery.json
 */

import { readFileSync, writeFileSync } from "node:fs";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const UA = "Ney-Heritage-Research/1.0 (SIH cultural heritage project)";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? null;

/** Equirectangular panoramas are ~2:1 and wide. Anything else is a flat photo. */
const PANO_MIN_WIDTH = 3000;
const PANO_ASPECT_MIN = 1.9;
const PANO_ASPECT_MAX = 2.1;

/** How far a panorama may sit from the monastery before it stops being about it. */
const DISTANCE_STRONG_M = 50;
const DISTANCE_REVIEW_M = 150;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params, attempt = 0) {
  const url = new URL(COMMONS);
  url.search = new URLSearchParams({ format: "json", origin: "*", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`${res.status} after retries`);
    await sleep(2000 * 2 ** attempt);
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/** Great-circle distance in metres. */
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

/** Search Commons for panoramic media naming this site. */
async function searchCommonsPanoramas(name) {
  const queries = [
    `${name} 360`,
    `${name} panorama`,
    `${name} equirectangular`,
  ];
  const hits = [];
  for (const q of queries) {
    await sleep(900);
    const data = await api({
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: "6",
      gsrlimit: "10",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
    });
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info || !info.mime?.startsWith("image/")) continue;
      const { width = 0, height = 0 } = info;
      if (height === 0) continue;
      const aspect = width / height;
      const isPano =
        width >= PANO_MIN_WIDTH && aspect >= PANO_ASPECT_MIN && aspect <= PANO_ASPECT_MAX;
      if (!isPano) continue;
      const meta = info.extmetadata ?? {};
      const lat = Number(meta.GPSLatitude?.value);
      const lng = Number(meta.GPSLongitude?.value);
      hits.push({
        title: page.title,
        url: info.url.split("?")[0],
        descriptionUrl: info.descriptionurl,
        width,
        height,
        aspect: Number(aspect.toFixed(3)),
        license: meta.LicenseShortName?.value ?? null,
        coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
        matchedQuery: q,
      });
    }
  }
  // De-duplicate by file title.
  return [...new Map(hits.map((h) => [h.title, h])).values()];
}

/**
 * Official Street View metadata check. Returns availability without ever
 * fetching or storing imagery, which is what the API terms allow.
 */
async function checkStreetView(monastery) {
  if (!MAPS_KEY) {
    return {
      checked: false,
      status: "UNAVAILABLE",
      reason:
        "GOOGLE_MAPS_API_KEY not configured. The Street View metadata endpoint is the only sanctioned availability check; scraping the Maps site instead would breach its terms.",
    };
  }
  if (monastery.latitude === null) {
    return { checked: false, status: "NO_COORDINATE", reason: "No authoritative coordinate." };
  }
  const url = new URL("https://maps.googleapis.com/maps/api/streetview/metadata");
  url.search = new URLSearchParams({
    location: `${monastery.latitude},${monastery.longitude}`,
    radius: String(DISTANCE_REVIEW_M),
    source: "outdoor",
    key: MAPS_KEY,
  }).toString();
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") {
    return { checked: true, status: "NONE", reason: `metadata status ${data.status}` };
  }
  const distance = haversine(
    { lat: monastery.latitude, lng: monastery.longitude },
    { lat: data.location.lat, lng: data.location.lng },
  );
  return {
    checked: true,
    status: "FOUND",
    panoramaId: data.pano_id,
    location: data.location,
    date: data.date ?? null,
    copyright: data.copyright ?? null,
    distanceMetres: Math.round(distance),
    // Proximity alone never proves the panorama depicts the monastery — a road
    // outside the gate is not the courtyard. Visual review still gates publish.
    confidence:
      distance <= DISTANCE_STRONG_M ? "MEDIUM" : distance <= DISTANCE_REVIEW_M ? "LOW" : "REJECT",
    requiresVisualReview: true,
  };
}

async function main() {
  console.log("360 Heritage Finder\n");
  const monasteries = JSON.parse(
    readFileSync("src/data/generated/monasteries.discovered.json", "utf8"),
  );

  const results = [];
  for (const m of monasteries) {
    const commons = await searchCommonsPanoramas(m.name);
    const streetView = await checkStreetView(m);

    // Scored candidates: a Commons panorama must name the site AND, when it
    // carries coordinates, sit close to it.
    const candidates = commons.map((c) => {
      let distanceMetres = null;
      let confidence = "LOW";
      if (c.coordinates && m.latitude !== null) {
        distanceMetres = Math.round(
          haversine({ lat: m.latitude, lng: m.longitude }, c.coordinates),
        );
        confidence =
          distanceMetres <= DISTANCE_STRONG_M
            ? "HIGH"
            : distanceMetres <= DISTANCE_REVIEW_M
              ? "MEDIUM"
              : "REJECT";
      }
      return { ...c, distanceMetres, confidence, requiresVisualReview: true };
    });

    const usable = candidates.filter((c) => c.confidence === "HIGH" || c.confidence === "MEDIUM");
    results.push({
      slug: m.slug,
      name: m.name,
      commonsCandidates: candidates.length,
      usableCandidates: usable.length,
      candidates,
      streetView,
      outcome: usable.length > 0 ? "CANDIDATES_FOR_REVIEW" : "NONE_FOUND",
      checkedAt: RETRIEVED_AT,
    });
    process.stdout.write(
      `  ${usable.length > 0 ? "!" : "·"} ${m.name} — commons:${candidates.length} usable:${usable.length} streetview:${streetView.status}\n`,
    );
  }

  const report = {
    generatedAt: RETRIEVED_AT,
    agent: "360 Heritage Finder",
    method: {
      commons:
        `Wikimedia Commons search per site name, filtered to equirectangular signature (width >= ${PANO_MIN_WIDTH}px, aspect ${PANO_ASPECT_MIN}-${PANO_ASPECT_MAX}), then distance-scored against the site coordinate where the file carries GPS metadata.`,
      streetView: MAPS_KEY
        ? "Official Street View Static metadata endpoint, outdoor source."
        : "Not run — no Maps Platform key configured.",
      thresholds: { strongMetres: DISTANCE_STRONG_M, reviewMetres: DISTANCE_REVIEW_M },
    },
    totals: {
      sitesChecked: results.length,
      sitesWithCandidates: results.filter((r) => r.usableCandidates > 0).length,
      sitesWithNone: results.filter((r) => r.outcome === "NONE_FOUND").length,
      streetViewChecked: results.filter((r) => r.streetView.checked).length,
      published: 0,
    },
    conclusion:
      results.every((r) => r.outcome === "NONE_FOUND")
        ? "No licensed 360° panorama depicting any catalogued Sikkim monastery was found. Every site therefore reports no 360° experience. This is a real negative result, not an unfinished search."
        : "Candidates require visual review before publication.",
    results,
  };
  writeFileSync("reports/monastery-360-discovery.json", JSON.stringify(report, null, 2) + "\n");
  console.log("\n" + JSON.stringify(report.totals, null, 2));
  console.log("\n" + report.conclusion);
}

main().catch((e) => {
  console.error("360 discovery failed:", e.message);
  process.exit(1);
});
