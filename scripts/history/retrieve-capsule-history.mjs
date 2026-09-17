/**
 * Give the 165 capsule events the prose they never had.
 *
 * WHAT THEY ARE NOW
 * -----------------
 * Each is the founding date of a building, one sentence long, derived from
 * that building's own article. Twelve of those is the Places list sorted by
 * date, not the history of a city — and with no `description` the engine
 * correctly refuses them a detail page, because `historyPages` is derived
 * from that field being present.
 *
 * WHAT THIS RETRIEVES
 * -------------------
 * The HISTORY SECTION of the subject's article, specifically — not the lead.
 * An article's "History", "Origins", "Construction" or "Early history"
 * section is the part that narrates what happened, which is what a timeline
 * entry should carry. Where no such section exists the event keeps its one
 * sentence and gets no page, which is the honest outcome.
 *
 * Nothing is authored. Every paragraph is text the cited source published,
 * quoted under the licence named on the record.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = ".data/history";
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";
const PAUSE_MS = 500;
const MIN_WORDS = 120;
const MAX_WORDS = 550;
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

/* The section names that actually narrate. Ordered by preference. */
const HISTORY_SECTIONS = [
  /^history$/i, /^origins?$/i, /^early history$/i, /^foundation$/i,
  /^construction$/i, /^background$/i, /^etymology and history$/i,
  /^history and description$/i, /^early years$/i, /^development$/i,
];
const TAIL = /^(see also|references|external links|further reading|notes|bibliography|sources|gallery)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function article(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=extracts&explaintext=1&redirects=1&titles=" + encodeURIComponent(title);
  for (let attempt = 0; attempt <= 3; attempt++) {
    let res;
    try { res = await fetch(url, { headers: { "User-Agent": UA } }); }
    catch { await sleep(2000 * 2 ** attempt); continue; }
    if (res.ok) {
      const data = await res.json();
      const page = Object.values(data?.query?.pages ?? {})[0];
      return typeof page?.extract === "string" ? page.extract : "";
    }
    if (attempt === 3) { console.log(`    ! ${res.status}: ${title}`); return ""; }
    const after = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 2000 * 2 ** attempt);
  }
  return "";
}

/** Paragraphs of the first section whose heading narrates history. */
function historyProse(text) {
  const lines = text.split("\n");
  let capturing = false;
  let depth = 0;
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^(=+)\s*(.+?)\s*=+$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const name = heading[2];
      if (capturing && level <= depth) capturing = false;   // section ended
      if (!capturing && HISTORY_SECTIONS.some((re) => re.test(name))) {
        capturing = true;
        depth = level;
      }
      if (TAIL.test(name)) capturing = false;
      continue;
    }
    if (!capturing) continue;
    if (line.length < 80 || !/[.!?]["')\]]?$/.test(line)) continue;
    /* A paragraph that begins mid-sentence is a fragment — the extract API
       splits leads carrying inline glosses across lines. */
    if (/^[a-z)\]}]/.test(line)) continue;
    out.push(line);
  }
  return out;
}

function budget(paras) {
  const kept = [];
  let words = 0;
  for (const p of paras) {
    const n = p.split(/\s+/).length;
    if (words + n > MAX_WORDS && kept.length > 0) break;
    kept.push(p); words += n;
  }
  return { kept, words };
}

/** Sentences carrying a date or a number, taken verbatim. */
function keyFacts(paras) {
  const facts = [];
  for (const p of paras) {
    for (const raw of p.split(/(?<=[.!?])\s+/)) {
      const s = raw.trim();
      if (s.length < 45 || s.length > 190) continue;
      if (!/\b(1[0-9]{3}|20[0-2][0-9]|century|BCE?|AD)\b/.test(s)) continue;
      if (facts.includes(s)) continue;
      facts.push(s);
      if (facts.length === 3) return facts;
    }
  }
  return facts;
}

/*
 * The event list comes from `.data/history-manifest.json`, produced by
 * scripts/history/manifest.mts against the modules the site actually reads.
 *
 * It replaced a regex over the capsule TypeScript, which silently skipped 21
 * of 165 events whose field order it had not anticipated and reported the
 * result as though those events did not exist.
 */
/* `--only=a,b` limits the run to those destinations. Added for the India-only
   expansion so the eight new cities could be retrieved without re-fetching —
   and re-dating — the records the other destinations already publish. */
const ONLY = (process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const wanted = (id) => ONLY.length === 0 || ONLY.includes(id);

const MANIFEST = JSON.parse(readFileSync(".data/history-manifest.json", "utf8"));

mkdirSync(OUT, { recursive: true });
let grand = 0;

for (const [id, events] of Object.entries(MANIFEST)) {
  if (!wanted(id)) continue;
  const enriched = [];
  const dropped = [];

  for (const event of events) {
    const wikiTitle = event.articleUrl?.includes("/wiki/")
      ? decodeURIComponent(event.articleUrl.split("/wiki/")[1]).replace(/_/g, " ")
      : null;
    if (!wikiTitle) { dropped.push({ id: event.id, reason: "no article" }); continue; }

    const text = await article(wikiTitle);
    await sleep(PAUSE_MS);
    const { kept, words } = budget(historyProse(text));
    if (words < MIN_WORDS) { dropped.push({ id: event.id, reason: `history section ${words} words` }); continue; }

    enriched.push({
      ...event,
      description: kept,
      keyFacts: keyFacts(kept),
      words,
      source: {
        name: `Wikipedia — ${wikiTitle}`,
        url: event.articleUrl,
        type: "encyclopedia",
        retrievedAt: RETRIEVED_AT,
        licence: "CC BY-SA 4.0",
      },
    });
  }

  writeFileSync(
    join(OUT, `${id}.json`),
    `${JSON.stringify({ destinationId: id, retrievedAt: RETRIEVED_AT, events: enriched, dropped }, null, 2)}\n`,
  );
  grand += enriched.length;
  console.log(`${id.padEnd(15)} ${String(enriched.length).padStart(3)} of ${String(events.length).padStart(3)} events given prose  ${dropped.length} left as they were`);
}
console.log(`\n${grand} events enriched`);
