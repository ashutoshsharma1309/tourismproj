/**
 * Review workflow — the publication boundary.
 *
 * Phase 3 could produce knowledge but nobody could act on it: output sat in
 * .data/research/jobs/ as `pending-review` with no way to review it. This
 * module is the boundary that turns that into a decision, and the decision is
 * always a person's.
 *
 * THREE SEPARATE LAYERS, DELIBERATELY
 * -----------------------------------
 *   .data/research/jobs/      RAW research. Unreviewed. Never public.
 *   .data/research/reviews/   Decisions + audit trail.
 *   .data/research/approved/  APPROVED knowledge. The only publishable layer.
 *
 * They are separate directories rather than a status field on one record
 * because a status field can be misread by one careless consumer, whereas a
 * directory a component never opens cannot leak. Nothing in src/ reads the
 * jobs directory; `qa:narrative` asserts it.
 *
 * NO DATABASE. The existing architecture is file-based (archive submissions
 * already work exactly this way, under .data/, gitignored, outside public/),
 * review volume is a handful of claims per destination, and introducing a
 * database would cost the zero-config guarantee that the app builds and
 * renders with an empty .env. Revisit when concurrent reviewers exist.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "./core.mjs";
import { sourceInScope } from "./claims.mjs";
import { getDestination } from "./destinations.mjs";
import { curatedFacts, findContradictions } from "./curated-guard.mjs";

const ROOT = join(process.cwd(), ".data", "research");
const REVIEWS_DIR = join(ROOT, "reviews");
const APPROVED_DIR = join(ROOT, "approved");
const JOBS_DIR = join(ROOT, "jobs");

/**
 * Review decisions.
 *
 * Four values, no more. The existing SubmissionStatus in archive-submissions
 * is a single-value union precisely so no code path can invent an approved
 * state; the same restraint applies here. A larger workflow (multi-stage
 * sign-off, roles, escalation) is not needed by one curator acting on a few
 * dozen claims, and every extra state is a state something can get stuck in.
 */
export const REVIEW_DECISIONS = ["approved", "rejected", "deferred", "changes-requested"];

const dir = (d) => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
};
const reviewPath = (destinationId) => join(dir(REVIEWS_DIR), `${destinationId}.json`);
const approvedPath = (destinationId) => join(dir(APPROVED_DIR), `${destinationId}.json`);

/* =========================================================================
   THE APPROVAL GATE
   ========================================================================= */

/**
 * The seven conditions a claim must satisfy before a reviewer may approve it.
 *
 * Checked HERE, in the model, not in the interface. A reviewer interface is
 * one consumer; a second one (a CLI, a script, a future web form) would each
 * have to re-implement the rules, and one of them would get it wrong. Putting
 * the gate in the model means "UI shortcuts around these rules" is not a
 * thing that can be built by accident.
 *
 * Returns every failure, not the first, so a reviewer sees the whole picture.
 */
export function approvalBlockers(claim, { documents = [], conflicts = [] } = {}) {
  const blockers = [];
  const destination = (() => {
    try {
      return getDestination(claim.destinationId);
    } catch {
      return null;
    }
  })();

  if (!destination) blockers.push("destination is not registered");

  /* 1-2. Source and evidence exist. */
  if (!claim.evidence || claim.evidence.length === 0) {
    blockers.push("no evidence attached");
  }

  for (const ev of claim.evidence ?? []) {
    /* 3. Evidence verified against the document it names. */
    const doc = documents.find((d) => d.sourceId === ev.sourceId);
    if (!doc) {
      blockers.push(`source document "${ev.sourceId}" not present in the job`);
      continue;
    }
    if (doc.text.slice(ev.locator.charStart, ev.locator.charEnd) !== ev.quote) {
      blockers.push(`evidence span no longer matches "${ev.sourceId}"`);
    }
    if (ev.contentHash !== doc.contentHash) {
      blockers.push(`source "${ev.sourceId}" changed since extraction`);
    }
    /* 4. Destination scope. */
    if (destination && !sourceInScope(ev.sourceId, destination)) {
      blockers.push(`source "${ev.sourceId}" is not citable for ${claim.destinationId}`);
    }
  }

  /* 5. Practical-data rules. */
  if (detectPracticalData(claim.statement).practical) {
    blockers.push("statement asserts practical travel data");
  }

  /*
   * 5b. Curated-content contradiction.
   *
   * A reviewer may still approve it — the disagreement might be the archive's
   * error, and that is a human judgement — but it cannot pass silently, and
   * publication blocks it independently in publish.mjs.
   */
  if (destination) {
    const contradictions = findContradictions(claim, curatedFacts(destination.id));
    for (const c of contradictions) blockers.push(`contradicts curated content: ${c.detail}`);
  }

  /* 6. No unresolved blocking conflict. */
  if (claim.status === "conflicted") blockers.push("claim is part of an unresolved conflict");
  const involved = conflicts.filter((c) => c.claimIds.includes(claim.id) && c.resolution === "unresolved");
  if (involved.length > 0) blockers.push(`unresolved conflict: ${involved[0].subject}`);

  /* Validation must already have passed. */
  if (claim.status !== "validated") blockers.push(`claim status is "${claim.status}", not "validated"`);

  return blockers;
}

/* =========================================================================
   REVIEW STORE + AUDIT TRAIL
   ========================================================================= */

function emptyReview(destinationId) {
  return { destinationId, decisions: {}, audit: [] };
}

export function loadReview(destinationId) {
  const path = reviewPath(destinationId);
  if (!existsSync(path)) return emptyReview(destinationId);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return emptyReview(destinationId);
  }
}

function saveReview(review) {
  writeFileSync(reviewPath(review.destinationId), `${JSON.stringify(review, null, 2)}\n`, "utf8");
}

/**
 * Record a reviewer decision.
 *
 * `at` is supplied by the caller rather than read from the clock here, so a
 * test can assert on a fixed timestamp without the store inventing one.
 *
 * The audit entry keeps the previous decision as well as the new one. "Who
 * approved what and when" is the requirement; recording what it was before
 * is what makes a reversal legible afterwards.
 */
export function recordDecision({
  destinationId,
  claimId,
  decision,
  reviewer,
  reason = "",
  at = new Date().toISOString(),
  claim = null,
  documents = [],
  conflicts = [],
}) {
  if (!REVIEW_DECISIONS.includes(decision)) {
    throw new Error(`Unknown decision "${decision}". Allowed: ${REVIEW_DECISIONS.join(", ")}`);
  }
  if (!reviewer || typeof reviewer !== "string") {
    throw new Error("A decision requires a reviewer identity.");
  }

  /* Approval — and only approval — must clear the gate. Rejecting, deferring
     or requesting changes on a blocked claim is always allowed. */
  if (decision === "approved") {
    if (!claim) throw new Error("Approving requires the claim so the gate can be checked.");
    const blockers = approvalBlockers(claim, { documents, conflicts });
    if (blockers.length > 0) {
      throw new Error(`Cannot approve ${claimId}: ${blockers.join("; ")}`);
    }
  }

  const review = loadReview(destinationId);
  const previous = review.decisions[claimId]?.decision ?? "pending-review";

  review.decisions[claimId] = { decision, reviewer, reason, at };
  review.audit.push({ claimId, previousStatus: previous, newStatus: decision, reviewer, reason, at });
  saveReview(review);
  return review.decisions[claimId];
}

export function decisionFor(destinationId, claimId) {
  return loadReview(destinationId).decisions[claimId] ?? null;
}

export function auditTrail(destinationId) {
  return loadReview(destinationId).audit;
}

/* =========================================================================
   THE REVIEW QUEUE
   ========================================================================= */

export function listJobFiles() {
  if (!existsSync(JOBS_DIR)) return [];
  return readdirSync(JOBS_DIR).filter((f) => f.endsWith(".json"));
}

function loadJobResult(file) {
  try {
    return JSON.parse(readFileSync(join(JOBS_DIR, file), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Everything a reviewer needs about one destination, assembled.
 *
 * The point is that a reviewer should not have to open five files to
 * understand one claim. Each queue item carries the claim, its evidence, the
 * verbatim span, the source with its tier and URL, the conflicts it is caught
 * in, its current decision, and — importantly — the blockers that would stop
 * approval, computed up front rather than discovered on a failed click.
 */
export function reviewQueue(destinationId) {
  const items = [];
  for (const file of listJobFiles()) {
    const result = loadJobResult(file);
    if (!result || result.job.destinationId !== destinationId) continue;
    if (result.job.status !== "pending-review") continue;

    const documents = result.documents ?? [];
    const conflicts = (result.knowledge ?? []).flatMap((k) => k.conflicts ?? []);

    for (const claim of result.allClaims ?? []) {
      const decision = decisionFor(destinationId, claim.id);
      const doc = documents.find((d) => d.sourceId === claim.evidence?.[0]?.sourceId) ?? null;
      items.push({
        jobId: result.job.id,
        claim,
        /* The documents this claim's job retrieved. Carried on the item so a
           caller can re-check the approval gate without reopening the job
           file — and so no interface has to reconstruct it and get it wrong. */
        documents,
        decision: decision?.decision ?? "pending-review",
        decisionMeta: decision,
        source: doc
          ? { id: doc.sourceId, title: doc.title, url: doc.url, tier: doc.tier, type: doc.type, publisher: doc.publisher, retrievalMethod: doc.retrievalMethod, retrievedAt: doc.retrievedAt }
          : null,
        conflicts: conflicts.filter((c) => c.claimIds.includes(claim.id)),
        blockers: claim.status === "validated" ? approvalBlockers(claim, { documents, conflicts }) : ["not validated"],
      });
    }
  }
  return items;
}

export function queueSummary(destinationId) {
  const items = reviewQueue(destinationId);
  const counts = {};
  for (const i of items) counts[i.decision] = (counts[i.decision] ?? 0) + 1;
  return { destinationId, total: items.length, counts };
}

/* =========================================================================
   APPROVED KNOWLEDGE — the only publishable layer
   ========================================================================= */

/**
 * Rebuild the approved-knowledge file for a destination from its decisions.
 *
 * Derived, never appended to. Rebuilding from raw research plus decisions
 * means an approval that is later reversed actually disappears, rather than
 * lingering because a removal step was forgotten.
 *
 * The gate is re-checked here even though approval already checked it, because
 * a source can change between the two. A claim approved yesterday whose source
 * was edited overnight does not silently stay approved.
 */
export function rebuildApproved(destinationId) {
  const approved = [];
  const dropped = [];

  for (const file of listJobFiles()) {
    const result = loadJobResult(file);
    if (!result || result.job.destinationId !== destinationId) continue;
    const documents = result.documents ?? [];
    const conflicts = (result.knowledge ?? []).flatMap((k) => k.conflicts ?? []);

    for (const claim of result.allClaims ?? []) {
      if (decisionFor(destinationId, claim.id)?.decision !== "approved") continue;
      const blockers = approvalBlockers(claim, { documents, conflicts });
      if (blockers.length > 0) {
        dropped.push({ claimId: claim.id, blockers });
        continue;
      }
      approved.push({
        ...claim,
        approvedBy: decisionFor(destinationId, claim.id).reviewer,
        approvedAt: decisionFor(destinationId, claim.id).at,
      });
    }
  }

  const payload = {
    destinationId,
    rebuiltAt: new Date().toISOString(),
    claims: approved,
    /* Claims that were approved but no longer clear the gate. Surfaced, not
       silently omitted — a reviewer needs to know their approval lapsed. */
    lapsed: dropped,
  };
  writeFileSync(approvedPath(destinationId), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function loadApproved(destinationId) {
  const path = approvedPath(destinationId);
  if (!existsSync(path)) return { destinationId, claims: [], lapsed: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { destinationId, claims: [], lapsed: [] };
  }
}

export { APPROVED_DIR, JOBS_DIR, REVIEWS_DIR };
