#!/usr/bin/env node
/**
 * History Image Finder — Sikkim Darshan
 *
 * Finds genuinely licensed Wikimedia Commons photographs for timeline events
 * that currently render an empty state.
 *
 * The honesty rule this respects: an image may ILLUSTRATE an event's subject,
 * place or people without being a photograph OF the event. A portrait of the
 * botanist who was detained is a true image of him; captioning it as a picture
 * of the detention would be a lie. Every result therefore carries a `depicts`
 * note that the UI renders, so the reader always knows what they are seeing.
 *
 * Usage: node scripts/history-image-finder.mjs
 * Writes: reports/history-image-candidates.json
 */

import { writeFileSync } from "node:fs";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const UA = "SikkimDarshan-Research/1.0 (SIH cultural heritage project)";
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

/**
 * One entry per event still showing an empty state. `depicts` is written by
 * hand because only a person can say what an image is honestly evidence of.
 */
const WANTED = [
  { slug: "bhutanese-occupation", queries: ["Bhutan dzong 18th century", "Paro Taktsang Bhutan", "Bhutanese architecture fortress"],
    depicts: "A Bhutanese dzong — the fortress-monastery form of the power that occupied Sikkim, not a depiction of the occupation itself." },
  { slug: "gorkha-invasions", queries: ["Gorkha soldiers 19th century", "Nepal Gurkha historical", "Anglo-Nepalese War"],
    depicts: "Gorkha soldiers of the period. Illustrative of the invading force, not of any engagement in Sikkim." },
  { slug: "treaty-of-titalia", queries: ["Map of Sikkim 1855", "Sikkim historical map", "map Himalaya Sikkim 19th century"],
    depicts: "A period map of the region the treaty redrew." },
  { slug: "cession-of-darjeeling", queries: ["Darjeeling 1880s", "Darjeeling Himalayan Railway historical", "Darjeeling 19th century photograph"],
    depicts: "Darjeeling in the colonial period — the hill station built on the land ceded by Sikkim." },
  { slug: "campbell-hooker-detention", queries: ["Joseph Dalton Hooker portrait", "Joseph Hooker Himalayan Journals", "Hooker Sikkim rhododendron"],
    depicts: "Joseph Dalton Hooker, the botanist detained. A portrait of the man, not of his detention." },
  { slug: "treaty-of-tumlong", queries: ["Ashley Eden", "Tumlong Sikkim", "British Indian treaty signing 19th century"],
    depicts: "Illustrative of the treaty's British signatory and setting." },
  { slug: "sikkim-expedition", queries: ["Sikkim Expedition 1888", "British Indian Army 1888", "Jelep La pass"],
    depicts: "The high passes contested in the expedition." },
  { slug: "indian-protectorate", queries: ["Gangtok 1950s", "Palden Thondup Namgyal", "Chogyal Sikkim palace"],
    depicts: "Gangtok and the Chogyal's seat in the protectorate years." },
  { slug: "the-agitation", queries: ["Gangtok town 1970s", "Sikkim Gangtok MG Marg historical", "Tsuklakhang Palace Gangtok"],
    depicts: "Gangtok, where the agitation took place. Not a photograph of the protests." },
  { slug: "referendum-end-of-kingdom", queries: ["Sikkim palace Gangtok", "Chogyal palace Tsuklakhang", "Sikkim Legislative Assembly"],
    depicts: "The royal seat at the end of the kingdom." },
];

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
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const strip = (v) => (v ? String(v.value).replace(/<[^>]*>/g, "").trim() : null);

/** Licences we may display with attribution. Anything else is skipped. */
const OK_LICENCE = /public domain|cc[ -]?by|cc0|pd-|attribution/i;

async function search(query) {
  const data = await api({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1600",
  });
  const out = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info || !info.mime?.startsWith("image/") || info.mime === "image/svg+xml") continue;
    const { width = 0, height = 0 } = info;
    if (width < 800 || height < 500) continue;      // usable at card and hero size
    if (width / height < 1.1) continue;              // landscape reads better in these slots
    const meta = info.extmetadata ?? {};
    const licence = strip(meta.LicenseShortName);
    if (!licence || !OK_LICENCE.test(licence)) continue;
    out.push({
      title: page.title,
      url: (info.thumburl ?? info.url).split("?")[0],
      descriptionUrl: info.descriptionurl,
      width, height,
      licence,
      author: strip(meta.Artist),
      credit: strip(meta.Credit),
      matchedQuery: query,
    });
  }
  return out;
}

async function main() {
  console.log("History Image Finder\n");
  const results = [];
  for (const want of WANTED) {
    const hits = [];
    for (const q of want.queries) {
      await sleep(900);
      try {
        hits.push(...(await search(q)));
      } catch (e) {
        console.log(`    (query failed: ${q} — ${e.message})`);
      }
      if (hits.length >= 4) break;   // enough to choose from
    }
    const unique = [...new Map(hits.map((h) => [h.title, h])).values()];
    results.push({ ...want, candidateCount: unique.length, candidates: unique.slice(0, 5), checkedAt: RETRIEVED_AT });
    console.log(`  ${unique.length > 0 ? "✓" : "·"} ${want.slug.padEnd(30)} ${unique.length} candidates`);
  }
  writeFileSync("reports/history-image-candidates.json", JSON.stringify(results, null, 2) + "\n");
  const found = results.filter((r) => r.candidateCount > 0).length;
  console.log(`\n  ${found}/${results.length} events have at least one licensed candidate`);
  console.log("  written to reports/history-image-candidates.json");
}

main().catch((e) => { console.error("failed:", e.message); process.exit(1); });
