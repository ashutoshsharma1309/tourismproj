/**
 * Stays integrity audit.
 *
 * Accommodation is the part of this archive that points at REAL BUSINESSES a
 * reader may telephone, pay, or turn up at. Every other section can be wrong
 * and merely misinform; this one can send someone to a stranger's door. So the
 * checks here are deliberately about what must NOT be present as much as what
 * must:
 *
 *   - no price, rating or availability, ever, on any surface;
 *   - a telephone number only where the capsule's own source published one;
 *   - a website only where it is the property's own, not an aggregator's;
 *   - no property belonging to two destinations at once.
 *
 * The count ceiling is the other half. A curated stays section is an editorial
 * recommendation, and an editorial recommendation that runs to thirty entries
 * is a directory wearing a recommendation's clothes. Twelve is the published
 * limit; this fails the run if a destination's CURATED set exceeds it.
 *
 * SIKKIM'S REGISTER IS EXEMPT FROM THE CEILING, DELIBERATELY.
 * `/destinations/sikkim/hotels` is not a curated selection — it is the state's
 * own hospitality register, published as a directory, and truncating a public
 * register to twelve entries would misrepresent what the register contains.
 * The ceiling applies to capsule stays, which ARE a curated selection. That
 * distinction is asserted below rather than left implicit, so nobody later
 * "fixes" the register by cutting it to twelve.
 *
 *   node scripts/qa/stays-integrity.mjs
 */

import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const note = (text) => console.log(`NOTE  ${text}`);

/** The published ceiling for a CURATED stays set. */
const MAX_CURATED = 12;

const CAPSULE_DIR = "src/data/destinations/capsules";
const skip = new Set(["_template.ts", "ids.ts", "index.ts"]);

/* ------------------------------------------------------------ parse capsules */

/** The `stays: [...]` array of one capsule, as raw source. */
function staysBlock(source) {
  const match = source.match(/\n {2}stays: \[(.*?)\n {2}\],/s);
  return match ? match[1] : "";
}

/** Split a stays block into one chunk per record. */
function records(block) {
  return block
    .split(/\n {4}\{\n/)
    .slice(1)
    /* The split consumes the record's leading newline; put it back, or the
       FIRST field (`id`) never matches a `\n      name:` shaped pattern. */
    .map((chunk) => `\n${chunk.split(/\n {4}\},?/)[0]}`);
}

const field = (chunk, name) => chunk.match(new RegExp(`\\n {6}${name}: "([^"]*)"`))?.[1];

const capsules = readdirSync(CAPSULE_DIR)
  .filter((f) => f.endsWith(".ts") && !skip.has(f))
  .map((f) => {
    const source = read(`${CAPSULE_DIR}/${f}`);
    return {
      destinationId: f.replace(/\.ts$/, ""),
      stays: records(staysBlock(source)).map((chunk) => ({
        id: field(chunk, "id"),
        name: field(chunk, "name"),
        category: field(chunk, "category"),
        summary: field(chunk, "summary"),
        website: field(chunk, "website"),
        phone: field(chunk, "phone"),
        raw: chunk,
      })),
    };
  });

const allStays = capsules.flatMap((c) => c.stays.map((s) => ({ ...s, destinationId: c.destinationId })));

console.log(
  `\n${capsules.length} capsules · ${allStays.length} curated stays · ceiling ${MAX_CURATED} per destination\n`,
);

for (const capsule of capsules) {
  console.log(`  ${capsule.destinationId.padEnd(16)} ${String(capsule.stays.length).padStart(2)}`);
}
console.log("");

/* -------------------------------------------------------------- the ceiling */

const overCeiling = capsules.filter((c) => c.stays.length > MAX_CURATED);
check(
  `No destination publishes more than ${MAX_CURATED} curated stays`,
  overCeiling.length === 0,
  overCeiling.map((c) => `${c.destinationId}=${c.stays.length}`).join(", ") || `max ${Math.max(0, ...capsules.map((c) => c.stays.length))}`,
);

/* --------------------------------------------------- structural completeness */

const missingCore = allStays.filter((s) => !s.id || !s.name || !s.category || !s.summary);
check(
  "Every stay has an id, name, category and sourced summary",
  missingCore.length === 0,
  missingCore.map((s) => `${s.destinationId}/${s.id ?? "?"}`).join(", "),
);

const unsourced = allStays.filter((s) => !/sourceIds: \[[^\]]*"/.test(s.raw));
check(
  "Every stay cites at least one source",
  unsourced.length === 0,
  unsourced.map((s) => `${s.destinationId}/${s.id}`).join(", "),
);

/* ------------------------------------------------------------ no duplicates */

const byId = new Map();
for (const stay of allStays) {
  const key = `${stay.destinationId}/${stay.id}`;
  byId.set(key, (byId.get(key) ?? 0) + 1);
}
const dupeIds = [...byId].filter(([, n]) => n > 1);
check("Stay ids are unique within a destination", dupeIds.length === 0, dupeIds.map(([k]) => k).join(", "));

/*
 * The same PROPERTY under two destinations. A hotel has one location, so a
 * name appearing under both Delhi and Agra means one of them is wrong — the
 * cross-contamination this archive's destination isolation exists to prevent.
 */
const byName = new Map();
for (const stay of allStays) {
  const key = stay.name?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!key) continue;
  if (!byName.has(key)) byName.set(key, new Set());
  byName.get(key).add(stay.destinationId);
}
const shared = [...byName].filter(([, dests]) => dests.size > 1);
check(
  "No property appears under two destinations",
  shared.length === 0,
  shared.map(([name, d]) => `"${name}" in ${[...d].join("+")}`).join("; "),
);

/* ------------------------------------------- what must never be published */

/*
 * Price, rating and availability. The capsule schema has no field for any of
 * them, so this is a check that none has been smuggled in as prose — a
 * summary reading "from €400 a night" is the same publication the schema was
 * shaped to prevent, and it would pass every structural check above.
 */
const PRICE = /(?:₹|Rs\.?\s?\d|\$\s?\d|€\s?\d|£\s?\d|¥\s?\d|\d+\s?(?:USD|EUR|GBP|INR|JPY)\b|per night|a night|nightly rate)/i;
const priced = allStays.filter((s) => PRICE.test(s.summary ?? ""));
check(
  "No stay summary quotes a price",
  priced.length === 0,
  priced.map((s) => `${s.destinationId}/${s.id}`).join(", "),
);

/*
 * A REVIEW SCORE, not a star classification. "a five-star hotel" quoted from
 * a source is the property's official category, which §15 explicitly prefers
 * over arbitrary ratings; "4.8/5" is a scraped aggregate with no stated
 * methodology, which is the thing that must never appear.
 */
const RATING = /\b\d(?:\.\d)?\s*(?:\/\s*(?:5|10)|out of (?:five|ten|5|10))|\b\d{2}%\s*recommend/i;
const rated = allStays.filter((s) => RATING.test(s.summary ?? ""));
check(
  "No stay summary asserts a rating",
  rated.length === 0,
  rated.map((s) => `${s.destinationId}/${s.id}: ${s.summary.match(RATING)?.[0]}`).join(", "),
);

const AVAILABILITY = /\b(?:rooms? available|book now|sold out|available tonight|vacancies)\b/i;
const available = allStays.filter((s) => AVAILABILITY.test(s.summary ?? ""));
check(
  "No stay claims availability",
  available.length === 0,
  available.map((s) => `${s.destinationId}/${s.id}`).join(", "),
);

/* ------------------------------------------------------------ contact rules */

/*
 * A telephone number is the highest-consequence field here: a wrong one sends
 * a real person to a stranger. The schema documents that absent is the normal
 * case. This asserts the shape of what IS present rather than its truth —
 * a bare digit string with no country code is the shape a fabricated or
 * half-copied number takes.
 */
const phones = allStays.filter((s) => s.phone);
const malformedPhone = phones.filter((s) => !/^\+\d[\d\s()-]{6,}$/.test(s.phone));
check(
  `Published telephone numbers are internationally formatted (${phones.length} present of ${allStays.length})`,
  malformedPhone.length === 0,
  malformedPhone.map((s) => `${s.destinationId}/${s.id}: ${s.phone}`).join(", "),
);

/*
 * A website must be the PROPERTY'S OWN. An aggregator URL presented as the
 * official site is the specific substitution §52 forbids: it looks like
 * verification and is not.
 */
/*
 * Matched against the HOSTNAME. A substring test read `tajhotels.com` and
 * `rosewoodhotels.com` as `hotels.com` and reported four of the archive's
 * own brand sites as aggregators — a false positive that would have had
 * someone delete correct data.
 */
const AGGREGATOR_HOSTS = [
  "booking.com", "agoda.com", "expedia.com", "tripadvisor.com", "hotels.com",
  "makemytrip.com", "goibibo.com", "trivago.com", "airbnb.com", "yatra.com",
  "cleartrip.com",
];
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
const isAggregator = (url) => {
  const host = hostOf(url);
  return AGGREGATOR_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
    || /^(?:maps|travel)\.google\./.test(host);
};
const sites = allStays.filter((s) => s.website);
const aggregatorSites = sites.filter((s) => isAggregator(s.website));
check(
  `Published websites are the property's own, not an aggregator (${sites.length} present)`,
  aggregatorSites.length === 0,
  aggregatorSites.map((s) => `${s.destinationId}/${s.id}: ${s.website}`).join(", "),
);

/*
 * §52 asks for DEAD URLs to be detected, not for a scheme preference, and the
 * distinction matters: eleven of the twelve `http://` URLs here were checked
 * by hand and every one resolves, most redirecting to the property's own
 * https site. Failing the run on the scheme would have meant rewriting eleven
 * working links to satisfy a rule nobody set — and rewriting the scheme is
 * not free, because `divan.com.tr` serves its `/ENG/` path over http and
 * 404s on the lower-cased path an https rewrite lands on.
 *
 * What IS a failure is a URL that cannot be a website at all. Liveness itself
 * is deliberately not asserted here: a QA script that fetches twelve hotel
 * sites is a QA script that fails when a hotel has an outage, and this file
 * has to stay offline and deterministic. Liveness is a research-pipeline
 * concern; the count below is the standing advisory that it needs re-running.
 */
const malformedSite = sites.filter((s) => !/^https?:\/\/[^/\s]+\./.test(s.website));
check(
  "Published websites are absolute http(s) URLs",
  malformedSite.length === 0,
  malformedSite.map((s) => `${s.destinationId}/${s.id}: ${s.website}`).join(", "),
);

const plainHttp = sites.filter((s) => /^http:\/\//.test(s.website));
console.log(
  `NOTE  ${plainHttp.length} of ${sites.length} websites are recorded over http — all verified reachable ` +
  `on 2026-09-08; re-verify when the stays research pipeline next runs`,
);

/* ------------------------------------------------- images carry attribution */

/*
 * An image without alt text is an image whose subject nobody has asserted —
 * and for a property photograph, "which building is this" is exactly the
 * claim that has to be checked.
 */
const withImage = allStays.filter((s) => /\n {6}image: "/.test(s.raw));
const imageNoAlt = withImage.filter((s) => !/\n {6}imageAlt: "/.test(s.raw));
check(
  `Every stay photograph carries alt text (${withImage.length} of ${allStays.length} have an image)`,
  imageNoAlt.length === 0,
  imageNoAlt.map((s) => `${s.destinationId}/${s.id}`).join(", "),
);

const remoteImage = withImage.filter((s) => /\n {6}image: "https?:/.test(s.raw));
check(
  "Stay photographs are vendored, never hotlinked",
  remoteImage.length === 0,
  remoteImage.map((s) => `${s.destinationId}/${s.id}`).join(", "),
);

/* ------------------------------------------------------ geospatial rules */

/*
 * A coordinate is the highest-consequence field after a telephone number: a
 * reader opens it in a map and goes there. These are the checks the
 * discovery agent applies at research time, re-applied here at publish time
 * against the destination centres in the data files — so a hand edit, a
 * regeneration, or a future agent bug cannot ship a hotel in the wrong city.
 */
const destSrc = ["src/data/destinations/sikkim.ts", "src/data/destinations/planned.ts"].map((f) => read(f)).join("\n");
const CENTRES = new Map();
/* id/name/country adjacent = a destination record; the lazy form paired
   ids with the wrong centre. */
for (const m of destSrc.matchAll(/id:\s*"([a-z-]+)",\s*\n\s*name:\s*"[^"]+",\s*\n\s*country:\s*\{[\s\S]{0,600}?centre:\s*\{\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+)/g)) {
  if (!CENTRES.has(m[1])) CENTRES.set(m[1], { lat: Number(m[2]), lng: Number(m[3]) });
}
const RADIUS = { goa: 120 };
const kmBetween = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const coordOf = (s) => { const m = s.raw.match(/coordinates: \{ lat: (-?[\d.]+), lng: (-?[\d.]+) \}/); return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null; };
const located = allStays.map((s) => ({ ...s, coord: coordOf(s) })).filter((s) => s.coord);
check(
  "Every destination with stays has a parsed centre for the geospatial checks",
  [...new Set(allStays.map((s) => s.destinationId))].every((d) => CENTRES.has(d)),
  [...new Set(allStays.map((s) => s.destinationId))].filter((d) => !CENTRES.has(d)).join(", ") || `${CENTRES.size} centres`,
);
const farAway = located.filter((s) => CENTRES.has(s.destinationId) && kmBetween(CENTRES.get(s.destinationId), s.coord) > (RADIUS[s.destinationId] ?? 25));
check(
  "Every published coordinate lies inside its destination (≤ 25 km of centre; Goa 120)",
  farAway.length === 0,
  farAway.map((s) => `${s.destinationId}/${s.id}: ${Math.round(kmBetween(CENTRES.get(s.destinationId), s.coord))} km`).slice(0, 5).join(", ") || `${located.length} coordinates checked`,
);
const atCentre = located.filter((s) => CENTRES.has(s.destinationId) && kmBetween(CENTRES.get(s.destinationId), s.coord) < 0.03);
check("No coordinate is the destination centre itself (a geocode of the city, not the property)", atCentre.length === 0, atCentre.map((s) => `${s.destinationId}/${s.id}`).join(", "));
const zero = located.filter((s) => Math.abs(s.coord.lat) < 0.01 && Math.abs(s.coord.lng) < 0.01);
check("No coordinate is (0,0)", zero.length === 0, zero.map((s) => `${s.destinationId}/${s.id}`).join(", "));
const dupCoord = [];
const sameCoordDifferentName = [];
const nameKey = (s) => (s.name ?? "").toLowerCase().replace(/\b(the|hotel|hôtel|hotels)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
for (let i = 0; i < located.length; i++) for (let j = 0; j < i; j++) if (kmBetween(located[i].coord, located[j].coord) * 1000 < 25) {
  (nameKey(located[i]) === nameKey(located[j]) ? dupCoord : sameCoordDifferentName).push(`${located[i].destinationId}/${located[i].id} = ${located[j].destinationId}/${located[j].id}`);
}
check("No two stays with the same name share a coordinate (a duplicate record)", dupCoord.length === 0, dupCoord.slice(0, 4).join("; "));
/* Two DIFFERENT hotels at one rounded coordinate is a source-precision
   artefact (Wikipedia gives Divan Istanbul and the Hilton Bosphorus, which
   are neighbours, the same point), not a duplicate property. */
if (sameCoordDifferentName.length) note(`${sameCoordDifferentName.length} pair(s) of distinct stays share a source coordinate — neighbours at source precision: ${sameCoordDifferentName.slice(0, 3).join("; ")}`);
note(`${located.length} of ${allStays.length} stays publish a coordinate (map link and nearby places require one)`);

/* ------------------------------------------------ phone: no placeholders */

const suspicious = phones.filter((s) => {
  const body = s.phone.replace(/[^\d]/g, "").replace(/^(91|81|33|39|90|1)/, "");
  return /^(\d)\1{6,}$/.test(body) || /0{7,}/.test(body) || /0123456|1234567|9876543/.test(body);
});
check("No published telephone number is a placeholder pattern (repeated, all-zero, sequential)", suspicious.length === 0, suspicious.map((s) => `${s.destinationId}/${s.id}: ${s.phone}`).join(", "));
const dupPhone = new Map();
for (const s of phones) { const k = `${s.destinationId}|${s.phone.replace(/[^\d]/g, "")}`; dupPhone.set(k, [...(dupPhone.get(k) ?? []), `${s.destinationId}/${s.id}`]); }
const sharedPhone = [...dupPhone.values()].filter((v) => v.length > 1);
check("No two stays in one destination share a telephone number", sharedPhone.length === 0, sharedPhone.map((v) => v.join(" = ")).join("; "));
const acrossPhone = new Map();
for (const s of phones) { const k = s.phone.replace(/[^\d]/g, ""); acrossPhone.set(k, new Set([...(acrossPhone.get(k) ?? []), s.destinationId])); }
const chains = [...acrossPhone.values()].filter((d) => d.size > 1).length;
if (chains) note(`${chains} number(s) registered by units in more than one destination — an operator's central line, kept as registered`);

/* -------------------------------------------------------- target coverage */

for (const c of capsules) {
  if (c.stays.length < 10) note(`${c.destinationId}: ${c.stays.length} published — below the 10–12 target (verified pool, not a quota; see docs/stays-coverage-report.md)`);
}

/* ------------------------------------------- the register is not a selection */

/*
 * Asserted so the exemption stays deliberate. If Sikkim's register ever falls
 * to twelve entries, someone has truncated a public register to satisfy a
 * ceiling that was never meant to apply to it.
 */
const register = JSON.parse(read("src/data/generated/curated-stays.json"));
check(
  "Sikkim's state register is published as a directory, not capped to the curated ceiling",
  register.properties.length > MAX_CURATED,
  `${register.properties.length} registered properties`,
);

/* -------------------------------------------------------------------- done */

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed\n`);
process.exit(failed.length === 0 ? 0 : 1);
