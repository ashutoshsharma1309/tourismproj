/**
 * Phase 11-12 integrity — route migration and destination-native architecture.
 *
 * Sections 1-18 are Phase 11 (the migration itself). Sections 19-22 are
 * Phase 12, which closed the single-destination assumptions the migration
 * left behind: every destination's social card was Sikkim's photograph, the
 * sitemap listed Sikkim's twelve sections literally, and detail pages carried
 * no breadcrumb.
 *
 * Sikkim's content moved from un-prefixed routes (/monasteries) to
 * destination-native ones (/destinations/sikkim/monasteries). Two things can
 * go wrong with a migration like this, and both are silent:
 *
 *   1. An old URL stops resolving. Nothing in the application notices —
 *      only external links, search indexes and printed QR codes break.
 *   2. A destination-native route quietly keeps assuming Sikkim, so the
 *      architecture looks global while only one destination actually works.
 *
 * These checks assert against build output and source, so they run without a
 * server. Where a check depends on a file, a MISSING file fails rather than
 * skipping — Phase 10 shipped a check whose path was wrong, so it never ran
 * and read as a pass.
 *
 *   node scripts/qa/route-migration.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (t) => console.log(`\n── ${t} ──`);

const OUT = ".next/server/app";
const APP = "src/app/(v1)/destinations/[destinationId]";
const SIKKIM_OUT = join(OUT, "destinations/sikkim");

/** Read a file, or fail the run loudly rather than silently skipping. */
const mustRead = (path) => {
  if (!existsSync(path)) {
    check(`Required file exists: ${path}`, false, "cannot verify checks that depend on it");
    return "";
  }
  return readFileSync(path, "utf8");
};

/** Source with comments stripped — several past checks matched their own prose. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const nextConfig = mustRead("next.config.ts");
const nextConfigCode = codeOf(nextConfig);

/* The 14 sections that moved. Sourced from next.config.ts rather than
   retyped, so the suite cannot drift from the redirect table it audits. */
const MIGRATED = (() => {
  const block = nextConfig.match(/const MIGRATED_ROUTES = \[([\s\S]*?)\]/);
  return block ? [...block[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]) : [];
})();

/* Sections that had an index page before the migration. /places and /stays
   never did — they are [slug] parents only, and the browsable stays listing
   is /hotels. Documented in docs/phase-11-redirects.md §3. */
const NO_INDEX = new Set(["places", "stays"]);

/* Pre-migration prerender counts, recorded in docs/phase-11-route-audit.md
   before any file moved. These are the numbers Sikkim must still produce. */
const BASELINE = {
  monasteries: 15, stories: 70, history: 26, places: 38, stays: 22, archive: 78,
};

const htmlCount = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).length : -1;

/** Every .ts/.tsx file under src, for whole-tree static analysis. */
const walk = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(p)) acc.push(p);
  }
  return acc;
};
const SRC_FILES = walk("src");

/* ========================================================================
   1. EVERY VALID MIGRATED ROUTE RESOLVES
   ======================================================================== */
section("1. Every migrated route resolves");

check("next.config.ts declares the migrated-route table", MIGRATED.length === 14,
  `${MIGRATED.length} routes: ${MIGRATED.join(", ")}`);

const missingIndex = MIGRATED
  .filter((r) => !NO_INDEX.has(r))
  .filter((r) => !existsSync(join(SIKKIM_OUT, `${r}.html`)));
check("Every section with an index page is prerendered for Sikkim",
  missingIndex.length === 0, missingIndex.join(", ") || `${MIGRATED.length - NO_INDEX.size}/12`);

const missingRouteDir = MIGRATED.filter((r) => !existsSync(join(APP, r)));
check("Every migrated section exists under [destinationId]",
  missingRouteDir.length === 0, missingRouteDir.join(", ") || "14/14");

/*
 * `/stories` and `/history` are top-level pages again — but as GLOBAL index
 * pages across all fifteen destinations, not as Sikkim's old ones. Their deep
 * links still redirect into Sikkim, which is what the migration was for; only
 * the index changed owner. They are excluded here by name so that any OTHER
 * legacy directory reappearing is still caught.
 */
const GLOBAL_INDEX_ROUTES = new Set(["stories", "history"]);
const legacyDirs = MIGRATED
  .filter((r) => !GLOBAL_INDEX_ROUTES.has(r))
  .filter((r) => existsSync(join("src/app", r)));
check("No legacy un-prefixed route directory survives in src/app",
  legacyDirs.length === 0, legacyDirs.join(", ") || "all 14 removed");

/* ========================================================================
   2-3. OLD URLS REDIRECT, AND WITH 301
   ======================================================================== */
section("2-3. Redirect rules and status codes");

const rules = [...nextConfigCode.matchAll(
  /source:\s*`([^`]+)`[\s\S]{0,120}?destination:\s*`([^`]+)`[\s\S]{0,80}?statusCode:\s*(\d+)/g,
)].map(([, source, destination, statusCode]) => ({ source, destination, statusCode: Number(statusCode) }));

/* The rules are generated inside flatMap over MIGRATED_ROUTES, so the literal
   text carries ${route}. Expand it to the concrete rule set. */
const expanded = MIGRATED.flatMap((route) =>
  rules.map((r) => ({
    source: r.source.replace(/\$\{route\}/g, route),
    destination: r.destination.replace(/\$\{route\}/g, route),
    statusCode: r.statusCode,
  })),
);

check("Both a sub-tree rule and an index rule are declared per section",
  rules.length === 2, `${rules.length} rule templates`);
check("Every redirect rule is declared with statusCode 301",
  expanded.length > 0 && expanded.every((r) => r.statusCode === 301),
  `${expanded.filter((r) => r.statusCode === 301).length}/${expanded.length} are 301`);
check("No rule uses 302, 307 or 308",
  !/statusCode:\s*(302|307|308)/.test(nextConfigCode) && !/permanent:\s*(true|false)/.test(nextConfigCode));

const wrongTarget = expanded.filter((r) => !r.destination.startsWith("/destinations/sikkim/"));
check("Every migrated route redirects into Sikkim's destination namespace",
  wrongTarget.length === 0, wrongTarget.map((r) => r.source).join(", ") || `${expanded.length}/28`);

const subTree = expanded.filter((r) => r.source.endsWith("/:path+"));
check("Sub-tree rules preserve the remaining path segment",
  subTree.length === 14 && subTree.every((r) => r.destination.endsWith("/:path+")),
  `${subTree.length} sub-tree rules preserve :path+`);

/* A blanket redirect to a destination homepage would destroy per-page SEO
   equity, which is the entire reason the redirect exists. */
const blanket = expanded.filter((r) => r.destination === "/destinations/sikkim");
check("No rule collapses a deep URL onto the destination homepage",
  blanket.length === 0, blanket.map((r) => r.source).join(", ") || "none");

/* ========================================================================
   4-5. NO LOOPS, NO CHAINS
   ======================================================================== */
section("4-5. Loops and chains");

const sourcePrefixes = expanded.map((r) => r.source.replace("/:path*", ""));
const selfMatching = expanded.filter((r) => r.source.startsWith("/destinations"));
check("No redirect source is itself destination-native (loop guard)",
  selfMatching.length === 0, selfMatching.map((r) => r.source).join(", ") || "none");

const chained = expanded.filter((r) =>
  sourcePrefixes.some((p) => r.destination === p || r.destination.startsWith(`${p}/`)),
);
check("No redirect target matches another rule's source (chain guard)",
  chained.length === 0, chained.map((r) => `${r.source} -> ${r.destination}`).join(", ") || "none");

/* Compare whole sources. An earlier version compared them with "/:path*"
   stripped, so `/monasteries/:path*` and `/monasteries` — two deliberately
   distinct rules — always read as a duplicate. */
const sources = expanded.map((r) => r.source);
const dupes = sources.filter((p, i) => sources.indexOf(p) !== i);
check("No redirect source is declared twice",
  new Set(dupes).size === 0, [...new Set(dupes)].join(", ") || `${sources.length} unique sources`);

/* ========================================================================
   6. NO MIGRATED ROUTE PRODUCES A 404
   ======================================================================== */
section("6. Migrated routes do not 404");

for (const [sectionName, expected] of Object.entries(BASELINE)) {
  const actual = htmlCount(join(SIKKIM_OUT, sectionName));
  check(`Sikkim /${sectionName} prerenders its content pages`,
    actual === expected, `${actual} pages (baseline ${expected})`);
}

/* /places and /stays redirect to targets with no index page. That is the
   pre-migration behaviour, preserved deliberately — assert it stays true
   rather than letting a future change turn it into a surprise. */
const noIndexPresent = [...NO_INDEX].filter((r) => existsSync(join(SIKKIM_OUT, `${r}.html`)));
check("/places and /stays still have no index page (documented, pre-existing)",
  noIndexPresent.length === 0,
  noIndexPresent.join(", ") || "unchanged from pre-migration; listing lives at /hotels");

/* ========================================================================
   7. UNKNOWN DESTINATION FAILS SAFELY
   ======================================================================== */
section("7. Unknown destinations fail safely");

const resolveSrc = mustRead("src/lib/destinations/resolve.ts");
check("The resolver 404s rather than falling back to a default destination",
  /notFound\(\)/.test(resolveSrc) && !/DEFAULT_DESTINATION_ID/.test(codeOf(resolveSrc)));

const routePages = SRC_FILES.filter((f) => f.startsWith(APP) && /page\.tsx$/.test(f));
const undeclared = routePages.filter((f) => !/dynamicParams\s*=\s*false/.test(readFileSync(f, "utf8")));
check("Every destination route refuses params it did not generate",
  routePages.length > 0 && undeclared.length === 0,
  undeclared.length ? undeclared.join(", ") : `dynamicParams = false on ${routePages.length} pages`);

const registrySrc = mustRead("src/lib/destinations/registry.ts");
check("Destination lookup is an exact registry hit, not a pattern match",
  /BY_ID\.get\(id\)\s*\?\?\s*null/.test(registrySrc),
  "unknown ids return null; no filesystem or module path is derived from the segment");

/* ========================================================================
   8. DESTINATION ISOLATION
   ======================================================================== */
section("8. Destination isolation");

/* Next emits build metadata directories alongside the pages — "<id>.segments"
   and "page". Only a bare destination id names a real content sub-tree; an
   earlier version counted the metadata directories and reported every
   destination as leaking Sikkim content. */
const otherDestSections = readdirSync(join(OUT, "destinations"))
  .filter((e) => statSync(join(OUT, "destinations", e)).isDirectory())
  .filter((e) => !e.includes(".") && e !== "page")
  /* `compare` is a global route that happens to live under /destinations —
     it belongs to no destination and holds no destination's content. */
  .filter((e) => e !== "sikkim" && e !== "[destinationId]" && e !== "compare")
  /*
   * PHASE 18 — a CONTENT sub-tree, which is a subdirectory of detail pages.
   *
   * Capsule destinations now have a directory holding 404 shells for the
   * section routes they do not have, and counting any non-empty directory
   * reported all eight as leaking. What must never exist is another
   * destination's detail pages, and those live in subdirectories —
   * `sikkim/monasteries/`, `sikkim/stories/`. A capsule has none.
   */
  .filter((e) =>
    readdirSync(join(OUT, "destinations", e)).some(
      (child) =>
        statSync(join(OUT, "destinations", e, child)).isDirectory() && !child.includes("."),
    ),
  );
/*
 * RE-AIMED. This asserted that no destination but Sikkim has ANY detail-page
 * subdirectory, which was a proxy for the real rule while Sikkim was the only
 * destination with long-form content. Fourteen destinations now have story
 * articles of their own, so the proxy reports the product working as a
 * failure.
 *
 * The invariant it was protecting is ownership: a destination's detail pages
 * must be ITS pages. That is now checked directly — every prerendered story
 * slug under a destination must appear in that destination's own corpus, and
 * Sikkim's 70 slugs must appear nowhere else.
 */
const sikkimStorySlugs = new Set(
  readdirSync(join(OUT, "destinations", "sikkim", "stories"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, "")),
);

const borrowedStoryPages = [];
for (const id of readdirSync(join(OUT, "destinations"))) {
  const storiesDir = join(OUT, "destinations", id, "stories");
  if (id === "sikkim" || !existsSync(storiesDir)) continue;
  for (const file of readdirSync(storiesDir)) {
    if (!file.endsWith(".html")) continue;
    const slug = file.replace(/\.html$/, "");
    if (sikkimStorySlugs.has(slug)) borrowedStoryPages.push(`${id}/${slug}`);
  }
}

check("No destination prerenders another destination's story pages",
  borrowedStoryPages.length === 0,
  borrowedStoryPages.slice(0, 5).join(", ") || "every story page belongs to its own destination");

/* `archive` left this list when fourteen destinations gained catalogues of
   their own; ownership of archive pages is asserted by object id in
   qa:archive. `monasteries` remains Sikkim's word for a kind of site. */
check("Sikkim's own sections stay Sikkim's",
  otherDestSections.every((id) => !existsSync(join(OUT, "destinations", id, "monasteries"))),
  "monasteries are Sikkim-exclusive");

check("Sikkim data modules are not imported by the global destination page",
  !/@\/data\/(monasteries|stories|history|places|archive)/.test(mustRead("src/app/(v1)/destinations/page.tsx")));

/* ========================================================================
   9. DESTINATION-NATIVE CONTENT LOADING
   ======================================================================== */
section("9. Content loads from the route, not from a default");

/* The destination hub page is the one route that must exist for EVERY
   destination, so it resolves through getDestinationSummary rather than a
   capability gate. Every other page must gate. */
const HUB = join(APP, "page.tsx");

/*
 * The hub's resolution moved into `DestinationHubPage` when the twelve-language
 * routes arrived: `/destinations/<id>` and `/l/<lang>/destinations/<id>` both
 * render it, and duplicating the resolve-or-404 in two route files would have
 * been the real defect. The assertion is unchanged — the hub must resolve
 * through `getDestinationSummary` and must `notFound()` an unknown id — it is
 * now made against the file that does it.
 */
const HUB_COMPONENT = "src/components/destinations/DestinationHubPage.tsx";
const hubResolves = (() => {
  const s = codeOf(readFileSync(HUB_COMPONENT, "utf8"));
  return /getDestinationSummary/.test(s) && /notFound\(\)/.test(s);
})();
check("The destination hub resolves through the canonical resolver and 404s an unknown id",
  hubResolves, HUB_COMPONENT);

const notResolving = routePages.filter((f) => {
  const s = codeOf(readFileSync(f, "utf8"));
  /* The hub delegates; every other page must gate for itself. */
  if (f === HUB) return !/DestinationHubPage/.test(s);
  return !/resolveDestination|requireCapability|resolveDestinationOrNull/.test(s);
});
check("Every destination page resolves its destination through the canonical resolver",
  notResolving.length === 0, notResolving.join(", ") || `${routePages.length} pages`);

const notReadingParams = routePages.filter((f) => !/destinationId/.test(readFileSync(f, "utf8")));
check("Every destination page reads destinationId from its route params",
  notReadingParams.length === 0, notReadingParams.join(", ") || `${routePages.length} pages`);

/* ========================================================================
   10. NO DEFAULT_DESTINATION_ID DEPENDENCY
   ======================================================================== */
section("10. DEFAULT_DESTINATION_ID is not load-bearing");

/* The constant may still be DEFINED and re-exported from the barrel — that is
   not a dependency. What matters is that nothing READS it to decide which
   destination it is looking at. */
const DEFINERS = new Set(["src/lib/destinations/registry.ts", "src/lib/destinations/index.ts"]);
const usesDefault = SRC_FILES
  .filter((f) => !DEFINERS.has(f))
  .filter((f) => /DEFAULT_DESTINATION_ID/.test(codeOf(readFileSync(f, "utf8"))));
check("No module outside the registry reads DEFAULT_DESTINATION_ID",
  usesDefault.length === 0, usesDefault.join(", ") || "definition and barrel re-export only");

const barrel = existsSync("src/lib/destinations/index.ts")
  ? codeOf(readFileSync("src/lib/destinations/index.ts", "utf8")) : "";
check("The barrel only re-exports the constant, never applies it",
  !/DEFAULT_DESTINATION_ID\s*[);,]|=\s*DEFAULT_DESTINATION_ID/.test(barrel.replace(/export\s*\{[^}]*\}/g, "")),
  "re-export only");

const callsDefaultGetter = SRC_FILES.filter((f) =>
  /getDefaultDestination\s*\(/.test(codeOf(readFileSync(f, "utf8"))) &&
  f !== "src/lib/destinations/registry.ts",
);
check("getDefaultDestination() is never called in application code",
  callsDefaultGetter.length === 0, callsDefaultGetter.join(", ") || "no callers");

/* ========================================================================
   11. INTERNAL LINKS USE CANONICAL ROUTES
   ======================================================================== */
section("11. Internal links are canonical");

const LEGACY = MIGRATED.join("|");
/*
 * A SUB-PATH, not the bare index. `/stories` and `/history` are the global
 * indexes now (the `:path+` rewrite sends only their sub-trees into Sikkim),
 * so a component linking to `/stories` is linking to the product, and the
 * 404 page doing exactly that was flagged here as a Sikkim leak. What must
 * never appear is `/stories/<a Sikkim slug>` un-prefixed — and that still is.
 */
const legacyHref = new RegExp(`href=(?:"|\\{?\`)/(?:${LEGACY})/`);
const staleLinkFiles = SRC_FILES.filter((f) => legacyHref.test(codeOf(readFileSync(f, "utf8"))));
check("No component links to an un-prefixed Sikkim route",
  staleLinkFiles.length === 0, staleLinkFiles.join(", ") || `${SRC_FILES.length} files clean`);

check("Link targets are built through the canonical path helper",
  /export function destinationPath/.test(resolveSrc));

/* ========================================================================
   12. SITEMAP USES CANONICAL ROUTES
   ======================================================================== */
section("12. Sitemap is canonical");

const sitemapSrc = codeOf(mustRead("src/app/sitemap.ts"));
const sitemapLegacy = new RegExp(`\\$\\{SITE_URL\\}/(?:${LEGACY})(?:/|\`)`);
check("The sitemap emits no legacy un-prefixed URL",
  !sitemapLegacy.test(sitemapSrc) && !new RegExp(`"/(?:${LEGACY})"`).test(sitemapSrc));
check("The sitemap builds destination-native URLs",
  /\/destinations\//.test(sitemapSrc));

const sitemapXml = join(OUT, "sitemap.xml.body");
if (existsSync(sitemapXml)) {
  const xml = readFileSync(sitemapXml, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const bad = locs.filter((u) => new RegExp(`^https?://[^/]+/(?:${LEGACY})(?:/|$)`).test(u));
  check("The generated sitemap.xml contains no legacy URL",
    bad.length === 0, bad.slice(0, 3).join(", ") || `${locs.length} entries checked`);
}

/* ========================================================================
   13. METADATA USES CANONICAL ROUTES
   ======================================================================== */
section("13. Metadata and structured data are canonical");

const jsonLd = codeOf(mustRead("src/components/seo/JsonLd.tsx"));
check("Structured data emits no legacy un-prefixed URL",
  !new RegExp(`\\$\\{[A-Z_]+\\}/(?:${LEGACY})(?:/|\`)`).test(jsonLd) &&
  !new RegExp(`"/(?:${LEGACY})/`).test(jsonLd));

const metaLegacy = routePages.filter((f) => {
  const s = codeOf(readFileSync(f, "utf8"));
  const m = s.match(/canonical:\s*[`"]([^`"]+)/);
  return m && new RegExp(`^/(?:${LEGACY})`).test(m[1]);
});
check("No page declares a legacy canonical URL",
  metaLegacy.length === 0, metaLegacy.join(", ") || "none");

/* ========================================================================
   14. SEARCH USES CANONICAL ROUTES
   ======================================================================== */
section("14. Search is canonical and destination-aware");

const searchIndex = codeOf(mustRead("src/lib/search-index.ts"));
check("The search index emits no legacy un-prefixed href",
  !new RegExp(`[\`"]/(?:${LEGACY})/`).test(searchIndex));
check("Search results carry a destination scope",
  /destinationId/.test(searchIndex));

const palette = codeOf(mustRead("src/components/search/CommandPalette.tsx"));
check("The command palette derives the destination from the URL, not a constant",
  /pathname[\s\S]{0,200}\/destinations\\?\//.test(palette) && !/=\s*"sikkim"/.test(palette),
  "reads /destinations/<id> from the pathname");

/* ========================================================================
   15. CAPABILITY-UNAVAILABLE ROUTES DO NOT FABRICATE
   ======================================================================== */
section("15. Capability gating");

const ungated = routePages.filter((f) => {
  if (f === HUB) return false; /* every destination has a hub page */
  const s = codeOf(readFileSync(f, "utf8"));
  if (!/generateStaticParams/.test(s)) return false;
  /* `destinationsWithAnyCapability` is the same gate over a set: the journey
     planner is generated where a destination has experiences OR approved
     knowledge, so that a researched destination with nothing visitable can
     say so rather than 404. Params are still derived from capabilities. */
  return !/destinationsWith(Any)?Capability/.test(s);
});
check("Every route generating params gates them on a capability",
  ungated.length === 0, ungated.join(", ") || "capability-gated");

const noCapabilityConst = routePages.filter((f) => {
  if (f === HUB) return false;
  const s = codeOf(readFileSync(f, "utf8"));
  return /generateStaticParams/.test(s) && !/const CAPABILITY\s*=/.test(s);
});
check("Each capability-gated route names the capability it requires",
  noCapabilityConst.length === 0, noCapabilityConst.join(", ") || `${routePages.length} pages`);

/* A destination without a capability must produce no route at all — not an
   empty page apologising for missing content, which reads as real coverage. */
/*
 * The `otherDestSections.length === 0` term was dropped from this check. It
 * meant "no destination but Sikkim has a content sub-tree", which stopped
 * being true when fourteen destinations gained their own story articles —
 * and it was never what this check is about. What it asserts is that the
 * resolver refuses a route for a capability a destination lacks, and that is
 * the two conditions that remain. Ownership of the sub-trees is asserted
 * directly in section 15.
 */
check("A missing capability yields no route rather than an empty page",
  /requireCapability/.test(resolveSrc) && /notFound\(\)/.test(resolveSrc));

/* ========================================================================
   16. SIKKIM CONTENT IS UNCHANGED
   ======================================================================== */
section("16. Sikkim content count is unchanged");

const total = Object.keys(BASELINE)
  .reduce((n, s) => n + Math.max(0, htmlCount(join(SIKKIM_OUT, s))), 0);
check("Sikkim still prerenders its full pre-migration content set",
  total === 249, `${total} pages (pre-migration baseline 249)`);

/* ========================================================================
   17-18. OTHER DESTINATIONS WORK
   ======================================================================== */
section("17-18. Jaipur and Kochi");

/* Read the document title and the destination's own metadata rather than
   scanning the whole file. Every page embeds the GLOBAL search index, which
   indexes all 18 destinations by design — matching raw HTML for "Rumtek"
   therefore flags the search payload, not leaked Sikkim content.

   Read these from a CLEAN build: a running server can re-render and overwrite
   a prerendered .html, and the re-rendered shell carries the layout's default
   title rather than the page's own. */
const NAMES = { jaipur: "Jaipur", kochi: "Kochi" };
for (const [id, name] of Object.entries(NAMES)) {
  const path = join(OUT, "destinations", `${id}.html`);
  check(`${id} prerenders its destination page`, existsSync(path));
  const html = existsSync(path) ? readFileSync(path, "utf8") : "";
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? "";
  const desc = html.match(/<meta name="description" content="(.*?)"/s)?.[1] ?? "";
  check(`${id} titles the page with its own name`,
    title.includes(name), title || "no title");
  check(`${id} describes itself, not Sikkim`,
    desc.includes(name) && !/Sikkim's|monasteries — 15/.test(desc), desc.slice(0, 60) || "no description");
  check(`${id} declares a canonical URL for its own destination`,
    !new RegExp(`rel="canonical"[^>]*/destinations/(?!${id})`).test(html));
  /*
   * `stories` is no longer a Sikkim-only sub-tree — the other destinations
   * have their own articles, and ownership is asserted by slug further up.
   * `monasteries` still is, and always should be: it is Sikkim's word for a
   * kind of site, and its appearance under Kochi would mean the old defect
   * had come back.
   */
  check(`${id} prerenders no Sikkim content sub-tree`,
    !existsSync(join(OUT, "destinations", id, "monasteries")));
}

/* ========================================================================
   19. SOCIAL CARDS BELONG TO THE DESTINATION
   ======================================================================== */
section("19. Social cards");

/* The failure this closes: the root layout declares one openGraph block, and
   metadata is merged shallowly, so every page without its own block emitted
   Sikkim's photograph of Rumtek with alt text naming Sikkim. Sharing
   /destinations/paris posted a Sikkim monastery. */

const destTypes = mustRead("src/types/destination.ts");
check("The destination record can carry its own social card",
  /socialCard\?:\s*DestinationSocialCard/.test(destTypes) &&
  /interface DestinationSocialCard/.test(destTypes),
  "optional — absent means no card, never another destination's");

check("The social card declares alt text and real dimensions",
  /alt:\s*string/.test(destTypes) && /width:\s*number/.test(destTypes) &&
  /height:\s*number/.test(destTypes));

/* Every declared card must point at a file that actually exists. A card is
   the one asset nobody on the team ever sees fail — it renders on someone
   else's timeline. */
const destFiles = SRC_FILES.filter((f) => f.startsWith("src/data/destinations/"));
const declaredCards = destFiles.flatMap((f) =>
  [...readFileSync(f, "utf8").matchAll(/socialCard:\s*\{[\s\S]*?url:\s*"([^"]+)"/g)]
    .map((m) => ({ file: f, url: m[1] })),
);
check("At least one destination declares a social card", declaredCards.length > 0,
  `${declaredCards.length} declared`);
const missingCardFile = declaredCards.filter((c) => !existsSync(join("public", c.url)));
check("Every declared social-card image exists in public/",
  missingCardFile.length === 0,
  missingCardFile.map((c) => c.url).join(", ") || declaredCards.map((c) => c.url).join(", "));

const hubSrc = codeOf(mustRead(join(APP, "page.tsx")));
/* Phase 12 moved the card block into one helper, because the page written
   immediately after the hub omitted its own block and inherited Sikkim's
   photograph again (found by qa:planner). The assertions follow it: the page
   must declare a card, and the helper must build it from the record. */
const cardSrc = codeOf(mustRead("src/lib/destinations/social-card.ts"));
check("The destination hub page declares its own openGraph block",
  /openGraph:\s*(?:await\s+)?(\{|destinationOpenGraph\()/.test(hubSrc) && /openGraph/.test(hubSrc),
  "so the root layout's Sikkim card cannot win by inheritance");
check("The hub page's card comes from the destination record, never a literal image",
  /destination\.socialCard/.test(cardSrc) && !/\/images\//.test(hubSrc) && !/\/images\//.test(cardSrc));
/*
 * A destination with NO PHOTOGRAPHS AT ALL still emits no card.
 *
 * The helper used to emit `images: []` whenever the registry declared no
 * card, which was every destination but Sikkim. It now falls back to the
 * destination's own first catalogued photograph — so the empty case is
 * narrower, and this checks the narrower thing: the fallback is seeded from
 * that destination's own places, and an empty array is still the answer when
 * it has none. A borrowed image remains unspellable.
 */
check("The fallback card is drawn from the destination's own records",
  /getPlaces\(destination\.id\)/.test(cardSrc) &&
    /places\.find\(\(place\) => place\.image\)/.test(cardSrc),
  "never a literal path, never another destination's id");
check("A destination with no photographs at all still emits no card",
  /let images[\s\S]{0,80}=\s*\[\]/.test(cardSrc), "empty array, not a borrowed image");

/* Detail pages legitimately declare their own card — a monastery page should
   show that monastery, not the destination's. What must never happen is a
   TYPED image path: that is how a page ends up showing a photograph of
   somewhere else. Every card image must come from the record being rendered
   or from the destination record via the helper. */
const ownedPages = routePages.filter((f) => /generateMetadata/.test(readFileSync(f, "utf8")));
const literalCardImage = ownedPages.filter((f) => {
  const src = codeOf(readFileSync(f, "utf8"));
  const block = src.match(/openGraph:\s*\{[\s\S]*?\n\s{4}\}/)?.[0] ?? "";
  return /url:\s*["'`]\//.test(block) || /images:\s*\[\s*["'`]/.test(block);
});
check("No destination page types an image path into its social card",
  literalCardImage.length === 0,
  literalCardImage.join(", ") || `${ownedPages.length} pages carry a card from a record`);
check("The hub page declares a canonical URL for its own destination",
  /alternates:\s*\{\s*canonical/.test(hubSrc) && /destinationPath\(destinationId\)/.test(hubSrc));

/* The proof is in the build output, not the source. Read from a CLEAN build:
   a running server re-renders pages and overwrites them with a shell that
   carries the layout's defaults. */
const ogImage = (html) => html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? "";
const ogAlt = (html) => html.match(/<meta property="og:image:alt" content="([^"]*)"/)?.[1] ?? "";

const destHtml = existsSync(join(OUT, "destinations"))
  ? readdirSync(join(OUT, "destinations")).filter((f) => f.endsWith(".html"))
  : [];
check("Every registered destination prerenders a page", destHtml.length === 18,
  `${destHtml.length} pages`);

/*
 * EVERY CARD IS THE DESTINATION'S OWN PHOTOGRAPH.
 *
 * This asserted that no destination except Sikkim emitted a card at all. That
 * was the right check while Sikkim held the only registry-declared card and
 * the only alternative was borrowing it — but it meant fourteen destinations
 * shared to Slack or WhatsApp as a bare grey link.
 *
 * Each now derives a card from its own first catalogued photograph. The
 * invariant being protected was never "emit nothing", it was "never another
 * destination's photograph", and that is what is checked here — against the
 * prerendered HTML, per destination, by path. Absence passed trivially;
 * ownership cannot.
 */
const borrowed = destHtml
  .map((f) => ({ f, id: f.replace(/\.html$/, ""), img: ogImage(readFileSync(join(OUT, "destinations", f), "utf8")) }))
  .filter((d) => d.img !== "")
  .filter((d) => {
    const ownsIt = d.id === "sikkim"
      ? /\/images\/(mon|sikkim)\//.test(d.img)
      : new RegExp(`/images/capsule/${d.id}/`).test(d.img);
    return !ownsIt;
  });
check("Every destination's card is its own photograph, never another's",
  borrowed.length === 0,
  borrowed.map((d) => `${d.f} -> ${d.img}`).join(", ") || `${destHtml.length} destinations, none borrowed`);

const sikkimHtml = existsSync(join(OUT, "destinations/sikkim.html"))
  ? readFileSync(join(OUT, "destinations/sikkim.html"), "utf8") : "";
check("Sikkim emits its own card, with its own alt text",
  /rumtek/.test(ogImage(sikkimHtml)) && /Rumtek/.test(ogAlt(sikkimHtml)),
  ogImage(sikkimHtml) || "no og:image");

/* The site root keeps its card — this phase moved the destination cards off
   the layout, it did not delete the site's own. */
const rootHtml = existsSync(join(OUT, "index.html"))
  ? readFileSync(join(OUT, "index.html"), "utf8") : "";
check("The site root still emits its own social card",
  ogImage(rootHtml) !== "" && ogAlt(rootHtml) !== "", ogImage(rootHtml) || "no og:image");

/* ========================================================================
   20. THE SITEMAP IS DERIVED, NOT LISTED
   ======================================================================== */
section("20. Sitemap is derived from the registry");

check("The sitemap hardcodes no destination path",
  !/\/destinations\/sikkim/.test(sitemapSrc),
  "no literal /destinations/sikkim/... entry survives");
check("The sitemap iterates the destination registry",
  /listDestinations\(\)/.test(sitemapSrc));
check("Sections come from the shared capability table",
  /CAPABILITY_SECTION/.test(sitemapSrc));
check("Detail pages come from the destination content accessors",
  /@\/lib\/destinations\/content/.test(sitemapSrc) &&
  !/@\/data\/(monasteries|stories|history|places|archive|curated-stays)/.test(sitemapSrc));
check("A section is emitted only where the capability resolves",
  /capabilities\[capability\]/.test(sitemapSrc) && /capabilities\[route\.capability\]/.test(sitemapSrc));

const sectionsSrc = mustRead("src/lib/destinations/sections.ts");
check("One capability-to-section table exists, and it holds segments not paths",
  /CAPABILITY_SECTION/.test(sectionsSrc) &&
  !/["`]\/destinations\//.test(codeOf(sectionsSrc)),
  "the destination id is applied by the path helper, not typed into the table");
const duplicateTables = SRC_FILES
  .filter((f) => f !== "src/lib/destinations/sections.ts")
  .filter((f) => /sites:\s*"[^"]*monasteries/.test(codeOf(readFileSync(f, "utf8"))));
check("No second capability-to-route table exists",
  duplicateTables.length === 0, duplicateTables.join(", ") || "one table");

if (existsSync(sitemapXml)) {
  const xml = readFileSync(sitemapXml, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const hubs = locs.filter((u) => /\/destinations\/[a-z-]+$/.test(u));
  check("The sitemap lists every destination's hub page",
    hubs.length === 18, `${hubs.length} hub pages`);

  /* The check that matters: a destination without a capability must not be
     advertised as having one. Before this phase the sitemap could not have
     got this wrong, because it never mentioned another destination at all. */
  /*
   * PHASE 18: eight capsule destinations now legitimately have sections, so
   * "no non-Sikkim section appears" is no longer the test — it would have
   * passed for the wrong reason. The real requirement was always that an
   * advertised URL resolves, so that is now what is checked, against the
   * build output rather than a pattern.
   */
  const advertised = locs
    .map((u) => u.replace(/^https?:\/\/[^/]+/, ""))
    .filter((path) => /^\/destinations\/[a-z-]+\/[a-z]/.test(path));
  const phantom = advertised.filter((path) => {
    const parts = path.split("/").filter(Boolean);
    const [, destinationId, ...rest] = parts;
    const target = join(OUT, "destinations", destinationId, rest.join("/"));
    /* A route resolves if it prerendered a page, or is a dynamic route whose
       segment directory exists (discover and plan are rendered per request). */
    return !existsSync(`${target}.html`) && !existsSync(target) &&
      !["discover", "plan"].includes(rest[0]);
  });
  check("Every advertised section actually resolves",
    phantom.length === 0, phantom.slice(0, 3).join(", ") || `${advertised.length} section URLs checked`);

  const sikkimLocs = locs.filter((u) => u.includes("/destinations/sikkim/"));
  check("Sikkim's full corpus is still in the sitemap",
    sikkimLocs.length >= 253, `${sikkimLocs.length} Sikkim URLs`);

  const dupeLocs = locs.filter((u, i) => locs.indexOf(u) !== i);
  check("The sitemap contains no duplicate URL",
    dupeLocs.length === 0, [...new Set(dupeLocs)].slice(0, 3).join(", ") || `${locs.length} unique`);
}

/* ========================================================================
   21. BREADCRUMBS REACH DETAIL PAGES
   ======================================================================== */
section("21. Breadcrumbs");

const noCrumb = routePages
  .filter((f) => f !== HUB)
  .filter((f) => !/DestinationBreadcrumb/.test(readFileSync(f, "utf8")));
check("Every destination page below the hub renders a breadcrumb",
  noCrumb.length === 0, noCrumb.join(", ") || `${routePages.length - 1} pages`);

const crumbSrc = mustRead("src/components/destinations/DestinationBreadcrumb.tsx");
check("The breadcrumb names no destination of its own",
  !/Sikkim/.test(codeOf(crumbSrc)), "it labels whatever the caller resolved");

const literalCrumbName = routePages.filter((f) =>
  /destinationName="\w/.test(codeOf(readFileSync(f, "utf8"))));
check("No page hardcodes the destination name in its breadcrumb",
  literalCrumbName.length === 0, literalCrumbName.join(", ") || "all from the resolver");

const literalCrumbHref = routePages.filter((f) =>
  /sectionHref="\//.test(codeOf(readFileSync(f, "utf8"))));
check("Breadcrumb section links are built from the destination, not typed",
  literalCrumbHref.length === 0, literalCrumbHref.join(", ") || "all via destinationPath");

/* Rendered proof on one detail page per content type. A breadcrumb that
   exists in source but not in output is not a breadcrumb. */
const DETAIL_SAMPLES = [
  "destinations/sikkim/monasteries/rumtek.html",
  "destinations/sikkim/stories/the-dharma-kings.html",
  "destinations/sikkim/history/yuksom-coronation-1642.html",
];
for (const rel of DETAIL_SAMPLES) {
  const path = join(OUT, rel);
  const html = existsSync(path) ? readFileSync(path, "utf8") : "";
  check(`${rel.split("/").slice(-2).join("/")} renders a breadcrumb nav`,
    /aria-label="Breadcrumb"/.test(html) && />Explore</.test(html),
    existsSync(path) ? "" : "page missing");
}

/* ========================================================================
   22. THE REMAINING SINGLE-DESTINATION LITERALS DO NOT GROW
   ======================================================================== */
section("22. Hardcoded-destination ratchet");

/* Honest accounting. Destination-native pages still contain literal
   "/destinations/sikkim/..." strings in structured data, in-page links and
   related-content lists. Every one of them renders correctly today, because
   these routes are generated only for destinations that have the capability
   and Sikkim is the only one that does — so none of them is a live defect,
   and rewriting all of them was outside this phase.

   What must not happen is the number going UP. This is a ratchet: lower it
   when you fix some, and it fails the day a new page is written with a typed
   Sikkim path. The count excludes nothing — including the one deliberate
   link, the hub page's "See Sikkim" pointer to the reference destination. */
const HARDCODED_BASELINE = 78;
const hardcoded = routePages
  .map((f) => ({ f, n: (readFileSync(f, "utf8").match(/\/destinations\/sikkim/g) ?? []).length }))
  .filter((x) => x.n > 0);
const hardcodedTotal = hardcoded.reduce((n, x) => n + x.n, 0);
check("Hardcoded Sikkim paths in destination routes do not increase",
  hardcodedTotal <= HARDCODED_BASELINE,
  `${hardcodedTotal} literals across ${hardcoded.length} pages (baseline ${HARDCODED_BASELINE})`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
