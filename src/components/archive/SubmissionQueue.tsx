import { AlertTriangle, Info, Mail, Paperclip } from "lucide-react";

import { PendingReviewChip } from "@/components/ui/VerificationChip";
import { getPendingSubmissions } from "@/lib/archive-submissions";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

/**
 * Community contributions awaiting a curator.
 *
 * Everything on this page is unreviewed by definition, so every card wears the
 * pending badge and the automated screening notes sit next to the claim they
 * refer to. There are no approve/reject controls here on purpose: this build
 * has no curator authentication, and a one-click publish button reachable by
 * anyone would defeat the entire review workflow.
 */
export async function SubmissionQueue() {
  const submissions = await getPendingSubmissions();

  return (
    <section className="mt-14" aria-label="Community contributions awaiting review">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-h2">Community contributions</h2>
        <span data-numeric className="text-caption text-subtle">
          {submissions.length} awaiting review
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Contributions submitted through{" "}
        <span className="font-medium text-foreground">/archive/contribute</span>.
        Each is created as pending and stays pending — no code path in this
        application publishes or verifies a submission. Approval happens against
        the source, by a person, outside the public app.
      </p>

      {submissions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
          <p className="font-display text-h3">The queue is empty</p>
          <p className="mx-auto mt-2 max-w-md text-body text-muted">
            No community contributions are waiting. When one arrives it appears
            here with its media, its metadata and its screening flags.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-5">
          {submissions.map((submission) => (
            <li key={submission.id} className="rounded-xl border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-h3">{submission.title}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-muted">
                    <span>{submission.category}</span>
                    <span>{submission.community ?? "Community not stated"}</span>
                    <span>{submission.location ?? "Location not stated"}</span>
                    <span>{submission.period ?? "Period not stated"}</span>
                  </p>
                </div>
                <PendingReviewChip />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                {submission.mediaFilename ? (
                  <a
                    href={`/api/archive/submissions/${submission.id}/media`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="relative block aspect-4/3 overflow-hidden rounded-lg border bg-surface-muted"
                  >
                    {/* Unreviewed upload: served through the API route with
                        no-store, never optimised into the public image cache. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/archive/submissions/${submission.id}/media`}
                      alt={`Uploaded with the submission “${submission.title}”`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="flex aspect-4/3 items-center justify-center rounded-lg border border-dashed bg-surface-muted/40 text-center">
                    <span className="flex flex-col items-center gap-1.5 p-3 text-caption text-subtle">
                      <Paperclip className="size-4" aria-hidden />
                      No file attached
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-small leading-relaxed text-muted">{submission.description}</p>
                  {submission.sourceContext ? (
                    <p className="mt-3 rounded-lg border-l-2 border-border-strong bg-surface-muted/40 py-2 pl-3 text-caption leading-relaxed text-muted">
                      <strong className="text-foreground">Source given: </strong>
                      {submission.sourceContext}
                    </p>
                  ) : (
                    <p className="mt-3 text-caption text-warning">
                      No source or context given — this cannot be verified as submitted.
                    </p>
                  )}

                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-subtle">
                    <span>
                      Contributed by{" "}
                      <span className="font-medium text-foreground">
                        {submission.contributorName}
                      </span>
                    </span>
                    {submission.contributorContact ? (
                      <a
                        href={`mailto:${submission.contributorContact}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Mail className="size-3" aria-hidden />
                        {submission.contributorContact}
                      </a>
                    ) : (
                      <span>No contact given</span>
                    )}
                    <span>·</span>
                    <span>{formatDate(submission.submittedAt.slice(0, 10))}</span>
                    <span>·</span>
                    <span>Rights declared: {submission.rightsDeclared ? "yes" : "no"}</span>
                    <span>·</span>
                    <span className="font-mono">{submission.id}</span>
                  </p>
                </div>
              </div>

              {/* Automated screening — advisory notes for the curator. */}
              <div className="mt-4 border-t pt-3">
                <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                  Automated pre-screening
                </p>
                {submission.screening.length === 0 ? (
                  <p className="mt-2 text-caption text-subtle">
                    Nothing flagged. Still requires review — no flags is not a verification.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {submission.screening.map((flag) => (
                      <li
                        key={flag.code}
                        className={cn(
                          "flex items-start gap-2 text-caption leading-relaxed",
                          flag.severity === "warning" ? "text-warning" : "text-muted",
                        )}
                      >
                        {flag.severity === "warning" ? (
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        ) : (
                          <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
                        )}
                        {flag.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
