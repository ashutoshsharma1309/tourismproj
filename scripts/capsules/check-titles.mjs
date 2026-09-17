/**
 * Which candidate titles are real articles.
 *
 * Every title in `candidates.mjs` is a guess. This resolves each one against
 * Wikipedia and sorts it into: a real article, a redirect (with the title it
 * actually lands on), a disambiguation page, or nothing at all.
 *
 * WHY THIS RUNS BEFORE RETRIEVAL AND NOT DURING IT
 * ------------------------------------------------
 * A previous phase shipped a capsule built on "Ram Bagh", which returns HTTP
 * 200 and is a disambiguation page — it took Agra's whole capsule down. The
 * lesson was that a title has to be *resolved* before it is *read*, and that
 * the resolution belongs in a step whose output a human can look at.
 *
 * Output is written to .data/culture-titles.json and nothing is published
 * from it directly.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { CANDIDATES } from "./candidates.mjs";

/* ASCII only: a header value cannot carry an em dash. */
const UA = "TerraStory/1.0 (SIH 2026 tourism research; contact via repository)";
const API = "https://en.wikipedia.org/w/api.php";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wikipedia takes up to 50 titles per query; 40 keeps us clear of the edge. */
const BATCH = 40;

async function resolveBatch(titles) {
  const url = `${API}?action=query&format=json&redirects=1&prop=pageprops&ppprop=disambiguation&titles=${
    titles.map(encodeURIComponent).join("|")
  }`;
  /*
   * Wikimedia rate-limits an anonymous caller hard, and a thousand titles is
   * enough to meet it: a 429 used to end the run with four hundred resolved
   * and nothing written. Back off and ask again.
   */
  let response;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      response = await fetch(url, { headers: { "user-agent": UA } });
    } catch (error) {
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      const wait = response.status === 429 ? 60_000 * (attempt + 1) : 5_000 * (attempt + 1);
      console.log(`  (HTTP ${response.status}, waiting ${wait / 1000}s)`);
      await sleep(wait);
      continue;
    }
    break;
  }
  if (!response || !response.ok) throw new Error(`HTTP ${response?.status ?? "no response"}`);
  const data = await response.json();
  const query = data.query ?? {};

  /* `normalized` and `redirects` tell us what each requested title became. */
  const landedOn = new Map();
  for (const n of query.normalized ?? []) landedOn.set(n.from, n.to);
  for (const r of query.redirects ?? []) {
    for (const [from, to] of landedOn) if (to === r.from) landedOn.set(from, r.to);
    landedOn.set(r.from, r.to);
  }

  const byTitle = new Map();
  for (const page of Object.values(query.pages ?? {})) {
    byTitle.set(page.title, {
      missing: page.missing !== undefined,
      disambiguation: page.pageprops?.disambiguation !== undefined,
    });
  }

  return titles.map((requested) => {
    const final = landedOn.get(requested) ?? requested;
    const page = byTitle.get(final);
    if (!page || page.missing) return { requested, status: "missing" };
    if (page.disambiguation) return { requested, status: "disambiguation", final };
    return { requested, status: "ok", final, redirected: final !== requested };
  });
}

const flat = [];
for (const [destinationId, kinds] of Object.entries(CANDIDATES)) {
  for (const [kind, titles] of Object.entries(kinds)) {
    for (const title of titles) flat.push({ destinationId, kind, title });
  }
}

console.log(`Resolving ${flat.length} candidate titles…\n`);

const results = [];
for (let i = 0; i < flat.length; i += BATCH) {
  const slice = flat.slice(i, i + BATCH);
  const resolved = await resolveBatch(slice.map((entry) => entry.title));
  slice.forEach((entry, index) => results.push({ ...entry, ...resolved[index] }));
  console.log(`  ${Math.min(i + BATCH, flat.length)}/${flat.length}`);
  await sleep(1500);
}

/*
 * Two candidates that redirect to the same article are one article. Kept
 * here as well as in the generator so the written title list is already
 * clean — the count printed below is then the number of things that will
 * actually be published.
 */
const seen = new Set();
const ok = results.filter((r) => r.status === "ok").filter((r) => {
  const key = `${r.destinationId}|${r.kind}|${r.final}`;
  if (seen.has(key)) {
    console.log(`  DUPLICATE       ${r.destinationId}/${r.kind}  ${r.requested} -> ${r.final}`);
    return false;
  }
  seen.add(key);
  return true;
});
const bad = results.filter((r) => r.status !== "ok");

console.log("\n" + "=".repeat(74));
for (const r of bad) console.log(`  ${r.status.toUpperCase().padEnd(15)} ${r.destinationId}/${r.kind}  ${r.requested}`);
const redirects = ok.filter((r) => r.redirected);
if (redirects.length) {
  console.log("\n  redirects followed:");
  for (const r of redirects) console.log(`    ${r.requested}  ->  ${r.final}`);
}

console.log("\n" + "=".repeat(74));
console.log(`  usable ${ok.length} · dropped ${bad.length}`);
for (const [destinationId] of Object.entries(CANDIDATES)) {
  const mine = ok.filter((r) => r.destinationId === destinationId);
  const by = (k) => mine.filter((r) => r.kind === k).length;
  console.log(`  ${destinationId.padEnd(15)} food ${by("food")} · festival ${by("festival")} · craft ${by("craft")} · stay ${by("stay")}`);
}

mkdirSync(".data", { recursive: true });
writeFileSync(".data/culture-titles.json", JSON.stringify(ok, null, 2));
console.log("\nWritten to .data/culture-titles.json");
