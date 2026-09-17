/**
 * Propose MORE places to catalogue for a destination — Phase D.
 *
 * WHAT THIS IS
 * ------------
 * A search, not a source of facts. For each destination it asks Wikipedia
 * which articles carry coordinates near that destination's own registry
 * centre, asks Wikidata what each of those things IS, and prints the ones
 * that map onto the capsule category vocabulary. Nothing it writes asserts
 * anything about the world; it proposes pages for `plan.mjs` to name, and
 * `retrieve.mjs` then reads them and records what came back.
 *
 * WHY GEOSEARCH AND NOT A CATEGORY
 * --------------------------------
 * "Category:Tourist attractions in Delhi" is maintained by hand and mixes a
 * fort with a shopping mall and a suburb. Coordinates plus Wikidata's own
 * "instance of" are two structured facts, and the distance check is the one
 * that matters here: an earlier phase catalogued a Madurai museum whose
 * article turned out to be Delhi's, because the title matched and nobody
 * measured. Every candidate below is within MAX_KM of the destination centre
 * BY ITS OWN PUBLISHED COORDINATE.
 *
 * WHAT IT REFUSES TO PROPOSE
 * --------------------------
 *   - anything already planned (by title or by slug)
 *   - disambiguation pages and list articles
 *   - a thing whose Wikidata type is not a visitable kind of place: a
 *     neighbourhood, a road, a company, a person, a river basin
 *   - an article too short to say anything: under MIN_CHARS of intro prose
 *
 *   node scripts/capsules/discover-places.mjs [destinationId…] [--per 14]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { PLAN } from "./plan.mjs";

const WIKI = "https://en.wikipedia.org/w/api.php";
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const UA = "TerraStory/1.0 (cultural tourism archive; contact via repository)";
/*
 * A day trip from the destination: Fatehpur Sikri is 37 km from Agra. Raise
 * it with DISCOVER_MAX_KM for a city whose catalogued places are sparse
 * nearby — Sikkim, the reference archive, spans a whole state.
 */
const MAX_KM = Number(process.env.DISCOVER_MAX_KM ?? 45);
const MIN_CHARS = 250;
const PER_DESTINATION = 14;

/**
 * Wikidata type → the capsule's own category vocabulary and the planner's
 * interest themes. A type that is not here is not proposed, which is why the
 * list is long and dull: it is the whole filter.
 */
/**
 * A thing's kind is read from the ENGLISH LABEL of its Wikidata "instance of"
 * type, not from a list of ids typed from memory. The labels are fetched and
 * cached; these rules then map them onto the capsule's category vocabulary.
 * Order matters — the first rule that matches wins.
 */
const CATEGORY_RULES = [
  [/stepwell|step-well|baoli|baori/, "Stepwell", ["heritage", "architecture", "history"]],
  [/gurdwara/, "Gurdwara", ["sacred", "heritage", "architecture"]],
  [/synagogue/, "Synagogue", ["sacred", "heritage", "architecture"]],
  [/mosque|masjid|idgah/, "Mosque", ["sacred", "architecture", "heritage"]],
  [/dargah|sufi shrine|shrine/, "Shrine", ["sacred", "heritage"]],
  [/church|cathedral|basilica|chapel/, "Church", ["sacred", "architecture", "heritage"]],
  [/monastery|vihara|gompa/, "Monastery", ["sacred", "heritage", "architecture"]],
  [/temple|mandir|devasthana/, "Temple", ["sacred", "architecture", "heritage"]],
  [/tomb|mausoleum|cenotaph|chhatri/, "Mausoleum", ["heritage", "architecture", "history"]],
  [/palace|haveli|mahal/, "Palace", ["heritage", "architecture", "history"]],
  [/fort|citadel|fortification|bastion/, "Fort", ["heritage", "architecture", "history"]],
  [/museum|art gallery/, "Museum", ["museums", "heritage", "history"]],
  [/library/, "Library", ["museums", "history", "culture"]],
  [/observatory/, "Observatory", ["history", "architecture"]],
  [/ghat/, "Ghat", ["sacred", "heritage", "local"]],
  [/botanical garden/, "Botanical garden", ["nature", "local"]],
  [/zoo|aquarium/, "Zoo", ["nature", "local"]],
  [/garden|park(?!ing)/, "Garden", ["nature", "local"]],
  [/lake|reservoir|tank|stepped pond|waterfall/, "Lake", ["nature", "local"]],
  [/beach/, "Beach", ["nature", "local"]],
  [/island/, "Island", ["nature", "local"]],
  [/hill|mountain|peak|plateau/, "Hill", ["nature", "local"]],
  [/cave|rock-cut/, "Cave", ["heritage", "history", "nature"]],
  [/market|bazaar|bazar/, "Market", ["local", "culture"]],
  [/theatre|opera house|concert hall/, "Theatre", ["culture", "architecture"]],
  [/university|college|institute|school of/, "Institute", ["history", "architecture"]],
  [/gate(?:way)?|arch\b/, "Monument", ["heritage", "architecture", "history"]],
  [/memorial|cenotaph/, "Memorial", ["heritage", "history"]],
  [/monument|obelisk|statue|column/, "Monument", ["heritage", "history", "architecture"]],
  [/archaeological site|heritage site|world heritage|historic site|ruins/, "Heritage site", ["heritage", "architecture", "history"]],
  [/tower|minaret|lighthouse/, "Monument", ["heritage", "architecture", "history"]],
  [/bridge/, "Bridge", ["architecture", "heritage"]],
  [/planetarium/, "Museum", ["museums", "history"]],
];

/**
 * Kinds that are NOT proposed whatever else they also are: a travel archive
 * catalogues places whose story is cultural. A neighbourhood, a hospital or a
 * company has a page, not a heritage.
 */
const REFUSED = /settlement|neighbourhood|neighborhood|suburb|village|town\b|city\b|district|road|street|highway|railway station|metro station|airport|hospital|clinic|company|business|organization|organisation|stadium|cinema|multiplex|shopping mall|hotel|restaurant|school\b|river|canal|constituency|ward\b|census|human|family|government agency|political|bank\b|office building|apartment|residential/;

function categoryFor(labels) {
  if (labels.some((label) => REFUSED.test(label))) {
    /* Refused only when nothing cultural also applies: "Red Fort" is both a
       fort and a tourist attraction in a city. */
    const cultural = labels.some((label) => CATEGORY_RULES.some(([pattern]) => pattern.test(label)));
    if (!cultural) return null;
  }
  for (const [pattern, category, themes] of CATEGORY_RULES) {
    if (labels.some((label) => pattern.test(label))) return { category, themes };
  }
  return null;
}

const args = process.argv.slice(2);
const perIndex = args.indexOf("--per");
const per = perIndex > -1 ? Number(args[perIndex + 1]) : PER_DESTINATION;
const only = args.filter((value, index) => !value.startsWith("--") && index !== perIndex + 1);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wikidata type id → English label, cached across destinations and runs. */
const LABEL_CACHE = ".data/wikidata-type-labels.json";
const typeLabels = new Map(Object.entries(existsSync(LABEL_CACHE) ? JSON.parse(readFileSync(LABEL_CACHE, "utf8")) : {}));

/*
 * One request at a time, spaced. Wikimedia's anonymous API limit is low and
 * this job is not urgent; a 429 means back off for a minute, not hammer
 * harder. Measured: bursts of 20-page batches hit 429 within seconds.
 */
/* Slow enough to stay under the anonymous API limit: a 429 costs a minute. */
const PACE_MS = 6000;
/**
 * Points to search from. Geosearch covers 10 km per call and returns the
 * nearest fifty, so one call sees a corner of a city; these rings tile the
 * area out to MAX_KM. Raising the radius without raising the ring was a bug:
 * the far places were never asked for.
 */
const RING = (() => {
  const points = [[0, 0]];
  const stepDegrees = 0.11;
  const rings = Math.max(1, Math.round(MAX_KM / 111 / stepDegrees));
  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = stepDegrees * ring;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI / 4) * i;
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
  }
  return points;
})();
const slots = new Map();
async function paced(host) {
  const now = Date.now();
  const next = slots.get(host) ?? 0;
  const wait = Math.max(0, next - now);
  slots.set(host, Math.max(now, next) + PACE_MS);
  if (wait > 0) await sleep(wait);
}

async function api(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries({ format: "json", ...params })) {
    url.searchParams.set(key, String(value));
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await paced(url.host);
    let response;
    try {
      response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    } catch (error) {
      /* A dropped connection is not an answer; wait and ask again. */
      console.log(`  (network error: ${(error instanceof Error ? error.message : String(error)).slice(0, 60)})`);
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    if (response.status === 429) {
      const backoff = 60_000 * (attempt + 1);
      console.log(`  (rate limited, waiting ${backoff / 1000}s)`);
      await sleep(backoff);
      continue;
    }
    if (response.status >= 500) {
      await sleep(5_000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
  }
  throw new Error(`gave up after retries on ${url}`);
}

/** Straight-line kilometres, for the distance check. */
function km(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const slug = (title) =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/**
 * Fewest requests that can answer the question, because Wikimedia's anonymous
 * limit is the binding constraint:
 *
 *   1. one geosearch (500 results, 10 km — its maximum radius)
 *   2. Wikidata types in batches of 45, on its own host and budget
 *   3. article SIZE in batches of 50 (revisions), as a cheap proxy for prose
 *   4. intro prose only for the survivors, 20 at a time
 */
async function discover(destinationId, centre, planned) {
  /* Geosearch's radius maxes out at 10 km AND an anonymous caller gets 50
     results per point, so one call returns a corner of a city. Thirteen
     points tile it: the centre, a close ring, and a wider one. */
  const seen = new Map();
  for (const [dLat, dLng] of RING) {
    const ring = await api(WIKI, {
      action: "query",
      list: "geosearch",
      gscoord: `${centre.lat + dLat}|${centre.lng + dLng}`,
      gsradius: 10000,
      gslimit: 50,
      gsnamespace: 0,
    });
    for (const page of ring.query?.geosearch ?? []) if (!seen.has(page.pageid)) seen.set(page.pageid, page);
  }

  /*
   * City categories were tried here and removed: their members without a
   * coordinate cannot pass the distance check, and the ones with a coordinate
   * are already in the geosearch above. Twelve requests per destination for
   * nothing, against an API that rate-limits hard.
   */

  const candidates = [...seen.values()]
    .map((page) => ({
      ...page,
      distance: page.lat !== undefined ? km(centre, { lat: page.lat, lng: page.lon }) : null,
    }))
    /*
     * A COORDINATE IS NOT OPTIONAL.
     * Category membership was tried and proposed Chittor Fort and the Imphal
     * Peace Museum for Agra, because "Category:Museums in Uttar Pradesh" and
     * its relatives are maintained loosely. The distance check is the only
     * thing that has ever caught that class of error in this repository.
     */
    .filter((page) => page.distance !== null && page.distance <= MAX_KM)
    .filter((page) => !planned.titles.has(page.title) && !planned.ids.has(slug(page.title)))
    .filter((page) => !/^(List of|Timeline of|Outline of)/i.test(page.title))
    .filter((page) => {
      /* "Nagina Masjid, Agra Fort" and "Diwan-i-Khas (Red Fort)" are parts of
         a place already catalogued; the capsule holds places, not their rooms. */
      const qualifier = /[(,]\s*([^),]+)\)?\s*$/.exec(page.title)?.[1]?.trim();
      return !qualifier || ![...planned.titles].some((title) => title.includes(qualifier));
    });
  if (candidates.length === 0) return [];
  const stage = { geosearch: seen.size, candidates: candidates.length };

  /* What each thing IS. Wikidata ids come from the page props, so one small
     Wikipedia call, then Wikidata's own host. */
  const withItems = [];
  for (let i = 0; i < candidates.length; i += 50) {
    const batch = candidates.slice(i, i + 50);
    const data = await api(WIKI, {
      action: "query",
      prop: "pageprops|revisions",
      ppprop: "disambiguation|wikibase_item",
      rvprop: "size",
      pageids: batch.map((page) => page.pageid).join("|"),
    });
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.pageprops?.disambiguation !== undefined) continue;
      const item = page.pageprops?.wikibase_item;
      const size = page.revisions?.[0]?.size ?? 0;
      /* Roughly 4 kB of wikitext before an article has an intro worth quoting. */
      if (!item || size < 1200) continue;
      const source = batch.find((entry) => entry.pageid === page.pageid);
      if (source) withItems.push({ ...source, wikidata: item, size });
    }
  }

  stage.sized = withItems.length;
  const withTypes = [];
  for (let i = 0; i < withItems.length; i += 45) {
    const batch = withItems.slice(i, i + 45);
    const data = await api(WIKIDATA, {
      action: "wbgetentities",
      ids: batch.map((entry) => entry.wikidata).join("|"),
      props: "claims",
    });
    for (const entry of batch) {
      const claims = data.entities?.[entry.wikidata]?.claims?.P31 ?? [];
      const types = claims.map((claim) => claim.mainsnak?.datavalue?.value?.id).filter((id) => typeof id === "string");
      if (types.length > 0) withTypes.push({ ...entry, types });
    }
  }

  const unknown = [...new Set(withTypes.flatMap((entry) => entry.types))].filter((id) => !typeLabels.has(id));
  for (let i = 0; i < unknown.length; i += 45) {
    const batch = unknown.slice(i, i + 45);
    const data = await api(WIKIDATA, {
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "labels",
      languages: "en",
    });
    for (const id of batch) {
      typeLabels.set(id, (data.entities?.[id]?.labels?.en?.value ?? "").toLowerCase());
    }
  }

  stage.typed = withTypes.length;
  const typed = [];
  for (const entry of withTypes) {
    const labels = entry.types.map((id) => typeLabels.get(id) ?? "").filter(Boolean);
    const match = categoryFor(labels);
    if (!match) continue;
    typed.push({ ...entry, category: match.category, themes: match.themes, labels });
  }

  stage.classified = typed.length;
  /* Prose for the best-sized survivors only. */
  const shortlist = typed.sort((a, b) => b.size - a.size).slice(0, per * 4);
  const proposals = [];
  for (let i = 0; i < shortlist.length; i += 20) {
    const batch = shortlist.slice(i, i + 20);
    const data = await api(WIKI, {
      action: "query",
      prop: "extracts",
      exintro: 1,
      explaintext: 1,
      exlimit: "max",
      pageids: batch.map((page) => page.pageid).join("|"),
    });
    for (const page of Object.values(data.query?.pages ?? {})) {
      const extract = (page.extract ?? "").trim();
      if (extract.length < MIN_CHARS) continue;
      const entry = batch.find((candidate) => candidate.pageid === page.pageid);
      if (!entry) continue;
      proposals.push({
        id: slug(entry.title),
        title: entry.title,
        category: entry.category,
        themes: entry.themes,
        distanceKm: entry.distance === null ? null : Math.round(entry.distance * 10) / 10,
        chars: extract.length,
      });
    }
  }

  stage.prose = proposals.length;
  if (process.env.DISCOVER_DEBUG) {
    console.log(`  stages: ${JSON.stringify(stage)}`);
    const rejected = withTypes.filter((entry) => !typed.some((t) => t.pageid === entry.pageid));
    console.log(`  unclassified (${rejected.length}):`);
    for (const entry of rejected.slice(0, 25)) {
      console.log(`    ${entry.title} [${entry.types.map((id) => typeLabels.get(id)).join(" / ")}]`);
    }
  }
  return proposals.sort((a, b) => b.chars - a.chars).slice(0, per);
}

const registry = await import("../../src/lib/destinations/registry.ts").catch(() => null);

async function centreFor(destinationId) {
  /* The registry is TypeScript; read the capsule's own retrieved coordinates
     instead when it cannot be imported from plain node. */
  if (registry) {
    const found = registry.getDestination(destinationId);
    if (found) return { lat: found.geography.centre.lat, lng: found.geography.centre.lng };
  }
  const { default: capsule } = await import(`../../.data/capsules/${destinationId}.json`, { with: { type: "json" } });
  const place = (capsule.places ?? []).find((entry) => entry.coordinates);
  if (!place) throw new Error(`no centre for ${destinationId}`);
  return place.coordinates;
}

const destinations = PLAN.filter((entry) => (only.length === 0 ? true : only.includes(entry.id)));
/* Resume: a destination already proposed for is skipped unless --force. */
const PROPOSALS = ".data/place-proposals.json";
/*
 * Always start from what is on disk. `--force` re-runs the destinations NAMED
 * on the command line and replaces only those entries — an earlier version
 * emptied the whole file and threw away every destination already done.
 */
const output = existsSync(PROPOSALS) ? JSON.parse(readFileSync(PROPOSALS, "utf8")) : {};
mkdirSync(".data", { recursive: true });
for (const entry of destinations) {
  const forced = args.includes("--force") && only.includes(entry.id);
  if (output[entry.id] && !forced) {
    console.log(`${entry.id.padEnd(13)} ${String(output[entry.id].length).padStart(3)} proposals (already done)`);
    continue;
  }
  const planned = {
    titles: new Set(entry.places.map((place) => place.title)),
    ids: new Set(entry.places.map((place) => place.id)),
  };
  const centre = await centreFor(entry.id);
  const proposals = await discover(entry.id, centre, planned);
  output[entry.id] = proposals;
  console.log(`${entry.id.padEnd(13)} ${String(proposals.length).padStart(3)} proposals`);
  /* Written as each destination finishes: a crash costs one destination. */
  writeFileSync(PROPOSALS, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(LABEL_CACHE, `${JSON.stringify(Object.fromEntries(typeLabels), null, 0)}\n`);
  for (const proposal of proposals) {
    const where = proposal.distanceKm === null ? "no coordinate" : `${proposal.distanceKm} km`;
    console.log(`  ${proposal.category.padEnd(15)} ${proposal.title} (${where}, ${proposal.chars} chars)`);
  }
  await sleep(500);
}

mkdirSync(".data", { recursive: true });
writeFileSync(LABEL_CACHE, `${JSON.stringify(Object.fromEntries(typeLabels), null, 0)}\n`);
writeFileSync(".data/place-proposals.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(`\nWrote .data/place-proposals.json (${Object.values(output).flat().length} proposals)`);
