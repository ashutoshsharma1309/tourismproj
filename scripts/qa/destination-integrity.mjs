/**
 * Destination architecture integrity — structure, routing and isolation.
 *
 * This is the suite Phase 2 said had to exist before an AI research engine
 * could be trusted to write into this codebase. It answers one question the
 * type system cannot: does the destination abstraction actually hold, at
 * runtime, for all fifteen registered destinations — and can one destination's
 * content reach another's page?
 *
 * Three layers, deliberately:
 *
 *   A. REGISTRY STRUCTURE — parsed from the TypeScript sources, the way every
 *      other QA script in this project reads data (plain node, no TS loader).
 *   B. ROUTE RESOLUTION — the prerendered HTML must exist for all fifteen.
 *   C. RENDERED ISOLATION — assertions against what a visitor actually sees.
 *
 * Layer C is the one that matters. A structural test can pass while a page
 * still renders another destination's monasteries, so the isolation checks
 * read the built HTML and look inside <main> — the visible page — rather than
 * trusting that the data layer was wired correctly.
 *
 * WHY <main> AND NOT THE WHOLE DOCUMENT
 * The root layout builds the site-wide ⌘K search index and serialises it into
 * every page, so every document contains ~1,140 Sikkim search records
 * regardless of which destination it renders. That is global navigation, not
 * destination content, and it predates the destination architecture. Asserting
 * over the whole document would fail on a condition this suite is not testing.
 * The limitation is real and is recorded in docs/phase-2.5-hardening.md.
 *
 *   node scripts/qa/destination-integrity.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p) => readFileSync(p, "utf8");

let failures = 0;
let passes = 0;
const check = (name, pass, detail = "") => {
  if (pass) passes += 1;
  else failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (title) => console.log(`\n── ${title} ──`);

/* =========================================================================
   The fifteen destinations this suite exists to guarantee.
   Hard-coded on purpose: if the registry silently loses one, the test must
   fail rather than quietly validate a shorter list.
   ========================================================================= */
const EXPECTED = [
  "sikkim", "delhi", "jaipur", "varanasi", "agra", "mumbai", "kolkata",
  "hyderabad", "kochi", "goa", "kyoto", "paris", "rome", "istanbul",
  "new-york-city",
];

/** Every destination other than the deep reference implementation. */
const NON_SIKKIM = EXPECTED.filter((id) => id !== "sikkim");

/**
 * Destinations with reviewer-approved published knowledge (Phase 5).
 *
 * These legitimately render content, so they are exempt from the
 * "renders explicit absence" check — and ONLY from that one. Every isolation
 * check still applies to them: a destination gaining its own knowledge must
 * not gain any of Sikkim's.
 */
const PUBLISHED = (() => {
  try {
    const data = JSON.parse(read("src/data/generated/published-knowledge.json"));
    return new Set(Object.keys(data.destinations ?? {}));
  } catch {
    return new Set();
  }
})();

/**
 * Destinations carrying a capsule (Phase 18).
 *
 * Like the published ones, these legitimately render content and are exempt
 * from the absence check ALONE. Read from the registry rather than listed
 * here, so a capsule added tomorrow does not need this file edited — and a
 * destination that renders content without a capsule or published knowledge
 * still fails, which is the point.
 */
const CAPSULED = new Set(
  [...read("src/data/destinations/capsules/ids.ts").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]),
);

/** Destinations that must still hold no content at all. */
const MUST_BE_EMPTY = NON_SIKKIM.filter((id) => !PUBLISHED.has(id) && !CAPSULED.has(id));

/* =========================================================================
   A. REGISTRY STRUCTURE
   ========================================================================= */
section("A. Registry structure");

const sikkimSrc = read("src/data/destinations/sikkim.ts");
const plannedSrc = read("src/data/destinations/planned.ts");
const registrySrc = read("src/lib/destinations/registry.ts");
const contentSrc = read("src/lib/destinations/content.ts");

/**
 * Pull each destination record out of the sources.
 *
 * Records are flat object literals with predictable keys, so a field-scoped
 * regex is enough and avoids a TS loader. Anything this cannot parse shows up
 * as a missing field below rather than passing silently.
 */
function parseRecords(src, indent) {
  /*
   * `indent` scopes the match to top-level destination fields. Without it the
   * parser also matched `id: "buddhist-tradition"` nested inside Sikkim's
   * taxonomy and reported a sixteenth destination with no geography — a real
   * bug in an early version of this test, kept in mind here because a looser
   * regex would have made every future nested id a phantom destination.
   */
  const pad = " ".repeat(indent);
  const idRe = new RegExp(`^${pad}id:\\s*"([a-z0-9-]+)",`, "gm");
  const nextRe = new RegExp(`^${pad}id:\\s*"`, "m");
  const out = [];
  for (const m of src.matchAll(idRe)) {
    const start = m.index;
    const rest = src.slice(start + m[0].length);
    const nextId = rest.search(nextRe);
    const end = nextId === -1 ? src.length : start + m[0].length + nextId;
    out.push({ id: m[1], block: src.slice(start, end) });
  }
  return out;
}

/* Sikkim's record is a bare object (2-space fields); planned records sit
   inside an array literal (4-space fields). */
const records = [...parseRecords(sikkimSrc, 2), ...parseRecords(plannedSrc, 4)];
const ids = records.map((r) => r.id);

check("All 15 destinations registered", ids.length === 15, `found ${ids.length}: ${ids.join(", ")}`);
check(
  "Registry contains exactly the expected ids",
  EXPECTED.every((id) => ids.includes(id)),
  EXPECTED.filter((id) => !ids.includes(id)).join(", ") || "all present",
);
check("No duplicate destination ids", new Set(ids).size === ids.length,
  `${ids.length} ids, ${new Set(ids).size} unique`);

/* Security: an id becomes a URL segment and a static-params value. Anything
   outside this shape could reach a path or a module specifier. */
const BAD_ID = ids.filter((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id));
check("All destination ids are URL-safe (lowercase, no traversal)", BAD_ID.length === 0,
  BAD_ID.join(", ") || "15/15 safe");

const IANA = /^[A-Za-z]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/;
for (const rec of records) {
  const field = (name) => {
    const m = rec.block.match(new RegExp(`${name}:\\s*"([^"]*)"`));
    return m ? m[1] : null;
  };
  const num = (name) => {
    const m = rec.block.match(new RegExp(`${name}:\\s*(-?[0-9.]+)`));
    return m ? Number(m[1]) : null;
  };

  const name = field("name");
  const countryName = rec.block.match(/country:\s*\{\s*code:\s*"([A-Z]{2})",\s*name:\s*"([^"]+)"/);
  const tz = field("timezone");
  const lat = num("lat");
  const lng = num("lng");

  const problems = [];
  if (!name) problems.push("no name");
  if (!countryName) problems.push("no valid country {code,name}");
  if (!tz || !IANA.test(tz)) problems.push(`bad timezone ${tz ?? "(missing)"}`);
  if (lat === null || lat < -90 || lat > 90) problems.push(`bad lat ${lat}`);
  if (lng === null || lng < -180 || lng > 180) problems.push(`bad lng ${lng}`);

  check(`  ${rec.id}: identity + geography valid`, problems.length === 0, problems.join("; "));
}

/* Division vocabulary. Sikkim declares six districts built from the tuple in
   @/types; every planned destination declares none. A planned destination that
   grew divisions would mean content arrived without review. */
check(
  "Sikkim builds divisions from SIKKIM_DISTRICTS (single source of truth)",
  /divisions:\s*SIKKIM_DISTRICTS\.map/.test(sikkimSrc),
  "derived, not retyped",
);
check(
  "Sikkim builds its taxonomy from MONASTERY_TRADITIONS",
  /MONASTERY_TRADITIONS\.map/.test(sikkimSrc),
  "derived, not retyped",
);
const plannedWithDivisions = parseRecords(plannedSrc, 4).filter(
  (r) => !/divisions:\s*\[\]/.test(r.block),
);
check("Registered destinations declare zero divisions", plannedWithDivisions.length === 0,
  plannedWithDivisions.map((r) => r.id).join(", ") || "all empty");
/*
 * PHASE 18 — a destination may now declare `planned` OR `capsule`, and the
 * declaration must be backed by a file.
 *
 * The old check said all fourteen are "planned", which was true while none of
 * them had content and would have quietly passed forever afterwards. What it
 * was really protecting is that nothing declares a depth it cannot support,
 * so that is what is checked: a capsule destination must have a capsule
 * registered, and a planned one must not.
 */
const capsuleIds = [
  ...readFileSync("src/data/destinations/capsules/ids.ts", "utf8").matchAll(/"([a-z-]+)"/g),
].map((m) => m[1]);
/*
 * PHASE B: a registered capsule may declare a depth ABOVE "capsule".
 *
 * Jaipur and Kyoto now hold both a capsule and reviewed research knowledge, so
 * they declare "curated" and "researched" — which is what their coverage
 * earns. The rule the check enforces is unchanged in substance: a destination
 * must not claim a depth its content cannot support, and must not claim
 * "planned" while holding records.
 */
const DEPTH_RANK = { planned: 0, capsule: 1, researched: 2, curated: 3, deep: 4 };
const badDepth = parseRecords(plannedSrc, 4).filter((r) => {
  const depth = /depth:\s*"([a-z]+)"/.exec(r.block)?.[1];
  if (!depth) return true;
  /* Holding a capsule means at least capsule depth. */
  if (capsuleIds.includes(r.id)) return DEPTH_RANK[depth] < DEPTH_RANK.capsule;
  /* Holding no capsule means it cannot claim capsule depth on records alone. */
  return depth === "capsule";
});
check("Every registered destination declares a depth its content supports",
  badDepth.length === 0,
  badDepth.map((r) => r.id).join(", ") ||
    `${capsuleIds.length} capsule, ${parseRecords(plannedSrc, 4).length - capsuleIds.length} planned`);

/* No hand-retyped district list may reappear anywhere. */
const RETYPED = [];
for (const dir of ["src/data", "src/lib", "src/components", "src/app"]) {
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const s = read(p);
        if (/"Gangtok",\s*\n\s*"Mangan",/.test(s)) RETYPED.push(p);
      }
    }
  };
  walk(dir);
}
check("No module retypes the district list", RETYPED.length === 0,
  RETYPED.join(", ") || "single source of truth holds");

/* =========================================================================
   B. ROUTE RESOLUTION + ACCESSOR SAFETY
   ========================================================================= */
section("B. Route resolution and accessor safety");

const OUT = ".next/server/app/destinations";
const built = existsSync(OUT)
  ? readdirSync(OUT).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""))
  : [];

check("Build output present (run `npm run build` first)", built.length > 0,
  built.length ? `${built.length} pages` : "no .next output found");

if (built.length) {
  check("All 15 destination routes resolve to a prerendered page",
    EXPECTED.every((id) => built.includes(id)),
    EXPECTED.filter((id) => !built.includes(id)).join(", ") || "15/15");
  check("No extra destination routes beyond the registry",
    built.every((id) => EXPECTED.includes(id)),
    built.filter((id) => !EXPECTED.includes(id)).join(", ") || "no strays");
  check("One page per destination (no duplicate route mappings)",
    new Set(built).size === built.length, `${built.length} files, ${new Set(built).size} unique`);
}

/* =========================================================================
   THE SHARED ROUTE TREE NAMES NO DESTINATION
   ========================================================================= */
section("B2. The engine is destination-agnostic");

/*
 * WHY THIS CHECK EXISTS
 * ---------------------
 * Every page under `app/destinations/[destinationId]/` renders for whichever
 * destination the URL names. Eighty of those lines hardcoded
 * `/destinations/sikkim/...` — breadcrumbs, prev/next links, related places,
 * canonical URLs. It was invisible because most of those routes only generate
 * for Sikkim today, and it would have become fifteen wrong links the moment a
 * second destination gained that content.
 *
 * A literal destination id inside the shared tree is now a failure. The one
 * legitimate exception is a server action with no destination in scope, which
 * names the archive it actually feeds and says so.
 */
const SHARED_ROOT = "src/app/(v1)/destinations/[destinationId]";
const ALLOWED_LITERALS = new Set(["archive/contribute/actions.ts"]);

const sharedFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) sharedFiles.push(full);
  }
};
if (existsSync(SHARED_ROOT)) walk(SHARED_ROOT);

const offenders = [];
for (const file of sharedFiles) {
  const relative = file.slice(SHARED_ROOT.length + 1);
  if (ALLOWED_LITERALS.has(relative)) continue;
  /* Comments legitimately mention Sikkim's routes; only code counts. */
  const code = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const hits = (code.match(/\/destinations\/(?!\$\{)[a-z-]+/g) ?? []).filter(
    (hit) => EXPECTED.some((id) => hit === `/destinations/${id}`),
  );
  if (hits.length > 0) offenders.push(`${relative} (${hits.length})`);
}

check("No shared destination route hardcodes a destination id",
  offenders.length === 0,
  offenders.slice(0, 4).join(", ") || `${sharedFiles.length} files clean`);

/* Accessors must be allowlisted, not string-interpolated into a specifier.
   A dynamic import built from a destination id would be a module-injection
   surface the moment an id came from a URL. */
check(
  "No dynamic import is built from a destination id",
  !/import\(\s*[`'"][^`'"]*\$\{/.test(contentSrc),
  "all import() specifiers are string literals",
);
check(
  "Destination lookup is a fixed Map, not filesystem resolution",
  /new Map\(/.test(registrySrc) && !/readFile|readdir|join\(/.test(registrySrc),
  "allowlisted registry",
);
check(
  "Unknown destination returns null rather than throwing",
  /return BY_ID\.get\(id\)\s*\?\?\s*null/.test(registrySrc),
  "null, handled as 404",
);
check(
  "Destination route refuses unregistered params",
  /dynamicParams\s*=\s*false/.test(read("src/app/(v1)/destinations/[destinationId]/page.tsx")),
  "dynamicParams = false",
);

/* =========================================================================
   C. RENDERED ISOLATION — what a visitor actually sees
   ========================================================================= */
section("C. Cross-destination isolation (rendered output)");

/**
 * Markers that only exist in Sikkim's corpus. Deliberately NOT the word
 * "Sikkim" — a planned destination legitimately links to Sikkim as the
 * reference implementation, and testing for the word would fail on a
 * cross-reference that is correct.
 */
const SIKKIM_CONTENT = {
  monasteries: ["Rumtek", "Pemayangtse", "Tashiding", "Enchey", "Phodong", "Dubdi"],
  districts: ["Gangtok", "Gyalshing", "Namchi", "Mangan", "Pakyong", "Soreng"],
  traditions: ["Nyingma", "Kagyu", "Zurmang"],
  places: ["Tsomgo", "Yuksom", "Nathula", "Ravangla", "Pelling", "Lachung"],
  stays: ["Mayfair", "Denzong", "Chumbi"],
  stories: ["Norbugang", "Kabi", "Losar", "Pang Lhabsol"],
};

const mainOf = (id) => {
  const p = join(OUT, `${id}.html`);
  if (!existsSync(p)) return null;
  const m = read(p).match(/<main id="main".*?<\/main>/s);
  return m ? m[0].replace(/<[^>]+>/g, " ") : null;
};

if (built.length) {
  /* The specific pairings the phase brief called out, plus every other
     planned destination — a leak into Agra matters as much as one into Rome. */
  for (const id of NON_SIKKIM) {
    const body = mainOf(id);
    if (body === null) {
      check(`  ${id}: page renders`, false, "no built page");
      continue;
    }
    const leaks = [];
    for (const [kind, terms] of Object.entries(SIKKIM_CONTENT)) {
      for (const t of terms) if (body.includes(t)) leaks.push(`${kind}:${t}`);
    }
    check(`  ${id}: no Sikkim content in rendered page`, leaks.length === 0,
      leaks.join(", ") || "clean");
  }

  /* Sikkim keeps its own content — the isolation must not be achieved by
     rendering nothing anywhere. */
  const sikkimBody = mainOf("sikkim");
  check("  sikkim: still renders its own divisions",
    sikkimBody !== null && SIKKIM_CONTENT.districts.some((d) => sikkimBody.includes(d)),
    "districts present");
  check("  sikkim: still links to its heritage content",
    sikkimBody !== null && /Heritage sites/.test(sikkimBody), "capability links present");
}

/* =========================================================================
   D. CAPABILITY RENDERING — absence must render as absence
   ========================================================================= */
section("D. Capability rendering");

if (built.length) {
  for (const id of MUST_BE_EMPTY) {
    const body = mainOf(id) ?? "";
    const problems = [];
    if (!/Not yet available/.test(body)) problems.push("no explicit unavailable state");
    /* A destination with no content must not advertise sections. */
    if (/Only sections with content are listed/.test(body)) problems.push("renders the Explore list");
    for (const label of ["Heritage sites", "Stories", "Trip planner", "Audio guides", "Trade register"]) {
      if (body.includes(label)) problems.push(`offers "${label}"`);
    }
    check(`  ${id}: renders explicit absence, offers nothing`, problems.length === 0,
      problems.join("; ") || "clean");
  }

  /*
   * Destinations that HAVE published knowledge get the opposite check: they
   * must render their own content, and must not claim Sikkim's depth.
   */
  for (const id of NON_SIKKIM.filter((d) => PUBLISHED.has(d))) {
    const body = mainOf(id) ?? "";
    const problems = [];
    if (/Not yet available[\s\S]{0,80}is registered in the destination architecture/.test(body)) {
      problems.push("still renders the unavailable panel");
    }
    if (!/Researched knowledge/.test(body)) problems.push("does not render its published knowledge");
    if (/Deep archive/.test(body)) problems.push("claims deep-archive authority");
    check(`  ${id}: renders its own knowledge without claiming deep authority`,
      problems.length === 0, problems.join("; ") || "clean");
  }

  check("Capabilities are derived from content, not declared",
    /sites:\s*sites\.length\s*>\s*0/.test(contentSrc) &&
      /stories:\s*stories\.length\s*>\s*0/.test(contentSrc),
    "derived from presence");
  /*
   * PHASE 17 widened both conditions: a destination can now also hold a
   * capsule, so "planned and no knowledge" became "planned, no knowledge and
   * no capsule". The guarantees are unchanged and the first one is stricter
   * than it reads — capsule MEMBERSHIP is answered from `capsules/ids.ts`,
   * which imports nothing, so a destination with neither still performs zero
   * dynamic imports before short-circuiting.
   */
  check("A planned destination with no published knowledge loads no content modules",
    /destination\.depth === "planned" && !knowledge && !capsule\) return NO_CAPABILITIES/.test(contentSrc) &&
      /hasCapsuleId\(destinationId\)/.test(contentSrc),
    "short-circuits before any dynamic import");
  check("Published knowledge or a reviewed capsule is the only route out of planned",
    /if \(destination\.depth === "planned" && !capsule\) \{/.test(contentSrc) &&
      /return \{ \.\.\.NO_CAPABILITIES, knowledge: true \};/.test(contentSrc),
    "research + review, or a reviewed capsule");
  check("Trip planner is gated to deep destinations only",
    /tripPlanner:\s*destination\.depth === "deep"/.test(contentSrc),
    "Sikkim only");
}

/* =========================================================================
   E. GENERIC COMPONENTS CARRY NO SIKKIM ASSUMPTIONS
   ========================================================================= */
section("E. Generic layer independence");

const genericFiles = [
  "src/types/destination.ts",
  "src/lib/destinations/registry.ts",
  "src/lib/destinations/index.ts",
  "src/components/ui/DepthBadge.tsx",
  "src/app/(v1)/destinations/page.tsx",
];
for (const f of genericFiles) {
  const s = read(f);
  /*
   * Static imports of ONE DESTINATION's content would defeat the lazy
   * boundary and bind the generic layer to Sikkim.
   *
   * `published-knowledge` is exempt, and the exemption is the point rather
   * than a loophole: it is the multi-destination published layer — it holds
   * sikkim, jaipur and kyoto together — and the global map needs it to know
   * which destinations have knowledge at all. Binding to it binds the generic
   * layer to every destination equally, which is what "generic" means here.
   *
   * The compensating guarantee is asserted separately below: what crosses to
   * the browser must be metadata, not content.
   */
  const ALLOWED = ["@/data/published-knowledge"];
  const bad = [...s.matchAll(/^import .*from "(@\/data\/(?!destinations)[^"]+)"/gm)]
    .map((m) => m[1])
    .filter((mod) => !ALLOWED.includes(mod));
  check(`  ${f.replace("src/", "")}: no single-destination content import`, bad.length === 0,
    bad.join(", ") || "clean");
}
/*
 * The compensating check for the exemption above: the global page may know
 * WHICH destinations have knowledge, and must not ship WHAT that knowledge is.
 */
/* OUT is the destination-pages directory; the global page sits one level up. */
const GLOBAL_PAGE = join(process.cwd(), ".next", "server", "app", "destinations.html");
check("The global page is prerendered and available to check", existsSync(GLOBAL_PAGE),
  "a skipped check reads as a pass, so its absence must fail");
if (existsSync(GLOBAL_PAGE)) {
  const globalMain = (read(GLOBAL_PAGE).match(/<main id="main".*?<\/main>/s) ?? [""])[0]
    .replace(/<[^>]+>/g, " ");
  const leaked = SIKKIM_CONTENT.monasteries
    .concat(SIKKIM_CONTENT.districts, SIKKIM_CONTENT.traditions)
    .filter((t) => globalMain.includes(t));
  check("The global page ships destination status, not destination content",
    leaked.length === 0, leaked.join(", ") || "metadata only");
}

check(
  "content.ts loads every corpus via dynamic import only",
  !/^import \{[^}]*\} from "@\/data\/(monasteries|places|stories|history|archive)/m.test(contentSrc),
  "lazy boundary intact",
);

/* =========================================================================
   F. SOURCE SCOPING AND PROVENANCE (Phase 2.5)
   ========================================================================= */
section("F. Source scoping and provenance");

const sourcesSrc = read("src/data/sources.ts");

/* Parse the registry the same way section A parses destinations. */
const sourceRecords = [...sourcesSrc.matchAll(/^  "([a-z0-9-]+)": \{(.*?)^  \},/gms)].map(
  (m) => ({ id: m[1], block: m[2] }),
);

check("Source registry parsed", sourceRecords.length > 0, `${sourceRecords.length} sources`);

const unscoped = sourceRecords.filter((r) => !/\n\s*scope:/.test(r.block));
check("Every source declares a scope", unscoped.length === 0,
  unscoped.map((r) => r.id).join(", ") || `${sourceRecords.length}/${sourceRecords.length} scoped`);

const noMethod = sourceRecords.filter((r) => !/\n\s*retrievalMethod:/.test(r.block));
check("Every source declares a retrievalMethod", noMethod.length === 0,
  noMethod.map((r) => r.id).join(", ") || `${sourceRecords.length}/${sourceRecords.length}`);

/* A scope naming a destination that is not registered would be a dangling
   evidence relationship — the exact silent break this phase exists to stop. */
/* Scope forms in src/data/sources.ts: three shorthand aliases, plus
   `forDestination("id")` for destinations added from Phase 4 onward. This
   test knew only the aliases and reported every Phase 4 official source as
   dangling — the same blind spot the engine's own parser had. Both read the
   same file and must recognise the same forms. */
const scopeOf = (block) => {
  const alias = block.match(/scope:\s*(SIKKIM|INDIA|GLOBAL)\s*,/)?.[1];
  if (alias) return alias;
  const perDest = block.match(/scope:\s*forDestination\("([a-z0-9-]+)"\)/)?.[1];
  return perDest ? `DEST:${perDest}` : null;
};
const ALIAS_DEST = { SIKKIM: "sikkim" };
const dangling = sourceRecords.filter((r) => {
  const sc = scopeOf(r.block);
  if (!sc) return true;
  if (sc === "GLOBAL" || sc === "INDIA") return false;
  const dest = sc.startsWith("DEST:") ? sc.slice(5) : (ALIAS_DEST[sc] ?? null);
  return dest === null || !EXPECTED.includes(dest);
});
check("No source scoped to an unregistered destination", dangling.length === 0,
  dangling.map((r) => r.id).join(", ") || "all scopes resolve");

const counts = sourceRecords.reduce((acc, r) => {
  const sc = scopeOf(r.block) ?? "?";
  acc[sc] = (acc[sc] ?? 0) + 1;
  return acc;
}, {});
check("Sikkim's government sources are destination-scoped, not global",
  (counts.SIKKIM ?? 0) > 0 && !Object.keys(counts).includes("?"),
  Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" "));

/* Phase 3 gate, asserted from the baseline: nothing a model proposed exists
   yet, so the day one appears it is a deliberate act, not a drift. */
const modelProposed = sourceRecords.filter((r) => /retrievalMethod:\s*"model-proposed"/.test(r.block));
check("No model-proposed source is registered yet (Phase 3 baseline)",
  modelProposed.length === 0, modelProposed.map((r) => r.id).join(", ") || "0");

/* Scoping must be structural. String matching on ids or URLs is exactly the
   hack the phase brief forbids, so assert the resolver does not do it. */
check("Scope resolution is structural, not string matching",
  /switch \(source\.scope\.kind\)/.test(sourcesSrc) &&
    !/\.id\.(includes|startsWith)\(/.test(sourcesSrc),
  "switches on scope.kind");
check("country-scoped sources fail closed without a country",
  /countryCode !== undefined && source\.scope\.countryCode === countryCode/.test(sourcesSrc),
  "refuses when unknown");
check("A publishable-source gate exists for Phase 3",
  /retrievalMethod !== "model-proposed"/.test(sourcesSrc), "publishableSources()");
check("getSources filters by scope rather than returning the whole registry",
  /sourcesForDestination\(destinationId, destination\.country\.code\)/.test(contentSrc) &&
    !/return Object\.values\(SOURCES\)/.test(contentSrc),
  "scoped");

/* The provenance architecture that already existed must be untouched. */
const storyTypes = read("src/data/stories/types.ts");
check("ClaimType intact (documented history | oral tradition | legend | travel story)",
  /"documented history"/.test(storyTypes) && /"oral tradition"/.test(storyTypes) &&
    /"legend"/.test(storyTypes) && /"travel story"/.test(storyTypes),
  "4 claim types");
check("Provenance still carries sourceId, verifiedAt, confidence",
  /sourceId:/.test(sourcesSrc) && /verifiedAt:/.test(sourcesSrc) && /confidence:/.test(sourcesSrc),
  "intact");
check('getSource still returns undefined for the "internal" sentinel',
  /return SOURCES\[id\];/.test(sourcesSrc), "unchanged");

/* Pending-review invariant. */
const submissions = read("src/lib/archive-submissions.ts");
const statuses = [...submissions.matchAll(/status:\s*"([a-z-]+)"/g)].map((m) => m[1]);
check("Submissions can only ever be pending-review",
  statuses.every((s) => s === "pending-review"),
  `statuses assigned: ${[...new Set(statuses)].join(", ") || "none"}`);
check("SubmissionStatus type admits no published state",
  /export type SubmissionStatus = "pending-review";/.test(submissions), "single-value union");

/* =========================================================================
   SUMMARY
   ========================================================================= */
console.log(`\n${passes} passed, ${failures} failed\n`);
process.exit(failures === 0 ? 0 : 1);
