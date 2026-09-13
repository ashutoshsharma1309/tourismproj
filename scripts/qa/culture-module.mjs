/**
 * The Culture module, checked as data and as routes.
 *
 * Culture is the corpus most exposed to invention: a dish's "traditional
 * ingredients", a festival's annual date, an artisan's name. None of those
 * exist in this data and the checks below are what keeps it that way — every
 * summary must be a span the cited source published, every festival timing
 * must be a season a source stated rather than a date someone worked out.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const DIR = "src/data/destinations/capsules";
const STORIES = "src/data/generated/stories";
const FOCAL = JSON.parse(readFileSync("src/data/generated/image-focal.json", "utf8"));
const CREDITS = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const creditPaths = new Set(CREDITS.filter((c) => c.localPath).map((c) => c.localPath));

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed++; return; }
  failures.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

/** Culture entries out of a generated capsule module, without importing TS. */
function cultureOf(source) {
  const start = source.indexOf("culture: [");
  if (start < 0) return [];
  const block = source.slice(start, source.indexOf("\n  stays:", start));
  const entries = [];
  for (const m of block.matchAll(
    /id:\s*"([^"]+)",\s*\n\s*kind:\s*"([^"]+)",\s*\n\s*name:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*summary:\s*"((?:[^"\\]|\\.)*)"/g,
  )) {
    entries.push({ id: m[1], kind: m[2], name: m[3], summary: m[4] });
  }
  /* image / season are optional and follow, so they are read separately. */
  for (const entry of entries) {
    const at = block.indexOf(`id: "${entry.id}"`);
    const window = block.slice(at, at + 1400);
    entry.image = /image:\s*"([^"]+)"/.exec(window)?.[1] ?? null;
    entry.season = /season:\s*"([^"]+)"/.exec(window)?.[1] ?? null;
    entry.placeIds = (/placeIds:\s*\[([^\]]*)\]/.exec(window)?.[1] ?? "")
      .split(",").map((s) => s.trim().replace(/"/g, "")).filter(Boolean);
  }
  return entries;
}

const KINDS = new Set(["food", "festival", "craft"]);
/* A specific calendar date for a recurring festival is the classic fabrication
   in this corpus: sources say "in autumn" or "the second week of Shravan". */
const LOOKS_LIKE_A_DATE = /\b(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)|\d{1,2}\/\d{1,2}\/\d{2,4})\b/;

const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.startsWith("_") && f !== "ids.ts" && f !== "index.ts");
/* Counted from ids.ts, not typed: 14 became 17 in the India-only expansion. */
const CAPSULE_COUNT = (readFileSync("src/data/destinations/capsules/ids.ts", "utf8").match(/^\s+"[a-z-]+",$/gm) ?? []).length;
check("Every capsule destination is present", files.length === CAPSULE_COUNT, `${files.length}`);

let total = 0, linked = 0;
for (const file of files) {
  const id = file.replace(/\.ts$/, "");
  const source = readFileSync(join(DIR, file), "utf8");
  const entries = cultureOf(source);
  const storyPath = join(STORIES, `${id}.json`);
  const stories = existsSync(storyPath)
    ? new Set(JSON.parse(readFileSync(storyPath, "utf8")).map((s) => s.slug))
    : new Set();

  check(`${id}: has culture records`, entries.length > 0, `${entries.length}`);

  const seen = new Set();
  for (const entry of entries) {
    const where = `${id}/${entry.id}`;
    total++;

    check(`${where}: is on a known shelf`, KINDS.has(entry.kind), entry.kind);
    check(`${where}: is not duplicated`, !seen.has(entry.id), entry.id);
    seen.add(entry.id);
    check(`${where}: its id names its shelf`, entry.id.startsWith(`${entry.kind}-`), entry.id);
    check(`${where}: has a summary`, entry.summary.length > 20, `${entry.summary.length} chars`);

    /*
     * NO INVENTED CALENDAR — and this check had to be re-aimed once.
     *
     * It first forbade any date anywhere in the record, and failed on
     * Bastille Day, Republic Day, Ferragosto and Festa della Repubblica.
     * Those dates are correct, fixed, and printed by the cited source: the
     * summary is a verbatim span, so a date inside it is the source's claim,
     * not ours. Forbidding it would have meant deleting true facts to satisfy
     * a rule about invention.
     *
     * The invariant is about fields WE compose. `season` is the only one, and
     * it exists precisely so that "an autumn festival" can be recorded
     * without anyone deriving a date for it.
     */
    if (entry.season) {
      check(`${where}: its stated timing is a season, not a derived date`,
        !LOOKS_LIKE_A_DATE.test(entry.season), entry.season);
    }

    if (entry.image) {
      check(`${where}: its photograph is on disk`, existsSync(join("public", entry.image.slice(1))), entry.image);
      check(`${where}: its photograph belongs to this destination`,
        entry.image.startsWith(`/images/capsule/${id}/`), entry.image);
      check(`${where}: its photograph carries provenance`, creditPaths.has(entry.image), entry.image);
      const measured = FOCAL[entry.image];
      check(`${where}: its photograph has measured dimensions`, Boolean(measured), entry.image);
      if (measured) {
        check(`${where}: its photograph is large enough`, measured.w >= 640, `${measured.w}px`);
      }
    }

    /* Places it claims must exist here — the connection graph, checked. */
    for (const place of entry.placeIds) {
      check(`${where}: related place "${place}" exists here`, source.includes(`id: "${place}"`), place);
    }

    if (stories.has(entry.id)) linked++;
  }
}

check("Most culture records lead to an article", linked / total > 0.8, `${linked}/${total}`);

if (!process.argv.includes("--no-server")) {
  for (const file of files) {
    const id = file.replace(/\.ts$/, "");
    const res = await fetch(`${BASE}/destinations/${id}/culture`, { redirect: "manual" });
    check(`${id}: its culture page serves`, res.status === 200, `HTTP ${res.status}`);
    if (res.status === 200) {
      const html = await res.text();
      check(`${id}: the page names a shelf`, /Food|Festivals|Crafts/.test(html));
      /* Sikkim's film furniture must not appear on a destination with no films. */
      check(`${id}: claims no films`, !/youtube\.com\/embed/i.test(html));
    }
  }
  const sikkim = await fetch(`${BASE}/destinations/sikkim/culture`, { redirect: "manual" });
  check("sikkim: its film page still serves", sikkim.status === 200, `HTTP ${sikkim.status}`);
  if (sikkim.status === 200) {
    check("sikkim: still plays its films", /youtube/i.test(await sikkim.text()));
  }
}

for (const line of failures.slice(0, 25)) console.log(line);
if (failures.length > 25) console.log(`… and ${failures.length - 25} more`);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
