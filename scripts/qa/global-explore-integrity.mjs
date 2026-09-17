/**
 * Phase 10 integrity — global exploration and discovery.
 *
 * The recurring risk in a "global map" feature is that it quietly becomes a
 * second application: its own coordinate list, its own destination copies, its
 * own idea of what a place offers. These checks exist to keep it an entry
 * point — one registry, one set of routes, and every destination reachable
 * without touching the map at all.
 *
 *   node scripts/qa/global-explore-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { listDestinations } from "../research/destinations.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

const EXPECTED = ["sikkim", "jaipur", "delhi", "varanasi", "agra", "mumbai", "kolkata", "hyderabad", "kochi", "goa",
  "amritsar", "ahmedabad", "lucknow", "pune", "mysuru", "madurai", "bhubaneswar", "srinagar"];

const OUT = ".next/server/app";
const worldMapSrc = readFileSync("src/components/destinations/WorldMap.tsx", "utf8");
const globalHtml = existsSync(join(OUT, "destinations.html"))
  ? readFileSync(join(OUT, "destinations.html"), "utf8")
  : "";
const mainOf = (html) => (html.match(/<main id="main".*?<\/main>/s) ?? [""])[0];
const textOf = (html) => mainOf(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/* ========================================================================
   1-3. REGISTRY IS THE SINGLE SOURCE
   ======================================================================== */
section("1-3. Destinations and the canonical registry");

const registered = listDestinations();
check("All 18 destinations are registered", registered.length === 18, `${registered.length}`);
check("The registry holds exactly the expected ids",
  EXPECTED.every((id) => registered.some((d) => d.id === id)));

const badCoords = registered.filter(
  (d) => !d.country || typeof d.name !== "string" || !d.name,
);
check("Every destination has identity metadata", badCoords.length === 0,
  badCoords.map((d) => d.id).join(", ") || "18/18");

/* Coordinates live in the destination records, and nowhere else. */
const plannedSrc = readFileSync("src/data/destinations/planned.ts", "utf8");
const sikkimSrc = readFileSync("src/data/destinations/sikkim.ts", "utf8");
const coordCount =
  [...plannedSrc.matchAll(/centre:\s*\{\s*lat:/g)].length +
  [...sikkimSrc.matchAll(/centre:\s*\{\s*lat:/g)].length;
check("Every destination declares exactly one centre coordinate", coordCount === 18, `${coordCount}`);

check("The map component defines no coordinates of its own",
  !/lat:\s*-?\d/.test(worldMapSrc.replace(/lat:\s*d\.lat/g, "")),
  "no second marker list");
check("Markers are built from the registry projection",
  /DestinationMarker/.test(worldMapSrc) && !/listDestinations\(\)/.test(worldMapSrc));

const registrySrc = readFileSync("src/lib/destinations/registry.ts", "utf8");
check("A single marker projection exists in the registry",
  /export function buildDestinationMarkers/.test(registrySrc));
check("The projection carries metadata only, never content",
  !/categories:\s*knowledge/.test(registrySrc) && /hasKnowledge/.test(registrySrc),
  "identity, coordinate, status, experience names");

/* No component may hold a duplicate destination list. */
const dupes = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name) && !p.includes("data/destinations")) {
      const s = readFileSync(p, "utf8");
      /*
       * A duplicate registry is a list of destinations WITH COORDINATES.
       * Counting bare ids caught src/data/sources.ts, where the ids are
       * source-scope declarations (`forDestination("jaipur")`) — the exact
       * mechanism Phase 2.5 built to keep evidence destination-bound, and the
       * opposite of a duplicate registry. The coordinate is what makes a list
       * a second map.
       */
      const hits = EXPECTED.filter((id) => s.includes(`"${id}"`)).length;
      const hasCoordinates = /lat:\s*-?\d+\.?\d*/.test(s);
      if (hits >= 3 && hasCoordinates) dupes.push(`${p} (${hits} ids + coordinates)`);
    }
  }
};
walk("src");
check("No component holds a duplicate destination list", dupes.length === 0,
  dupes.join(", ") || "registry is the only source");

/* ========================================================================
   4-6. DISCOVERY: MAP AND LIST BOTH COMPLETE
   ======================================================================== */
section("4-6. Discovery paths");

check("The global page is prerendered", globalHtml.length > 0);
if (globalHtml) {
  const linked = EXPECTED.filter((id) => globalHtml.includes(`/destinations/${id}`));
  check("Every destination is linked from the global page without using the map",
    linked.length === 18, `${linked.length}/18 as plain links`);
  check("The map is present", /leaflet|WorldMap|World map/i.test(globalHtml));
  /* The map is `ssr: false`, so its accessible name is applied on hydration
     and is not in the prerendered HTML. It is passed as the `ariaLabel` prop
     and verified in the browser; checking the prerendered markup looked for
     the right property in the wrong document. */
  check("The map is given an accessible name",
    /ariaLabel="World map of TerraStory destinations/.test(worldMapSrc));
  check("The preview region is labelled",
    /aria-label="Selected destination"/.test(globalHtml));
  /* The cards now lead the page and the map follows; the list is the primary
     path and is labelled as such on the element rather than in a heading. */
  check("The list is the primary path, labelled for assistive technology",
    /aria-label="All destinations"/.test(globalHtml) && /Where they are/.test(textOf(globalHtml)));
}

/* Every destination route exists. */
for (const id of EXPECTED) {
  check(`  route resolves: /destinations/${id}`,
    existsSync(join(OUT, "destinations", `${id}.html`)));
}

/* ========================================================================
   7-8. ISOLATION AND HONESTY
   ======================================================================== */
section("7-8. Isolation and empty destinations");

const SIKKIM_CONTENT = ["Rumtek", "Pemayangtse", "Gangtok", "Nyingma", "Chogyal", "Karma Kagyu"];
if (globalHtml) {
  const visible = textOf(globalHtml);
  check("The global page shows no destination's content, only its status",
    !SIKKIM_CONTENT.some((t) => visible.includes(t)),
    "identity and status only");
  check("No claim ids reach the global page", !visible.includes("claim_"));
}

/*
 * Every destination says what it actually has — derived, not listed.
 *
 * PHASE 18 replaced Delhi in this list; PHASE 19 removed the last three names
 * in it, because Paris, Rome and Istanbul are capsules now and there is no
 * unresearched destination left to name. A list of ids was always going to
 * rot this way, so the set comes from the registry and the guarantee is
 * stated once for all of them: whatever a destination's depth is, its page
 * says so, and it borrows nobody's content to fill the space.
 */
const capsuleIds = new Set(
  [...readFileSync("src/data/destinations/capsules/ids.ts", "utf8")
    .match(/CAPSULE_IDS: string\[\] = \[([^\]]*)\]/)[1]
    .matchAll(/"([a-z-]+)"/g)].map((m) => m[1]),
);
const allIds = [...readFileSync("src/data/destinations/planned.ts", "utf8")
  .matchAll(/^\s{4}id: "([a-z-]+)",/gm)].map((m) => m[1]);

/* The depth badge each destination is entitled to claim. */
const DEPTH_COPY = /Deeply documented|Well documented|Researched|Documented|Being catalogued|still cataloguing/;
for (const id of allIds) {
  const page = existsSync(join(OUT, "destinations", `${id}.html`))
    ? readFileSync(join(OUT, "destinations", `${id}.html`), "utf8")
    : "";
  const text = textOf(page);
  check(`  ${id}: is shown, and states its own depth`, DEPTH_COPY.test(text), "shown, not hidden");
  check(`  ${id}: invents no content`,
    !SIKKIM_CONTENT.some((t) => text.includes(t)));
  if (!capsuleIds.has(id)) {
    check(`  ${id}: has no capsule and claims none`, !/Tourism capsule/.test(text));
  }
}
if (globalHtml) {
  /*
   * PHASE 18 — count what is actually unresearched rather than a fixed 12.
   *
   * Eight destinations gained capsules, so a hardcoded 12 now fails for the
   * right reason and would have passed forever for the wrong one. The
   * guarantee is unchanged and now self-adjusting: every destination with no
   * content is marked, and the expected number is derived from the registry
   * and the capsule list rather than remembered.
   */
  const capsuled = [
    ...readFileSync("src/data/destinations/capsules/ids.ts", "utf8").matchAll(/"([a-z-]+)"/g),
  ].map((m) => m[1]);
  const published = Object.keys(
    JSON.parse(readFileSync("src/data/generated/published-knowledge.json", "utf8")).destinations ?? {},
  );
  const withContent = new Set([...capsuled, ...published, "sikkim"]);
  const registeredCount = [...readFileSync("src/data/destinations/planned.ts", "utf8").matchAll(/^\s+id: "([a-z-]+)",$/gm)].length + 1;
  const expected = registeredCount - withContent.size;
  /* The card phrase, not the map legend's "Being catalogued" entry. */
  const marked = (textOf(globalHtml).match(/Being catalogued — explore/g) ?? []).length;
  check("The global list marks unresearched destinations honestly",
    marked === expected, `${marked} marked, ${expected} have no content`);
}

/* ========================================================================
   9-11. THE THREE PILOTS
   ======================================================================== */
section("9-11. Sikkim, Jaipur and the other published destinations");

const PUB = "src/data/generated/published-knowledge.json";
const published = existsSync(PUB) ? JSON.parse(readFileSync(PUB, "utf8")) : null;

check("Sikkim's curated records are untouched",
  readFileSync("src/data/monasteries.ts", "utf8").includes("const SEEDS: MonasterySeed[]"));
check("Sikkim's depth is unchanged", published?.destinations?.sikkim?.depth?.depth === "deep");
/* Phase 11 moved Sikkim's content to destination-native routes, so the page
   files now live under destinations/sikkim/. The assertion is unchanged in
   intent — Sikkim's routes must still resolve — and is now stronger: the
   legacy URL must ALSO still be reachable, via a declared 301. */
const REDIRECTS = readFileSync("next.config.ts", "utf8");
for (const route of ["monasteries.html", "stories.html", "history.html", "culture.html", "archive.html", "preservation.html"]) {
  const name = route.replace(".html", "");
  check(`  Sikkim route intact: /destinations/sikkim/${name}`,
    existsSync(join(OUT, "destinations/sikkim", route)));
  check(`  legacy URL /${name} still redirects`, REDIRECTS.includes(`"${name}"`));
}
check("Jaipur resolves through the same system, no custom component",
  published?.destinations?.jaipur?.depth?.depth === "curated" &&
  !existsSync("src/components/destinations/Jaipur.tsx"));
const publishedIds = Object.keys(published?.destinations ?? {});
check("Every published destination is a registered one",
  publishedIds.every((id) => EXPECTED.includes(id)),
  publishedIds.filter((id) => !EXPECTED.includes(id)).join(", ") || publishedIds.join(", "));
check("No destination resolves through a custom component",
  registered.every((d) => !existsSync(`src/components/destinations/${d.name.replace(/\s+/g, "")}.tsx`)));
check("Depth stays honestly distinct: the declared archive above the earned tier, nothing else deep",
  published?.destinations?.sikkim?.depth?.depth === "deep" &&
  published?.destinations?.jaipur?.depth?.depth === "curated" &&
  publishedIds.every((id) => id === "sikkim" || published?.destinations?.[id]?.depth?.depth !== "deep"));

/* ========================================================================
   12-13. SEARCH
   ======================================================================== */
section("12-13. Search");

const searchSrc = readFileSync("src/lib/search-index.ts", "utf8");
const paletteSrc = readFileSync("src/components/search/CommandPalette.tsx", "utf8");
check("The index is still grouped by owning destination",
  /export interface SearchGroupIndex/.test(searchSrc) && /destinationId: string \| null/.test(searchSrc));
check("Scope resolution is unchanged",
  /g\.destinationId === scope\.destinationId \|\| g\.destinationId === null/.test(searchSrc));
check("Destination scope remains the default", /useState\(false\)/.test(paletteSrc));
check("Global search ranks the current destination first",
  /globalSearch && localHrefs/.test(paletteSrc));
check("Only reviewer-approved knowledge is searchable",
  /getPublishedKnowledge/.test(searchSrc) && !searchSrc.includes(".data/research"));

/* ========================================================================
   14-16. ACCESSIBILITY, SECURITY, SCALE
   ======================================================================== */
section("14-16. Accessibility, security, scale");

check("Destinations are reachable without a pointer",
  globalHtml.includes('href="/destinations/srinagar"'),
  "plain anchors, not map-only interaction");
check("Marker state is not carried by colour alone",
  /DATA_DEPTH_LABEL/.test(worldMapSrc), "each state has a text label");
check("The legend explains what marker colour means",
  /how much verified knowledge exists/.test(worldMapSrc),
  "status, not quality");

const pageSrc = readFileSync("src/app/(v1)/destinations/[destinationId]/page.tsx", "utf8");
/*
 * The hub's route file pins the param set; the component it delegates to does
 * the resolve-or-404. Both halves are still asserted — they simply live in two
 * files since the twelve-language routes arrived, because
 * /destinations/<id> and /l/<lang>/destinations/<id> render the same hub.
 */
const hubSrc = readFileSync("src/components/destinations/DestinationHubPage.tsx", "utf8");
check("Unregistered destinations 404 rather than rendering",
  /notFound\(\)/.test(hubSrc) && /dynamicParams = false/.test(pageSrc));
check("Destination lookup returns null rather than throwing",
  /return BY_ID\.get\(id\) \?\? null/.test(registrySrc));
check("Coordinates come from the registry, never from a URL",
  !/searchParams[\s\S]{0,120}(lat|lng)/.test(pageSrc));

/* Adding a destination must not need new components. */
check("Adding a destination requires a registry entry, not a component",
  !/case "sikkim"|case "jaipur"|case "kochi"/.test(worldMapSrc) &&
  !/if \(destinationId === "(jaipur|kochi)"\)/.test(pageSrc),
  "no per-destination branching in the UI");

/* ========================================================================
   17-20. PERFORMANCE, CONTENT HONESTY, AI INDEPENDENCE
   ======================================================================== */
section("17-20. Performance and independence");

check("The map is loaded on demand, not in the initial bundle",
  /dynamic\(\(\) => import\("@\/components\/maps\/LeafletMap"\)/.test(worldMapSrc) &&
  /ssr: false/.test(worldMapSrc));
check("The global page loads no destination content",
  !/getSites|getStories|getHistory|getArchive/.test(readFileSync("src/app/(v1)/destinations/page.tsx", "utf8")),
  "metadata only");
check("No new mapping stack was introduced",
  /@\/components\/maps\/LeafletMap/.test(worldMapSrc),
  "reuses the existing Leaflet component");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
check("No new runtime dependency was added",
  !Object.keys(pkg.dependencies).some((d) => /map|globe|cluster|three|cesium|mapbox/i.test(d) && d !== "leaflet"),
  Object.keys(pkg.dependencies).filter((d) => /leaflet/i.test(d)).join(", "));

/* Comments are stripped first: an earlier version matched the comment in
   WorldMap.tsx that lists the very statistics it refuses to display. */
const worldMapCode = worldMapSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check("No fabricated statistics appear in the map component",
  !/visitors|ranking|popularity|hotels:\s*\d|rating/i.test(worldMapCode));
check("The experience does not depend on an AI provider",
  !/anthropic|generateNarrative|ANTHROPIC/i.test(worldMapSrc) &&
  !/anthropic/i.test(readFileSync("src/app/(v1)/destinations/page.tsx", "utf8")),
  "global discovery works with no API key");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
