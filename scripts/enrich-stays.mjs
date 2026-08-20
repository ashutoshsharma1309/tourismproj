/**
 * Enrich the state hotel register with OpenStreetMap facts.
 *
 * WHY THIS EXISTS
 * ---------------
 * The register publishes a name, an address and a registration number, and no
 * coordinate. An earlier pass concluded coordinates were unobtainable because
 * Nominatim's *search* endpoint returned nothing for twelve sample properties.
 * That was the wrong test: searching for a property by name is not the same as
 * asking OSM what accommodation it holds inside Sikkim. Overpass answers the
 * second question, and it knows 137 accommodation objects in the state — 126
 * named, with real coordinates, 14 carrying a website and 28 a telephone.
 *
 * ENTITY RESOLUTION IS DELIBERATELY CONSERVATIVE
 * ----------------------------------------------
 * Matching on name alone produced obvious errors: "Sonam Home Stay" collapsed
 * onto "M/s Sonam Delek", two different properties. So a match must also agree
 * on district, computed from the OSM coordinate rather than taken on trust.
 * Six candidates matched by name and were REJECTED because their coordinates
 * put them in a different district from the register entry.
 *
 * Two confidence tiers survive:
 *   high    — the normalised names are identical and the districts agree
 *   medium  — one name contains the other and the districts agree
 *
 * Medium is surfaced in the UI as needing review rather than presented as
 * settled. Nothing is merged on name similarity alone.
 *
 *   node scripts/enrich-stays.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const osm = JSON.parse(readFileSync("reports/osm-accommodation-sikkim.json", "utf8"))
  .elements.filter((e) => e.tags?.name);
const register = JSON.parse(readFileSync("src/data/generated/registered-hotels.json", "utf8"));

/* Words that describe the kind of property rather than identify it. Stripping
   them is what lets "M/s.Mintokling Guest House" meet "Mintokling Guesthouse". */
const GENERIC =
  /\b(hotel|resort|residency|retreat|guest|house|guesthouse|home|stay|homestay|lodge|inn|the|and|of|m\/s|ms)\b/gi;
const norm = (s) => s.toLowerCase().replace(GENERIC, " ").replace(/[^a-z0-9]/g, "");

/* District centres, used only to decide which district a coordinate falls
   nearest to — never published as a property's own location. */
const DISTRICT_CENTRES = {
  Gangtok: [27.3314, 88.6138],
  Gyalshing: [27.2833, 88.2667],
  Namchi: [27.1675, 88.3639],
  Mangan: [27.509, 88.522],
  Soreng: [27.1667, 88.2333],
  Pakyong: [27.2333, 88.5833],
};

/** Destinations a visitor actually measures a stay against. */
const LANDMARKS = [
  { key: "bagdogra", label: "Bagdogra Airport", lat: 26.6812, lng: 88.3286 },
  { key: "pakyong", label: "Pakyong Airport", lat: 27.2255, lng: 88.586 },
  { key: "njp", label: "New Jalpaiguri station", lat: 26.7271, lng: 88.3953 },
  { key: "mgmarg", label: "M.G. Marg, Gangtok", lat: 27.3283, lng: 88.6138 },
];

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
function haversineKm(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const nearestDistrict = (lat, lng) =>
  Object.entries(DISTRICT_CENTRES)
    .map(([name, [a, b]]) => [name, haversineKm(lat, lng, a, b)])
    .sort((x, y) => x[1] - y[1])[0][0];

const bySlug = new Map();
let rejected = 0;

for (const el of osm) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) continue;

  const key = norm(el.tags.name);
  if (key.length < 4) continue;
  const district = nearestDistrict(lat, lng);

  const exact = register.hotels.filter((h) => norm(h.name) === key);
  let match = null;
  let confidence = null;

  if (exact.length) {
    const sameDistrict = exact.find((h) => h.district === district);
    if (sameDistrict) {
      match = sameDistrict;
      confidence = "high";
    } else {
      rejected++;
      continue;
    }
  } else {
    const near = register.hotels
      .filter((h) => h.district === district)
      .find((h) => {
        const rk = norm(h.name);
        return rk.length >= 6 && key.length >= 6 && (rk.includes(key) || key.includes(rk));
      });
    if (near) {
      match = near;
      confidence = "medium";
    }
  }
  if (!match) continue;

  /* Straight-line distance, rounded to the kilometre. The roads through this
     terrain are nothing like straight, so a decimal place here would be a
     precision the number does not have — the UI says "approx." for the same
     reason. */
  const distances = Object.fromEntries(
    LANDMARKS.map((l) => [l.key, Math.round(haversineKm(lat, lng, l.lat, l.lng))]),
  );

  const tags = el.tags;
  bySlug.set(match.slug, {
    slug: match.slug,
    osmId: `${el.type}/${el.id}`,
    osmName: tags.name,
    confidence,
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lng.toFixed(5)),
    propertyType: tags.tourism ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    stars: tags.stars ?? null,
    rooms: tags.rooms ? Number(tags.rooms) : null,
    distancesKm: distances,
  });
}

const rows = [...bySlug.values()];
writeFileSync(
  "src/data/generated/stay-enrichment.json",
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: {
        name: "OpenStreetMap contributors, via the Overpass API",
        url: "https://www.openstreetmap.org/copyright",
        licence: "ODbL 1.0",
        query: 'area["ISO3166-2"="IN-SK"]; node/way[tourism~hotel|guest_house|hostel|motel|apartment|chalet]',
      },
      landmarks: LANDMARKS,
      note:
        "Coordinates, websites and telephone numbers come from OpenStreetMap and are matched to the state register only where the district also agrees. Distances are straight-line from those coordinates and are labelled approximate. Nothing here is inferred from a name alone.",
      matched: rows.length,
      rejectedOnDistrict: rejected,
      rows,
    },
    null,
    2,
  )}\n`,
);

const high = rows.filter((r) => r.confidence === "high").length;
process.stdout.write(
  `matched ${rows.length} of ${osm.length} OSM properties to the register\n` +
    `  high confidence   ${high}\n` +
    `  medium confidence ${rows.length - high}\n` +
    `  rejected (district disagreed) ${rejected}\n` +
    `  with website ${rows.filter((r) => r.website).length}   with phone ${rows.filter((r) => r.phone).length}\n`,
);
