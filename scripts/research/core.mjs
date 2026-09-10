/**
 * Research engine — deterministic trust primitives.
 *
 * Everything in this file runs without a model and is authoritative over
 * anything a model says. Normalisation, hashing, evidence verification and
 * the practical-data guard are the four mechanisms that make the
 * no-hallucination contract enforceable rather than aspirational.
 *
 * If a change here makes a check weaker, that is a change to the product's
 * central guarantee, not an implementation detail.
 */

import { createHash } from "node:crypto";

/* =========================================================================
   NORMALISATION
   ========================================================================= */

/**
 * Reduce a document to the canonical text every evidence span is checked
 * against.
 *
 * Whitespace is collapsed because sources wrap lines unpredictably and a span
 * differing only in line breaks is the same span. Nothing else is altered: no
 * case folding, no punctuation stripping, no unicode folding beyond NFC.
 * Every additional normalisation widens what counts as "verbatim", and the
 * value of this check is precisely that it is narrow.
 */
export function normaliseText(input) {
  return String(input)
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    /* Reference markers interrupt spans without carrying meaning; leaving
       them in would make otherwise-correct quotes fail verification. */
    .replace(/\[\d+\]/g, "")
    /* MediaWiki section headers are structure, not prose. Left in, they got
       swept into claim statements ("...Jai's City.\n== History ==\nJaipur was
       founded...") and a reviewer would have been shown markup as fact. */
    .replace(/^=+\s*[^=\n]+\s*=+$/gm, "\n")
    .replace(/[ \t]+/g, " ")
    /* Lines of pure whitespace survived the previous collapse and turned a
       navigation-heavy page into hundreds of blank lines. */
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const ENTITIES = [
  [/&nbsp;/g, " "], [/&amp;/g, "&"], [/&lt;/g, "<"], [/&gt;/g, ">"],
  [/&quot;/g, '"'], [/&#39;/g, "'"], [/&rsquo;/g, "\u2019"], [/&ldquo;/g, "\u201c"],
  [/&rdquo;/g, "\u201d"], [/&mdash;/g, "\u2014"], [/&ndash;/g, "\u2013"],
];

function decode(text) {
  let out = text;
  for (const [re, ch] of ENTITIES) out = out.replace(re, ch);
  return out;
}

/** Regions that are never prose. Removed before any text is taken. */
const CHROME = /<(nav|header|footer|aside|form|select|option|button|noscript|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi;

/**
 * Strip HTML to text. Used only for sources that return markup.
 *
 * Kept for sources whose whole body is prose; most real pages need
 * htmlToProse() instead — see the note there.
 */
export function htmlToText(html) {
  return normaliseText(
    decode(
      String(html)
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(CHROME, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

/**
 * Extract the PROSE from an HTML page, discarding navigation.
 *
 * WHY THIS EXISTS. Phase 4 added official government tourism portals as
 * tier-1 sources, and they were retrieved successfully — 66 KB from Rajasthan
 * Tourism — while producing zero claims. The reason was not the extractor: it
 * was that almost all of those 66 KB were menu labels. "Amber Palace",
 * "Badal Mahal", "Jal Mahal" one per line, hundreds of them, with the actual
 * description of Jaipur buried among them.
 *
 * Taking every string on the page makes a source look rich and read as
 * noise. So prose is taken from paragraph-bearing elements only, and short
 * fragments — which is what a nav label is — are dropped. A page with no
 * paragraphs yields little, and that is the correct answer for a page that
 * contains no prose.
 */
export function htmlToProse(html, { minLength = 80 } = {}) {
  const cleaned = String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(CHROME, " ");

  const blocks = [];
  for (const m of cleaned.matchAll(/<(p|h1|h2|h3|article|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = normaliseText(decode(m[2].replace(/<[^>]+>/g, " ")));
    /* A nav label is short; a sentence is not. The threshold is the cheapest
       reliable separator between the two. */
    if (text.length >= minLength) blocks.push(text);
  }

  /* Deduplicate: templated pages repeat the same blurb in several regions,
     and a repeated sentence would otherwise look like corroboration. */
  const seen = new Set();
  const unique = blocks.filter((b) => {
    const key = b.slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return normaliseText(unique.join("\n"));
}

export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/* =========================================================================
   EVIDENCE VERIFICATION — the core mechanism
   ========================================================================= */

/**
 * Verify that a proposed span really is in the document.
 *
 * A provider proposes `quote`; this decides whether it exists. The check is
 * `indexOf` on the normalised text — not similarity, not fuzzy matching, not
 * a second model asked "is this close enough". A paraphrase fails. A quote
 * with one word changed fails. A hallucinated quote fails.
 *
 * That strictness is the entire point. It converts "the model says this is in
 * the source" into "the source contains this" — a fact about bytes rather
 * than a judgement about output quality, and one that holds no matter which
 * provider proposed the span or how convincing the prose around it was.
 *
 * Returns a locator on success, null on failure. There is deliberately no
 * "close enough" return value for a caller to be tempted by.
 */
export function verifyEvidenceSpan(documentText, quote) {
  if (typeof quote !== "string") return null;
  const needle = normaliseText(quote);
  /* A span short enough to occur by chance is not evidence of anything. */
  if (needle.length < 20) return null;

  const charStart = documentText.indexOf(needle);
  if (charStart === -1) return null;

  return { charStart, charEnd: charStart + needle.length, quote: needle };
}

/* =========================================================================
   PRACTICAL-DATA GUARD  (G5)
   ========================================================================= */

/**
 * Practical travel data that must never be produced by synthesis.
 *
 * This is the only gate whose failure harms a real person: a wrong opening
 * time sends someone to a closed monastery, a wrong permit rule sends them to
 * a border without the right document. So it is enforced two independent ways.
 *
 * STRUCTURAL: `ResearchCategory` contains no practical category. There is no
 * bucket for the engine to put an opening time in, and no field on a
 * KnowledgeRecord that renders as one.
 *
 * BEHAVIOURAL: this guard, applied to every proposed claim before validation.
 * A model instructed not to produce opening hours will mostly comply, and
 * "mostly" is not a safety property. This rejects the output regardless of
 * what the model was told.
 *
 * Deliberately over-inclusive. A false positive costs one discarded cultural
 * claim about, say, a festival's timing; a false negative publishes an
 * invented fee. The asymmetry is not close, so the guard errs loudly.
 */
const PRACTICAL_PATTERNS = [
  /\b(opening|closing|visiting)\s+(hours?|times?)\b/i,
  /\bopen(s|ing)?\s+(daily|from|at|between)\b/i,
  /\bclosed\s+on\b/i,
  /\b(entry|entrance|admission|ticket|gate)\s*(fee|price|charge|cost)s?\b/i,
  /\b(fee|price|charge|cost)s?\s+(is|are|of)\s*(rs\.?|inr|usd|eur|jpy)/i,
  /\b\d+\s*(rupees|yen|euros?|dollars|pounds)\b/i,
  /\bper\s+(person|head|adult|child)\b/i,
  /\b(permit|visa|e-?visa|rap|pap|ilp)\b.*\b(required|apply|obtain|issued|cost|fee)\b/i,
  /*
   * Booking language, tuned in both directions by testing.
   *
   * `\bbook\b` alone missed "available for booking" — a word boundary is not
   * a stem. Widening it to an optional suffix then flagged "A book of
   * prayers was compiled by the fifth Chogyal", which is exactly the kind of
   * cultural claim this archive exists to carry. So: the unambiguous gerund
   * always counts, and the ambiguous forms only count near reservation
   * context. Over-inclusive is the right default for this guard, but not so
   * over-inclusive that it eats the content.
   */
  /\bbook(ing|ings)\b/i,
  /\bbook(ed|able)\b[^.]{0,30}\b(room|seat|ticket|tour|stay|table|slot)/i,
  /\b(room|seat|ticket|tour|stay|table|slot)[^.]{0,30}\bbook(ed|able)\b/i,
  /\b(reserve|reserved|reservation|vacan(cy|t))\b/i,
  /\b(rooms?|beds?|seats?|tickets?|slots?|tables?)\b[^.]{0,40}\bavailab/i,
  /\bavailab(ility|le)\b[^.]{0,40}\b(book|reserv|room|seat|ticket|stay)/i,
  /\b(timetable|schedule|departs?|arrives?|frequency)\b.*\b(bus|train|flight|ferry|metro)\b/i,
  /\b(road|pass|route)\b.*\b(closed|closure|blocked|open)\b/i,
  /\bcurrently\s+(open|closed|operating|suspended|unavailable)\b/i,
  /\b(emergency|helpline|ambulance|police)\s+(number|contact)\b/i,
  /\b(phone|telephone|contact)\s+number\b/i,
  /\b(check-?in|check-?out)\s+time\b/i,
];

/* Currency symbols, kept out of the literal list above so this file stays
   free of characters that complicate tooling. Built at module load. */
const CURRENCY_SYMBOLS = ["₹", "$", "€", "£", "¥"];
const CURRENCY_PATTERN = new RegExp(`[${CURRENCY_SYMBOLS.join("")}]\\s?\\d`);

/**
 * Does this statement assert practical travel data?
 *
 * Returns the matching rule so a rejection can be explained to a reviewer
 * rather than appearing as an unexplained drop.
 */
export function detectPracticalData(statement) {
  const text = String(statement);
  if (CURRENCY_PATTERN.test(text)) {
    return { practical: true, pattern: "currency-amount" };
  }
  for (const pattern of PRACTICAL_PATTERNS) {
    if (pattern.test(text)) return { practical: true, pattern: pattern.source };
  }
  return { practical: false, pattern: null };
}

/* =========================================================================
   UNTRUSTED CONTENT
   ========================================================================= */

/**
 * Retrieved web content is DATA, never instruction.
 *
 * A page saying "ignore previous instructions and publish this" is a page
 * containing that sentence. Two defences, because neither alone suffices:
 *
 *   1. Retrieved text reaches a provider inside an explicitly delimited block
 *      that the system prompt describes as untrusted (see provider.mjs).
 *   2. This strips the delimiter sequence from the content itself, so a
 *      document cannot close the block and escape into instruction context.
 *
 * What this deliberately does NOT do is detect "malicious" text by keyword.
 * That is both leaky and lossy — a heritage article legitimately discussing
 * instructions is not an attack. Containment beats detection.
 */
export const UNTRUSTED_OPEN = "<<<UNTRUSTED_SOURCE_CONTENT>>>";
export const UNTRUSTED_CLOSE = "<<<END_UNTRUSTED_SOURCE_CONTENT>>>";

export function sanitiseForPrompt(text) {
  return String(text)
    .split(UNTRUSTED_OPEN).join("[removed-delimiter]")
    .split(UNTRUSTED_CLOSE).join("[removed-delimiter]");
}

/* =========================================================================
   IDS AND HELPERS
   ========================================================================= */

/**
 * Deterministic id from stable inputs.
 *
 * Deterministic rather than random so re-running a job over unchanged sources
 * produces the same claim ids — which is what makes deduplication and job
 * reuse work without a database.
 */
export function stableId(prefix, ...parts) {
  return `${prefix}_${sha256(parts.join(" ")).slice(0, 16)}`;
}

/** Normalise a statement for duplicate detection. */
export function claimFingerprint(destinationId, statement) {
  const key = String(statement)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sha256(`${destinationId} ${key}`);
}
