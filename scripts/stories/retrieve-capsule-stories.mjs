/**
 * Retrieve real narrative for the fourteen capsule destinations.
 *
 * WHAT WAS WRONG
 * --------------
 * Their "stories" were place records wearing a different hat: the title was
 * the place's name, the body was one sentence lifted from that place's own
 * article, and the id carried a `-practice` suffix. Seven sat under "Stories"
 * on Paris's hub while the same seven places sat under "Places" three
 * sections above.
 *
 * WHAT THIS RETRIEVES INSTEAD
 * ---------------------------
 * The subjects a destination's culture records already name — its dishes, its
 * festivals, its crafts. Those are story subjects that the place list does not
 * already answer, and Sikkim's own archive is organised the same way: it has
 * eight food stories AND food records, because a card is an index entry and a
 * story is an article.
 *
 * The body is the subject's article prose, retrieved in full rather than the
 * one-sentence summary the capsules already hold. It is quoted, not written:
 * every paragraph is text a cited source published, the source is named with
 * the date it was read, and the story carries the CC BY-SA notice that reuse
 * of that text requires. Nothing here is authored, so nothing here can be
 * wrong in a way the source is not already wrong.
 *
 * A subject whose article cannot supply MIN_WORDS of prose is dropped rather
 * than padded — fourteen destinations with fewer, real stories is the outcome
 * this repository has chosen every previous time the question came up.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = ".data/culture";
const OUT = ".data/stories";
const UA = "TerraStory/1.0 (heritage archive; non-commercial research)";
const PAUSE_MS = 500;
const MIN_WORDS = 220;
const MAX_WORDS = 700;
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);

/* `stay` is not a story subject — a hotel is a place to sleep, not a subject
   with a narrative, and the stays section already carries them honestly. */
const STORY_KINDS = new Set(["food", "festival", "craft"]);

/** Which shelf a subject belongs on. The capsules had no shelves at all. */
const CATEGORY = {
  food: "Food & Flavours",
  festival: "Festivals",
  craft: "Art & Craft",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Registry ids are kebab-case; captions are read by people. */
function destinationName(id) {
  return id
    .split("-")
    .map((part) => (part === "city" ? "City" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

/**
 * The full article as plain text — every section, not just the lead.
 *
 * Retried, and loud when it gives up. The first run swallowed a non-ok
 * response as "" and reported it downstream as "only 0 words", which reads as
 * "this subject has no article" when it meant "the request was throttled".
 * Eight destinations came out with zero stories and none of them deserved to.
 */
async function fullText(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=extracts&explaintext=1&redirects=1&titles=" +
    encodeURIComponent(title);
  for (let attempt = 0; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const page = Object.values(data?.query?.pages ?? {})[0];
      return typeof page?.extract === "string" ? page.extract : "";
    }
    if (attempt === 3) {
      console.log(`    ! ${res.status} after ${attempt + 1} attempts: ${title}`);
      return "";
    }
    const after = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 2000 * 2 ** attempt);
  }
  return "";
}

/**
 * Article plaintext into readable paragraphs.
 *
 * The API returns section headings as "== Name ==" lines and a tail of
 * See also / References / External links that is a list of link text with no
 * sentences in it. Both are dropped: a heading is not prose, and a reference
 * list rendered as a paragraph is what makes retrieved content look retrieved.
 */
function paragraphs(text) {
  const TAIL = /^(see also|references|external links|further reading|notes|bibliography|sources|gallery)$/i;
  const out = [];
  let skipping = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^=+\s*(.+?)\s*=+$/.exec(line);
    if (heading) {
      skipping = TAIL.test(heading[1]);
      continue;
    }
    if (skipping) continue;
    /* A paragraph with no sentence-ending punctuation is a list item or a
       stray caption, not prose. */
    if (line.length < 80 || !/[.!?]["')\]]?$/.test(line)) continue;
    out.push(line);
  }
  return out;
}

/** Take whole paragraphs up to the word budget — never a truncated sentence. */
function budget(paras) {
  const kept = [];
  let words = 0;
  for (const p of paras) {
    const n = p.split(/\s+/).length;
    if (words + n > MAX_WORDS && kept.length > 0) break;
    kept.push(p);
    words += n;
  }
  return { kept, words };
}

/**
 * Facts a reader can carry away — sentences that state something datable or
 * countable, taken verbatim from the prose above so they cite themselves.
 */
function keyFacts(paras) {
  const facts = [];
  for (const p of paras) {
    for (const sentence of p.split(/(?<=[.!?])\s+/)) {
      const s = sentence.trim();
      if (s.length < 45 || s.length > 190) continue;
      if (!/\b(1[0-9]{3}|20[0-2][0-9]|century|BCE?|AD)\b/.test(s) && !/\b\d{2,}\b/.test(s)) continue;
      if (facts.includes(s)) continue;
      facts.push(s);
      if (facts.length === 4) return facts;
    }
  }
  return facts;
}

function firstSentence(text) {
  const m = /^(.{40,240}?[.!?])(\s|$)/s.exec(text.trim());
  return m ? m[1].trim() : text.trim().slice(0, 200);
}

mkdirSync(OUT, { recursive: true });
const summary = [];

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const store = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  const destinationId = store.destinationId;
  const stories = [];
  const dropped = [];

  /* Kyoto's culture store lists tofu twice. Two stories with one slug means
     one URL for two records, and the second silently wins. */
  const seen = new Set();

  for (const record of store.culture ?? []) {
    if (!STORY_KINDS.has(record.kind)) continue;
    const storyId = `${record.kind}-${record.id}`;
    if (seen.has(storyId)) { dropped.push({ id: record.id, reason: "duplicate subject" }); continue; }
    seen.add(storyId);
    const article = decodeURIComponent((record.page ?? "").split("/wiki/")[1] ?? "");
    if (!article) { dropped.push({ id: record.id, reason: "no article" }); continue; }

    const text = await fullText(article.replace(/_/g, " "));
    await sleep(PAUSE_MS);
    const paras = paragraphs(text);
    const { kept, words } = budget(paras);
    if (words < MIN_WORDS) { dropped.push({ id: record.id, reason: `only ${words} words` }); continue; }

    const image = `/images/capsule/${destinationId}/${record.kind}-${record.id}.jpg`;
    stories.push({
      id: `${record.kind}-${record.id}`,
      title: record.title,
      dek: firstSentence(record.extract ?? kept[0]),
      category: CATEGORY[record.kind],
      subject: record.kind,
      claimType: "documented history",
      summary: record.extract ?? firstSentence(kept[0]),
      content: kept,
      keyFacts: keyFacts(kept),
      words,
      heroImage: existsSync(join("public", image.slice(1))) ? image : null,
      /* The destination's display name, not its id — the alt text read
         "Kintsugi, kyoto" and was spoken that way by a screen reader. */
      heroAlt: `${record.title}, ${destinationName(destinationId)}`,
      season: record.season ?? null,
      coordinates: record.coordinates ?? null,
      source: {
        name: `Wikipedia — ${article.replace(/_/g, " ")}`,
        url: record.page,
        type: "encyclopedia",
        retrievedAt: RETRIEVED_AT,
        /* Text reuse, not just a citation: CC BY-SA has to be named. */
        licence: "CC BY-SA 4.0",
      },
    });
  }

  writeFileSync(
    join(OUT, `${destinationId}.json`),
    `${JSON.stringify({ destinationId, retrievedAt: RETRIEVED_AT, retrievalMethod: "wikipedia-api", stories, dropped }, null, 2)}\n`,
  );
  const withImage = stories.filter((s) => s.heroImage).length;
  summary.push({ destinationId, stories: stories.length, withImage, dropped: dropped.length });
  console.log(
    `${destinationId.padEnd(15)} ${String(stories.length).padStart(3)} stories  ` +
      `${String(withImage).padStart(3)} with a photograph  ${dropped.length} dropped`,
  );
}

console.log(`\ntotal ${summary.reduce((n, s) => n + s.stories, 0)} stories across ${summary.length} destinations`);
