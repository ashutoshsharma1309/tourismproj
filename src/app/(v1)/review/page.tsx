import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isReviewUiEnabled, listReviewDestinations } from "@/lib/research/review-store";

/**
 * Internal review index.
 *
 * force-dynamic because it reads .data/ at request time — the same pattern
 * /archive already uses for the pending-submission store. It is deliberately
 * NOT prerendered: unreviewed machine output should not exist as a static
 * file in the build.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research review",
  /* Never indexed. This surface shows unreviewed machine output. */
  robots: { index: false, follow: false },
};

export default function ReviewIndexPage() {
  if (!isReviewUiEnabled()) notFound();
  const destinations = listReviewDestinations();

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
      <p className="font-mono text-eyebrow tracking-widest text-warning uppercase">
        Internal tool — unreviewed content
      </p>
      <h1 className="mt-3 font-display text-h1">Research review</h1>
      <p className="mt-3 max-w-2xl text-body text-muted">
        Machine-generated claims awaiting a curator. Nothing shown here is
        published, and nothing on this page appears anywhere in the public
        archive. Approval is recorded through the review CLI —{" "}
        <code className="font-mono text-caption">npm run review -- approve …</code> — so
        the approval gate cannot be bypassed by an interface.
      </p>

      {destinations.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border bg-surface-muted p-6 text-body text-muted">
          No research awaiting review. Run{" "}
          <code className="font-mono text-caption">npm run research:run -- sikkim</code> first.
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {destinations.map((d) => (
            <li key={d.destinationId}>
              <Link
                href={`/review/${d.destinationId}`}
                className="focus-visible:ring-primary flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="font-medium">{d.destinationId}</span>
                <span className="text-caption text-muted">
                  {d.pending} pending of {d.total}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
