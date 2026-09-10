/**
 * Data-integrity audit — the two state trade registers.
 *
 * The registers are the first data in this project that is *about businesses*,
 * and that changes what a mistake costs. A wrong founding year on a monastery
 * is an error; a wrong licence state against a named hotel with a published
 * telephone number is closer to a defamation. So the checks here are less
 * about completeness than about the two failure modes that would actually
 * damage someone:
 *
 *   1. An absent grade rendering as a bad grade.
 *   2. A statement about a *register entry* being rendered as a statement
 *      about a *business*.
 *
 * Both are enforced mechanically below, including a scan of the rendering
 * layer for the specific words that would cross that line.
 *
 *   node scripts/qa/industry-integrity.mjs
 */

import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const hotels = JSON.parse(read("src/data/generated/registered-hotels.json"));
const agents = JSON.parse(read("src/data/generated/registered-travel-agents.json"));

const DISTRICTS = new Set(["Gangtok", "Mangan", "Namchi", "Gyalshing", "Pakyong", "Soreng"]);

console.log(
  `\n${hotels.hotels.length} hotels · ${agents.agents.length} travel agencies · ` +
    `read ${hotels.retrievedAt} / ${agents.retrievedAt}\n`,
);

/* ------------------------------------------------------------ provenance */

for (const [label, reg] of [["hotels", hotels], ["agencies", agents]]) {
  check(
    `${label}: register records its source URL`,
    typeof reg.source?.url === "string" && reg.source.url.startsWith("https://sikkimtourism.gov.in/"),
    reg.source?.url,
  );
  check(
    `${label}: register records the date it was read`,
    /^\d{4}-\d{2}-\d{2}$/.test(reg.retrievedAt ?? ""),
    reg.retrievedAt,
  );
}

check(
  "agencies: published count matches the department's reported total",
  agents.agents.length === agents.reportedTotal,
  `${agents.agents.length} published, ${agents.reportedTotal} reported`,
);

/* The hotels register reports 907 and names 905; the two unnamed entries are a
   known, documented shortfall rather than a bug, so this asserts the shortfall
   has not silently grown. */
check(
  "hotels: shortfall against the reported total is still the documented two",
  hotels.reportedTotal - hotels.hotels.length === 2,
  `${hotels.reportedTotal} reported, ${hotels.hotels.length} named`,
);

/* ------------------------------------------------------------- identity */

for (const [label, rows] of [["hotels", hotels.hotels], ["agencies", agents.agents]]) {
  const slugs = rows.map((r) => r.slug);
  check(`${label}: no duplicate slugs`, new Set(slugs).size === slugs.length,
    `${slugs.length - new Set(slugs).size} duplicates`);

  check(`${label}: every entry has a non-empty name`,
    rows.every((r) => typeof r.name === "string" && r.name.trim() !== ""));

  const badDistrict = rows.filter((r) => r.district && !DISTRICTS.has(r.district));
  check(`${label}: every district is one of the six current names`,
    badDistrict.length === 0,
    [...new Set(badDistrict.map((r) => r.district))].join(", "));
}

/* ---------------------------------------------------------------- grades */

/* The load-bearing one. The registers grade 22 hotels and 70 agencies; if a
   promotion step ever coerced a missing grade into a string, 2,671 businesses
   would acquire a rating the state never gave them. */
const hotelGraded = hotels.hotels.filter((h) => h.category !== null);
const agentGraded = agents.agents.filter((a) => a.grade !== null);

check(
  "hotels: an absent star category is null, never a placeholder string",
  hotels.hotels.every((h) => h.category === null || (typeof h.category === "string" && h.category.trim() !== "")),
);
check(
  "agencies: an absent grade is null, never a placeholder string",
  agents.agents.every((a) => a.grade === null || (typeof a.grade === "string" && a.grade.trim() !== "")),
);
/* The graded counts are quoted in the product's copy and in the pitch. If a
   re-ingest changed them, those numbers would go stale silently. */
check(
  "hotels: the number the register grades is still the documented 22",
  hotelGraded.length === 22,
  `${hotelGraded.length} graded`,
);
check(
  "agencies: the number the register grades is still the documented 70",
  agentGraded.length === 70,
  `${agentGraded.length} graded`,
);
check(
  "agencies: every recorded grade is one the register actually uses",
  agentGraded.every((a) => ["A", "B", "C"].includes(a.grade)),
  [...new Set(agentGraded.map((a) => a.grade))].join(", "),
);
check(
  "registers: no entry carries a rating, review, price or availability field",
  [...hotels.hotels, ...agents.agents].every(
    (r) => !("rating" in r) && !("reviews" in r) && !("price" in r) && !("tariff" in r) && !("available" in r),
  ),
);

/* ------------------------------------------------------- licence honesty */

/* The UI states licence currency. Everything it says must be phrased about the
   register entry. These are the words that would turn a date comparison into a
   claim about a business, scanned for across the rendering layer. */
const RENDER_FILES = [
  "src/lib/licence.ts",
  "src/lib/capacity.ts",
  "src/lib/operator-index.ts",
  "src/data/travel-agents.ts",
  "src/app/(v1)/destinations/[destinationId]/industry/page.tsx",
  "src/components/industry/OperatorDirectory.tsx",
  "src/components/industry/CapacityTable.tsx",
];

/* Matched only inside the strings that reach a visitor — prose in comments
   discusses these very words on purpose, and flagging that would make the
   check unfixable. */
const FORBIDDEN = [
  /\bunlicensed\b/i,
  /\billegal\b/i,
  /\bnot licensed\b/i,
  /\bavoid this\b/i,
  /\buntrustworthy\b/i,
  /\bclosed down\b/i,
  /\bout of business\b/i,
];

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const offenders = [];
for (const file of RENDER_FILES) {
  const body = stripComments(read(file));
  for (const pattern of FORBIDDEN) {
    if (pattern.test(body)) offenders.push(`${file} :: ${pattern}`);
  }
}
check(
  "licence: no rendered string calls any business unlicensed, illegal or closed",
  offenders.length === 0,
  offenders.join("; "),
);

check(
  "licence: the caveat is defined and non-trivial",
  /export const LICENCE_CAVEAT\s*=\s*\n?\s*"[^"]{120,}"/.test(read("src/lib/licence.ts")),
);

check(
  "licence: the index page renders the caveat rather than only importing it",
  read("src/app/(v1)/destinations/[destinationId]/industry/page.tsx").includes("tally.caveat") ||
    read("src/app/(v1)/destinations/[destinationId]/industry/page.tsx").includes("hotelTally.caveat"),
);

check(
  "capacity: both structural caveats travel with the totals",
  /heritageCaveat/.test(read("src/lib/capacity.ts")) &&
    /accessCaveat/.test(read("src/lib/capacity.ts")) &&
    /CAPACITY_TOTALS.heritageCaveat/.test(read("src/components/industry/CapacityTable.tsx")) &&
    /CAPACITY_TOTALS.accessCaveat/.test(read("src/components/industry/CapacityTable.tsx")),
);

/* Assessment must be pinned to the retrieval date. `new Date()` here would make
   a prerendered page's content depend on when the build ran. */
check(
  "licence: currency is assessed against the retrieval date, not build time",
  !/new Date\(\)/.test(stripComments(read("src/lib/licence.ts"))) &&
    !/Date\.now\(\)/.test(stripComments(read("src/lib/licence.ts"))),
);

/* ------------------------------------------------------- reported figures */

const parseDate = (printed) => {
  const m = /^([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4})$/.exec((printed ?? "").trim());
  if (!m) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const mo = months.indexOf(m[1].slice(0, 3).toLowerCase());
  if (mo < 0) return null;
  return Date.UTC(Number(m[3]), mo, Number(m[2]));
};

for (const [label, rows, field, asOf] of [
  ["hotels", hotels.hotels, "validUpto", hotels.retrievedAt],
  ["agencies", agents.agents, "validUpto", agents.retrievedAt],
]) {
  const assessed = Date.parse(`${asOf}T00:00:00Z`);
  let current = 0, lapsed = 0, undated = 0;
  for (const r of rows) {
    const ts = parseDate(r[field]);
    if (ts === null) undated++;
    else if (ts >= assessed) current++;
    else lapsed++;
  }
  const datable = current + lapsed;
  console.log(
    `\nREPORTED  ${label}: ${current} current · ${lapsed} past printed date · ${undated} undated ` +
      `(${((lapsed / datable) * 100).toFixed(1)}% of ${datable} datable)`,
  );
  check(`${label}: every entry falls into exactly one licence state`,
    current + lapsed + undated === rows.length);
}

/* ---------------------------------------------------------- district mix */

const byDistrict = (rows) => {
  const out = {};
  for (const r of rows) out[r.district] = (out[r.district] ?? 0) + 1;
  return out;
};
console.log(`\nREPORTED  hotels by district:   ${JSON.stringify(byDistrict(hotels.hotels))}`);
console.log(`REPORTED  agencies by district: ${JSON.stringify(byDistrict(agents.agents))}`);

/* ------------------------------------------------------------------ verdict */

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  process.exitCode = 1;
}
