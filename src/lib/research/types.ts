/**
 * TerraStory research engine — the knowledge model.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * The engine itself runs offline, under plain node, in scripts/research/ —
 * the same convention as every other agent in this project, and the reason
 * research can never execute during a page render. This file is the
 * *application-facing* description of what that engine produces, so the app
 * and the QA harness share one definition of a claim, a piece of evidence and
 * a research job.
 *
 * THE ONE IDEA THAT MATTERS
 * -------------------------
 * A claim is not trusted because a model asserted it. A claim is trusted
 * because a verbatim span from a retrieved document supports it, and because
 * code checked that the span is really in that document — byte for byte,
 * after normalisation, with no paraphrase allowed.
 *
 * That single mechanism is what makes the no-hallucination contract
 * enforceable instead of aspirational. A model may propose anything it likes;
 * a proposal whose span is not present in the source is discarded before it
 * can reach a validation stage, let alone a page. Fabricated evidence is not
 * discouraged here — it is unrepresentable.
 *
 * Tapestry, the reference implementation studied in Phase 1, stores sources at
 * the research-task level: a bibliography. A reader can see that thirty
 * sources were consulted and cannot tell which supports any given sentence.
 * Everything below exists to avoid that outcome.
 */

import type { ClaimType } from "@/data/stories/types";
import type { Confidence, RetrievalMethod, SourceType } from "@/data/sources";

/* =========================================================================
   RESEARCH JOBS
   ========================================================================= */

/**
 * Job status.
 *
 * Deliberately small. `pending-review` is the terminal state for anything
 * that produced knowledge — there is no `published`, because publication is
 * not something this engine can do. That mirrors SubmissionStatus in
 * archive-submissions.ts, where the type itself cannot express "approved".
 */
export type ResearchJobStatus =
  | "queued"
  | "running"
  | "failed"
  /** Completed and awaiting a human. The only success state. */
  | "pending-review";

/** One knowledge area a job investigates. Never a practical-travel field. */
export type ResearchCategory =
  | "history"
  | "culture"
  | "heritage"
  | "stories"
  | "traditions"
  | "festivals"
  | "attractions"
  | "people"
  | "places";

export interface ResearchJob {
  id: string;
  destinationId: string;
  categories: ResearchCategory[];
  status: ResearchJobStatus;
  createdAt: string;
  completedAt?: string;
  /** Set when status is "failed". Never used to publish a partial result. */
  error?: string;
  /** Which provider produced the proposals, recorded for auditability. */
  provider: string;
  stats?: ResearchJobStats;
}

export interface ResearchJobStats {
  sourcesDiscovered: number;
  sourcesRetrieved: number;
  sourcesFailed: number;
  claimsProposed: number;
  /** Proposals discarded because their span was not found in the source. */
  claimsRejectedNoEvidence: number;
  /** Proposals discarded because they asserted practical-travel data. */
  claimsRejectedPractical: number;
  claimsValidated: number;
  conflictsDetected: number;
}

/* =========================================================================
   RESEARCH PLAN  (Agent 1 output)
   ========================================================================= */

export interface ResearchPlan {
  destinationId: string;
  createdAt: string;
  tasks: ResearchTask[];
  /** Areas the planner believes are unlikely to be answerable. Honest output. */
  anticipatedGaps: string[];
}

export interface ResearchTask {
  id: string;
  category: ResearchCategory;
  /** What this task is trying to establish, in one line. */
  question: string;
  /**
   * The claim type this task expects to produce. Planned per claim type on
   * purpose: a legend and a documented date are different kinds of assertion,
   * and deciding which one you are looking for BEFORE searching is what stops
   * folklore arriving dressed as history.
   */
  expectedClaimType: ClaimType;
  /** Source tiers acceptable for this task, best first. */
  acceptableTiers: SourceTier[];
}

/* =========================================================================
   SOURCES  (Agent 2 + 3)
   ========================================================================= */

/**
 * Source authority tiers, best first.
 *
 * Distinct from `SourceType` in @/data/sources, which says what *kind* of
 * publisher something is. A tier says how much weight a claim from it may
 * carry. Both are needed: a government portal and a content farm can both be
 * "press" by type and are not equally citable.
 */
export type SourceTier =
  | "official-government"
  | "official-tourism"
  | "institutional"
  | "academic"
  | "museum-university"
  | "reputable-publication"
  | "encyclopedia"
  | "other-public";

export const SOURCE_TIER_ORDER: SourceTier[] = [
  "official-government",
  "official-tourism",
  "institutional",
  "academic",
  "museum-university",
  "reputable-publication",
  "encyclopedia",
  "other-public",
];

/** A candidate found by discovery, before anything has been fetched. */
export interface SourceCandidate {
  url: string;
  title: string;
  publisher?: string;
  tier: SourceTier;
  type: SourceType;
  retrievalMethod: RetrievalMethod;
  /** Why discovery believes this source is relevant. Not a factual claim. */
  rationale: string;
}

/**
 * A retrieved and normalised document.
 *
 * `text` is the normalised body every evidence span is checked against. It is
 * the ONLY text a span may come from — not the model's echo of it, not a
 * summary, not the raw HTML.
 */
export interface RetrievedDocument {
  sourceId: string;
  url: string;
  title: string;
  publisher?: string;
  tier: SourceTier;
  type: SourceType;
  retrievalMethod: RetrievalMethod;
  retrievedAt: string;
  /** Normalised plain text. Whitespace collapsed; markup removed. */
  text: string;
  /** SHA-256 of `text`, so a span can be tied to the exact bytes checked. */
  contentHash: string;
  destinationId: string;
}

export interface RetrievalFailure {
  url: string;
  reason: string;
  attemptedAt: string;
}

/* =========================================================================
   EVIDENCE  (Agent 5) — the component Phase 2.5 specified and deferred
   ========================================================================= */

export type EvidenceType =
  /** The span states the claim directly. */
  | "direct-statement"
  /** The span supports the claim without stating it in the same words. */
  | "supporting-context";

/**
 * A verbatim span from a retrieved document, sufficient to support one claim.
 *
 * `quote` MUST appear in the document's normalised `text`. This is checked by
 * `indexOf`, not by a model, and not by similarity. A paraphrase fails. An
 * "almost right" quote fails. That strictness is the whole point: it converts
 * "the model says this is in the source" into "the source contains this".
 *
 * `locator` records where, so a reviewer can find it in seconds.
 */
export interface Evidence {
  sourceId: string;
  /** Verbatim, present in RetrievedDocument.text. Never paraphrased. */
  quote: string;
  locator: EvidenceLocator;
  evidenceType: EvidenceType;
  retrievedAt: string;
  /** Hash of the document text the span was verified against. */
  contentHash: string;
}

export interface EvidenceLocator {
  /** Character offset of `quote` within the normalised document text. */
  charStart: number;
  charEnd: number;
  /** Deep link to the page the span came from. */
  url: string;
}

/* =========================================================================
   CLAIMS  (Agent 4)
   ========================================================================= */

/** Where a claim stands after validation. */
export type ClaimStatus =
  /** Proposed by a provider; nothing verified yet. */
  | "proposed"
  /** Evidence verified against the source. Eligible for review. */
  | "validated"
  /** Failed validation. Retained for audit; never rendered. */
  | "rejected"
  /** Validated, but another validated claim contradicts it. */
  | "conflicted";

export interface Claim {
  id: string;
  destinationId: string;
  category: ResearchCategory;
  /** The assertion, in one sentence. */
  statement: string;
  claimType: ClaimType;
  status: ClaimStatus;
  /** At least one is required for `validated`. */
  evidence: Evidence[];
  confidence: Confidence;
  /** Populated when status is "rejected". Machine-readable reason. */
  rejectionReason?: ClaimRejectionReason;
  /** Ids of claims this one contradicts. */
  conflictsWith?: string[];
  proposedBy: string;
  proposedAt: string;
}

export type ClaimRejectionReason =
  /** No evidence attached at all. */
  | "no-evidence"
  /** The quoted span is not present in the source document. */
  | "evidence-not-in-source"
  /** The cited source is not registered. */
  | "unknown-source"
  /** The cited source is not in scope for this destination. */
  | "source-out-of-scope"
  /** The claim asserts practical-travel data. Never synthesised — see G5. */
  | "practical-data"
  /** The claim duplicates an existing validated claim. */
  | "duplicate"
  /** Structured output failed schema validation. */
  | "malformed";

/* =========================================================================
   CONFLICTS  (Agent 7)
   ========================================================================= */

/**
 * Two validated claims that disagree.
 *
 * Both are preserved and neither is chosen. The existing archive already
 * models this instinct — VisitingHours distinguishes an `official` schedule
 * from a `reported` one rather than picking a winner — and a research engine
 * silently resolving a disagreement between two sourced dates would be
 * discarding exactly the information a reader needs.
 */
export interface Conflict {
  id: string;
  destinationId: string;
  claimIds: string[];
  /** What the two claims disagree about, e.g. "founding year". */
  subject: string;
  detectedAt: string;
  /** Always requires a person. No automated resolution path exists. */
  resolution: "unresolved";
}

/* =========================================================================
   STRUCTURED KNOWLEDGE  (Agent 8) + NARRATIVE  (Agent 9)
   ========================================================================= */

export interface KnowledgeRecord {
  destinationId: string;
  category: ResearchCategory;
  claims: Claim[];
  conflicts: Conflict[];
}

/**
 * A synthesised narrative block.
 *
 * `claimIds` is not decoration. Every sentence in `text` must be traceable to
 * a validated claim, and a block that cites nothing is rejected before it is
 * stored. The narrative layer restates verified knowledge; it is never
 * allowed to become a new source of facts.
 */
export interface NarrativeBlock {
  text: string;
  claimIds: string[];
  claimType: ClaimType;
}

export interface ResearchResult {
  job: ResearchJob;
  plan: ResearchPlan;
  documents: RetrievedDocument[];
  failures: RetrievalFailure[];
  knowledge: KnowledgeRecord[];
  narrative: NarrativeBlock[];
  /** Every claim, including rejected ones — the audit trail. */
  allClaims: Claim[];
}
