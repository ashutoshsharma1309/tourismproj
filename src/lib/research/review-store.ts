import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Server-only reader for the research review store.
 *
 * DANGER, AND WHY THIS FILE IS NAMED THE WAY IT IS
 * ------------------------------------------------
 * This reads RAW, UNREVIEWED research from .data/research/jobs/. That content
 * has not been approved by anyone and must never appear on a public page.
 *
 * Two things keep that true:
 *
 *   1. Only src/app/review/** imports this module. `qa:narrative` asserts it,
 *      so a public page that starts importing it fails the build rather than
 *      quietly shipping unreviewed claims.
 *   2. The review route is gated (see isReviewUiEnabled) and marked noindex.
 *
 * The public application reads approved knowledge only — and today reads none
 * of it at all, because Phase 4 stops at the approval boundary and does not
 * publish approved claims into pages.
 */

const ROOT = join(process.cwd(), ".data", "research");

export interface ReviewClaim {
  id: string;
  destinationId: string;
  category: string;
  statement: string;
  claimType: string;
  status: string;
  confidence: string;
  confidenceReason?: string;
  corroboratingSources?: string[];
  rejectionReason?: string;
  rejectionDetail?: string;
  evidence: {
    sourceId: string;
    quote: string;
    locator: { charStart: number; charEnd: number; url: string };
    evidenceType: string;
    retrievedAt: string;
  }[];
}

export interface ReviewSource {
  sourceId: string;
  title: string;
  url: string;
  tier: string;
  type: string;
  publisher?: string;
  retrievalMethod: string;
  retrievedAt: string;
}

export interface ReviewItem {
  claim: ReviewClaim;
  source: ReviewSource | null;
  decision: string;
  decisionMeta: { decision: string; reviewer: string; reason: string; at: string } | null;
  conflicts: { id: string; subject: string; resolution: string }[];
}

/**
 * The review interface is off unless deliberately switched on.
 *
 * A tool that renders unreviewed machine output should not be reachable on a
 * deployed site by default. Development is treated as enabled because that is
 * where a curator actually works.
 */
export function isReviewUiEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.TERRASTORY_REVIEW_UI === "1";
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function jobFiles(): string[] {
  const dir = join(ROOT, "jobs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

/** Destinations that currently have research awaiting review. */
export function listReviewDestinations(): { destinationId: string; total: number; pending: number }[] {
  const out = new Map<string, { destinationId: string; total: number; pending: number }>();
  for (const file of jobFiles()) {
    const result = readJson<{ job: { destinationId: string; status: string }; allClaims?: ReviewClaim[] }>(
      join(ROOT, "jobs", file),
    );
    if (!result || result.job.status !== "pending-review") continue;
    const id = result.job.destinationId;
    const decisions = readJson<{ decisions: Record<string, { decision: string }> }>(
      join(ROOT, "reviews", `${id}.json`),
    );
    const entry = out.get(id) ?? { destinationId: id, total: 0, pending: 0 };
    for (const claim of result.allClaims ?? []) {
      entry.total += 1;
      if (!decisions?.decisions?.[claim.id]) entry.pending += 1;
    }
    out.set(id, entry);
  }
  return [...out.values()].sort((a, b) => b.pending - a.pending);
}

/** Everything a reviewer needs for one destination, assembled in one pass. */
export function loadReviewItems(destinationId: string): ReviewItem[] {
  const items: ReviewItem[] = [];
  const decisions = readJson<{ decisions: Record<string, ReviewItem["decisionMeta"]> }>(
    join(ROOT, "reviews", `${destinationId}.json`),
  );

  for (const file of jobFiles()) {
    const result = readJson<{
      job: { destinationId: string; status: string };
      documents?: ReviewSource[];
      knowledge?: { conflicts?: { id: string; claimIds: string[]; subject: string; resolution: string }[] }[];
      allClaims?: ReviewClaim[];
    }>(join(ROOT, "jobs", file));

    if (!result || result.job.destinationId !== destinationId) continue;
    if (result.job.status !== "pending-review") continue;

    const documents = result.documents ?? [];
    const conflicts = (result.knowledge ?? []).flatMap((k) => k.conflicts ?? []);

    for (const claim of result.allClaims ?? []) {
      const meta = decisions?.decisions?.[claim.id] ?? null;
      const primary = claim.evidence?.[0]?.sourceId;
      items.push({
        claim,
        source: documents.find((d) => d.sourceId === primary) ?? null,
        decision: meta?.decision ?? "pending-review",
        decisionMeta: meta,
        conflicts: conflicts
          .filter((c) => c.claimIds.includes(claim.id))
          .map((c) => ({ id: c.id, subject: c.subject, resolution: c.resolution })),
      });
    }
  }
  return items;
}

export function loadAuditTrail(destinationId: string) {
  const review = readJson<{ audit: { claimId: string; previousStatus: string; newStatus: string; reviewer: string; reason: string; at: string }[] }>(
    join(ROOT, "reviews", `${destinationId}.json`),
  );
  return review?.audit ?? [];
}

export function loadApprovedCount(destinationId: string): number {
  const approved = readJson<{ claims: unknown[] }>(join(ROOT, "approved", `${destinationId}.json`));
  return approved?.claims?.length ?? 0;
}
