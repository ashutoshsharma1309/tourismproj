/**
 * Official website and published telephone number for the documented stays.
 *
 * WHY THIS IS SAFE TO PUBLISH AND A GUESSED NUMBER IS NOT
 * -------------------------------------------------------
 * The brief asks for a hotel's official website and public contact number.
 * Both are facts a source either publishes or does not, and Wikidata
 * publishes them as structured claims: P856 for the official website, P1329
 * for the telephone number. Retrieving those is the same act as retrieving a
 * founding date.
 *
 * What must never happen is the other thing — writing a plausible number.
 * A wrong telephone number for a real hotel sends a real person to a stranger,
 * so a stay with no published number simply has none, and the page says
 * nothing rather than something.
 *
 * Writes .data/stay-contacts.json, which `generate.mjs` reads.
 *
 *   node scripts/capsules/enrich-stays.mjs
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const UA = "TerraStory/1.0 (SIH 2026 tourism research; contact via repository)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wikidata takes up to 50 ids per request. */
const BATCH = 40;

const ids = new Map(); // wikidata id -> { destinationId, stayId, title }
for (const file of readdirSync(".data/culture").filter((f) => f.endsWith(".json"))) {
  const record = JSON.parse(readFileSync(`.data/culture/${file}`, "utf8"));
  for (const stay of record.stays ?? []) {
    const qid = stay.wikidata?.id;
    if (qid) ids.set(qid, { destinationId: record.destinationId, stayId: `stay-${stay.id}`, title: stay.title });
  }
}

console.log(`Reading ${ids.size} stay entities for website and telephone…\n`);

/** The first value of a claim, or null. Never a guess at a missing one. */
const firstValue = (claims, property) => {
  const claim = claims?.[property]?.[0];
  const value = claim?.mainsnak?.datavalue?.value;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const out = {};
const all = [...ids.keys()];

for (let i = 0; i < all.length; i += BATCH) {
  const slice = all.slice(i, i + BATCH);
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json` +
    `&props=claims&ids=${slice.join("|")}`;

  let data = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": UA } });
    const text = await response.text();
    if (response.ok && !text.startsWith("You are making too many requests")) {
      data = JSON.parse(text);
      break;
    }
    await sleep(4000 * (attempt + 1));
  }
  if (!data) throw new Error("Wikidata unreachable after 5 attempts");

  for (const [qid, entity] of Object.entries(data.entities ?? {})) {
    const meta = ids.get(qid);
    if (!meta) continue;
    const website = firstValue(entity.claims, "P856");
    const phone = firstValue(entity.claims, "P1329");
    if (!website && !phone) continue;
    out[meta.destinationId] ??= {};
    out[meta.destinationId][meta.stayId] = {
      ...(website ? { website } : {}),
      ...(phone ? { phone } : {}),
      wikidataId: qid,
    };
    console.log(
      `  ${meta.title.padEnd(38)} ${website ? "site" : "    "} ${phone ? "tel" : "   "}`,
    );
  }
  console.log(`  ${Math.min(i + BATCH, all.length)}/${all.length}`);
  await sleep(1500);
}

mkdirSync(".data", { recursive: true });
writeFileSync(".data/stay-contacts.json", JSON.stringify(out, null, 2));

const totals = Object.values(out).flatMap((d) => Object.values(d));
console.log(`\n${"".padEnd(70, "=")}`);
console.log(
  `stays with a published website  ${totals.filter((t) => t.website).length}\n` +
  `stays with a published telephone ${totals.filter((t) => t.phone).length}\n` +
  `of ${ids.size} documented stays`,
);
console.log("".padEnd(70, "="));
console.log("\nWritten to .data/stay-contacts.json\n");
