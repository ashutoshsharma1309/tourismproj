/**
 * Text utilities for the Guide: matching what a traveller typed (or said) to
 * a record, and turning an answer into something worth hearing.
 *
 * Pure and dependency-free, so the same code runs in the route, the browser
 * and the tests.
 */

export function fold(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "the", "a", "an", "of", "in", "at", "to", "is", "are", "was", "and", "or", "for", "me", "my", "i", "im",
  "about", "tell", "what", "whats", "which", "where", "how", "far", "from", "near", "nearby", "this", "that",
  "there", "here", "do", "does", "can", "should", "visit", "go", "see", "place", "please", "it", "its", "be",
  "monastery", "monasteries", "gompa", "temple", "fort", "palace", "lake", "museum",
]);

export function tokens(input: string): string[] {
  return fold(input).split(" ").filter((t) => t.length > 1 && !STOP.has(t));
}

/** Character trigrams of a folded string, padded so short words still match. */
function trigrams(input: string): Set<string> {
  const s = `  ${fold(input)} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i += 1) out.add(s.slice(i, i + 3));
  return out;
}

/** Trigram similarity, 0–1. Tolerant of speech-to-text spellings: "Pemiang Tsieng" ≈ "Pemayangtse". */
export function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared += 1;
  return (2 * shared) / (ta.size + tb.size);
}

export interface NameMatch {
  score: number;
  /** Word span of the question that matched: [start, end). */
  start: number;
  end: number;
}

const GENERIC = /\b(monastery|gompa|temple|fort|palace|lake|museum|mahal|the|of)\b/g;

/**
 * The best-matching span of the question for a name. Compares every run of
 * one to four words against the name — both as written and with spaces
 * removed, because speech-to-text splits names ("Pemiang Tsieng" for
 * Pemayangtse) — and reports where in the question the match sits, so two
 * places named in one sentence can be told apart.
 *
 * The name's generic nouns ("Monastery", "Mahal") are dropped first: "Hawa
 * Mahal" must not match "Jal Mahal" on the word they share.
 */
export function nameMatch(question: string, name: string): NameMatch {
  const words = fold(question).split(" ").filter(Boolean);
  const core = fold(name).replace(GENERIC, "").replace(/\s+/g, " ").trim() || fold(name);
  const coreCompact = core.replace(/ /g, "");
  const width = Math.max(1, Math.min(4, core.split(" ").length + 1));
  let best: NameMatch = { score: 0, start: 0, end: 0 };
  for (let size = 1; size <= width; size += 1) {
    for (let i = 0; i + size <= words.length; i += 1) {
      const window = words.slice(i, i + size).join(" ");
      if (window.replace(/ /g, "").length < 3) continue;
      const score = Math.max(similarity(window, core), similarity(window.replace(/ /g, ""), coreCompact));
      if (score > best.score) best = { score, start: i, end: i + size };
    }
  }
  return best;
}

export function nameScore(question: string, name: string): number {
  return nameMatch(question, name).score;
}

/* ------------------------------------------------------------------ speech */

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bkm\b/g, "kilometres"],
  [/\bm\b(?=\s|$)/g, "metres"],
  [/\bc\.\s?(?=\d)/g, "around "],
  [/\bca\.\s?(?=\d)/g, "around "],
  [/\be\.g\.\s?/g, "for example, "],
  [/\bi\.e\.\s?/g, "that is, "],
  [/\bSt\.\s/g, "Saint "],
  [/\bNo\.\s?(?=\d)/g, "number "],
  [/\bmins?\b/g, "minutes"],
  [/\bhrs?\b/g, "hours"],
];

/**
 * An answer, made fit to be heard.
 *
 * Markdown, bullet glyphs, links, citation markers and anything in brackets
 * meant for the eye are removed; abbreviations a voice would spell out are
 * expanded; and every sentence is kept short enough for a listener. Names are
 * left exactly as written — respelling "Rumtek" for a voice is the voice's job
 * (see `respell`), not something to bake into the text a reader also sees.
 */
export function toSpeech(message: string, language = "en"): string {
  let text = message
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[(R?\d+|source[^\]]*)\]/gi, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|]/g, " ")
    .replace(/^\s*[-•·]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
  if (language === "en") {
    for (const [pattern, replacement] of ABBREVIATIONS) text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+([,.;:!?])/g, "$1").replace(/,\s*,/g, ",").trim();
}

/**
 * Phonetic respellings a voice needs for names it mispronounces
 * (data/pronunciation.json, kept only where a render measurably improved).
 * Applied to the SPOKEN text only, and only for English voices.
 */
export function respell(text: string, respellings: Record<string, string>): string {
  let out = text;
  for (const [name, said] of Object.entries(respellings)) {
    if (name.startsWith("_")) continue;
    out = out.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), said);
  }
  return out;
}

/** Every number in a text, as digits (Devanagari and other Indic digits folded to ASCII). */
export function numbersIn(text: string): string[] {
  /* Every Indic digit block starts its zero at offset 0x66, so the digit is
     the low nibble of (code point − 0x66). */
  const ascii = text.replace(/[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (d) =>
    String(((d.codePointAt(0) ?? 0x66) - 0x66) & 0xf),
  );
  return (ascii.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
}
