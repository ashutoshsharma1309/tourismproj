import { getPublishedKnowledge } from "@/data/published-knowledge";
import type { Experience } from "@/lib/planner/types";

/**
 * Shared themes across destinations — the only vocabulary in this project
 * that spans more than one place.
 *
 * WHY A TERM VOCABULARY, AND WHY IT IS SAFE HERE
 * ----------------------------------------------
 * Sikkim's records and Kyoto's approved claims share no identifiers. There is
 * no authored edge between destinations, and there is no honest way to invent
 * one. So a connection has to be made out of something both sides genuinely
 * contain — and the two things they both contain are *text somebody
 * approved* and *records somebody catalogued*.
 *
 * A theme is therefore an explicit, hand-written list of terms. A destination
 * carries a theme when one of those terms appears:
 *
 *   - in the statement of a reviewer-approved claim, or
 *   - in a catalogued record's own STRUCTURED fields — its title and its type
 *     label ("Nyingma monastery", "Museum", "Temple").
 *
 * Record SUMMARIES are deliberately excluded. A summary is prose, and
 * matching prose is where term matching stops being checkable and starts
 * being a vibe.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not a similarity model. Nothing is embedded, nothing is scored by
 * distance in a vector space, and no relationship exists that a reader cannot
 * audit: every edge carries the exact claims and records that produced it, so
 * "these two share Buddhist heritage" can always be answered with "here are
 * the five sentences and fifteen records that say so".
 *
 * It is also not an assertion that two places are alike. A shared theme means
 * this archive holds material on that theme for both — no more.
 */

export interface Theme {
  id: string;
  label: string;
  /** Lower-case terms. A term match is an occurrence, not an inference. */
  terms: string[];
  /** What the theme covers, rendered where the theme is explained. */
  description: string;
}

export const THEMES: Theme[] = [
  {
    id: "buddhist-heritage",
    label: "Buddhist heritage",
    terms: ["buddhis", "monaster", "gompa", "stupa", "chorten", "lama", "zen"],
    description: "Monastic foundations, orders and the built fabric of Buddhist practice",
  },
  {
    id: "royal-heritage",
    label: "Royal and palace heritage",
    terms: ["palace", "royal", "maharaja", "fort", "chogyal", "monarch", "dynasty", "shogun"],
    description: "Courts, rulers, palaces and the buildings power left behind",
  },
  {
    id: "festivals",
    label: "Festivals and observances",
    terms: ["festival", "procession", "matsuri", "pilgrimage"],
    description: "Recurring observances documented in the record",
  },
  {
    id: "museums",
    label: "Museums and collections",
    terms: ["museum", "institute", "archive", "collection"],
    description: "Institutions that hold and publish collections",
  },
  {
    id: "landscape",
    label: "Mountains, water and landscape",
    terms: ["mountain", "lake", "valley", "peak", "himalaya", "river", "waterfall"],
    description: "Landforms and water named in the record",
  },
  {
    id: "temples",
    label: "Temples and shrines",
    terms: ["temple", "shrine"],
    description: "Places of worship outside the monastic orders",
  },
];

/** A single piece of evidence for a theme, always linkable or quotable. */
export interface ThemeEvidence {
  kind: "claim" | "record";
  /** The claim statement, or the record's title and type. */
  text: string;
  /** The term that matched — so the reader can see exactly why. */
  term: string;
  href?: string;
}

export interface ThemePresence {
  theme: Theme;
  claims: number;
  records: number;
  /** Up to three examples, for inspection. */
  evidence: ThemeEvidence[];
}

function firstTerm(haystack: string, terms: string[]): string | null {
  const lower = haystack.toLowerCase();
  return terms.find((term) => lower.includes(term)) ?? null;
}

/**
 * Which themes a destination carries, with the evidence that produced each.
 *
 * Both sources are consulted; a destination with only claims (Jaipur, Kyoto)
 * and a destination with mostly records (Sikkim) are treated identically.
 */
export function themesFor(destinationId: string, experiences: Experience[]): ThemePresence[] {
  const knowledge = getPublishedKnowledge(destinationId);
  const claims = (knowledge?.categories ?? []).flatMap((category) => category.claims);

  return THEMES.map((theme) => {
    const evidence: ThemeEvidence[] = [];

    let claimCount = 0;
    for (const claim of claims) {
      const term = firstTerm(claim.statement, theme.terms);
      if (!term) continue;
      claimCount += 1;
      if (evidence.length < 3) {
        evidence.push({ kind: "claim", text: claim.statement, term });
      }
    }

    let recordCount = 0;
    for (const experience of experiences) {
      /* Structured fields only — never the free-text summary. */
      const term = firstTerm(`${experience.title} ${experience.typeLabel}`, theme.terms);
      if (!term) continue;
      recordCount += 1;
      if (evidence.length < 3) {
        evidence.push({
          kind: "record",
          text: `${experience.title} — ${experience.typeLabel}`,
          term,
          href: experience.href,
        });
      }
    }

    return { theme, claims: claimCount, records: recordCount, evidence };
  }).filter((presence) => presence.claims > 0 || presence.records > 0);
}
