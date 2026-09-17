/**
 * NIDHI+ register ingest — documented stays for the Indian destinations.
 *
 * NIDHI+ (National Integrated Database of Hospitality Industry) is the
 * Ministry of Tourism's register of accommodation units. Its public
 * "showcasing" page lists registered units per state with the unit's own
 * name, sub-category (Hotel, Homestay, Heritage, Guest House…), full postal
 * address, and the contact e-mail and telephone the unit registered — a
 * Tier-1 government source, and the same class of record Sikkim's stays
 * already come from. It publishes no coordinates and no licensed photograph,
 * so a register stay carries an address and a number and no map pin.
 *
 * HOW IT IS READ
 * --------------
 * Plain GETs of the public listing, one page every 400 ms, following the
 * page's own numbered pagination links (no parameter is guessed). The
 * listing is state-wide — its city filter is not applied server-side — so
 * the destination is decided from the address the unit registered, which
 * ends "…, <City>, <State>, <PIN>". No detail pages are fetched: the listing
 * already carries every field this product publishes, and the detail page
 * is script-rendered.
 *
 * WHAT IS PUBLISHED
 * -----------------
 * Only sub-categories that are places to stay. Telephone numbers are kept
 * exactly as registered (10-digit Indian mobiles/landlines) and displayed
 * as +91; e-mails kept verbatim. Nothing is composed: the summary generate.mjs
 * writes for these is a statement about the register entry, cited to it.
 *
 *   node scripts/capsules/ingest-nidhi.mjs [--only agra,varanasi]
 * Writes .data/stays-register.json, which generate.mjs reads.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; TerraStory-research/1.0; SIH 2026; contact via repository)";
const BASE = "https://nidhi.tourism.gov.in";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const onlyIdx = process.argv.indexOf("--only");
const ONLY = (process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? (onlyIdx >= 0 ? process.argv[onlyIdx + 1] : "") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_PAGES_PER_STATE = 80;

/** Destination → state and the city names the register uses in addresses. */
const TARGETS = [
  { destinationId: "delhi", state: "DL", cities: ["New Delhi", "Delhi"] },
  { destinationId: "jaipur", state: "RJ", cities: ["Jaipur"] },
  { destinationId: "varanasi", state: "UP", cities: ["Varanasi", "Banaras", "Benares", "Kashi"] },
  { destinationId: "agra", state: "UP", cities: ["Agra"] },
  { destinationId: "mumbai", state: "MH", cities: ["Mumbai", "Bombay", "Navi Mumbai"] },
  { destinationId: "kolkata", state: "WB", cities: ["Kolkata", "Calcutta"] },
  { destinationId: "hyderabad", state: "TS", cities: ["Hyderabad", "Secunderabad"] },
  { destinationId: "kochi", state: "KL", cities: ["Kochi", "Cochin", "Ernakulam", "Fort Kochi"] },
  { destinationId: "goa", state: "GA", cities: [] /* whole state */ },
  /* INDIA-ONLY (SIH 2026 final): the eight added cities. Odisha's code on
     the register is OD, not OR; Mysuru is registered under both spellings. */
  { destinationId: "amritsar", state: "PB", cities: ["Amritsar"] },
  { destinationId: "ahmedabad", state: "GJ", cities: ["Ahmedabad", "Ahmadabad"] },
  { destinationId: "lucknow", state: "UP", cities: ["Lucknow"] },
  { destinationId: "pune", state: "MH", cities: ["Pune", "Poona"] },
  { destinationId: "mysuru", state: "KA", cities: ["Mysuru", "Mysore"] },
  { destinationId: "madurai", state: "TN", cities: ["Madurai"] },
  { destinationId: "bhubaneswar", state: "OD", cities: ["Bhubaneswar", "Bhubaneshwar"] },
  { destinationId: "srinagar", state: "JK", cities: ["Srinagar"] },
];
const LODGING = new Set(["Hotel", "Heritage", "Homestay", "Guest House", "Bed and Breakfast", "Apartment Hotel", "Lodge and Tourist Home", "Legacy Vintage", "Motel", "Resort", "Farm Stay", "House Boat", "Tented Accommodation", "Camping Site"]);

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
    if (res.status === 429 || res.status === 503) { await sleep(5000 * (i + 1)); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return await res.text();
  }
  throw new Error(`rate-limited: ${url}`);
}

const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

/** Parse the listing: one record per unit uuid. */
function parseCards(html) {
  const out = new Map();
  const parts = html.split(/(?=<a[^>]+href="https:\/\/nidhi\.tourism\.gov\.in\/home\/details\/)/);
  for (const p of parts.slice(1)) {
    const uid = p.match(/\/home\/details\/([a-f0-9-]{36})/)?.[1];
    if (!uid || out.has(uid)) continue;
    const text = unescape(p.slice(0, 5000).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "|")).replace(/\s+/g, " ");
    const segs = text.split("|").map((s) => s.trim()).filter(Boolean);
    /* Shape observed: [name, "- /", "-", "(.. reviews)", subcategory, address, email?, phone?] */
    const name = segs[0];
    if (!name || /view details|showcased found/i.test(name)) continue;
    const sub = segs.find((s) => LODGING.has(s)) ?? null;
    const address = segs.find((s) => /\b\d{6}\b/.test(s) && s.length > 20) ?? null;
    const email = segs.find((s) => /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(s)) ?? null;
    const phone = segs.find((s) => /^\+?91?[\s-]?[6-9]\d{9}$/.test(s.replace(/\s/g, "")) || /^0?\d{2,5}[\s-]?\d{6,8}$/.test(s)) ?? null;
    out.set(uid, { id: uid, name: name.replace(/\s*\(A unit of[^)]*\)?\s*$/i, "").trim(), category: sub, address, email, phone });
  }
  return [...out.values()];
}

/** The state listing, following the page's own pagination links. */
async function listState(state) {
  const start = `${BASE}/home/showcasing?stateCode=${state}&categoryCode=01`;
  const seenPages = new Set([start]);
  const queue = [start];
  const units = new Map();
  let pages = 0;
  while (queue.length && pages < MAX_PAGES_PER_STATE) {
    const url = queue.shift();
    const html = await get(url);
    pages++;
    for (const u of parseCards(html)) if (!units.has(u.id)) units.set(u.id, u);
    for (const m of html.matchAll(/class="page-link[^"]*"\s+href="(https:\/\/nidhi\.tourism\.gov\.in\/home\/showcasing\?[^"]+)"/g)) {
      const href = unescape(m[1]);
      if (!seenPages.has(href)) { seenPages.add(href); queue.push(href); }
    }
    process.stdout.write(`\r  ${state}: ${pages} pages, ${units.size} units`);
    await sleep(400);
  }
  process.stdout.write("\n");
  return [...units.values()];
}

const cityOf = (address) => {
  /* "…, Lucknow, Uttar Pradesh, 226010" → "Lucknow" */
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 3] : parts[0] ?? "";
};
const inCity = (u, target) => {
  if (!u.address) return false;
  if (target.cities.length === 0) return true;
  const hay = u.address.toLowerCase();
  return target.cities.some((c) => new RegExp(`(^|[\\s,(])${c.toLowerCase()}([\\s,)]|$)`).test(hay));
};
const normPhone = (p) => {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(d)) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (/^91[6-9]\d{9}$/.test(d)) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (/^0\d{9,10}$/.test(d)) return `+91 ${d.slice(1)}`;
  return null;
};

const byState = new Map();
const out = existsSync(".data/stays-register.json") ? JSON.parse(readFileSync(".data/stays-register.json", "utf8")) : {};
const retrievedAt = new Date().toISOString().slice(0, 10);
for (const t of TARGETS) {
  if (ONLY.length && !ONLY.includes(t.destinationId)) continue;
  if (!byState.has(t.state)) byState.set(t.state, await listState(t.state));
  const all = byState.get(t.state);
  const mine = all.filter((u) => u.category && inCity(u, t));
  const seenNames = new Set();
  const rows = mine
    .map((u) => ({ ...u, city: cityOf(u.address), phone: normPhone(u.phone), phoneRaw: u.phone, state: t.state, source: { url: `${BASE}/home/details/${u.id}`, publisher: "Ministry of Tourism, Government of India — NIDHI+", retrievedAt } }))
    .filter((u) => { const k = u.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); if (seenNames.has(k)) return false; seenNames.add(k); return true; })
    /* Most completely registered first, then alphabetical — deterministic. */
    .sort((a, b) => (Number(Boolean(b.phone)) + Number(Boolean(b.email))) - (Number(Boolean(a.phone)) + Number(Boolean(a.email))) || a.name.localeCompare(b.name));
  out[t.destinationId] = rows;
  const cats = rows.reduce((m, r) => ((m[r.category] = (m[r.category] ?? 0) + 1), m), {});
  console.log(`  ${t.destinationId.padEnd(10)} ${String(rows.length).padStart(3)} in city of ${all.length} in state · phone ${rows.filter((r) => r.phone).length} · email ${rows.filter((r) => r.email).length} · ${Object.entries(cats).map(([k, v]) => `${k} ${v}`).join(", ")}`);
}
writeFileSync(".data/stays-register.json", JSON.stringify(out, null, 2) + "\n");
console.log("\nWrote .data/stays-register.json");
