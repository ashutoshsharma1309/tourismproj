import raw from "@/data/generated/published-knowledge.json";

/**
 * Published destination knowledge — the ONLY machine-derived content the
 * application may render.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not research output. Raw research lives in .data/research/jobs/,
 * which nothing in src/ reads. Everything here passed the seven-condition
 * approval gate, a human reviewer, and a re-verification at publication that
 * re-checked the evidence span against the source document.
 *
 * The file is produced by `npm run publish:knowledge` — a deterministic
 * filter with no model involved — and is committed like every other
 * generated dataset in this project, so pages prerender from it and nothing
 * is read at request time.
 */

export type PublishedClaimType =
  | "documented history"
  | "oral tradition"
  | "legend"
  | "travel story";

export interface PublishedSource {
  sourceId: string;
  title: string;
  publisher: string | null;
  url: string | null;
  tier: string | null;
  /** The verbatim span from the source that supports the claim. */
  quote?: string;
  retrievedAt?: string;
}

export interface PublishedClaim {
  id: string;
  category: string;
  statement: string;
  claimType: PublishedClaimType;
  confidence: "high" | "medium" | "unverified";
  approvedBy: string;
  approvedAt: string;
  sources: PublishedSource[];
}

export interface PublishedNarrativeBlock {
  id: string;
  /** Which narrative mode produced it — used to pick the page's opening. */
  mode?: string;
  category: string;
  claimType: PublishedClaimType;
  text: string;
  /** Provenance: which claims each block was built from. Never empty. */
  claimIds: string[];
  sentenceCount: number;
  generatedBy: string;
  verifiedAt: string;
}

export interface PublishedDepth {
  depth: "deep" | "curated" | "researched" | "capsule" | "planned";
  /** "declared" for a human-curated archive; "earned" from evidence. */
  basis: "declared" | "earned";
  note: string | null;
  /** What the research alone would have earned, even when depth is declared. */
  earned: string;
  metrics: {
    approvedClaims: number;
    categories: number;
    higherTierClaims: number;
    distinctSources: number;
  };
  reasons: string[];
}

export interface PublishedTimelineEntry {
  claimId: string;
  year: number;
  endYear: number | null;
  title: string;
  category: string;
  claimType: PublishedClaimType;
  sources: { title: string; publisher: string | null; url: string | null }[];
}

/**
 * A subject several approved facts speak about.
 *
 * Derived from the claim graph — two claims naming the same proper noun —
 * never from similarity or inference. A connection a reader follows is only
 * worth following if the claims themselves establish it.
 */
export interface PublishedConnection {
  subject: string;
  claimIds: string[];
  statements: string[];
}

export interface PublishedDestination {
  destinationId: string;
  depth: PublishedDepth;
  categories: { category: string; claims: PublishedClaim[] }[];
  narrative: PublishedNarrativeBlock[];
  timeline: PublishedTimelineEntry[];
  connections: PublishedConnection[];
  sourcesUsed: PublishedSource[];
  stats: Record<string, number>;
}

const DATA = raw as unknown as {
  schema: number;
  destinations: Record<string, PublishedDestination>;
};

/** Published knowledge for a destination, or null when none was published. */
export function getPublishedKnowledge(destinationId: string): PublishedDestination | null {
  return DATA.destinations[destinationId] ?? null;
}

export function hasPublishedKnowledge(destinationId: string): boolean {
  const d = DATA.destinations[destinationId];
  return Boolean(d && (d.categories.length > 0 || d.narrative.length > 0));
}

export function publishedDestinationIds(): string[] {
  return Object.keys(DATA.destinations);
}

/** Human-readable label for a category key. */
export const CATEGORY_LABEL: Record<string, string> = {
  history: "History",
  culture: "Culture",
  heritage: "Heritage",
  stories: "Stories",
  traditions: "Traditions",
  festivals: "Festivals",
  attractions: "Attractions",
  people: "People",
  places: "Places",
};
