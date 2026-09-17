/**
 * Stays coverage report — writes docs/stays-coverage-report.md.
 *
 * One row per destination: how many candidates the discovery agent examined,
 * how many verified, how many are published, how many of those carry each
 * verified field, and the shortfall against the 10–12 target — with the
 * reason, taken from the agent's own audit. The target is a target; the pool
 * of VERIFIED properties is what is published, and a destination whose
 * documented pool is three publishes three and says so here.
 *
 *   node scripts/qa/stays-coverage.mjs
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const TARGET_MIN = 10, MAX = 12;

/* Published: the capsule .ts files (generated) and Sikkim's register. */
const CAP = "src/data/destinations/capsules";
const published = {};
for (const f of readdirSync(CAP).filter((n) => n.endsWith(".ts") && !["_template.ts", "ids.ts", "index.ts"].includes(n))) {
  const src = read(`${CAP}/${f}`);
  const block = src.match(/\n {2}stays: \[(.*?)\n {2}\],/s)?.[1] ?? "";
  const recs = block.split(/\n {4}\{\n/).slice(1).map((c) => `\n${c.split(/\n {4}\},?/)[0]}`);
  published[f.replace(/\.ts$/, "")] = {
    count: recs.length,
    image: recs.filter((r) => /\n {6}image: "/.test(r)).length,
    website: recs.filter((r) => /\n {6}website: "/.test(r)).length,
    phone: recs.filter((r) => /\n {6}phone: "/.test(r)).length,
    address: recs.filter((r) => /\n {6}address: "/.test(r)).length,
    coords: recs.filter((r) => /\n {6}coordinates: \{/.test(r)).length,
    typed: recs.filter((r) => /\n {6}category: "(?!Documented stay")/.test(r)).length,
  };
}
const register = JSON.parse(read("src/data/generated/curated-stays.json"));
const audit = existsSync(".data/stays-verification.json") ? JSON.parse(read(".data/stays-verification.json")) : { destinations: {} };

const order = ["sikkim", "jaipur", "delhi", "varanasi", "agra", "mumbai", "kolkata", "hyderabad", "kochi", "goa",
  "amritsar", "ahmedabad", "lucknow", "pune", "mysuru", "madurai", "bhubaneswar", "srinagar"];
const rows = [];
let totals = { cands: 0, verified: 0, published: 0, image: 0, website: 0, phone: 0, address: 0 };
for (const id of order) {
  if (id === "sikkim") {
    const n = register.properties.length;
    rows.push({ id, cands: "—", verified: n, published: n, image: 0, website: register.properties.filter((p) => p.officialWebsite).length, phone: register.properties.filter((p) => p.phone).length, address: register.properties.filter((p) => p.address).length, coords: register.properties.filter((p) => p.latitude).length, missing: 0, coverage: "register", note: "State hospitality register (Tier 1); published as a directory, exempt from the curated ceiling; hub section shows ≤ 12" });
    continue;
  }
  const a = audit.destinations?.[id] ?? [];
  const p = published[id] ?? { count: 0, image: 0, website: 0, phone: 0, address: 0, coords: 0, typed: 0 };
  const verified = a.filter((r) => r.status !== "FAIL").length;
  const failReasons = a.filter((r) => r.status === "FAIL").reduce((m, r) => { const k = (r.reasons[0] ?? "?").replace(/:.*$/, "").replace(/ — .*$/, "").replace(/\d+ km from .*/, "outside the destination"); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const missing = Math.max(0, TARGET_MIN - p.count);
  const coverage = `${Math.round((Math.min(p.count, MAX) / MAX) * 100)}%`;
  const topFails = Object.entries(failReasons).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, n]) => `${n} ${k}`).join(", ");
  const note = p.count >= TARGET_MIN
    ? `at target; ${p.count - p.image} without a free-licence photograph, ${p.count - p.phone} without a published number`
    : a.length === 0
      ? "no audit run yet"
      : `verified pool is ${verified} of ${a.length} candidates (${topFails || "no failures"}); ${p.count - p.phone} of ${p.count} have no published number`;
  rows.push({ id, cands: a.length, verified, published: p.count, ...p, missing, coverage, note });
  totals.cands += a.length; totals.verified += verified; totals.published += p.count; totals.image += p.image; totals.website += p.website; totals.phone += p.phone; totals.address += p.address;
}

const md = `# Stays coverage report

Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/qa/stays-coverage.mjs\`. Target 10–12 per destination, maximum 12. **Verified** = candidates the discovery agent could confirm as public accommodation with a published coordinate inside the destination; **published** = what the capsule holds after retrieval and generation. Fields are counted from the published records.

| Destination | Candidates | Verified | Published | Coords | Image | Website | Phone | Address | Missing to 10 | Coverage | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
${rows.map((r) => `| ${r.id} | ${r.cands} | ${r.verified} | ${r.published} | ${r.coords} | ${r.image} | ${r.website} | ${r.phone} | ${r.address} | ${r.missing} | ${r.coverage} | ${r.note} |`).join("\n")}
| **14 capsules** | ${totals.cands} | ${totals.verified} | **${totals.published}** | | ${totals.image} | ${totals.website} | **${totals.phone}** | ${totals.address} | | | Sikkim's register (${register.properties.length}) is additional |

## Why the phone column is small

A telephone number is published only where a source publishes one as a structured claim (Wikidata P1329), verified for shape, country code and placeholder patterns. Hotels' own websites are not scraped for numbers: extracting the wrong line from a page and publishing it against a real business sends a real person to a stranger, and the archive's rule is that absence is published as absence. The website column is the property's own site (P856), checked reachable.

## Why some destinations are below target

Discovery reads English Wikipedia (hotel categories, \`{{Infobox hotel}}\` search) and Wikidata's geospatial index within 25 km of each centre (Goa 120). Where English Wikipedia documents few hotels in a city — Varanasi, Agra — the verified pool is small, and the pool is what is published. Filling to twelve from unverified sources is the one thing this pipeline will not do.

## Rules applied (every run)

- Identity: Wikidata item with an English Wikipedia article; type (P31) is public accommodation — state guest houses, official residences and historic post-stations are excluded.
- Location: P625 present; ≤ 25 km from the destination centre (Goa 120); not (0,0); not the centre itself; not within 25 m of another candidate.
- Website: P856, host answers (bot-blocking 403/405 counts; DNS failure or 404 drops the field).
- Phone: P1329, E.164 shape, country code matches, no placeholder pattern.
- Image: P18 with a free licence on Commons (CC0/PD/CC BY/CC BY-SA), author present where BY requires, ≥ 800 px.
- Duplicates: same item, normalised name, coordinate, website host or phone → the later candidate is dropped.
- Selection: the ≤ 12 best-documented verified candidates, already-published first.
`;
writeFileSync("docs/stays-coverage-report.md", md);
console.log(md.split("\n").slice(0, 22).join("\n"));
console.log(`\nWrote docs/stays-coverage-report.md`);
