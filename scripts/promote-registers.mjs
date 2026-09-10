/**
 * Promote a register from the pending ingest into publishable generated data.
 *
 * WHY THIS EXISTS
 * ---------------
 * `ingest-sikkim-tourism.mjs` writes everything it reads into
 * `reports/ingest/sikkim-tourism-pending.json` with
 * `verificationStatus: "PENDING_REVIEW"`, and nothing in that file is ever
 * served. Promotion into `src/data/generated/` is the review gate, and it was
 * previously done by hand for the hotels register — which meant the one step
 * that decides what the public sees left no record of how it was performed.
 *
 * So it is a script. Same input, same output, every time, and the transform is
 * readable instead of remembered.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not clean, correct, infer or enrich. A blank cell stays blank; the
 * register's "N/A" becomes `null` because that is what the department means by
 * it, and nothing else is touched. In particular it does not parse licence
 * dates into a status — `validUpto` is carried across exactly as printed, and
 * what it means is decided at render time by `src/lib/licence.ts`, where the
 * caveats can travel with the answer.
 *
 *   node scripts/promote-registers.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const PENDING = "reports/ingest/sikkim-tourism-pending.json";
const OUT_AGENTS = "src/data/generated/registered-travel-agents.json";

/** The department writes "N/A" where it holds nothing. That is a null. */
function cell(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "N/A" || trimmed === "-") return null;
  return trimmed;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slugs must be unique and stable.
 *
 * 1,858 agencies include genuine duplicates of name — several "Himalayan Tours
 * & Travels" hold separate registrations. Suffixing by first-seen order keeps
 * every row addressable without inventing a distinction between them, and the
 * registration number stays on the record as the real identity.
 */
function uniqueSlugger() {
  const seen = new Map();
  return (name, fallback) => {
    const base = slugify(name) || fallback;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

const pending = JSON.parse(readFileSync(PENDING, "utf8"));

const record = pending.records.find(
  (r) => typeof r.sourceUrl === "string" && r.sourceUrl.endsWith("/registered-establishments/travel-agents"),
);

if (!record) {
  console.error(`No travel-agent register found in ${PENDING}.`);
  process.exit(1);
}

/* Read by header name rather than by index. The department has reordered
   columns before, and a silent column shift would republish every phone
   number as an email address. */
const col = Object.fromEntries(record.header.map((h, i) => [h, i]));
const REQUIRED = ["Agency Name", "Address", "District", "Grade", "Reg. No.", "Contact", "Email / Website", "Issued On", "Valid Upto"];
const missing = REQUIRED.filter((h) => !(h in col));
if (missing.length) {
  console.error(`Register header changed — missing columns: ${missing.join(", ")}`);
  console.error(`Got: ${record.header.join(" | ")}`);
  process.exit(1);
}

const slugFor = uniqueSlugger();
let unnamed = 0;

const agents = record.rows.flatMap((row, i) => {
  const name = cell(row[col["Agency Name"]]);
  if (!name) {
    unnamed += 1;
    return [];
  }
  /* "Email / Website" is one column holding either, or both separated by a
     slash. Splitting it is not cleaning — it is reading a column that the
     department packed two facts into, and each fact is carried unaltered. */
  const contactish = cell(row[col["Email / Website"]]);
  const parts = contactish ? contactish.split("/").map((p) => p.trim()).filter(Boolean) : [];
  const email = parts.find((p) => p.includes("@")) ?? null;
  const website = parts.find((p) => !p.includes("@") && /\./.test(p)) ?? null;

  return [
    {
      slug: slugFor(name, `agency-${i + 1}`),
      name,
      district: cell(row[col["District"]]),
      address: cell(row[col["Address"]]),
      grade: cell(row[col["Grade"]]),
      registrationNo: cell(row[col["Reg. No."]]),
      contact: cell(row[col["Contact"]]),
      email,
      website,
      issuedOn: cell(row[col["Issued On"]]),
      validUpto: cell(row[col["Valid Upto"]]),
    },
  ];
});

const out = {
  generatedAt: new Date().toISOString(),
  source: {
    name: record.sourceName,
    url: record.sourceUrl,
    type: record.sourceType,
  },
  retrievedAt: record.retrievedAt,
  reportedTotal: record.reportedTotal ?? null,
  pagesRead: record.pagesRead ?? null,
  note:
    "Registered travel agents published by the Tourism & Civil Aviation Department. Grade is null where the register states none — no grade is inferred. Licence validity is carried across exactly as printed and is interpreted at render time.",
  agents,
};

writeFileSync(OUT_AGENTS, `${JSON.stringify(out, null, 2)}\n`);

console.log(`Wrote ${OUT_AGENTS}`);
console.log(`  agencies published : ${agents.length}`);
console.log(`  department reports : ${out.reportedTotal ?? "not stated"}`);
console.log(`  rows without a name: ${unnamed}`);
console.log(`  with a grade       : ${agents.filter((a) => a.grade).length}`);
console.log(`  with a phone       : ${agents.filter((a) => a.contact).length}`);
console.log(`  with an email      : ${agents.filter((a) => a.email).length}`);
console.log(`  with a website     : ${agents.filter((a) => a.website).length}`);
