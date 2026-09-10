import generated from "@/data/generated/responsible-tourism.json";
import type { Provenance } from "@/data/sources";

/**
 * Responsible tourism guidance, from the department that issues it.
 *
 * This is the one place where tourism and preservation are the same act: how a
 * visitor behaves at a monastery is what determines whether the thing they came
 * to see survives being visited. The archive had no such guidance at all until
 * now — it documented what to see and said nothing about how to be there.
 *
 * POLARITY IS THE SOURCE'S, NOT OURS
 * ----------------------------------
 * The department marks every guideline on its page with a tick or a cross, and
 * that marking is carried through here verbatim. It matters more than it looks:
 * several of the crossed items are phrased as bare noun phrases — "Smoking near
 * monasteries, temples and sacred places", "Drinking and driving under any
 * circumstances" — and a flat list, or a polarity guessed from the section
 * heading, renders them as advice to do exactly that. Nothing here infers
 * intent from wording.
 *
 * Refresh with `npm run ingest:tourism`.
 */

export type GuidelinePolarity = "do" | "avoid";

export interface Guideline {
  text: string;
  /** The department's own tick or cross, never inferred from the wording. */
  polarity: GuidelinePolarity;
}

export interface GuidelineSection {
  slug: string;
  heading: string;
  /**
   * Whether this section is worth showing on a monastery page. Road safety and
   * altitude sickness are real guidance but they belong to the journey, not to
   * standing in a courtyard.
   */
  appliesAtSite: boolean;
  items: Guideline[];
}

export const guidelineSections = generated.sections as GuidelineSection[];

/** Sections that make sense beside a specific monastery. */
export const siteGuidelines: GuidelineSection[] = guidelineSections.filter(
  (section) => section.appliesAtSite,
);

export const GUIDELINE_STATS = {
  sections: guidelineSections.length,
  total: guidelineSections.reduce((n, s) => n + s.items.length, 0),
  avoid: guidelineSections.reduce(
    (n, s) => n + s.items.filter((i) => i.polarity === "avoid").length,
    0,
  ),
  retrievedAt: generated.retrievedAt,
  sourceUrl: generated.source.url,
  sourceName: generated.source.name,
} as const;

/** Provenance for anything rendered from this dataset. */
export const GUIDELINE_PROVENANCE: Provenance = {
  sourceId: "sikkim-tourism-do-and-do-not",
  sourceUrl: generated.source.url,
  verifiedAt: generated.retrievedAt,
  confidence: "high",
};
