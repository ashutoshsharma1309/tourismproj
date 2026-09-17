/**
 * Capsule generation — Phases 18 and 19.
 *
 * Reads the retrieval records in `.data/capsules/`, vendors the photographs
 * they found, and writes `src/data/destinations/capsules/<id>.ts`.
 *
 * THE RULE THIS FILE OBEYS
 * ------------------------
 * **It writes no sentence of its own about a destination.** Every summary,
 * every historical claim and every story is a span copied verbatim out of a
 * retrieved response, and it carries the URL that response came from. The
 * only prose this generator authors is prose about THE ARCHIVE — "four
 * catalogued records in this capsule carry it" — which is a statement about
 * the file it is writing, and is true by construction.
 *
 * WHAT IT DECIDES
 * ---------------
 * Selection, not content. Which of the retrieved dated sentences become
 * history entries, which sentences read as cultural description rather than
 * chronology, which places group into an experience. Those rules are written
 * out below, they are deterministic, and re-running this file on the same
 * records produces byte-identical output.
 *
 *   node scripts/capsules/retrieve.mjs && node scripts/capsules/generate.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { PLAN } from "./plan.mjs";

const RECORDS = ".data/capsules";
/** Where `retrieve-culture.mjs` leaves its records. */
const CULTURE_RECORDS = ".data/culture";

/**
 * Websites and telephone numbers for the documented stays, from
 * `enrich-stays.mjs`. Absent for most of them, and that absence is published
 * as absence — never as a placeholder.
 */
const STAY_CONTACTS = existsSync(".data/stay-contacts.json")
  ? JSON.parse(readFileSync(".data/stay-contacts.json", "utf8"))
  : {};

/*
 * What the stay verification agent established per title — the record's own
 * accommodation type (Wikidata P31, resolved to a label) and its published
 * street address (P6375). Read, never inferred: a title the agent did not
 * verify keeps the neutral "Documented stay" and states no address.
 */
const STAY_FACTS = existsSync(".data/stays-verification.json")
  ? JSON.parse(readFileSync(".data/stays-verification.json", "utf8")).destinations ?? {}
  : {};
function stayFacts(destinationId, title) {
  const rec = (STAY_FACTS[destinationId] ?? []).find((r) => r.title === title || r.fields?.label === title);
  return rec?.fields ?? {};
}

const OUT_DIR = "src/data/destinations/capsules";
const IMAGE_DIR = "public/images/capsule";
const CREDITS = "src/data/generated/image-credits.json";

const UA =
  "TerraStory/1.0 (SIH 2026 tourism intelligence; https://github.com/ashutoshsharma1309/tourismproj) node-fetch";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** How many times a rate-limited image download is retried before it is given up. */
const IMAGE_RETRIES = 4;

/** The per-photograph weight budget `qa:global-capsules` enforces. */
const IMAGE_BUDGET_BYTES = 1_500_000;

/** Widths tried, in order, when a 1280px rendition lands over budget. */
const NARROWER_WIDTHS = [960, 720, 540];

/**
 * The same Commons file, rendered at `width`.
 *
 * Wikipedia hands back two shapes and only one of them carries a width to
 * rewrite. A thumbnail already names its own:
 *
 *   …/commons/thumb/7/70/File.jpg/1280px-File.jpg
 *
 * An original names none, and asking for a narrower one means moving it under
 * `thumb/` and appending the rendition — which is where Sainte-Chapelle's
 * 2.5 MB came from, since a plain `px-` rewrite finds nothing to replace.
 *
 * Returns null when the URL is neither shape, so the caller keeps what it has
 * rather than guessing at a path.
 */
function thumbnailUrl(url, width) {
  if (/\/\d+px-/.test(url)) return url.replace(/\/\d+px-/, `/${width}px-`);

  const original = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-f]\/[0-9a-f]{2})\/(.+)$/.exec(url);
  if (!original) return null;

  const [, root, shard, filename] = original;
  return `${root}/thumb/${shard}/${filename}/${width}px-${filename}`;
}

/** Interest labels, for the one sentence this file is allowed to write. */
const THEME_LABEL = {
  history: "History",
  heritage: "Heritage",
  culture: "Culture",
  architecture: "Architecture",
  sacred: "Religious heritage",
  museums: "Museums",
  nature: "Nature",
  food: "Food",
  art: "Art",
  local: "Local life",
};

/**
 * Words that mark a sentence as cultural description rather than chronology.
 *
 * A capsule story is a *practice* — how a place is used, built or observed —
 * where a history entry is a dated event. Splitting them by keyword is crude,
 * and it is deliberately crude: the alternative is a model deciding what
 * counts as culture, which is exactly the judgement this project does not let
 * a model make. A sentence that matches nothing simply is not used.
 */
const PRACTICE_WORDS = [
  "festival", "ritual", "pilgrim", "worship", "ceremony", "tradition", "craft",
  "cuisine", "market", "architecture", "style", "carved", "built in the",
  "known for", "dedicated to", "sacred", "prayer", "devotees", "cremation",
];

/* -------------------------------------------------------------------------
   Reading sentences out of retrieved prose

   PHASE 19 REWROTE THIS, AND IT FIXED SHIPPED CONTENT. Phase 18 split on
   "period followed by a space", which is wrong the moment an article uses an
   abbreviation. The Taj Mahal's history entry read:

     "It was commissioned in 1631 by the fifth Mughal emperor, Shah Jahan (r."

   — a fragment, published, with a citation under it. Rome did not cause that
   failure; it made it impossible to keep missing.
   ------------------------------------------------------------------------- */

/**
 * Abbreviations whose full stop does not end a sentence.
 *
 * `r.` (reigned) and `c.` (circa) are the ones that matter for heritage
 * prose; the rest are here because they cost nothing, and each one is a
 * fragment that never reaches a page.
 */
const ABBREVIATIONS = [
  "r", "c", "ca", "cf", "fl", "d", "b", "St", "Mt", "Ft", "Dr", "Mr", "Mrs",
  "Ms", "No", "vs", "etc", "approx", "Jr", "Sr", "Rev", "Prof", "Gen", "Col",
  "Co", "Inc", "Ltd", "AD", "BC", "CE", "BCE", "est", "pl", "lit",
];

/** Stand-in for a full stop that must survive the split. */
const DOT = "@@DOT@@";

/**
 * Split retrieved text into sentences.
 *
 * Protects decimals, abbreviations and initials, then splits only where a
 * terminator is followed by something that can begin a sentence. A split that
 * would produce "…Shah Jahan (r." never happens.
 */
function sentencesOf(text) {
  if (!text) return [];
  const working = String(text)
    .replace(/(\d)\.(\d)/g, `$1${DOT}$2`)
    .replace(new RegExp(`\\b(${ABBREVIATIONS.join("|")})\\.`, "g"), `$1${DOT}`)
    /* Initials, but NOT Roman numerals. "J. Smith" is one name; "Ahmed I."
       and "Pope Leo IX." end sentences, and protecting those full stops
       glued the Blue Mosque's construction sentence to its neighbour until
       the pair exceeded every length filter and vanished. I, V, X, L, C, D
       and M are therefore excluded. */
    .replace(/\b([ABEFGHJKNOPQRSTUWYZ])\.(?=\s)/g, `$1${DOT}`);

  return working
    .split(/(?<=[.!?])["”]?\s+(?=[A-Z"“(\d])/)
    .map((sentence) => sentence.split(DOT).join(".").trim())
    .filter(Boolean);
}

/**
 * Is this a whole sentence?
 *
 * Opens like one, closes like one, and balances its brackets. Anything else
 * is wreckage from a split and is dropped rather than repaired — repairing it
 * would mean writing words, which this file may not do.
 */
function wellFormed(sentence) {
  if (sentence.length < 40) return false;
  if (!/^[A-Z0-9"“(]/.test(sentence)) return false;
  /* A sentence that opens by contradicting something needs the something.
     "Nevertheless, it became a standard exemplar…" is a whole sentence and
     still a fragment of an argument, and a capsule shows it alone. */
  if (/^(?:Nevertheless|However|Nonetheless|Moreover|Furthermore|Instead|Meanwhile|Thus|Therefore|Consequently|Additionally|These|Those|Such)\b/.test(sentence)) return false;
  /* Pronunciation apparatus. The REST extract strips the IPA but leaves the
     scaffolding — "The Pantheon (UK: , US: ; Latin: Pantheum…" — which is
     transliteration machinery, not a sentence about a building. */
  if (/\((?:UK|US|IPA)\s?:/.test(sentence)) return false;
  if (!/[.!?]["”]?$/.test(sentence)) return false;
  const opens = (sentence.match(/[(\[]/g) ?? []).length;
  const closes = (sentence.match(/[)\]]/g) ?? []).length;
  return opens === closes;
}

/**
 * Tourism-ranking language, which a capsule does not repeat even when a
 * source states it.
 *
 * The distinction being drawn: "one of the largest mosques in India" is a
 * measurable fact and stays; "one of the most frequented heritage spots" and
 * "regarded as one of the best examples" are a popularity claim and an
 * aesthetic judgement, and both are the marketing voice every brief since
 * Phase 13 has told this project not to adopt. Filtering at selection beats
 * filtering at validation: the sentence is simply never chosen, and the
 * generator moves on to the next one.
 */
const RANKING_MARKERS = [
  /\bmost (?:famous|popular|visited|frequented|beautiful|iconic|celebrated|important tourist)\b/i,
  /\bmost-visited\b/i,
  /\bone of the (?:best|finest|most)\b/i,
  /\b(?:best|finest) (?:example|examples|place|places|way)\b/i,
  /\bworld's most\b/i,
  /* Bare evaluative superlatives. "the third and greatest Mughal emperor" is
     a verbatim quotation and still a judgement this project does not put in
     a visitor's mouth. Measurable superlatives — "the largest mosque in
     India" — are facts and stay. */
  /\b(?:greatest|grandest)\b/i,
  /\bmost (?:magnificent|spectacular|impressive|stunning|breathtaking)\b/i,
  /\bNo\.\s?1\b/i,
  /\btop (?:attraction|destination|\d+)\b/i,
  /\bmust[-\s](?:see|visit)\b/i,
];

const ranks = (sentence) => RANKING_MARKERS.some((marker) => marker.test(sentence));

/** A sentence a capsule may publish: whole, and not a ranking claim. */
const publishable = (sentence) => wellFormed(sentence) && !ranks(sentence);

/* -------------------------------------------------------------------------
   Dates

   PHASE 19 REWROTE THIS TOO. Phase 18 recognised four-digit years from 1000
   to 2029 — fine for a Mughal fort, useless for an amphitheatre finished in
   AD 80. Rome returned TWO dated sentences across six places; the Pantheon,
   the Roman Forum, Piazza Navona and the Basilica Cistern returned none.
   ------------------------------------------------------------------------- */

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th",
  "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th",
  "20th", "21st"];

/**
 * A regnal range describes a person, not an event.
 *
 * "(r. 69–79 AD)" inside a sentence about construction starting in 72 would
 * otherwise date the entry to 79. Stripped before any date is read.
 */
const withoutRegnalRanges = (sentence) =>
  sentence.replace(/\((?:r|reigned|ruled)\.?[^)]*\)/gi, "").replace(/\s{2,}/g, " ");

/**
 * The date a sentence states, or null.
 *
 * Reads what is written and nothing else. A century is published as a century
 * — "6th century", with no year — because a source that says "the 6th
 * century" has not told anyone the year, and picking one would be the
 * invention every brief forbids. Ordering still needs a number, so a century
 * sorts at its midpoint; that number is never displayed and never stored as a
 * year.
 */
function dateOf(rawSentence) {
  const sentence = withoutRegnalRanges(rawSentence);
  let match;

  if ((match = sentence.match(/\b(\d{1,4})\s?(?:BCE|BC)\b/))) {
    const year = -Number(match[1]);
    return { year, sortYear: year, period: `${match[1]} BC` };
  }
  if ((match = sentence.match(/\bAD\s?(\d{1,4})\b/)) || (match = sentence.match(/\b(\d{1,4})\s?(?:AD|CE)\b/))) {
    const year = Number(match[1]);
    if (year > 0 && year <= 2029) {
      return { year, sortYear: year, period: year < 1000 ? `AD ${year}` : String(year) };
    }
  }
  if ((match = sentence.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/))) {
    const year = Number(match[1]);
    return { year, sortYear: year, period: String(year) };
  }
  if ((match = sentence.match(/\b(\d{1,2})(?:st|nd|rd|th)[-\s]century(\s?(?:BCE|BC))?\b/i))) {
    const century = Number(match[1]);
    if (century < 1 || century > 21) return null;
    const bc = Boolean(match[2]);
    const midpoint = (century - 1) * 100 + 50;
    return {
      /* No `year`: the source did not state one. */
      sortYear: bc ? -midpoint : midpoint,
      period: `${ORDINAL[century]} century${bc ? " BC" : ""}`,
    };
  }
  return null;
}

/**
 * Every date a sentence states, not just the first.
 *
 * `dateOf` answers "what is this sentence dated to?" and takes the leading
 * date. Corroboration needs the other question — "does this sentence mention
 * the year the second source records?" — because the sentence that says it
 * best often says it last:
 *
 *   "Construction started on March 17, 1930, and the building opened
 *    thirteen and a half months afterward on May 1, 1931."
 *
 * Wikidata records 1931 for the Empire State Building. Reading only the first
 * year found 1930, missed the match, and the capsule ended up dating the
 * building to the hotel that stood on the site in 1893 instead.
 */
function datesIn(rawSentence) {
  const sentence = withoutRegnalRanges(rawSentence);
  const found = new Map();
  const add = (year, period) => {
    if (!Number.isFinite(year) || year === 0 || year > 2029) return;
    if (!found.has(year)) found.set(year, { year, sortYear: year, period });
  };
  for (const match of sentence.matchAll(/\b(\d{1,4})\s?(?:BCE|BC)\b/g)) {
    add(-Number(match[1]), `${match[1]} BC`);
  }
  for (const match of sentence.matchAll(/\bAD\s?(\d{1,4})\b/g)) {
    add(Number(match[1]), Number(match[1]) < 1000 ? `AD ${match[1]}` : match[1]);
  }
  for (const match of sentence.matchAll(/\b(\d{1,4})\s?(?:AD|CE)\b/g)) {
    add(Number(match[1]), Number(match[1]) < 1000 ? `AD ${match[1]}` : match[1]);
  }
  for (const match of sentence.matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)) {
    add(Number(match[1]), match[1]);
  }
  return [...found.values()];
}

/**
 * Two sentences at most: a card, not an essay. Verbatim either way.
 *
 * Only whole, non-ranking sentences are eligible, so a card never opens on a
 * fragment and never opens on "one of the most visited attractions in the
 * world". Where the summary extract yields nothing usable the lead is tried,
 * and where that yields nothing either the place is reported and gets no
 * summary rather than a stitched-together one.
 */
function summaryOf(place) {
  const fromExtract = sentencesOf(place.extract).filter(publishable);
  if (fromExtract.length > 0) return fromExtract.slice(0, 2).join(" ");
  const fromLead = sentencesOf(place.lead).filter(publishable);
  return fromLead.slice(0, 2).join(" ");
}

/**
 * Up to twelve dated facts, spread across places.
 *
 * PHASE B raised the cap from five. It is a CAP, not a quota: the round-robin
 * stops the moment the places run out of publishable dated sentences, so a
 * destination with six usable facts publishes six. Raising the ceiling lets a
 * destination with thirteen places show more of what it actually holds; it
 * cannot make one show more than it has.
 *
 * Round-robin over the places rather than taking the first five: a capsule
 * whose entire history came from the Taj Mahal's article would describe one
 * monument, not a destination.
 *
 * WHERE THE SECOND SOURCE COMES IN
 * --------------------------------
 * A Wikipedia sentence supplies the words and the year. If the place's
 * Wikidata entity independently states the same year, the entry cites BOTH,
 * and the page shows both citations without any component knowing why. That
 * is the whole of the corroboration mechanism: no badge, no score, no new
 * field — two sources under an entry instead of one.
 *
 * Where the two disagree, the Wikidata date is simply not published. Nothing
 * is reconciled and nothing is averaged.
 */
/*
 * PHASE D: twelve became twenty-four. The cap exists so one place with a
 * long article cannot fill a timeline, which the round-robin below already
 * prevents; twelve was sized for a capsule of six places, and these archives
 * now hold thirty. A deep archive is graded at fifteen dated events.
 */
function historyOf(record, limit = 24) {
  const queues = record.places.map((place) => {
    const stated = new Set(
      (place.wikidata?.dates ?? []).map((entry) => entry.year).filter((year) => Number.isFinite(year)),
    );
    return sentencesOf(place.lead || place.extract)
      .filter(publishable)
      /* 420, not 320. The Arc de Triomphe's only sentence about its own
         founding — "the Arc de Triomphe was designed by Jean-François
         Chalgrin in 1806" — runs to 408 characters inside a clause about the
         Axe historique, and the tighter cap left the monument dated to a
         sentence about a taller arch in Mexico City. */
      .filter((sentence) => sentence.length < 420)
      .map((sentence) => {
        /* Where the sentence names a year the second source also records,
           that year dates the entry — the agreed fact leads, not the first
           number to appear. */
        const agreed = datesIn(sentence).find((date) => stated.has(date.year));
        return {
          sentence,
          date: agreed ?? dateOf(sentence),
          place,
          stated,
          corroborated: Boolean(agreed),
        };
      })
      .filter((entry) => entry.date !== null)
      /*
       * WHICH FACT LEADS: corroborated first, then earliest.
       *
       * Document order is arbitrary with respect to history — it gave the
       * Blue Mosque its 1985 UNESCO listing rather than its construction, and
       * Central Park "managed by the Conservancy since 1998". But earliest
       * alone is no better: it dated Ellis Island to the Welshman who bought
       * the island in 1774 and the Statue of Liberty to the date inscribed on
       * its tablet.
       *
       * The signal that actually separates "this place's own founding" from
       * "a date that happens to appear nearby" is the second source. A year
       * that Wikidata independently records as this place's inception or
       * opening is a year about this place. So corroborated candidates lead,
       * earliest breaks the tie, and where Wikidata is silent — the Roman
       * Forum, the Pantheon — the earliest stated date is still used.
       *
       * This is also why the two-source lookup earns its place: it does not
       * merely decorate an entry with a second citation, it chooses the entry.
       */
      .sort(
        (a, b) =>
          Number(b.corroborated) - Number(a.corroborated) || a.date.sortYear - b.date.sortYear,
      );
  });

  const chosen = [];
  for (let round = 0; chosen.length < limit; round += 1) {
    let added = false;
    for (const queue of queues) {
      if (chosen.length >= limit) break;
      const entry = queue[round];
      if (!entry) continue;
      if (chosen.some((existing) => existing.sentence === entry.sentence)) continue;
      /* One entry per place per period: two sentences both dated 1453 are one
         fact told twice. */
      if (chosen.some((e) => e.place.id === entry.place.id && e.date.period === entry.date.period)) continue;
      chosen.push(entry);
      added = true;
    }
    if (!added) break;
  }

  return chosen
    .sort((a, b) => a.date.sortYear - b.date.sortYear || a.place.id.localeCompare(b.place.id))
    .map((entry) => {
      const { corroborated } = entry;
      return {
        id: `${entry.place.id}-${entry.date.period.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        year: entry.date.year,
        period: entry.date.period,
        /* A label, not a claim: the place, and the date the sentence states. */
        title: `${entry.place.title}, ${entry.date.period}`,
        summary: entry.sentence,
        placeIds: [entry.place.id],
        sourceIds: corroborated ? [entry.place.id, `${entry.place.id}-wikidata`] : [entry.place.id],
        corroborated,
      };
    });
}

/**
 * Up to eight cultural descriptions, one per place, longest first.
 *
 * PHASE B raised the cap from three, and the one-per-place rule is what keeps
 * it honest: eight descriptions require eight different places to have said
 * something about practice or construction. A destination that cannot supply
 * them publishes fewer.
 *
 * A story is a description of practice or construction rather than a dated
 * event, so anything `dateOf` can read a date out of is excluded — including,
 * since Phase 19, sentences dated only to a century, which used to slip
 * through and appear as "cultural notes" about the 6th century.
 */
/* PHASE D: eight became twenty, for the same reason as the history cap. */
function storiesOf(record, limit = 20) {
  const candidates = record.places.flatMap((place) =>
    sentencesOf(place.lead)
      .filter(publishable)
      .filter((sentence) => sentence.length > 80 && sentence.length < 320)
      .filter((sentence) => dateOf(sentence) === null)
      .filter((sentence) => PRACTICE_WORDS.some((word) => sentence.toLowerCase().includes(word)))
      .map((sentence) => ({ sentence, place })),
  );

  const seen = new Set();
  const chosen = [];
  for (const candidate of candidates.sort(
    (a, b) => b.sentence.length - a.sentence.length || a.place.id.localeCompare(b.place.id),
  )) {
    if (chosen.length >= limit) break;
    if (seen.has(candidate.place.id)) continue;
    seen.add(candidate.place.id);
    chosen.push(candidate);
  }

  return chosen
    .sort((a, b) => a.place.id.localeCompare(b.place.id))
    .map((candidate) => ({
      id: `${candidate.place.id}-practice`,
      title: candidate.place.title,
      summary: candidate.sentence,
      /* Encyclopaedic description of a documented practice. Where the source
         itself frames something as belief or legend, that sentence carries
         the framing and the reader sees it. */
      claimType: "documented history",
      placeIds: [candidate.place.id],
      sourceIds: [candidate.place.id],
    }));
}

/**
 * One experience per theme that at least two places share.
 *
 * The explanation is the only sentence in a capsule this generator writes,
 * and it is a statement about the capsule's own contents — countable, and
 * true of the file it appears in.
 */
function experiencesOf(record) {
  const byTheme = new Map();
  for (const place of record.places) {
    for (const theme of place.themes) {
      byTheme.set(theme, [...(byTheme.get(theme) ?? []), place]);
    }
  }
  return [...byTheme.entries()]
    .filter(([, places]) => places.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([theme, places]) => ({
      id: `${theme}-experience`,
      title: `${THEME_LABEL[theme] ?? theme} in this capsule`,
      explanation: `${places.length} of the catalogued records here carry it: ${places
        .map((place) => place.title)
        .join(", ")}.`,
      themes: [theme],
      placeIds: places.map((place) => place.id),
      sourceIds: places.map((place) => place.id),
    }));
}

/* -------------------------------------------------------------------------
   Image vendoring — download once, credit always
   ------------------------------------------------------------------------- */

/**
 * A file whose own name says it is a diagram is not a photograph of the thing.
 *
 * Wikipedia's lead image for "Bengali cuisine" is `Bengali_dialects.png` — a
 * linguistic map. Correctly licensed, correctly attributed, and completely
 * wrong under a photograph of a dish: the homepage food grid showed a colour-
 * coded map of dialect regions between a plate of chaat and a bowl of biryani.
 *
 * Tokens are matched with delimiters on both sides so `photographed_by` does
 * not trip the `graph` rule. When a file matches, the record simply gets no
 * photograph — which the schema and every surface already handle.
 */
const DIAGRAM_FILENAME =
  /(^|[_\-])(dialects?|maps?|locator|distribution|chart|diagram|graph|infographic)([_\-.]|$)/i;

async function vendor(record, place, slot = place.id) {
  if (!place.image?.url || !place.image.license) return null;

  const commonsFile = decodeURIComponent(
    (place.image.commonsFilePage ?? "").split("File:")[1] ?? "",
  );
  if (commonsFile && DIAGRAM_FILENAME.test(commonsFile)) {
    console.log(`    image SKIPPED ${slot} — ${commonsFile} is a diagram, not a photograph`);
    return null;
  }
  const dir = `${IMAGE_DIR}/${record.destinationId}`;
  /* `slot` namespaces culture and stay images ("food-lassi", "stay-le-meurice")
     so a dish and a monument that share a slug cannot overwrite each other. */
  const localPath = `/images/capsule/${record.destinationId}/${slot}.jpg`;
  const file = `public${localPath}`;

  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });

    /*
     * Wikimedia answers a burst with HTTP 429, and the first run of the full
     * 166-place plan lost 38 photographs to it — not one of them for a reason
     * that would still be true a second later. Backing off and retrying is
     * both the way to get them and the way the host asks to be treated; the
     * alternative, re-running the whole script until the gaps fill in, is the
     * same requests made less politely.
     *
     * `Retry-After` is honoured when sent, capped so a long one cannot stall
     * the run, and the delay doubles otherwise.
     */
    let response = null;
    for (let attempt = 0; attempt < IMAGE_RETRIES; attempt += 1) {
      response = await fetch(place.image.url, { headers: { "user-agent": UA } });
      if (response.status !== 429) break;

      const advertised = Number(response.headers.get("retry-after"));
      const wait = Number.isFinite(advertised) && advertised > 0
        ? Math.min(advertised * 1000, 30_000)
        : 2000 * 2 ** attempt;
      console.log(`    image 429 ${place.id} — waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }

    if (!response?.ok) {
      console.log(`    image FAILED ${place.id} — HTTP ${response?.status ?? "no response"}`);
      return null;
    }
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    await sleep(400);

    /*
     * Commons renders a thumbnail at the width asked for, not to a weight, so
     * a densely detailed subject can come back several times heavier than a
     * plain one at the same 1280px — Sainte-Chapelle's glass arrived at 2.5 MB
     * against a 1.5 MB budget.
     *
     * The fix is a narrower rendition of the very same file, not a raised
     * budget and not a local re-encode: the image keeps its Commons URL, its
     * licence and its attribution, and only its width changes.
     */
    for (const width of NARROWER_WIDTHS) {
      if (statSync(file).size <= IMAGE_BUDGET_BYTES) break;
      const narrower = thumbnailUrl(place.image.url, width);
      if (!narrower) break;

      const retry = await fetch(narrower, { headers: { "user-agent": UA } });
      if (!retry.ok) break;
      writeFileSync(file, Buffer.from(await retry.arrayBuffer()));
      console.log(
        `    image narrowed ${place.id} → ${width}px (${Math.round(statSync(file).size / 1024)} KB)`,
      );
      await sleep(400);
    }
  }

  return {
    localPath,
    /* Keyed by SLOT, not record id. A stay and a place can share an id
       (Mysuru's Lalitha Mahal is both), and keying on the id let the stay's
       credit overwrite the place's — a photograph on the page with no
       licence row behind it. The slot carries the kind prefix. */
    key: `capsule/${record.destinationId}/${slot}`,
    sourceUrl: place.image.url,
    commonsFilePage: place.image.commonsFilePage,
    license: place.image.license,
    licenseUrl: place.image.licenseUrl,
    attribution: place.image.attribution,
    bytes: statSync(file).size,
  };
}

/**
 * A stay's published website and telephone, or nothing.
 *
 * Wikidata publishes 27 websites and 2 telephone numbers across the 62
 * documented stays. The other 35 and 60 get no field at all — there is no
 * placeholder, no "contact the property", and no number assembled from a
 * country code and a guess.
 */
function stayContact(destinationId, stayId) {
  const contact = STAY_CONTACTS[destinationId]?.[stayId];
  if (!contact) return "";
  return [
    contact.website ? `\n      website: ${quote(contact.website)},` : "",
    contact.phone ? `\n      phone: ${quote(contact.phone)},` : "",
  ].join("");
}

/**
 * A stay's two dates, told apart.
 *
 * Wikidata publishes `inception` (when the building dates from) and `date of
 * official opening` (when it opened as a hotel), and for a converted palace
 * they are decades or centuries apart. Taking whichever matched first and
 * calling it "Opened" made The Peninsula Paris — a 1903 building that opened
 * as a hotel in 2014 — read as having opened in 1903.
 *
 * Each is emitted under its own name, or not at all.
 */
function stayYears(entry) {
  const dates = entry.wikidata?.dates ?? [];
  const pick = (pattern) => {
    const year = dates.find((d) => pattern.test(d.label ?? ""))?.year;
    return Number.isInteger(year) && year > 1000 && year <= 2026 ? year : null;
  };
  const opened = pick(/opening/i);
  const built = pick(/inception/i);

  return [
    opened ? `\n      openedYear: ${opened},` : "",
    built && built !== opened ? `\n      buildingYear: ${built},` : "",
  ].join("");
}

/* -------------------------------------------------------------------------
   Emit
   ------------------------------------------------------------------------- */

const quote = (value) => JSON.stringify(value);

/**
 * How far apart two coordinates are, in kilometres.
 *
 * Haversine, because a degree of longitude is not a degree of latitude and a
 * naive box test would pass a point 300km east of Kyoto.
 */
function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Records whose coordinate is nowhere near the destination they were filed
 * under.
 *
 * WHY THIS IS A DROP, NOT A COORDINATE FIX
 * ----------------------------------------
 * Three records failed this on the first run and every one was the WRONG
 * ARTICLE rather than a bad number:
 *
 *   Devigarh        — a hotel near Udaipur, 250km from Jaipur, picked up from
 *                     Category:Hotels in Rajasthan
 *   Fort Madhogarh  — carrying Delhi's coordinate
 *   The Carlyle     — a building in MINNEAPOLIS, filed under New York City
 *
 * Keeping the record and dropping the coordinate would leave a Minneapolis
 * building described on New York's page. The coordinate is the evidence that
 * the retrieval landed somewhere else, so the record goes.
 *
 * THE CENTRE IS THE MEDIAN, NOT THE MEAN
 * --------------------------------------
 * A mean is dragged toward exactly the outlier being looked for. The median of
 * the destination's own coordinates is stable no matter how wrong one entry is.
 */
const MAX_KM_FROM_DESTINATION = 150;

function withoutDisplacedRecords(record, culture) {
  /* The centre comes from PLACES, which are the destination's own monuments
     and the most reliable anchor. Stays are checked against it — and all three
     records this guard first caught were stays, pulled in from regional hotel
     categories that reach well beyond the city. */
  const points = record.places.map((p) => p.coordinates).filter(Boolean);
  if (points.length < 3) return record;

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const centre = {
    lat: median(points.map((p) => p.lat)),
    lng: median(points.map((p) => p.lng)),
  };

  const keep = (entry, label) => {
    if (!entry.coordinates) return true;
    const km = distanceKm(centre, entry.coordinates);
    if (km <= MAX_KM_FROM_DESTINATION) return true;
    console.log(
      `    DROP  ${label} ${entry.title ?? entry.id} — ${Math.round(km)} km from ${record.destinationId}`,
    );
    return false;
  };

  record.places = record.places.filter((p) => keep(p, "place"));
  if (culture && Array.isArray(culture.stays)) {
    culture.stays = culture.stays.filter((entry) => keep(entry, "stay"));
  }
  return record;
}

function emit(record, images, destinationName, culture = { culture: [], stays: [] }) {
  record = withoutDisplacedRecords(record, culture);
  const history = historyOf(record);

  /*
   * Which places ended up leaning on Wikidata — either because it corroborated
   * a date or because it supplied the coordinate Wikipedia's summary omitted.
   * Only those get a Wikidata source entry: a citation list should name what
   * was used, not everything that was fetched.
   */
  const usesWikidata = new Set([
    ...history.filter((entry) => entry.corroborated).map((entry) => entry.placeIds[0]),
    ...record.places.filter((place) => place.coordinates?.from === "wikidata").map((place) => place.id),
  ]);

  const sources = record.places.flatMap((place) => {
    const wikipedia = `    {
      id: ${quote(place.id)},
      title: ${quote(place.title)},
      publisher: "Wikipedia",
      url: ${quote(place.page)},
      retrievedAt: ${quote(record.retrievedAt)},
      confidence: "medium",
      retrievalMethod: "web-search",
    },`;
    if (!usesWikidata.has(place.id) || !place.wikidata) return [wikipedia];
    return [
      wikipedia,
      `    {
      id: ${quote(`${place.id}-wikidata`)},
      title: ${quote(`${place.title} (${place.wikidata.id})`)},
      publisher: "Wikidata",
      url: ${quote(place.wikidata.url)},
      retrievedAt: ${quote(record.retrievedAt)},
      confidence: "medium",
      retrievalMethod: "agent-api",
    },`,
    ];
  });

  /*
   * A place with nothing publishable to say about it is not published.
   *
   * Every filter this generator applies can, in principle, reject everything a
   * source offered. When that happens the honest output is one fewer place —
   * not a card with a name and an empty paragraph under it.
   */
  const publishablePlaces = record.places.filter((place) => summaryOf(place).trim().length > 0);
  for (const place of record.places) {
    if (!publishablePlaces.includes(place)) {
      console.log(`    DROP  ${place.id} — no publishable sentence in the retrieved text`);
    }
  }
  record.places = publishablePlaces;

  const places = record.places.map((place) => {
    const image = images.get(place.id);
    return `    {
      id: ${quote(place.id)},
      name: ${quote(place.title)},
      category: ${quote(place.category)},
      summary: ${quote(summaryOf(place))},${
        place.coordinates
          ? `\n      coordinates: { lat: ${place.coordinates.lat}, lng: ${place.coordinates.lng} },`
          : "\n      /* No coordinate published by the source, so none is stated. */"
      }${
        image
          ? `\n      image: ${quote(image.localPath)},\n      imageAlt: ${quote(`${place.title}, ${destinationName}`)},`
          : "\n      /* No freely licensed photograph was found, so none is shown. */"
      }
      sourceIds: [${[quote(place.id), ...(place.coordinates?.from === "wikidata" ? [quote(`${place.id}-wikidata`)] : [])].join(", ")}],
    },`;
  });

  const experiences = experiencesOf(record).map(
    (experience) => `    {
      id: ${quote(experience.id)},
      title: ${quote(experience.title)},
      explanation: ${quote(experience.explanation)},
      themes: [${experience.themes.map(quote).join(", ")}],
      placeIds: [${experience.placeIds.map(quote).join(", ")}],
      sourceIds: [${experience.sourceIds.map(quote).join(", ")}],
    },`,
  );

  /*
   * A SENTENCE IS PUBLISHED ONCE.
   *
   * `validateCapsule` refuses a capsule where two history entries or stories
   * carry the same summary, and it compares the EMITTED summary — two
   * different source sentences can still normalise to the same text, which is
   * what two neighbouring monuments' shared opening line did for Delhi and
   * Bhubaneswar. Dropping the later one keeps the earlier, better-dated entry.
   */
  const publishedSummaries = new Set();
  const historyEntries = history.filter((entry) => {
    const summary = entry.summary.trim();
    if (publishedSummaries.has(summary)) return false;
    publishedSummaries.add(summary);
    return true;
  });

  const historyBlocks = historyEntries.map(
    (entry) => `    {
      id: ${quote(entry.id)},${
        entry.year === undefined
          ? "\n      /* The source states a century, not a year, so no year is stored. */"
          : `\n      year: ${entry.year},`
      }
      period: ${quote(entry.period)},
      title: ${quote(entry.title)},
      summary: ${quote(entry.summary)},
      placeIds: [${entry.placeIds.map(quote).join(", ")}],
      sourceIds: [${entry.sourceIds.map(quote).join(", ")}],
    },`,
  );

  const stories = storiesOf(record)
    .filter((entry) => {
      const summary = entry.summary.trim();
      if (publishedSummaries.has(summary)) return false;
      publishedSummaries.add(summary);
      return true;
    })
    .map(
    (story) => `    {
      id: ${quote(story.id)},
      title: ${quote(story.title)},
      summary: ${quote(story.summary)},
      claimType: ${quote(story.claimType)},
      placeIds: [${story.placeIds.map(quote).join(", ")}],
      sourceIds: [${story.sourceIds.map(quote).join(", ")}],
    },`,
  );

  /*
   * CULTURE AND STAYS.
   *
   * Retrieved by `retrieve-culture.mjs` from titles that `check-titles.mjs`
   * resolved and `discover-stays.mjs` found in Wikipedia's own hotel
   * categories. Same rule as everywhere else in this file: the sentence that
   * reaches the page is a sentence the source contained.
   *
   * A stay carries what an article publishes — what it is, when it opened,
   * where it stands. It carries no rate, no telephone number and no
   * availability, because no source here publishes those and the schema is
   * built so they cannot be added later by accident.
   */
  const CULTURE_KINDS = new Set(["food", "festival", "craft"]);

  /*
   * TWO CANDIDATES CAN BE ONE ARTICLE.
   *
   * "Marble inlay" redirects to "Pietra dura" and "Yudofu" redirects to
   * "Tofu", so Agra proposed the same craft twice and Kyoto the same dish
   * twice. Both produced a duplicate id, the validator rejected the whole
   * capsule, and Agra's discovery page 404'd — which is the validator working
   * exactly as intended and the wrong place to find out.
   *
   * Deduplicated on the resolved id, first occurrence winning, so the order in
   * the candidate list stays the order on the page.
   */
  const seenCulture = new Set();
  const seenStays = new Set();

  const cultureEntries = (culture.culture ?? [])
    .filter((entry) => CULTURE_KINDS.has(entry.kind))
    .filter((entry) => {
      const key = `${entry.kind}-${entry.id}`;
      if (seenCulture.has(key)) return false;
      seenCulture.add(key);
      return true;
    })
    .filter((entry) => summaryOf(entry).trim().length > 0)
    .map((entry) => `    {
      id: ${quote(`${entry.kind}-${entry.id}`)},
      kind: ${quote(entry.kind)},
      name: ${quote(entry.title)},
      summary: ${quote(summaryOf(entry))},${
        entry.season ? `\n      season: ${quote(entry.season)},` : ""
      }${
        images.get(`${entry.kind}-${entry.id}`)
          ? `\n      image: ${quote(images.get(`${entry.kind}-${entry.id}`).localPath)},\n      imageAlt: ${quote(`${entry.title} — ${destinationName}`)},`
          : "\n      /* No freely licensed photograph was found, so none is shown. */"
      }
      placeIds: [],
      sourceIds: [${quote(`culture-${entry.kind}-${entry.id}`)}],
    },`);

  const stayEntries = (culture.stays ?? [])
    .filter((entry) => {
      if (seenStays.has(entry.id)) return false;
      seenStays.add(entry.id);
      return true;
    })
    .filter((entry) => summaryOf(entry).trim().length > 0)
    .map((entry) => `    {
      id: ${quote(`stay-${entry.id}`)},
      name: ${quote(entry.title)},
      category: ${quote(stayFacts(record.destinationId, entry.title).category ?? "Documented stay")},
      summary: ${quote(summaryOf(entry))},${
        stayFacts(record.destinationId, entry.title).address
          ? `\n      address: ${quote(stayFacts(record.destinationId, entry.title).address)},`
          : ""
      }${
        entry.coordinates
          ? `\n      coordinates: { lat: ${entry.coordinates.lat}, lng: ${entry.coordinates.lng} },`
          : "\n      /* No coordinate published by the source, so none is stated. */"
      }${stayYears(entry)}${
        images.get(`stay-${entry.id}`)
          ? `\n      image: ${quote(images.get(`stay-${entry.id}`).localPath)},\n      imageAlt: ${quote(`${entry.title}, ${destinationName}`)},`
          : "\n      /* No freely licensed photograph was found, so none is shown. */"
      }${stayContact(record.destinationId, `stay-${entry.id}`)}
      sourceIds: [${[quote(`stay-${entry.id}`), ...(stayContact(record.destinationId, `stay-${entry.id}`) && entry.wikidata?.url ? [quote(`stay-${entry.id}-wikidata`)] : [])].join(", ")}],
    },`);

  /* One citation per retrieved article, on the same terms as a place's. */
  const emittedCultureIds = new Set(cultureEntries.map((block) => /id: "([^"]+)"/.exec(block)[1]));
  /*
   * REGISTER STAYS — the Ministry of Tourism's NIDHI+ entries for the Indian
   * destinations (`.data/stays-register.json`, from `ingest-nidhi.mjs`).
   * They fill the curated section up to its ceiling of twelve AFTER the
   * Wikipedia-documented stays, which carry a photograph and a source
   * sentence a register entry cannot. A register stay carries what the
   * register publishes — name, sub-category, postal address, the telephone
   * number the unit registered — and states no coordinate, because the
   * register publishes none. Its summary is a sentence about the register
   * entry, not about the hotel, and is cited to that entry.
   */
  const REGISTER = existsSync(".data/stays-register.json") ? JSON.parse(readFileSync(".data/stays-register.json", "utf8")) : {};
  /*
   * A USEFUL RANGE, NOT THE FIRST TWELVE ALPHABETICALLY. Delhi's register
   * holds 167 bed-and-breakfasts and 53 hotels; taking the top of an
   * alphabetical list gives a reader twelve B&Bs beginning with "A". Rows are
   * interleaved across sub-categories in a fixed order — hotels and heritage
   * properties first, then homestays, guest houses, B&Bs, resorts — and
   * alphabetical within each, so the selection is deterministic and shows
   * the kinds of stay the destination actually registers.
   */
  const CATEGORY_ORDER = ["Hotel", "Heritage", "Homestay", "Guest House", "Bed and Breakfast", "Resort", "Apartment Hotel", "Lodge and Tourist Home", "Legacy Vintage", "Farm Stay", "Motel", "House Boat"];
  /* One unit per registered telephone number within a destination: the same
     operator registering two units on one line is one place to call, and a
     second card with the same number is a duplicate. */
  const seenPhones = new Set();
  const registerPool = (REGISTER[record.destinationId] ?? [])
    .filter((r) => r.name && r.category && r.address)
    .filter((r) => { if (!r.phone) return true; const k = r.phone.replace(/\D/g, ""); if (seenPhones.has(k)) return false; seenPhones.add(k); return true; });
  const byCategory = new Map(CATEGORY_ORDER.map((c) => [c, registerPool.filter((r) => r.category === c).sort((x, y) => x.name.localeCompare(y.name))]));
  const registerRows = [];
  const room = Math.max(0, 12 - stayEntries.length);
  for (let round = 0; registerRows.length < room && round < 50; round++) {
    for (const c of CATEGORY_ORDER) {
      const next = byCategory.get(c)?.[round];
      if (next && registerRows.length < room) registerRows.push(next);
    }
  }
  const registerId = (r) => `stay-nidhi-${r.id.slice(0, 8)}`;
  const registerEntries = registerRows.map((r) => `    {
      id: ${quote(registerId(r))},
      name: ${quote(r.name)},
      category: ${quote(r.category)},
      summary: ${quote(`Registered on NIDHI+, the Ministry of Tourism's National Integrated Database of Hospitality Industry, as a ${r.category.toLowerCase()} in ${r.city}.`)},
      /* No coordinate: the register publishes a postal address, not a location. */
      address: ${quote(r.address.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim())},${r.phone ? `\n      phone: ${quote(r.phone)},` : "\n      /* The register lists no telephone number for this unit; none is guessed. */"}${r.email ? `\n      email: ${quote(r.email)},` : ""}
      sourceIds: [${quote(registerId(r))}],
    },`);
  const registerSources = registerRows.map((r) => `    {
      id: ${quote(registerId(r))},
      title: ${quote(`${r.name} — NIDHI+ register entry`)},
      publisher: "Ministry of Tourism, Government of India (NIDHI+)",
      url: ${quote(r.source.url)},
      retrievedAt: ${quote(r.source.retrievedAt)},
      confidence: "high",
      retrievalMethod: "agent-api",
    },`);
  const emittedStayIds = new Set(stayEntries.map((block) => /id: "([^"]+)"/.exec(block)[1]));
  /*
   * One citation per emitted record. Filtering by emitted id is not enough on
   * its own: two candidates that resolved to the same article still both pass
   * that test, which is how Agra kept a duplicate `culture-craft-pietra-dura`
   * source after its duplicate craft had already been removed.
   */
  const seenSourceIds = new Set();
  const cultureSources = [
    ...(culture.culture ?? [])
      .filter((entry) => emittedCultureIds.has(`${entry.kind}-${entry.id}`))
      .map((entry) => ({ id: `culture-${entry.kind}-${entry.id}`, entry })),
    ...(culture.stays ?? [])
      .filter((entry) => emittedStayIds.has(`stay-${entry.id}`))
      .map((entry) => ({ id: `stay-${entry.id}`, entry })),
  ].filter(({ id }) => {
    if (seenSourceIds.has(id)) return false;
    seenSourceIds.add(id);
    return true;
  }).flatMap(({ id, entry }) => [`    {
      id: ${quote(id)},
      title: ${quote(entry.title)},
      publisher: "Wikipedia",
      url: ${quote(entry.page)},
      retrievedAt: ${quote(culture.retrievedAt ?? record.retrievedAt)},
      confidence: "medium",
      retrievalMethod: "web-search",
    },`,
    /* A website or telephone number on a stay came from Wikidata (P856 /
       P1329, via enrich-stays.mjs), not from the Wikipedia article — so the
       Wikidata item is cited beside it. A phone with only a Wikipedia
       citation was a claim whose source did not publish it. */
    ...(id.startsWith("stay-") && entry.wikidata?.url && stayContact(record.destinationId, id)
      ? [`    {
      id: ${quote(`${id}-wikidata`)},
      title: ${quote(`${entry.title} (${entry.wikidata.id})`)},
      publisher: "Wikidata",
      url: ${quote(entry.wikidata.url)},
      retrievedAt: ${quote(culture.retrievedAt ?? record.retrievedAt)},
      confidence: "medium",
      retrievalMethod: "agent-api",
    },`]
      : []),
  ]);

  return `import type { DestinationCapsule } from "@/types/capsule";

/**
 * ${destinationName} — a tourism capsule.
 *
 * GENERATED, AND THAT IS THE POINT. Written by
 * \`scripts/capsules/generate.mjs\` from a retrieval recorded in
 * \`.data/capsules/${record.destinationId}.json\` on ${record.retrievedAt}.
 *
 * Every summary, historical claim and cultural description below is a span
 * copied VERBATIM from the Wikipedia article cited beside it — not written
 * from a model's memory, which is the distinction this project has kept since
 * Phase 3. Coordinates are the ones the source publishes; a place whose
 * source publishes none does not get one. Photographs are freely licensed
 * Commons files, vendored locally, credited in
 * \`src/data/generated/image-credits.json\`.
 *
 * Do not hand-edit. Re-run the two scripts instead: the same records produce
 * byte-identical output, and a hand-edit is a claim nobody retrieved.
 *
 * NOT HUMAN-REVIEWED. The retrieval is real and the spans are verbatim, but
 * no editor has yet read these against the sources. That review is the step
 * between "capsule" and a depth a destination can be proud of.
 */
export const capsule: DestinationCapsule = {
  destinationId: ${quote(record.destinationId)},
  scope: ${quote(record.scope)},

  sources: [
${[...sources, ...cultureSources, ...registerSources].join("\n")}
  ],

  places: [
${places.join("\n")}
  ],

  experiences: [
${experiences.join("\n")}
  ],

  history: [
${historyBlocks.join("\n")}
  ],

  stories: [
${stories.join("\n")}
  ],

  culture: [
${cultureEntries.join("\n")}
  ],

  stays: [
${[...stayEntries, ...registerEntries].join("\n")}
  ],

  reviewedAt: ${quote(record.retrievedAt)},
  reviewedBy: "scripts/capsules (retrieved; pending human review)",
};
`;
}

/* -------------------------------------------------------------------------
   Run
   ------------------------------------------------------------------------- */

const files = (await readdir(RECORDS)).filter((file) => file.endsWith(".json"));
const credits = JSON.parse(readFileSync(CREDITS, "utf8"));
const creditByKey = new Map(credits.map((credit) => [credit.key, credit]));

const report = [];

for (const file of files.sort()) {
  const record = JSON.parse(readFileSync(`${RECORDS}/${file}`, "utf8"));
  const destination = PLAN.find((entry) => entry.id === record.destinationId);
  const destinationName =
    record.destinationId.charAt(0).toUpperCase() + record.destinationId.slice(1).replace(/-/g, " ");

  console.log(`\n${record.destinationId}`);

  /*
   * The culture and stays pass is optional per destination. A destination
   * whose record has not been retrieved yet, or which genuinely has no
   * documented hotels, generates exactly as it did before.
   */
  const culturePath = `${CULTURE_RECORDS}/${record.destinationId}.json`;
  const culture = existsSync(culturePath)
    ? JSON.parse(readFileSync(culturePath, "utf8"))
    : { culture: [], stays: [] };

  const images = new Map();
  let imageBytes = 0;
  const slots = [
    ...record.places.map((place) => [place.id, place]),
    ...(culture.culture ?? []).map((entry) => [`${entry.kind}-${entry.id}`, entry]),
    ...(culture.stays ?? []).map((entry) => [`stay-${entry.id}`, entry]),
  ];
  for (const [slot, place] of slots) {
    const vendored = await vendor(record, place, slot);
    if (!vendored) continue;
    images.set(slot, vendored);
    imageBytes += vendored.bytes;
    creditByKey.set(vendored.key, {
      key: vendored.key,
      localPath: vendored.localPath,
      sourceUrl: vendored.sourceUrl,
      commonsFilePage: vendored.commonsFilePage,
      license: vendored.license,
      licenseUrl: vendored.licenseUrl,
      attribution: vendored.attribution,
    });
  }

  const source = emit(record, images, destination?.name ?? destinationName, culture);
  writeFileSync(`${OUT_DIR}/${record.destinationId}.ts`, source);

  const counts = {
    id: record.destinationId,
    places: record.places.length,
    images: images.size,
    imageKB: Math.round(imageBytes / 1024),
    history: historyOf(record).length,
    stories: storiesOf(record).length,
    experiences: experiencesOf(record).length,
    /* What was EMITTED, not what was read: the records also carry the stay
       titles that the earlier candidate list happened to resolve, and those
       are published as stays rather than as culture. */
    culture: (culture.culture ?? []).filter((entry) =>
      ["food", "festival", "craft"].includes(entry.kind)).length,
    stays: (culture.stays ?? []).length,
    bytes: source.length,
  };
  report.push(counts);
  console.log(
    `  places ${counts.places} · experiences ${counts.experiences} · history ${counts.history} · ` +
      `stories ${counts.stories} · culture ${counts.culture} · stays ${counts.stays} · ` +
      `images ${counts.images} (${counts.imageKB} KB) · file ${Math.round(counts.bytes / 1024)} KB`,
  );
}

/*
 * PRUNE CREDITS FOR FILES THAT NO LONGER EXIST.
 *
 * `creditByKey` is seeded from the existing credits file and only ever added
 * to, so an image the generator stops vendoring — a diagram it now skips, a
 * place dropped from the plan — left its credit behind. The next run then
 * claimed a licence for a file that is not on disk, and two suites caught it:
 * "every referenced local file exists" and "every credited file exists".
 *
 * A credit is a claim about a file. When the file goes, the claim goes.
 */
for (const [key, credit] of [...creditByKey.entries()]) {
  if (!credit.localPath?.startsWith("/images/capsule/")) continue;
  if (!existsSync(`public${credit.localPath}`)) {
    creditByKey.delete(key);
    console.log(`  credit pruned  ${key} — no file on disk`);
  }
}

writeFileSync(CREDITS, `${JSON.stringify([...creditByKey.values()], null, 2)}\n`);

console.log(`\n${"".padEnd(78, "=")}`);
console.log(
  `capsules ${report.length} · places ${report.reduce((n, r) => n + r.places, 0)} · ` +
    `history ${report.reduce((n, r) => n + r.history, 0)} · stories ${report.reduce((n, r) => n + r.stories, 0)} · ` +
    `experiences ${report.reduce((n, r) => n + r.experiences, 0)} · ` +
    `culture ${report.reduce((n, r) => n + r.culture, 0)} · stays ${report.reduce((n, r) => n + r.stays, 0)}`,
);
console.log(
  `source ${Math.round(report.reduce((n, r) => n + r.bytes, 0) / 1024)} KB · ` +
    `images ${Math.round(report.reduce((n, r) => n + r.imageKB, 0) / 1024)} MB across ` +
    `${report.reduce((n, r) => n + r.images, 0)} files`,
);
console.log("".padEnd(78, "="));
console.log("\nNext: register the ids in capsules/ids.ts and capsules/index.ts,");
console.log("set each destination's depth to \"capsule\", then npm run qa:content-framework\n");
