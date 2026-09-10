/**
 * Search scope audit — the search/keyword QA agent.
 *
 * The command palette shows a destination's own index plus the global
 * navigation entries. This checks the invariant that makes that safe: no
 * item filed under one destination may LINK into another, and a global entry
 * that points at a destination must SAY which one in its label — so a reader
 * on Varanasi who types "monasteries" sees "Sikkim: monasteries", labelled,
 * or nothing, but never an unlabelled Sikkim record wearing Varanasi's scope.
 *
 * Then the cross-destination probes from the brief: the terms one destination
 * owns, searched inside another, must match nothing in that other's own index.
 *
 * The index is fetched from a running server — the same JSON the palette
 * fetches — so this tests what a visitor actually gets, not a module import.
 *
 *   QA_BASE_URL=http://localhost:3000 node scripts/qa/search-scope.mjs
 */

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

let index;
try {
  const res = await fetch(`${BASE}/api/search-index`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  index = await res.json();
} catch (error) {
  console.error(`\nCannot reach ${BASE}/api/search-index — ${error instanceof Error ? error.message : error}\n`);
  process.exit(2);
}

const groups = Array.isArray(index) ? index : index.groups;
const scoped = groups.filter((g) => g.destinationId);
const global = groups.filter((g) => !g.destinationId);
/* Only a REGISTERED destination id counts. `/destinations/compare` is a
   route, not a destination; treating its segment as an id reported Sikkim's
   own "Compare destinations" shortcut as a cross-destination leak. */
const knownIds = new Set(groups.map((g) => g.destinationId).filter(Boolean));
const destinationOf = (href) => {
  const id = href?.match(/^\/destinations\/([a-z-]+)(?:\/|$|\?|#)/)?.[1] ?? null;
  return id && knownIds.has(id) ? id : null;
};

console.log(
  `\n${groups.length} groups · ${scoped.length} destination-scoped · ${groups.reduce((n, g) => n + g.items.length, 0)} items\n`,
);

/* --------------------------------------------- no cross-destination links */

const leaks = [];
for (const g of scoped) {
  for (const item of g.items) {
    const target = destinationOf(item.href);
    if (target && target !== g.destinationId) {
      leaks.push(`${g.destinationId} → ${item.href} ("${item.label}")`);
    }
  }
}
check(
  "No destination-scoped item links into another destination",
  leaks.length === 0,
  leaks.slice(0, 5).join("; ") || `${scoped.reduce((n, g) => n + g.items.length, 0)} items checked`,
);

/* ---------------------------------------- global entries name their owner */

/*
 * A global entry may point at a destination — "Sikkim: monasteries" is a
 * legitimate shortcut — but only if the label carries the destination's
 * name. An unlabelled one is a destination record presented as global.
 */
const names = new Map(scoped.map((g) => [g.destinationId, g.destinationName]));
/*
 * The global navigation seed is NOT in /api/search-index — the palette
 * inlines it into every page (see CommandPalette `seed`). So it is read from
 * the homepage's serialised payload: every `{label, href, group:"Go to"}`
 * entry is a global item that shows in every destination's scope.
 */
let seedItems = [];
try {
  const html = await (await fetch(`${BASE}/`)).text();
  const re = /\\"label\\":\\"([^"\\]+)\\",\\"sublabel\\":\\"([^"\\]*)\\",\\"href\\":\\"([^"\\]+)\\",\\"group\\":\\"Go to\\"/g;
  for (const m of html.matchAll(re)) seedItems.push({ label: m[1], sublabel: m[2], href: m[3] });
} catch { /* reported by the count below */ }
const unlabelled = [];
for (const g of [...global, { items: seedItems }]) {
  for (const item of g.items) {
    const target = destinationOf(item.href);
    if (!target) continue;
    const name = names.get(target);
    const label = `${item.label} ${item.sublabel ?? ""}`;
    if (!name || !label.toLowerCase().includes(name.toLowerCase())) {
      unlabelled.push(`${item.href} ("${item.label}")`);
    }
  }
}
check(
  "Every global entry that points at a destination names it in its label",
  unlabelled.length === 0,
  unlabelled.slice(0, 5).join("; ") || `${seedItems.length} global seed items + ${global.reduce((n, g) => n + g.items.length, 0)} API items`,
);

/* ------------------------------------------------ cross-destination probes */

/*
 * Each row: a destination, and a term ANOTHER destination owns. Matching is
 * on the item's own label and sublabel — the text the palette searches. Zero
 * is the only correct answer: the term is vocabulary that destination has no
 * record for.
 */
const PROBES = [
  ["varanasi", /monaster/i, "Sikkim's vocabulary"],
  ["kyoto", /monaster/i, "Sikkim's vocabulary"],
  ["paris", /monaster/i, "Sikkim's vocabulary"],
  ["new-york-city", /monaster/i, "Sikkim's vocabulary"],
  ["jaipur", /\bghat/i, "Varanasi's vocabulary"],
  ["kyoto", /\bghat/i, "Varanasi's vocabulary"],
  ["sikkim", /\bghat/i, "Varanasi's vocabulary"],
  ["rome", /ryokan/i, "Kyoto's vocabulary"],
  ["paris", /ryokan/i, "Kyoto's vocabulary"],
  ["paris", /\bghat|ryokan|monaster/i, "any foreign vocabulary"],
];
const byId = new Map(scoped.map((g) => [g.destinationId, g]));
for (const [destinationId, term, why] of PROBES) {
  const g = byId.get(destinationId);
  if (!g) {
    check(`${destinationId}: index group exists`, false, "missing");
    continue;
  }
  const hits = g.items.filter((i) => term.test(`${i.label} ${i.sublabel ?? ""}`));
  check(
    `${destinationId} + ${term.source}: no matches in its own index (${why})`,
    hits.length === 0,
    hits.slice(0, 3).map((i) => `"${i.label}"`).join(", ") || `${g.items.length} items searched`,
  );
}

/* --------------------------------------------- positive control (sanity) */

/*
 * If Sikkim + "monaster" also returned zero, the probes above would be
 * passing because the matcher is broken, not because the index is clean.
 */
const sikkim = byId.get("sikkim");
const sikkimHits = sikkim ? sikkim.items.filter((i) => /monaster/i.test(`${i.label} ${i.sublabel ?? ""}`)).length : 0;
check("Positive control: sikkim + monaster matches its own records", sikkimHits > 0, `${sikkimHits} matches`);

/* ------------------------------------------------------- every destination */

const ids = ["sikkim", "jaipur", "delhi", "varanasi", "agra", "mumbai", "kolkata", "hyderabad", "kochi", "goa", "kyoto", "paris", "rome", "istanbul", "new-york-city"];
const absent = ids.filter((id) => !byId.has(id));
check("All fifteen destinations have a scoped index group", absent.length === 0, absent.join(", ") || "15/15");

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed\n`);
process.exit(failed.length === 0 ? 0 : 1);
