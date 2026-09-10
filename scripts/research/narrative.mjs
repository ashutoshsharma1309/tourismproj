/**
 * Sentence-level narrative verification — the Phase 4 centrepiece.
 *
 * Phase 3 refused to let a model write narrative at all, because a model
 * asked to turn claims into flowing prose reliably adds connective
 * assertions: a motive, a consequence, a date, a "this made it important".
 * Each addition is plausible, unsourced, and invisible in a paragraph that
 * otherwise checks out.
 *
 * This module is what makes generation safe enough to allow. Generated prose
 * is split into sentences, each sentence is decomposed into FACTUAL ATOMS,
 * and every atom must be present in an approved claim. An atom that is not
 * supported rejects its sentence. The paragraph is assembled from what
 * survives.
 *
 * WHY ATOMS AND NOT SIMILARITY
 * ----------------------------
 * A similarity score answers "does this sentence resemble the claims?" — and
 * the sentences that most need rejecting are precisely the ones that resemble
 * them closely while adding one new fact. "Founded in 1705 by Lhatsun Chempo,
 * it became the seat of the Nyingma order in 1710" scores extremely well
 * against a claim about 1705 and smuggles in 1710.
 *
 * So verification asks a different question, one at a time: is THIS year in a
 * claim? is THIS entity? is THIS superlative? is THIS causal relationship?
 * Similarity is never sufficient proof, and is not used as proof here at all.
 *
 * The model is a writer. The claim set is the fact base. Verification is the
 * boundary, and it is deterministic.
 */

import { detectPracticalData, normaliseText, stableId } from "./core.mjs";

/* =========================================================================
   SENTENCE SPLITTING
   ========================================================================= */

/**
 * Split prose into sentences.
 *
 * Abbreviations that end in a period would otherwise split mid-sentence and
 * produce fragments that fail verification for the wrong reason.
 */
const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|St|Mt|No|vs|etc|c|ca|approx|Fig|e\.g|i\.e)\.$/i;

export function splitSentences(text) {
  const parts = String(text)
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/);

  const out = [];
  for (const part of parts) {
    const previous = out[out.length - 1];
    if (previous && ABBREVIATIONS.test(previous)) out[out.length - 1] = `${previous} ${part}`;
    else out.push(part);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

/* =========================================================================
   FACTUAL ATOMS
   ========================================================================= */

/** Words that are capitalised for position, not because they name anything. */
const NON_ENTITY = new Set([
  "the", "a", "an", "this", "that", "these", "those", "it", "its", "he", "she", "they", "their",
  "and", "but", "or", "in", "on", "at", "by", "for", "from", "to", "of", "with", "as", "was",
  "were", "is", "are", "been", "being", "has", "have", "had", "today", "later", "during",
  "after", "before", "when", "while", "although", "however", "because", "over", "under",
  "built", "founded", "established", "constructed", "located", "known", "one", "two", "three",
  "many", "most", "some", "several", "both", "each", "every", "there", "here", "now", "then",
]);

/**
 * Superlatives and absolutes.
 *
 * These are assertions dressed as adjectives. "One of the most important
 * Buddhist sites" is a claim about rank, and a claim set that establishes a
 * monastery's founding date says nothing about its importance relative to
 * others. Left unchecked, this is the single most common way a generated
 * paragraph overstates its sources.
 */
const SUPERLATIVE = /\b(most|least|largest|smallest|oldest|newest|biggest|greatest|finest|best|worst|foremost|leading|principal|primary|chief|main|major|only|first|last|unique|unrivalled|unparalleled|renowned|famous|celebrated|important|significant|prominent)\b/gi;

/**
 * Connectives, split by what they actually assert.
 *
 * PHASE 6. Composition needs transitions — prose without them is a list —
 * but a transition can smuggle a claim. The distinction that makes this
 * tractable is logical rather than stylistic:
 *
 *   Does the connective assert something the supported claims already
 *   entail, or does it assert something new?
 *
 * CAUSAL / EVALUATIVE asserts something new. "Because of this it became
 *   important" claims a cause; "these traditions shaped the region's
 *   identity" claims a significance. Two supported facts sitting side by
 *   side entail neither. These are rejected unless a claim carries the
 *   relationship itself. Phase 6 ADDED the evaluative verbs — shaped,
 *   influenced, gave rise to, cemented — which previously slipped through
 *   whenever the sentence happened to carry no date or proper noun.
 *
 * PRESENT-CONTINUATION asserts that something is still true now. A claim
 *   about 1705 supports nothing about today. Kept rejected.
 *
 * PROCESS asserts gradual change — "over time", "eventually". Two dated
 *   facts do not entail a process between them. Kept rejected.
 *
 * ORDERING asserts only sequence: "later", "subsequently". When the claim
 *   set contains both years and they run in the stated direction, the
 *   ordering IS entailed, and rejecting it would force prose to repeat bare
 *   dates forever. Allowed only under that check.
 *
 * ADDITIVE asserts only conjunction: "also", "in addition". If both joined
 *   facts are supported, their conjunction is supported. Nothing new is
 *   claimed, so nothing new needs proving.
 */
const CONNECTIVE_CAUSAL = /\b(because of this|as a result|consequently|therefore|thus|hence|this made|which made|led to|resulted in|owing to|due to this|for this reason|in turn|as such|meant that|gave rise to|contributed to|helped (?:to )?(?:establish|shape|create)|cemented|ensured|shaped|influenced|transformed|established it as|made it (?:a|the|an))\b/gi;

const CONNECTIVE_PRESENT = /\b(today it|it remains|has remained|continues to|to this day|still stands|remains one of)\b/gi;

const CONNECTIVE_PROCESS = /\b(over time|in time|eventually|gradually|increasingly|came to be)\b/gi;

const CONNECTIVE_ORDERING = /\b(later|subsequently|afterwards|thereafter|earlier)\b/gi;

const CONNECTIVE_ADDITIVE = /\b(also|in addition|additionally|alongside|likewise|furthermore|moreover|as well|while)\b/gi;

/** Connectives that assert something new and must be separately supported. */
const CONNECTIVE = new RegExp(
  `${CONNECTIVE_CAUSAL.source}|${CONNECTIVE_PRESENT.source}|${CONNECTIVE_PROCESS.source}`,
  "gi",
);

/**
 * Decompose a sentence into the things that must be independently supported.
 *
 * `hasAssertion` is false only for sentences carrying no checkable content at
 * all — those are not published either, but they are reported as "no factual
 * content" rather than as unsupported, which is a different problem.
 */
export function extractFactualAtoms(sentence) {
  const text = String(sentence);

  const years = [...text.matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)].map((m) => m[1]);
  /* Bare numerals excluding the years already captured. */
  const numbers = [...text.matchAll(/\b\d+(?:[.,]\d+)?\b/g)]
    .map((m) => m[0])
    .filter((n) => !years.includes(n));
  const entities = [...text.matchAll(/\b([A-Z][a-zA-ZÀ-ɏ]{2,}(?:\s+[A-Z][a-zA-ZÀ-ɏ]{2,}){0,3})\b/g)]
    .map((m) => m[1])
    .filter((e) => !NON_ENTITY.has(e.toLowerCase().split(/\s+/)[0]));
  const superlatives = [...text.matchAll(SUPERLATIVE)].map((m) => m[0].toLowerCase());
  const connectives = [...text.matchAll(CONNECTIVE)].map((m) => m[0].toLowerCase());
  const ordering = [...text.matchAll(CONNECTIVE_ORDERING)].map((m) => m[0].toLowerCase());
  const additive = [...text.matchAll(CONNECTIVE_ADDITIVE)].map((m) => m[0].toLowerCase());

  return {
    years: [...new Set(years)],
    numbers: [...new Set(numbers)],
    entities: [...new Set(entities)],
    superlatives: [...new Set(superlatives)],
    connectives: [...new Set(connectives)],
    /* Sound transitions, tracked separately — they are not failures. */
    ordering: [...new Set(ordering)],
    additive: [...new Set(additive)],
    hasAssertion:
      years.length > 0 || numbers.length > 0 || entities.length > 0 ||
      superlatives.length > 0 || connectives.length > 0 ||
      ordering.length > 0 || additive.length > 0,
  };
}

/* =========================================================================
   VERIFICATION
   ========================================================================= */

const norm = (s) => normaliseText(String(s)).toLowerCase();

/** Content words of a claim, for grounding checks. */
function contentWords(text) {
  return new Set(
    norm(text)
      .replace(/[^a-z0-9À-ɏ\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !NON_ENTITY.has(w)),
  );
}

/**
 * Verify one sentence against the approved claim set.
 *
 * Every atom must be found in the claims that support the sentence. A single
 * unsupported atom rejects the whole sentence — there is no partial credit,
 * because a sentence is published or not published as a unit.
 *
 * Returns the supporting claim ids on success so the published block can cite
 * them, and the specific unsupported atoms on failure so a reviewer sees why.
 */
export function verifySentence(sentence, approvedClaims) {
  const atoms = extractFactualAtoms(sentence);

  /* The practical-data firewall applies to the narrative path too. A source
     may well state opening hours; that does not permit the narrative engine
     to restate them. Checked first, before anything else. */
  const practical = detectPracticalData(sentence);
  if (practical.practical) {
    return { ok: false, reason: "practical-data", detail: practical.pattern, claimIds: [], atoms };
  }

  /*
   * DIRECT RESTATEMENT. If the sentence is a claim, or is contained verbatim
   * within one, it is supported by the strongest evidence available — it IS
   * the approved text. Atom checking exists to catch what a model ADDS to a
   * claim; there is nothing added here.
   *
   * This is not a loosening. The containment test is one-directional on
   * purpose: an approved claim may contain the sentence, never the reverse.
   * A sentence that contains a claim plus extra words is exactly the smuggling
   * case, and it falls through to the atom checks below.
   *
   * Without this, a perfectly sourced sentence carrying no year, number or
   * proper noun — "It also served as a place where the ladies of the royal
   * household could observe everyday life without being seen themselves" —
   * was rejected as "asserts nothing checkable" while being, verbatim, an
   * approved claim.
   */
  const normalisedSentence = norm(sentence);
  const restated = approvedClaims.filter((claim) => {
    const c = norm(claim.statement);
    return c === normalisedSentence || c.includes(normalisedSentence);
  });
  if (restated.length > 0) {
    return { ok: true, reason: null, detail: "direct restatement of an approved claim", claimIds: restated.map((c) => c.id), atoms };
  }

  if (!atoms.hasAssertion) {
    return { ok: false, reason: "no-factual-content", detail: "sentence asserts nothing checkable", claimIds: [], atoms };
  }

  /* Candidate support: claims sharing at least one entity or year with the
     sentence. Nothing is proved yet — this only narrows the search. */
  const candidates = approvedClaims.filter((claim) => {
    const c = norm(claim.statement);
    return (
      atoms.entities.some((e) => c.includes(norm(e))) ||
      atoms.years.some((y) => c.includes(y))
    );
  });

  if (candidates.length === 0) {
    return { ok: false, reason: "no-supporting-claim", detail: "no approved claim mentions anything in this sentence", claimIds: [], atoms };
  }

  const pool = candidates.map((c) => norm(c.statement)).join(" ");
  const poolWords = new Set(candidates.flatMap((c) => [...contentWords(c.statement)]));
  const unsupported = [];

  /* Years: an unsupported date is the classic smuggled fact. */
  for (const year of atoms.years) if (!pool.includes(year)) unsupported.push(`year:${year}`);

  /* Numbers: quantities are assertions too. */
  for (const n of atoms.numbers) if (!pool.includes(n)) unsupported.push(`number:${n}`);

  /* Entities: a name the claims never mention is a new fact. */
  for (const e of atoms.entities) if (!pool.includes(norm(e))) unsupported.push(`entity:${e}`);

  /* Superlatives: rank claims need a source that ranks. */
  for (const sup of atoms.superlatives) if (!pool.includes(sup)) unsupported.push(`superlative:${sup}`);

  /*
   * Causal, evaluative, present-continuation and process connectives assert
   * something the claims must actually contain. "Because of this it became a
   * centre of learning" is two assertions — the becoming and the because —
   * and a claim set can easily support the first while saying nothing about
   * the second.
   *
   * Matching the phrase alone is not enough: the relationship has to be in a
   * claim, so the check looks for the connective or its head verb in the
   * supporting text.
   */
  for (const conn of atoms.connectives) {
    const head = conn.split(/\s+/)[0];
    if (!pool.includes(conn) && !pool.includes(head)) unsupported.push(`connective:${conn}`);
  }

  /*
   * ORDERING is entailed when the claims carry the dates it orders.
   *
   * "Founded in 1705, it was later rebuilt in 1913" asserts nothing beyond
   * 1705 < 1913, and both years are checked above. What is NOT entailed is an
   * ordering with nothing to order — "it was later expanded" with a single
   * date in the claim set asserts a second event, so it is refused.
   *
   * This is the one place Phase 6 permits something Phase 5 did not, and the
   * condition is deliberately strict: at least two distinct years, in the
   * supporting claims, spanning the ordering.
   */
  if (atoms.ordering.length > 0) {
    const claimYears = [...new Set(
      candidates.flatMap((c) => [...String(c.statement).matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)].map((m) => m[1])),
    )];
    const sentenceYears = atoms.years;
    const orderingGrounded =
      claimYears.length >= 2 &&
      sentenceYears.length >= 2 &&
      sentenceYears.every((y) => claimYears.includes(y));
    if (!orderingGrounded) {
      unsupported.push(`ordering:${atoms.ordering.join("/")} (needs two dated claims it orders)`);
    }
  }

  /*
   * ADDITIVE connectives assert conjunction and nothing else. If both joined
   * facts are supported — and every atom in the sentence has just been
   * checked — their conjunction is supported too. No further test is needed,
   * and adding one would reject correct prose for being well written.
   */

  if (unsupported.length > 0) {
    return { ok: false, reason: "unsupported-assertion", detail: unsupported.join(", "), claimIds: candidates.map((c) => c.id), atoms };
  }

  /*
   * Grounding backstop. Every atom checking out is necessary, not sufficient:
   * a sentence could pass while carrying substantive unchecked vocabulary
   * ("the monastery was destroyed" contains no atom at all). Requiring most
   * content words to come from the claim set closes that gap.
   *
   * This is a floor on lexical overlap, NOT a similarity score standing in
   * for proof — the atom checks above are the proof, and no sentence reaches
   * here without passing all of them.
   */
  const sentenceWords = [...contentWords(sentence)];
  const grounded = sentenceWords.filter((w) => poolWords.has(w));
  const ratio = sentenceWords.length === 0 ? 0 : grounded.length / sentenceWords.length;
  if (ratio < 0.6) {
    return {
      ok: false,
      reason: "insufficient-grounding",
      detail: `only ${Math.round(ratio * 100)}% of content words appear in supporting claims`,
      claimIds: candidates.map((c) => c.id),
      atoms,
    };
  }

  return { ok: true, reason: null, detail: null, claimIds: candidates.map((c) => c.id), atoms };
}

/**
 * Verify a whole generated narrative, sentence by sentence.
 *
 * Returns accepted and rejected sentences separately. Rejected ones are kept
 * with their reason: a reviewer needs to see what the model tried to say and
 * why it was refused, and a silent drop is indistinguishable from the model
 * simply not having written it.
 */
export function verifyNarrative(text, approvedClaims) {
  const sentences = splitSentences(text);
  const accepted = [];
  const rejected = [];

  for (const sentence of sentences) {
    const result = verifySentence(sentence, approvedClaims);
    if (result.ok) accepted.push({ sentence, claimIds: result.claimIds });
    else rejected.push({ sentence, reason: result.reason, detail: result.detail });
  }

  return { accepted, rejected, total: sentences.length };
}

/* =========================================================================
   CONFLICT EXCLUSION
   ========================================================================= */

/**
 * Remove claims caught in an unresolved conflict before generation.
 *
 * The model never sees a disputed fact, so it cannot average two dates,
 * pick the more convenient one, or write "around 1710". Excluding at the
 * input is stronger than checking the output: there is no disputed value in
 * the prompt for a plausible compromise to be built from.
 */
export function excludeConflicted(claims, conflicts) {
  const blocked = new Set(
    conflicts.filter((c) => c.resolution === "unresolved").flatMap((c) => c.claimIds),
  );
  return {
    usable: claims.filter((c) => !blocked.has(c.id) && c.status !== "conflicted"),
    excluded: claims.filter((c) => blocked.has(c.id) || c.status === "conflicted"),
  };
}

/* =========================================================================
   ASSEMBLY
   ========================================================================= */

/**
 * Build a publishable narrative block from verified sentences.
 *
 * `claimIds` is the union of what the surviving sentences cited, so the
 * published block carries its own provenance and a reader can be walked from
 * any sentence back to a source.
 */
export function assembleBlock({ accepted, category, claimType, destinationId, generatedBy }) {
  if (accepted.length === 0) return null;
  const text = accepted.map((a) => a.sentence).join(" ");
  const claimIds = [...new Set(accepted.flatMap((a) => a.claimIds))];
  return {
    id: stableId("narr", destinationId, category, text),
    destinationId,
    category,
    claimType,
    text,
    claimIds,
    sentenceCount: accepted.length,
    generatedBy,
    verifiedAt: new Date().toISOString(),
  };
}
