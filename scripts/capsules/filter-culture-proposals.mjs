/**
 * Keep only the culture subjects the encyclopedia itself files under this
 * destination.
 *
 * WHY
 * ---
 * `discover-culture.mjs` finds category names by searching, and a search for
 * "festivals in Delhi" also returns "Category:Festivals in India". Its members
 * include Onam, which is Kerala's harvest festival and has no business in
 * Delhi's stories. Relevance is therefore checked per subject, against the
 * article's OWN categories: a subject is kept when one of its categories, or
 * its title, names this destination's city or state.
 *
 * That is the encyclopedia's classification, not a judgement made here.
 *
 *   node scripts/capsules/filter-culture-proposals.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const WIKI = "https://en.wikipedia.org/w/api.php";
const UA = "TerraStory/1.0 (cultural tourism archive; contact via repository)";
const PACE_MS = 2500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextSlot = 0;
async function paced() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + PACE_MS;
  if (wait > 0) await sleep(wait);
}

async function api(params) {
  const url = new URL(WIKI);
  for (const [key, value] of Object.entries({ format: "json", ...params })) url.searchParams.set(key, String(value));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await paced();
    let response;
    try {
      response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    } catch {
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    if (response.status === 429) {
      console.log(`  (rate limited, waiting ${60 * (attempt + 1)}s)`);
      await sleep(60_000 * (attempt + 1));
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

const { listDestinations } = await import("../../src/lib/destinations/registry.ts");
const names = new Map(
  listDestinations().map((destination) => [
    destination.id,
    [destination.name, destination.region?.name ?? destination.country.name].filter(Boolean),
  ]),
);

const proposals = JSON.parse(readFileSync(".data/culture-proposals.json", "utf8"));
const kept = {};

for (const [destinationId, kinds] of Object.entries(proposals)) {
  const words = (names.get(destinationId) ?? []).map((name) => name.toLowerCase());
  /* Also match the state's adjectival forms as the encyclopedia writes them:
     "Rajasthani cuisine", "Bengali sweets", "Punjabi dance". */
  const stems = words.map((word) => word.replace(/\s+.*$/, "").slice(0, 6));
  const relevant = (haystacks) =>
    haystacks.some((text) => {
      const lower = text.toLowerCase();
      return words.some((word) => lower.includes(word)) || stems.some((stem) => stem.length > 3 && lower.includes(stem));
    });

  kept[destinationId] = { food: [], festival: [], craft: [] };
  for (const [kind, titles] of Object.entries(kinds)) {
    for (let i = 0; i < titles.length; i += 50) {
      const batch = titles.slice(i, i + 50);
      const data = await api({
        action: "query",
        prop: "categories",
        cllimit: "max",
        titles: batch.join("|"),
      });
      for (const page of Object.values(data.query?.pages ?? {})) {
        const categories = (page.categories ?? []).map((category) => category.title);
        if (relevant([page.title, ...categories])) kept[destinationId][kind].push(page.title);
      }
    }
  }
  const counts = Object.entries(kept[destinationId]).map(([kind, list]) => `${kind} ${list.length}`).join(", ");
  const before = Object.values(kinds).flat().length;
  const after = Object.values(kept[destinationId]).flat().length;
  console.log(`${destinationId.padEnd(13)} ${String(before).padStart(3)} → ${String(after).padStart(3)}   ${counts}`);
}

writeFileSync(".data/culture-proposals.json", `${JSON.stringify(kept, null, 2)}\n`);
console.log(`\nKept ${Object.values(kept).flatMap((entry) => Object.values(entry).flat()).length} subjects`);
