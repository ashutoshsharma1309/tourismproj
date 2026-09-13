/**
 * The History module, checked as data and as routes.
 *
 * The two failure modes this guards are invented precision and lost records.
 * A date is the easiest thing in a heritage archive to make up and the
 * hardest for a reader to check, so nothing here may carry more precision
 * than its source; and enrichment must never delete an event that has a real
 * date and a real source merely because its article had no prose to quote —
 * a mistake this module made once, cutting Goa from eleven events to three.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const DIR = "src/data/generated/history";
const MANIFEST = JSON.parse(readFileSync(".data/history-manifest.json", "utf8"));

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed++; return; }
  failures.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

const ERA_IDS = new Set(["ancient", "medieval", "early-modern", "modern", "contemporary"]);
const NOW = new Date().getFullYear();

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
/* Counted from ids.ts, not typed: 14 became 17 in the India-only expansion. */
const CAPSULE_COUNT = (readFileSync("src/data/destinations/capsules/ids.ts", "utf8").match(/^\s+"[a-z-]+",$/gm) ?? []).length;
check("Every capsule destination has a timeline", files.length === CAPSULE_COUNT, `${files.length}`);

let total = 0, withPage = 0;
for (const file of files) {
  const id = file.replace(/\.json$/, "");
  const events = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  total += events.length;

  /* NOTHING LOST. The manifest is the full record; enrichment adds to it. */
  check(`${id}: keeps every event the capsule holds`,
    events.length === (MANIFEST[id] ?? []).length,
    `${events.length} of ${(MANIFEST[id] ?? []).length}`);

  const slugs = new Set();
  let previous = -Infinity;
  for (const event of events) {
    const where = `${id}/${event.slug}`;

    check(`${where}: names its destination`, event.destinationId === id, event.destinationId);
    check(`${where}: is not duplicated`, !slugs.has(event.slug), event.slug);
    slugs.add(event.slug);

    /* Chronology. The file is the timeline's order, so it must be sorted. */
    check(`${where}: follows the event before it`, event.sortYear >= previous,
      `${event.sortYear} after ${previous}`);
    previous = event.sortYear;

    /* Dates that could not be true. */
    check(`${where}: its year is a number`, Number.isInteger(event.sortYear), String(event.sortYear));
    check(`${where}: its year is not in the future`, event.sortYear <= NOW, String(event.sortYear));
    check(`${where}: its year is within recorded history`, event.sortYear > -4000, String(event.sortYear));

    /*
     * NO INVENTED PRECISION. A negative year is BCE and must never be shown
     * with a minus sign; and a label must not claim a day or month the
     * capsule's `period` string did not carry.
     */
    check(`${where}: its label shows no minus sign`, !/^-/.test(event.yearLabel), event.yearLabel);
    if (event.sortYear < 0) {
      check(`${where}: a BCE year says so`, /BCE?|B\.C\./i.test(event.yearLabel), event.yearLabel);
    }
    check(`${where}: its label names no day`, !/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(event.yearLabel), event.yearLabel);

    /* Era. Derived, and it must agree with the year. */
    check(`${where}: sits in a known era`, ERA_IDS.has(event.eraId), event.eraId);
    const expected =
      event.sortYear < 500 ? "ancient"
      : event.sortYear < 1500 ? "medieval"
      : event.sortYear < 1800 ? "early-modern"
      : event.sortYear < 1945 ? "modern" : "contemporary";
    check(`${where}: its era matches its year`, event.eraId === expected, `${event.eraId} for ${event.sortYear}`);

    /* Evidence. */
    check(`${where}: cites a source`, Array.isArray(event.sources) && event.sources.length > 0);
    for (const source of event.sources ?? []) {
      check(`${where}: its source has an https URL`, /^https:\/\//.test(source.url ?? ""), source.url);
    }
    check(`${where}: states when it was verified`, /^\d{4}-\d{2}-\d{2}$/.test(event.lastVerifiedAt ?? ""));

    /* Relationships resolve, and stay inside this destination. */
    const capsule = readFileSync(join("src/data/destinations/capsules", `${id}.ts`), "utf8");
    for (const place of event.relatedPlaces ?? []) {
      check(`${where}: related place "${place}" exists here`, capsule.includes(`id: "${place}"`), place);
    }
    let ownStories = new Set();
    try {
      ownStories = new Set(
        JSON.parse(readFileSync(`src/data/generated/stories/${id}.json`, "utf8")).map((s) => s.slug),
      );
    } catch { /* none */ }
    for (const story of event.relatedStories ?? []) {
      check(`${where}: related story "${story}" is this destination's`, ownStories.has(story), story);
    }

    /* Sikkim's vocabulary must not leak. */
    check(`${where}: is linked to no monastery`,
      Array.isArray(event.relatedMonasteries) && event.relatedMonasteries.length === 0);

    /* A page only where there is something to put on it. */
    if (event.description) {
      withPage++;
      check(`${where}: its body is substantial`, event.description.join(" ").split(/\s+/).length >= 100,
        `${event.description.join(" ").split(/\s+/).length} words`);
    }
  }
}

check("The module carries a substantial corpus", total >= 150, `${total} events`);
check("Most events open into a page", withPage / total > 0.6, `${withPage}/${total}`);

if (!process.argv.includes("--no-server")) {
  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const events = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    const index = await fetch(`${BASE}/destinations/${id}/history`, { redirect: "manual" });
    check(`${id}: its timeline serves`, index.status === 200, `HTTP ${index.status}`);
    /*
     * WHOSE PAGE IS IT. This suite asserted only that the index served 200,
     * and the index served Sikkim's page at every destination's URL — "The
     * Story of Sikkim" under New York City — for a full build cycle before
     * anyone looked at it. A 200 is not evidence of the right content.
     */
    if (index.status === 200) {
      const html = await index.text();
      const own = events.slice(0, 3).map((r) => r.slug);
      check(`${id}: its index lists its own records`, own.some((slug) => html.includes(`/destinations/${id}/history/${slug}`) || html.includes(`#${slug}`)), own.join(", "));
      check(`${id}: its index carries none of Sikkim's`, !/The Story of Sikkim|Namgyal|Rumtek|Nathu La/.test(html), "Sikkim content found");
    }
    for (const event of events.filter((e) => e.description).slice(0, 2)) {
      const res = await fetch(`${BASE}/destinations/${id}/history/${event.slug}`, { redirect: "manual" });
      check(`${id}/${event.slug}: its page serves`, res.status === 200, `HTTP ${res.status}`);
    }
    /* An event with no prose must NOT have a page — that is the honest state,
       not a 200 with one sentence on it. */
    const bare = events.find((e) => !e.description);
    if (bare) {
      const res = await fetch(`${BASE}/destinations/${id}/history/${bare.slug}`, { redirect: "manual" });
      check(`${id}/${bare.slug}: an event with no prose has no page`, res.status === 404, `HTTP ${res.status}`);
    }
  }
}

for (const line of failures.slice(0, 25)) console.log(line);
if (failures.length > 25) console.log(`… and ${failures.length - 25} more`);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
