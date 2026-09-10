/**
 * Stay discovery + verification agent — the step that selects `.data/stays-final.json`.
 *
 * WHAT THIS RESTORES, AND WHAT IT ADDS
 * ------------------------------------
 * The first version of this script read `Category:Hotels in <city>` on English
 * Wikipedia and capped each destination at eight. That found 98 candidates for
 * New York and none at all for Kyoto, Varanasi, Agra or Hyderabad — the
 * categories are simply empty there — and the cap left Paris publishing 8 of
 * 35. The script was lost; this is its replacement, and it changes three things:
 *
 *   1. DISCOVERY reads the category AND Wikipedia's search index for articles
 *      carrying `{{Infobox hotel}}` that mention the destination, so a hotel
 *      with an article but no category still surfaces. Kyoto also reads
 *      `Category:Ryokan`. Existing candidates and everything already
 *      published are kept as candidates too, so nothing is silently lost.
 *
 *   2. VERIFICATION is per field, against structured sources, and recorded:
 *        - identity: the article's Wikidata item exists and has an enwiki link;
 *        - location: P625 exists, is inside the destination (≤ RADIUS_KM of
 *          the registry centre), is not (0,0), is not the centre itself, and
 *          is not another candidate's coordinate;
 *        - website: P856, and the host answers (2xx/3xx/403/405 count —
 *          hotel sites block bots; DNS failure or 404 does not);
 *        - phone: P1329, E.164-shaped, country code matches the destination,
 *          not a placeholder (all-zero, repeated, sequential);
 *        - image: P18, and Commons reports a free licence (CC0 / PD / CC BY /
 *          CC BY-SA; never NC, ND or ©) with a width;
 *        - type: P31, resolved to its English label;
 *        - address: P6375 where published.
 *      Nothing is inferred. A field a source does not publish is absent.
 *
 *   3. SELECTION keeps the ≤ MAX best-DOCUMENTED verified candidates — scored
 *      by which verified fields they carry — with everything currently
 *      published ranked first so existing ids and pages stay stable. "Best
 *      documented" is the whole rule; it is stated in the coverage table.
 *
 * Statuses: PASS (identity + location verified; publishable), NEEDS_REVIEW
 * (publishable, but a soft field — website, phone, image — failed and is
 * DROPPED from the record, with the reason recorded), FAIL (not publishable:
 * no item, no coordinate, outside the destination, or a duplicate).
 *
 * Sikkim is skipped on purpose: its stays come from the state's own
 * hospitality register, a Tier-1 government source this pipeline cannot
 * improve on.
 *
 *   node scripts/capsules/discover-stays.mjs                 # dry run, all
 *   node scripts/capsules/discover-stays.mjs --only kyoto,agra
 *   node scripts/capsules/discover-stays.mjs --write         # writes stays-final + verification
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const UA = "TerraStory/1.0 (SIH 2026 tourism research; stays verification; contact via repository)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
/* `--only=a,b` or `--only a,b`. With no `--only` at all this is empty — the
   first version fell back to args[0], so `--from-audit` alone became a
   destination filter matching nothing and published nothing. */
const onlyIdx = args.indexOf("--only");
const ONLY = (args.find((a) => a.startsWith("--only="))?.split("=")[1] ?? (onlyIdx >= 0 ? args[onlyIdx + 1] : "") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const MAX = 12;
/* 25 km from a city's centre keeps every borough of New York and every
   arrondissement of Paris and excludes the next city: at 40 km the Kyoto run
   admitted the Nara Hotel, which is in Nara. Goa is a state and its documented
   hotels lie along 100 km of coast. */
const RADIUS_DEFAULT_KM = 25;
const RADIUS_KM_BY_ID = { goa: 120, sikkim: 150 };
const radiusFor = (dest) => RADIUS_KM_BY_ID[dest.id] ?? RADIUS_DEFAULT_KM;
const DUP_M = 25;

/*
 * Wikidata's query service is the one source that finds a hotel by WHERE IT
 * IS rather than by what its article is called or categorised as — which is
 * how Kyoto's ryokans surface when `Category:Hotels in Kyoto` is empty. It is
 * throttled to one request a minute today, so calls are paced globally.
 */
let lastSparqlAt = 0;
async function sparql(query) {
  const wait = 65000 - (Date.now() - lastSparqlAt);
  if (wait > 0) await sleep(wait);
  lastSparqlAt = Date.now();
  const url = "https://query.wikidata.org/sparql?" + new URLSearchParams({ query, format: "json" });
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
    if (res.status === 429) { await sleep(70000); lastSparqlAt = Date.now(); continue; }
    if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
    return (await res.json()).results.bindings;
  }
  throw new Error("SPARQL throttled three times");
}
async function discoverSparql(dest) {
  const q = `SELECT DISTINCT ?title WHERE {
    SERVICE wikibase:around { ?h wdt:P625 ?c . bd:serviceParam wikibase:center "Point(${dest.centre.lng} ${dest.centre.lat})"^^geo:wktLiteral ; wikibase:radius "${radiusFor(dest)}" . }
    ?h wdt:P31/wdt:P279* wd:Q27686 .
    ?article schema:about ?h ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
  } LIMIT 400`;
  /* P279* below Q27686 reaches Edo post-stations and historic inns; those
     fail the per-item type check later. The limit is high so real hotels are
     not truncated behind them. */
  try {
    return (await sparql(q)).map((r) => r.title.value);
  } catch (e) {
    console.log(`  (sparql skipped for ${dest.id}: ${e.message})`);
    return [];
  }
}

/* ------------------------------------------------------------ registry */

/** The destination records are TypeScript data files (`registry.ts` only
    imports them); read the fields this script needs. Abort rather than guess
    if any destination lacks a centre. */
const registrySrc = ["src/data/destinations/sikkim.ts", "src/data/destinations/planned.ts"]
  .filter((f) => existsSync(f)).map((f) => readFileSync(f, "utf8")).join("\n");
const DESTINATIONS = [];
/* id, name and country must be ADJACENT lines — that is the shape of a
   destination record and of nothing else in these files. A lazy match across
   the file paired `id: "buddhist-tradition"` (a Sikkim tradition record) with
   Sikkim's own centre and ran discovery on it. */
for (const m of registrySrc.matchAll(/id:\s*"([a-z-]+)",\s*\n\s*name:\s*"([^"]+)",\s*\n\s*country:\s*\{\s*code:\s*"([A-Z]{2})"[\s\S]{0,600}?centre:\s*\{\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+)/g)) {
  DESTINATIONS.push({ id: m[1], name: m[2], country: m[3], centre: { lat: Number(m[4]), lng: Number(m[5]) } });
}
const seen = new Set();
const REGISTRY = DESTINATIONS.filter((d) => (seen.has(d.id) ? false : seen.add(d.id)));
if (REGISTRY.length !== 15) {
  console.error(`Parsed ${REGISTRY.length} destinations (expected 15): ${REGISTRY.map((d) => d.id).join(", ")} — refusing to run.`);
  process.exit(2);
}
const DIAL = { IN: "91", JP: "81", FR: "33", IT: "39", TR: "90", US: "1" };
const EXTRA_CATEGORIES = { kyoto: ["Category:Ryokan"] };

/* --------------------------------------------------------------- http */

/* One request at a time, 400 ms apart, honouring Retry-After. The first
   run overlapped a foreground run and Wikipedia answered 429 until the
   retries ran out — and this function then RETURNED UNDEFINED, which
   surfaced as "cannot read 'query'" three calls later. Exhausted retries now
   throw where they happen. */
let lastCallAt = 0;
async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const gap = 400 - (Date.now() - lastCallAt);
    if (gap > 0) await sleep(gap);
    lastCallAt = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
      continue;
    }
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      await sleep(Math.max(retryAfter * 1000, 5000 * (i + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 80)}`);
    return await res.json();
  }
  throw new Error(`rate-limited ${tries} times: ${url.slice(0, 80)}`);
}
const wp = (params) => getJson("https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params }));
const wd = (params) => getJson("https://www.wikidata.org/w/api.php?" + new URLSearchParams({ format: "json", ...params }));
const commons = (params) => getJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params }));

/** Does the site answer at all? Bot-blocking (403/405) still means the host
    is the property's live site; DNS failure, timeouts and 404/410 do not. */
async function reachable(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; TerraStory-link-check/1.0)" } });
    clearTimeout(t);
    if ([404, 410].includes(res.status)) return { ok: false, status: res.status };
    return { ok: true, status: res.status, final: res.url };
  } catch (e) {
    return { ok: false, status: 0, error: e?.name ?? String(e) };
  }
}

/* ---------------------------------------------------------- discovery */

async function discover(dest) {
  const titles = new Map(); // title -> how found
  const add = (t, how) => { if (t && !/^(List of|Category:|Template:)/.test(t) && !titles.has(t)) titles.set(t, how); };

  const existingFinal = existsSync(".data/stays-final.json") ? JSON.parse(readFileSync(".data/stays-final.json", "utf8"))[dest.id] ?? [] : [];
  for (const t of existingFinal) add(t, "published");
  const existingCands = existsSync(".data/stay-candidates.json") ? JSON.parse(readFileSync(".data/stay-candidates.json", "utf8"))[dest.id] ?? [] : [];
  for (const t of existingCands) add(t, "candidate-pool");

  for (const cat of [`Category:Hotels in ${dest.name}`, ...(EXTRA_CATEGORIES[dest.id] ?? [])]) {
    try {
      const r = await wp({ action: "query", list: "categorymembers", cmtitle: cat, cmlimit: 200, cmnamespace: 0 });
      for (const m of r.query?.categorymembers ?? []) add(m.title, cat);
    } catch { /* category may not exist */ }
    await sleep(250);
  }
  for (const t of await discoverSparql(dest)) add(t, "wikidata:around");

  /*
   * The `{{Infobox hotel}}` full-text search is OFF. It matched the city name
   * anywhere in an article — "Kyoto" returned a Los Angeles DoubleTree — so
   * nearly everything it added failed the location check, at three requests
   * per destination while Wikipedia was rate-limiting. Category members and
   * Wikidata's geospatial index carry the recall.
   */
  for (const term of /** @type {string[]} */ ([])) {
    for (let offset = 0; offset < 150; offset += 50) {
      const r = await wp({ action: "query", list: "search", srsearch: `hastemplate:"Infobox hotel" "${term}"`, srlimit: 50, sroffset: offset, srnamespace: 0 });
      const hits = r.query?.search ?? [];
      for (const h of hits) add(h.title, `search:${term}`);
      if (hits.length < 50) break;
      await sleep(250);
    }
    await sleep(250);
  }
  return titles;
}

/* ------------------------------------------------------- verification */

async function resolveQids(titles) {
  const out = new Map();
  const list = [...titles];
  for (let i = 0; i < list.length; i += 50) {
    const r = await wp({ action: "query", prop: "pageprops", ppprop: "wikibase_item", titles: list.slice(i, i + 50).join("|"), redirects: 1 });
    const redirects = new Map((r.query?.redirects ?? []).map((x) => [x.to, x.from]));
    for (const p of Object.values(r.query?.pages ?? {})) {
      const qid = p.pageprops?.wikibase_item;
      const original = redirects.get(p.title) ?? p.title;
      if (qid) out.set(original, { qid, canonicalTitle: p.title });
    }
    await sleep(250);
  }
  return out;
}

async function entities(qids) {
  const out = new Map();
  for (let i = 0; i < qids.length; i += 40) {
    const r = await wd({ action: "wbgetentities", ids: qids.slice(i, i + 40).join("|"), props: "claims|labels|sitelinks", languages: "en" });
    for (const [id, e] of Object.entries(r.entities ?? {})) out.set(id, e);
    await sleep(300);
  }
  return out;
}
const claimVals = (e, p) => (e?.claims?.[p] ?? []).map((c) => c.mainsnak?.datavalue?.value).filter((v) => v !== undefined);
const firstStr = (e, p) => { const v = claimVals(e, p)[0]; return typeof v === "string" ? v.trim() : null; };

function km(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function checkPhone(raw, country) {
  if (!raw) return { ok: false, reason: "no published number (P1329)" };
  const digits = raw.replace(/[^\d+]/g, "");
  if (!/^\+\d{6,15}$/.test(digits)) return { ok: false, reason: `not E.164-shaped: ${raw}` };
  const body = digits.slice(1);
  if (/^(\d)\1{6,}/.test(body.replace(/^\d{1,3}/, "")) || /0{7,}/.test(body)) return { ok: false, reason: `placeholder pattern: ${raw}` };
  if (/0123456|1234567|9876543/.test(body)) return { ok: false, reason: `sequential digits: ${raw}` };
  const dial = DIAL[country];
  if (dial && !body.startsWith(dial)) return { ok: false, reason: `country code +${body.slice(0, 2)} does not match ${country} (+${dial})` };
  return { ok: true, value: raw, e164: digits };
}

const FREE = /\b(cc0|public domain|pd-|cc[- ]by(?:[- ]sa)?(?:[- ][\d.]+)?)\b/i;
const UNFREE = /\b(nc|nd|non-commercial|no derivatives|all rights reserved|©)\b/i;
async function checkImage(file) {
  if (!file) return { ok: false, reason: "no image (P18)" };
  try {
    const r = await commons({ action: "query", titles: `File:${file}`, prop: "imageinfo", iiprop: "extmetadata|size|url" });
    const page = Object.values(r.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii) return { ok: false, reason: "not on Commons" };
    const md = ii.extmetadata ?? {};
    const lic = md.LicenseShortName?.value ?? "";
    const artist = (md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim();
    if (!lic) return { ok: false, reason: "no licence on Commons" };
    if (UNFREE.test(lic) || !FREE.test(lic)) return { ok: false, reason: `licence not free: ${lic}` };
    if (/cc[- ]by/i.test(lic) && !artist && !md.Attribution?.value) return { ok: false, reason: `${lic} but no author on Commons` };
    if ((ii.width ?? 0) < 800) return { ok: false, reason: `only ${ii.width}px wide` };
    return { ok: true, file, license: lic, artist: artist || null, width: ii.width, height: ii.height, url: ii.url, commonsFilePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}` };
  } catch (e) {
    return { ok: false, reason: `Commons lookup failed: ${e.message}` };
  }
}

/* ------------------------------------------------------------ per dest */

async function processDestination(dest) {
  const titles = await discover(dest);
  const qids = await resolveQids([...titles.keys()]);
  const ents = await entities([...new Set([...qids.values()].map((v) => v.qid))]);

  /* Resolve P31 labels once. */
  const typeIds = [...new Set([...ents.values()].flatMap((e) => claimVals(e, "P31").map((v) => v?.id).filter(Boolean)))];
  const typeEnts = typeIds.length ? await entities(typeIds) : new Map();
  const typeLabel = (id) => typeEnts.get(id)?.labels?.en?.value ?? null;

  /*
   * The article LEAD, per candidate. Wikidata's P31 is thin for heritage
   * hotels — Bissau Palace Hotel is typed "built structure", Raj Mahal
   * "palace", Devigarh "building" — while each article's first sentence says
   * "is a heritage hotel in Jaipur". That sentence is a source statement, so
   * accommodation-ness is accepted from P31 OR the lead, the type label is
   * taken from whichever states it, and a lead that says "former hotel",
   * "closed" or "demolished" fails the record outright (stale detection).
   */
  const leads = new Map();
  const titleList = [...titles.keys()];
  for (let i = 0; i < titleList.length; i += 20) {
    try {
      const r = await wp({ action: "query", prop: "extracts", exintro: 1, explaintext: 1, exlimit: 20, titles: titleList.slice(i, i + 20).join("|"), redirects: 1 });
      const back = new Map((r.query?.redirects ?? []).map((x) => [x.to, x.from]));
      for (const pg of Object.values(r.query?.pages ?? {})) if (pg.extract) leads.set(back.get(pg.title) ?? pg.title, pg.extract.slice(0, 1200));
    } catch { /* leads are advisory input to typing; a failed batch just types by P31 */ }
    await sleep(250);
  }
  /* Past tense is the tell: "was a hotel", "formerly", "closed", "demolished",
     "converted into offices". Present-tense "now the X Hotel" is NOT stale —
     the American Radiator Building is the Bryant Park Hotel today. */
  const STALE = /\b(former hotel|formerly (?:a|an|the) [\w -]{0,30}hotel|was (?:a|an|once) (?:[\w'’,-]+ ){0,4}(?:hotel|inn|guest ?house)\b|closed (?:in|since|down)|was demolished|demolished in|no longer (?:operates|a hotel|in operation)|ceased operation|converted (?:in)?to (?:apartments|offices|flats|residences|condominiums))\b/i;
  /* Lead evidence must be a predicate — "is a heritage hotel", "is a ryokan" —
     not a mention. "includes a hotel" is a shopping mall; "is a historic han"
     is a caravanserai nobody sleeps in. */
  const LEAD_IS_LODGING = /\bis (?:now |today |currently )?(?:a|an|the|one of the) (?:[\w'’-]+ ){0,5}(hotel|ryokan|guest ?house|resort|homestay|hostel|inn|lodge|bed and breakfast|haveli)\b/i;
  /* Wikidata says "hotel"; the article says "now known as the Esplanade
     Mansion … is a cast-iron building" and never that it takes guests. The
     type outlived the use. Only fires when the lead ALSO signals a change of
     use, so a building that is simply described architecturally still passes
     on its Wikidata type. */
  const CHANGED_USE = /\bnow known as\b|\bconverted (?:in)?to\b|\boccupied by\b|\bnow houses\b|\bcurrently houses\b/i;
  /* The article names a DIFFERENT registry destination as its location and
     not this one: Fort Madhogarh carries a Delhi coordinate on Wikidata and a
     lead that says Jaipur. The lead wins; the coordinate is the error. */
  const otherDestinations = REGISTRY.filter((d) => d.id !== dest.id).map((d) => d.name);
  const categoryFromLead = (lead) => {
    const t = lead.toLowerCase();
    if (/heritage hotel/.test(t)) return "Heritage hotel";
    if (/palace hotel|\bpalace\b[^.]{0,80}\bhotel\b|\bhotel\b[^.]{0,80}\bpalace\b/.test(t)) return "Palace hotel";
    if (/boutique hotel/.test(t)) return "Boutique hotel";
    if (/luxury hotel/.test(t)) return "Luxury hotel";
    if (/\bryokan\b/.test(t)) return "Ryokan";
    if (/guest ?house/.test(t)) return "Guest house";
    if (/\bresort\b/.test(t)) return "Resort";
    if (/\bhomestay\b/.test(t)) return "Homestay";
    if (/\bhostel\b/.test(t)) return "Hostel";
    if (/\bhaveli\b/.test(t)) return "Haveli";
    if (/\binn\b/.test(t)) return "Inn";
    return "Hotel";
  };

  /*
   * Website reachability, six at a time, BEFORE the per-record loop. Done
   * one by one inside it, New York's hundred-odd candidates — many of whose
   * hotel sites hang rather than refuse a bot — took the run past half an
   * hour on this one check.
   */
  const siteChecks = new Map();
  {
    const sites = [...new Set([...qids.values()].map((v) => firstStr(ents.get(v.qid), "P856")).filter(Boolean))];
    for (let i = 0; i < sites.length; i += 6) {
      const batch = sites.slice(i, i + 6);
      const results = await Promise.all(batch.map((u) => reachable(u)));
      batch.forEach((u, k) => siteChecks.set(u, results[k]));
    }
  }

  const records = [];
  for (const [title, how] of titles) {
    const res = qids.get(title);
    const rec = { title, foundVia: how, qid: res?.qid ?? null, status: "FAIL", reasons: [], dropped: [], fields: {} };
    records.push(rec);
    if (!res) { rec.reasons.push("no Wikidata item"); continue; }
    const e = ents.get(res.qid);
    if (!e || !e.sitelinks?.enwiki) { rec.reasons.push("no enwiki sitelink"); continue; }
    rec.fields.label = e.labels?.en?.value ?? title;
    rec.fields.article = `https://en.wikipedia.org/wiki/${encodeURIComponent(e.sitelinks.enwiki.title.replace(/ /g, "_"))}`;

    /* Type must be a hotel-like thing, or the article is not a stay. */
    const types = claimVals(e, "P31").map((v) => v?.id).filter(Boolean).map((id) => ({ id, label: typeLabel(id) }));
    rec.fields.types = types.map((t) => t.label).filter(Boolean);
    const hotelish = /hotel|ryokan|inn\b|guest ?house|hostel|resort|lodge|motel|accommodation|serviced apartment|palace hotel|heritage hotel|haveli|homestay|machiya|bed and breakfast/i;
    /* A "state guest house" is a government reception building, an "official
       residence" is a home, and a post station is a historic site — each
       carries a lodging-shaped type label and none takes guests. */
    /* "former" is deliberately NOT here: a "former palace" that is now a
       hotel is exactly a heritage hotel. Only types that never take guests. */
    const notLodging = /state guest ?house|official residence|post station|shukuba|ruins|museum|historic site|archaeological|hospital|school|university/i;
    const lodgingTypes = types.filter((t) => t.label && hotelish.test(t.label) && !notLodging.test(t.label));
    const lead = leads.get(title) ?? leads.get(res.canonicalTitle) ?? "";
    const firstSentences = lead.split(/(?<=\.)\s/).slice(0, 2).join(" ");
    /* The Lutetia closed in 2014 for renovation and reopened in 2018; the
       Westin Vendôme was "formerly the …" and is a Westin today. A closure or
       former name followed by a reopening or a present-tense identity is not
       a closure. */
    const REOPENED = /\breopen(?:ed|ing|s)\b|\bis (?:now|today|currently) (?:a|an|the)\b|\bremains (?:a|an|open|in operation)\b|\bcontinues to operate\b/i;
    if (STALE.test(lead) && !REOPENED.test(lead)) { rec.reasons.push(`no longer operating: "${lead.match(STALE)[0]}" in its article`); continue; }
    const leadSaysLodging = LEAD_IS_LODGING.test(firstSentences);
    const namedElsewhere = otherDestinations.find((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(firstSentences));
    if (namedElsewhere && !new RegExp(`\\b${dest.name}\\b`, "i").test(firstSentences)) {
      rec.reasons.push(`article places it in ${namedElsewhere}, not ${dest.name} — the coordinate is the error`);
      continue;
    }
    if (notLodging.test(rec.fields.label) || (lodgingTypes.length === 0 && !leadSaysLodging)) {
      rec.reasons.push(`not public accommodation: ${rec.fields.types.join(", ") || "untyped"}${lead ? "; lead does not describe lodging" : "; no article lead"}`);
      continue;
    }
    /* A Wikidata "inn"/"hotel" whose article calls it a HISTORIC building and
       never says it takes guests today — Elçi Han is a caravanserai, the
       Tokatliyan closed before the war. "Is a historic hotel" (Pera Palace,
       The Imperial) has the predicate and passes. */
    const HAN = /\bcaravanserai\b|\bhan\b|\bkhan\b|\bcaravansary\b/i;
    if (lodgingTypes.length > 0 && lead && !leadSaysLodging && /\bhistoric(?:al)?\b/i.test(firstSentences) && (/\binn\b/i.test(lodgingTypes[0].label) || HAN.test(firstSentences))) {
      rec.reasons.push(`Wikidata types it "${lodgingTypes[0].label}" but its article describes a historic building, not operating lodging`);
      continue;
    }
    if (lodgingTypes.length > 0 && lead && !leadSaysLodging && CHANGED_USE.test(firstSentences)) {
      rec.reasons.push(`Wikidata types it "${lodgingTypes[0].label}" but its article describes a changed use and never says it operates as one`);
      continue;
    }
    if (lodgingTypes.length > 0) {
      rec.fields.category = lodgingTypes[0].label.replace(/^\w/, (c) => c.toUpperCase());
      rec.fields.typeEvidence = "Wikidata P31";
    } else {
      rec.fields.category = categoryFromLead(firstSentences);
      rec.fields.typeEvidence = "article lead";
    }

    /* Location — hard. */
    const c = claimVals(e, "P625")[0];
    if (!c || typeof c.latitude !== "number") { rec.reasons.push("no coordinate (P625)"); continue; }
    const coords = { lat: c.latitude, lng: c.longitude };
    if (Math.abs(coords.lat) < 0.01 && Math.abs(coords.lng) < 0.01) { rec.reasons.push("coordinate is (0,0)"); continue; }
    const d = km(dest.centre, coords);
    if (d > radiusFor(dest)) { rec.reasons.push(`${Math.round(d)} km from ${dest.name} — outside its ${radiusFor(dest)} km radius`); continue; }
    if (d < 0.03) { rec.reasons.push("coordinate is the destination centre itself"); continue; }
    rec.fields.coordinates = coords;
    rec.fields.kmFromCentre = Math.round(d * 10) / 10;
    rec.fields.mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;

    rec.status = "PASS";

    /* Soft fields — recorded, dropped on failure, never invented. */
    const site = firstStr(e, "P856");
    if (site) {
      const r = siteChecks.get(site) ?? (await reachable(site));
      if (r.ok) rec.fields.website = site; else { rec.dropped.push(`website ${site}: ${r.error ?? "HTTP " + r.status}`); rec.status = "NEEDS_REVIEW"; }
    }
    const ph = checkPhone(firstStr(e, "P1329"), dest.country);
    if (ph.ok) rec.fields.phone = ph.value; else if (firstStr(e, "P1329")) { rec.dropped.push(`phone: ${ph.reason}`); rec.status = "NEEDS_REVIEW"; }
    const addr = claimVals(e, "P6375")[0];
    if (addr?.text) rec.fields.address = addr.text;
    const img = await checkImage(firstStr(e, "P18"));
    if (img.ok) rec.fields.image = img; else if (firstStr(e, "P18")) { rec.dropped.push(`image: ${img.reason}`); rec.status = "NEEDS_REVIEW"; }
    await sleep(200);
  }

  /* Duplicates: same item, same name, same coordinate, same site host, same phone. */
  const norm = (s) => s.toLowerCase().replace(/\b(the|hotel|hôtel|hotels)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
  const ok = records.filter((r) => r.status !== "FAIL");
  for (let i = 0; i < ok.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = ok[i], b = ok[j];
      if (b.status === "FAIL") continue;
      const why =
        a.qid === b.qid ? "same Wikidata item" :
        norm(a.fields.label) === norm(b.fields.label) ? "same name" :
        km(a.fields.coordinates, b.fields.coordinates) * 1000 < DUP_M ? "same coordinate" :
        a.fields.website && b.fields.website && host(a.fields.website) === host(b.fields.website) ? "same website" :
        a.fields.phone && b.fields.phone && a.fields.phone === b.fields.phone ? "same phone" : null;
      if (why) { a.status = "FAIL"; a.reasons.push(`duplicate of "${b.title}" (${why})`); break; }
    }
  }

  /* Selection: best-documented, published first. */
  const score = (r) => (r.foundVia === "published" ? 100 : 0) + (r.fields.image ? 3 : 0) + (r.fields.website ? 2 : 0) + (r.fields.phone ? 2 : 0) + (r.fields.address ? 1 : 0) + (r.fields.category && !/^hotel$/i.test(r.fields.category) ? 1 : 0);
  const publishable = records.filter((r) => r.status !== "FAIL").sort((a, b) => score(b) - score(a) || a.fields.kmFromCentre - b.fields.kmFromCentre);
  const selected = publishable.slice(0, MAX);
  for (const r of selected) r.selected = true;
  return { dest, records, selected };
}

/* ------------------------------------------------------------------ main */

/*
 * --from-audit: publish the selections a previous run recorded, with no
 * network. The review happens on the audit file; this writes exactly what was
 * reviewed. Re-running discovery to publish would re-decide under whatever
 * Wikipedia and Wikidata answer fifteen minutes later.
 */
if (args.includes("--from-audit")) {
  const audit = JSON.parse(readFileSync(".data/stays-verification.json", "utf8"));
  const out = existsSync(".data/stays-final.json") ? JSON.parse(readFileSync(".data/stays-final.json", "utf8")) : {};
  for (const [id, recs] of Object.entries(audit.destinations ?? {})) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    out[id] = recs.filter((r) => r.selected && r.status !== "FAIL").slice(0, MAX).map((r) => r.title);
    console.log(`${id.padEnd(15)} ${String(out[id].length).padStart(2)} titles from audit ${audit.generatedAt}`);
  }
  writeFileSync(".data/stays-final.json", JSON.stringify(out, null, 2) + "\n");
  console.log("\nWrote .data/stays-final.json from the audit");
  process.exit(0);
}

const targets = REGISTRY.filter((d) => d.id !== "sikkim" && (ONLY.length === 0 || ONLY.includes(d.id)));
const final = existsSync(".data/stays-final.json") ? JSON.parse(readFileSync(".data/stays-final.json", "utf8")) : {};
const verification = {};
const rows = [];
for (const dest of targets) {
  process.stdout.write(`${dest.id.padEnd(15)} discovering… `);
  try {
    const { records, selected } = await processDestination(dest);
    const pass = records.filter((r) => r.status === "PASS").length;
    const review = records.filter((r) => r.status === "NEEDS_REVIEW").length;
    const fail = records.filter((r) => r.status === "FAIL").length;
    verification[dest.id] = records;
    const withImg = selected.filter((r) => r.fields.image).length, withSite = selected.filter((r) => r.fields.website).length, withPhone = selected.filter((r) => r.fields.phone).length;
    rows.push([dest.id, records.length, pass + review, selected.length, withImg, withSite, withPhone, fail]);
    console.log(`${records.length} candidates → PASS ${pass} · REVIEW ${review} · FAIL ${fail} → selected ${selected.length} (img ${withImg}, site ${withSite}, phone ${withPhone})`);
    if (WRITE) final[dest.id] = selected.map((r) => r.title);
  } catch (e) {
    console.log(`ERROR ${e.message}`);
    rows.push([dest.id, "-", "-", "-", "-", "-", "-", "-"]);
  }
}

console.log(`\n${"destination".padEnd(15)}${"cands".padStart(6)}${"verified".padStart(9)}${"selected".padStart(9)}${"image".padStart(6)}${"site".padStart(5)}${"phone".padStart(6)}${"fail".padStart(5)}`);
for (const r of rows) console.log(`${String(r[0]).padEnd(15)}${String(r[1]).padStart(6)}${String(r[2]).padStart(9)}${String(r[3]).padStart(9)}${String(r[4]).padStart(6)}${String(r[5]).padStart(5)}${String(r[6]).padStart(6)}${String(r[7]).padStart(5)}`);

/* The verification record is an AUDIT of what was checked and why; it is
   written on every run. Only the publish decision waits for --write. */
const audit = { generatedAt: new Date().toISOString(), radiusKm: { default: RADIUS_DEFAULT_KM, ...RADIUS_KM_BY_ID }, max: MAX, rule: "best-documented verified candidates, published first", destinations: verification };
if (ONLY.length && existsSync(".data/stays-verification.json")) {
  const prev = JSON.parse(readFileSync(".data/stays-verification.json", "utf8"));
  audit.destinations = { ...(prev.destinations ?? {}), ...verification };
}
writeFileSync(".data/stays-verification.json", JSON.stringify(audit, null, 2) + "\n");
if (WRITE) {
  writeFileSync(".data/stays-final.json", JSON.stringify(final, null, 2) + "\n");
  console.log("\nWrote .data/stays-final.json and .data/stays-verification.json");
} else {
  console.log("\nDry run — wrote .data/stays-verification.json only; pass --write to update .data/stays-final.json");
}
