import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import {
  isReviewUiEnabled,
  loadApprovedCount,
  loadAuditTrail,
  loadReviewItems,
} from "@/lib/research/review-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research review",
  robots: { index: false, follow: false },
};

const DECISION_TONE = {
  approved: "success",
  rejected: "error",
  deferred: "neutral",
  "changes-requested": "warning",
  "pending-review": "info",
} as const;

const TIER_TONE = {
  "official-government": "success",
  "official-tourism": "success",
  institutional: "success",
  academic: "jade",
  "museum-university": "jade",
  "reputable-publication": "info",
  encyclopedia: "neutral",
  "other-public": "warning",
} as const;

/**
 * One destination's review queue.
 *
 * The whole point of this page is that a reviewer should not have to open
 * five files to understand one claim. Each row carries the claim, its type,
 * its confidence and why, the source with its authority tier and URL, the
 * verbatim evidence span with its character offsets, any conflict it is
 * caught in, and the decision already recorded against it.
 *
 * It is read-only. Decisions are written through the CLI, which calls the
 * approval gate in scripts/research/review.mjs — so there is no path here
 * that could approve a claim without clearing the seven conditions.
 */
export default async function ReviewDestinationPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  if (!isReviewUiEnabled()) notFound();
  const { destinationId } = await params;
  const items = loadReviewItems(destinationId);
  if (items.length === 0) notFound();

  const audit = loadAuditTrail(destinationId);
  const approvedCount = loadApprovedCount(destinationId);
  const counts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.decision] = (acc[i.decision] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
      <p className="font-mono text-eyebrow tracking-widest text-warning uppercase">
        <Link href="/review" className="hover:underline">
          Review
        </Link>{" "}
        — unreviewed machine output
      </p>
      <h1 className="mt-3 font-display text-h1">{destinationId}</h1>
      <p className="mt-2 text-body text-muted">
        {items.length} claim(s) ·{" "}
        {Object.entries(counts)
          .map(([k, v]) => `${v} ${k}`)
          .join(" · ")}{" "}
        · {approvedCount} in approved knowledge
      </p>

      <ol className="mt-10 space-y-6">
        {items.map((item) => (
          <li
            key={item.claim.id}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={DECISION_TONE[item.decision as keyof typeof DECISION_TONE] ?? "neutral"}>
                {item.decision}
              </Badge>
              <Badge tone="neutral">{item.claim.claimType}</Badge>
              <Badge tone="neutral">{item.claim.category}</Badge>
              <Badge tone={item.claim.confidence === "high" ? "success" : "neutral"}>
                {item.claim.confidence}
              </Badge>
              {item.source ? (
                <Badge tone={TIER_TONE[item.source.tier as keyof typeof TIER_TONE] ?? "neutral"}>
                  {item.source.tier}
                </Badge>
              ) : null}
              <code className="ml-auto font-mono text-caption text-muted">{item.claim.id}</code>
            </div>

            <p className="mt-3 text-body-lg">{item.claim.statement}</p>

            {item.claim.status !== "validated" ? (
              <p className="mt-2 text-caption text-error">
                Not approvable — status {item.claim.status}
                {item.claim.rejectionReason ? `: ${item.claim.rejectionReason}` : ""}
                {item.claim.rejectionDetail ? ` (${item.claim.rejectionDetail})` : ""}
              </p>
            ) : null}

            {item.claim.evidence?.map((ev) => (
              <blockquote
                key={`${ev.sourceId}-${ev.locator.charStart}`}
                className="mt-3 border-l-2 border-primary pl-4"
              >
                <p className="text-body italic">“{ev.quote}”</p>
                <p className="mt-1 font-mono text-caption text-muted">
                  chars {ev.locator.charStart}–{ev.locator.charEnd} of {ev.sourceId} · verified{" "}
                  {ev.retrievedAt.slice(0, 10)}
                </p>
              </blockquote>
            ))}

            {item.source ? (
              <p className="mt-3 text-caption text-muted">
                {item.source.publisher ? `${item.source.publisher} — ` : ""}
                {item.source.title} ·{" "}
                <a
                  href={item.source.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  open source
                </a>{" "}
                · retrieved via {item.source.retrievalMethod}
              </p>
            ) : null}

            {item.claim.confidenceReason ? (
              <p className="mt-1 text-caption text-muted">{item.claim.confidenceReason}</p>
            ) : null}

            {item.conflicts.map((c) => (
              <p key={c.id} className="mt-2 text-caption text-warning">
                Conflict ({c.resolution}): {c.subject}
              </p>
            ))}

            {item.decisionMeta ? (
              <p className="mt-2 text-caption text-muted">
                {item.decisionMeta.decision} by {item.decisionMeta.reviewer} at{" "}
                {item.decisionMeta.at}
                {item.decisionMeta.reason ? ` — ${item.decisionMeta.reason}` : ""}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      {audit.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-h3">Audit trail</h2>
          <ul className="mt-4 space-y-1 font-mono text-caption text-muted">
            {audit.map((e, i) => (
              <li key={`${e.claimId}-${i}`}>
                {e.at} · {e.reviewer} · {e.claimId} · {e.previousStatus} → {e.newStatus}
                {e.reason ? ` · ${e.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
