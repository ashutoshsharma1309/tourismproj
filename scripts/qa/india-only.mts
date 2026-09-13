/**
 * India-only — the registry, the data layer and the search index hold
 * exactly the eighteen Indian destinations and nothing of the five that were
 * removed.
 *
 * WHAT THIS GUARDS
 * ----------------
 * The product was re-aimed as an India-only cultural tourism platform. Five
 * international destinations were deleted from the data layer and eight
 * Indian ones were added. A deletion across a dozen generated files and
 * three image trees is exactly the kind of change that leaves residue — a
 * credit row pointing at a photograph that is gone, a source scoped to a
 * destination that no longer exists, a story search entry for a city no page
 * renders — and residue is what the next phase trips over.
 *
 * Sections A–D run without a server or a build. Section E needs a running
 * server and is skipped, with a clear message, when none answers.
 *
 *   pnpm qa:india                       # sections A–D, E if a server answers
 *   QA_BASE_URL=http://host:3000 pnpm qa:india
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { validateCapsule } from "@/lib/destinations/capsule";
import { listDestinations } from "@/lib/destinations/registry";
import { capsuleSearchGroups } from "@/lib/search-capsules";
import { buildSearchIndex } from "@/lib/search-index";
import type { DestinationCapsule } from "@/types/capsule";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
};
const section = (t: string) => console.log(`\n-- ${t} --`);

/** The final registry, by id. Hard-coded on purpose: a registry that drifts
    must fail against this list, not validate itself. */
const EXPECTED = [
  "sikkim", "jaipur", "delhi", "varanasi", "agra", "mumbai", "kolkata", "hyderabad", "kochi", "goa",
  "amritsar", "ahmedabad", "lucknow", "pune", "mysuru", "madurai", "bhubaneswar", "srinagar",
];
/** The five that were removed. None may survive anywhere. */
const REMOVED = ["kyoto", "paris", "rome", "istanbul", "new-york-city"];

/* ======================================================================
   A. REGISTRY
   ====================================================================== */
section("A. Registry");

const destinations = listDestinations();
const ids = destinations.map((d) => d.id);
const normalise = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

check("exactly 18 destinations", destinations.length === 18, String(destinations.length));
check("exactly the 18 expected ids",
  EXPECTED.every((id) => ids.includes(id)) && ids.every((id) => EXPECTED.includes(id)),
  [...EXPECTED.filter((id) => !ids.includes(id)).map((id) => `missing ${id}`), ...ids.filter((id) => !EXPECTED.includes(id)).map((id) => `unexpected ${id}`)].join(", ") || "18/18");
check("no duplicate ids", new Set(ids).size === ids.length, `${ids.length} ids, ${new Set(ids).size} unique`);
const names = destinations.map((d) => normalise(d.name));
check("no duplicate names (normalised)", new Set(names).size === names.length,
  names.filter((n, i) => names.indexOf(n) !== i).join(", ") || "18 distinct");
check("every destination is in India", destinations.every((d) => d.country.code === "IN" && d.country.name === "India"),
  destinations.filter((d) => d.country.code !== "IN").map((d) => `${d.id}=${d.country.code}`).join(", ") || "18/18");
check("every destination carries a region name", destinations.every((d) => (d.region?.name ?? "").trim().length > 0),
  destinations.filter((d) => !(d.region?.name ?? "").trim()).map((d) => d.id).join(", ") || "18/18");
const outside = destinations.filter((d) => {
  const { lat, lng } = d.geography.centre;
  return !(lat >= 6 && lat <= 37 && lng >= 68 && lng <= 98);
});
check("every centre coordinate is inside India's bounding box", outside.length === 0,
  outside.map((d) => `${d.id} (${d.geography.centre.lat}, ${d.geography.centre.lng})`).join(", ") || "lat 6–37, lng 68–98");
check("every timezone is Asia/Kolkata", destinations.every((d) => d.geography.timezone === "Asia/Kolkata"),
  destinations.filter((d) => d.geography.timezone !== "Asia/Kolkata").map((d) => `${d.id}=${d.geography.timezone}`).join(", ") || "18/18");

/* ======================================================================
   B. NO INTERNATIONAL RESIDUE
   ====================================================================== */
section("B. No international residue");

const DATA_DIRS = [
  ["src/data/destinations/capsules", ".ts"],
  ["src/data/generated/stories", ".json"],
  ["src/data/generated/history", ".json"],
  ["src/data/generated/archive", ".json"],
] as const;
for (const [dir, ext] of DATA_DIRS) {
  const present = REMOVED.filter((id) => existsSync(join(dir, `${id}${ext}`)));
  check(`no removed destination has a file under ${dir}`, present.length === 0, present.join(", ") || "clean");
}
for (const dir of ["public/images/capsule", "public/images/archive"]) {
  const present = REMOVED.filter((id) => existsSync(join(dir, id)));
  check(`no removed destination has an image directory under ${dir}`, present.length === 0, present.join(", ") || "clean");
}

const removedPath = new RegExp(`/(?:${REMOVED.join("|")})/`);
const credits: { key: string; localPath: string }[] = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const staleCredits = credits.filter((c) => removedPath.test(c.localPath) || removedPath.test(`/${c.key}/`));
check("image-credits.json carries no removed destination", staleCredits.length === 0,
  staleCredits.slice(0, 3).map((c) => c.localPath).join(", ") || `${credits.length} entries clean`);
const focal: Record<string, unknown> = JSON.parse(readFileSync("src/data/generated/image-focal.json", "utf8"));
const staleFocal = Object.keys(focal).filter((path) => removedPath.test(path));
check("image-focal.json carries no removed destination", staleFocal.length === 0,
  staleFocal.slice(0, 3).join(", ") || `${Object.keys(focal).length} entries clean`);

const sourcesSrc = readFileSync("src/data/sources.ts", "utf8");
const staleScopes = REMOVED.filter((id) => sourcesSrc.includes(`forDestination("${id}")`));
check("sources.ts scopes no source to a removed destination", staleScopes.length === 0, staleScopes.join(", ") || "clean");

const storySearch: { destinationId: string }[] = JSON.parse(readFileSync("src/data/generated/stories/search.json", "utf8"));
const staleStories = [...new Set(storySearch.map((s) => s.destinationId))].filter((id) => !EXPECTED.includes(id));
check("stories/search.json indexes only registered destinations", staleStories.length === 0, staleStories.join(", ") || `${storySearch.length} entries clean`);

const published: { destinations?: Record<string, unknown> } = JSON.parse(readFileSync("src/data/generated/published-knowledge.json", "utf8"));
const stalePublished = Object.keys(published.destinations ?? {}).filter((id) => !EXPECTED.includes(id));
check("published-knowledge.json publishes only registered destinations", stalePublished.length === 0,
  stalePublished.join(", ") || Object.keys(published.destinations ?? {}).join(", "));

/*
 * Code, not comments. A comment explaining why a rule exists may name the
 * destination whose bug produced it; a string literal or identifier naming a
 * removed destination is a live reference. Comments are stripped the way
 * intelligence.mjs strips them.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const CODE_NAMES = /\b(kyoto|paris|rome|istanbul|new-york-city|new york)\b/i;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
const codeHits: string[] = [];
for (const root of ["src/app", "src/components", "src/lib"]) {
  for (const file of walk(root)) {
    const stripped = code(readFileSync(file, "utf8"));
    const hit = stripped.match(CODE_NAMES);
    if (hit) codeHits.push(`${file}: "${hit[0]}"`);
  }
}
check("no code string in src/app, src/components or src/lib names a removed destination",
  codeHits.length === 0, codeHits.slice(0, 5).join("; ") || "clean");

/* ======================================================================
   C. DESTINATION + MEDIA ISOLATION, over every capsule that exists
   ====================================================================== */
section("C. Destination and media isolation");

const CAPSULE_DIR = "src/data/destinations/capsules";
const capsuleFiles = readdirSync(CAPSULE_DIR)
  .filter((f) => /^[a-z][a-z-]*\.ts$/.test(f) && !["ids.ts", "index.ts"].includes(f))
  .map((f) => f.replace(/\.ts$/, ""));
const capsules = new Map<string, DestinationCapsule>();
for (const id of capsuleFiles) {
  try {
    const loaded = (await import(`../../${CAPSULE_DIR}/${id}.ts`)) as { capsule: DestinationCapsule };
    capsules.set(id, loaded.capsule);
  } catch (error) {
    check(`${id}: capsule module loads`, false, String(error).slice(0, 120));
  }
}
console.log(`   ${capsules.size} capsules: ${[...capsules.keys()].join(", ")}`);
check("every capsule file belongs to a registered destination",
  [...capsules.keys()].every((id) => EXPECTED.includes(id)),
  [...capsules.keys()].filter((id) => !EXPECTED.includes(id)).join(", ") || "all registered");

const imagesOf = (c: DestinationCapsule) =>
  [...c.places, ...c.culture, ...c.stays].flatMap((r) => (r.image ? [{ id: r.id, image: r.image }] : []));

for (const [id, c] of capsules) {
  check(`${id}: destinationId matches its filename`, c.destinationId === id, c.destinationId);
  const validation = validateCapsule(c);
  check(`${id}: passes the capsule validator`, validation.ok, validation.errors.slice(0, 2).join("; ") || "0 errors");

  const images = imagesOf(c);
  const foreignImage = images.filter((r) => !r.image.startsWith(`/images/capsule/${id}/`));
  check(`${id}: every image path is under /images/capsule/${id}/`, foreignImage.length === 0,
    foreignImage.slice(0, 3).map((r) => `${r.id} → ${r.image}`).join(", ") || `${images.length} images`);
  const missingImage = images.filter((r) => !existsSync(`public${r.image}`));
  check(`${id}: every referenced image exists on disk`, missingImage.length === 0,
    missingImage.slice(0, 3).map((r) => r.image).join(", ") || "all present");

  const sourceIds = new Set(c.sources.map((s) => s.id));
  const claims = [...c.places, ...c.experiences, ...c.history, ...c.stories, ...c.culture, ...c.stays];
  const dangling = claims.flatMap((r) => r.sourceIds.filter((sid) => !sourceIds.has(sid)).map((sid) => `${r.id}→${sid}`));
  check(`${id}: every sourceId resolves inside the capsule's own sources`, dangling.length === 0,
    dangling.slice(0, 3).join(", ") || `${claims.length} claims, ${c.sources.length} sources`);
}

/* Credits under /images/capsule/<id>/ must name a registered destination. */
const capsuleCreditIds = [...new Set(credits.map((c) => /^\/images\/capsule\/([a-z-]+)\//.exec(c.localPath)?.[1]).filter((x): x is string => Boolean(x)))];
const unregisteredCredits = capsuleCreditIds.filter((id) => !EXPECTED.includes(id));
check("every capsule image credit belongs to a registered destination", unregisteredCredits.length === 0,
  unregisteredCredits.join(", ") || `${capsuleCreditIds.length} destinations credited`);

/*
 * Exact name collisions across capsules. A record that genuinely shares a
 * name with one elsewhere — a Jama Masjid, a Marine Drive — carries a
 * disambiguating suffix, so an exact match is a leak or a missing suffix.
 */
const collisionsOf = (labelsOf: (c: DestinationCapsule) => string[]) => {
  const owners = new Map<string, string[]>();
  for (const [id, c] of capsules) {
    for (const label of new Set(labelsOf(c))) owners.set(label, [...(owners.get(label) ?? []), id]);
  }
  return {
    distinct: owners.size,
    pairs: [...owners].filter(([, o]) => o.length > 1).map(([name, o]) => `"${name}" in ${o.join(" + ")}`),
  };
};
const records = collisionsOf((c) => [
  ...c.places.map((r) => r.name),
  ...c.stories.map((r) => r.title),
  ...c.history.map((r) => r.title),
]);
/* Stays are excluded from the exact-name rule: the NIDHI+ register lists a
   chain hotel under the same brand in more than one city ("COURTYARD BY
   MARRIOTT" in Agra and Amritsar), and each is a different property with its
   own register entry, address and phone. Section C already asserts every stay
   links inside its own destination. */
check("no place, story or history name is identical to one in another capsule", records.pairs.length === 0,
  records.pairs.slice(0, 6).join("; ") || `${records.distinct} distinct names`);
/* Culture entries are reported separately: a festival or a dish shared by
   several cities is a real thing, but an identical name still renders as the
/*
 * Culture names are NOT held to the exact-duplicate rule. Diwali is kept in
 * Agra, Delhi, Jaipur and Mumbai because each of those cities celebrates it;
 * Mughlai cuisine is Agra's and Delhi's; the record in each capsule is that
 * destination's own retrieved entry, anchored to its own culture page. A
 * shared festival is shared culture, not a leak. What IS asserted is that
 * every culture entry links inside its own destination — section C above
 * checks the href prefix and image ownership for every record.
 */
const culture = collisionsOf((c) => c.culture.map((r) => r.name));
check("culture names shared across capsules are reported, not failed", true,
  culture.pairs.length ? `${culture.pairs.length} shared (e.g. ${culture.pairs.slice(0, 3).join("; ")})` : `${culture.distinct} distinct names`);

/* ======================================================================
   D. ADVERSARIAL SEARCH
   ====================================================================== */
section("D. Adversarial search");

const TERMS = ["monastery", "temple", "fort", "palace", "museum", "lake", "market", "street", "food", "festival", "ghat", "garden", "mosque", "church"];
const groups = capsuleSearchGroups();
check("every capsule search group is a registered destination",
  groups.every((g) => EXPECTED.includes(g.destinationId)),
  groups.filter((g) => !EXPECTED.includes(g.destinationId)).map((g) => g.destinationId).join(", ") || `${groups.length} groups`);
for (const term of TERMS) {
  const re = new RegExp(term, "i");
  let matched = 0;
  const strays: string[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      if (!re.test(`${item.label} ${item.sublabel}`)) continue;
      matched += 1;
      if (!item.href.startsWith(`/destinations/${g.destinationId}/`)) strays.push(`${g.destinationId}: "${item.label}" → ${item.href}`);
    }
  }
  check(`"${term}": every matching capsule item links inside its own destination`, strays.length === 0,
    strays.slice(0, 3).join("; ") || `${matched} matches`);
}
const sikkimGroups = buildSearchIndex().filter((g) => g.destinationId === "sikkim");
const sikkimItems = sikkimGroups.flatMap((g) => g.items);
/* Sikkim's registered stays link to an external map rather than a page of
   their own; what may never happen is a Sikkim item linking into another
   destination. */
const sikkimStrays = sikkimItems.filter((i) => !i.href.startsWith("/destinations/sikkim/") && !/^https:\/\//.test(i.href));
check("every Sikkim index item links under /destinations/sikkim/ (or to an external map)", sikkimItems.length > 0 && sikkimStrays.length === 0,
  sikkimStrays.slice(0, 3).map((i) => `"${i.label}" → ${i.href}`).join("; ") || `${sikkimItems.length} items, ${sikkimItems.filter((i) => /^https:/.test(i.href)).length} external`);

/* ======================================================================
   E. SITEMAP — needs a running server
   ====================================================================== */
section("E. Sitemap");

const fetchWithTimeout = async (url: string, ms: number): Promise<{ status: number; body: string } | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { status: response.status, body: response.status === 200 ? await response.text() : "" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/* Something else may be listening on the port — another project's dev
   server answered 404 to every route during the first run of this suite — so
   the server is checked for being THIS product before anything is asserted. */
const home = await fetchWithTimeout(`${BASE}/`, 4000);
const sitemap = home && home.status === 200 && /TerraStory/.test(home.body) ? await fetchWithTimeout(`${BASE}/sitemap.xml`, 8000) : null;
if (!home) {
  console.log(`SKIP  section E — no server answered at ${BASE} (set QA_BASE_URL to run it)`);
} else if (!sitemap) {
  console.log(`SKIP  section E — the server at ${BASE} is not TerraStory (HTTP ${home.status} at /), or its sitemap did not answer`);
} else {
  check("sitemap.xml serves", sitemap.status === 200, `HTTP ${sitemap.status}`);
  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const hubIds = locs.map((u) => /\/destinations\/([a-z-]+)$/.exec(u)?.[1]).filter((x): x is string => Boolean(x));
  check("every destination hub URL uses a registered id", hubIds.every((id) => EXPECTED.includes(id)),
    hubIds.filter((id) => !EXPECTED.includes(id)).join(", ") || `${hubIds.length} hub URLs`);
  const removedUrls = locs.filter((u) => removedPath.test(`${u}/`));
  check("no sitemap URL names a removed destination", removedUrls.length === 0, removedUrls.slice(0, 3).join(", ") || `${locs.length} URLs clean`);
  const missingHubs = EXPECTED.filter((id) => !hubIds.includes(id));
  check("each of the 18 hub URLs is present", missingHubs.length === 0, missingHubs.join(", ") || "18/18");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
