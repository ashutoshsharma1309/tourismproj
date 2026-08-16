import { ExternalLink, ShieldCheck, ShieldQuestion } from "lucide-react";

import { getSource } from "@/data/sources";
import type { Provenance as ProvenanceData } from "@/data/sources";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

/**
 * Source-first UI (§42, §43). A record only wears a "Verified" badge when its
 * provenance says so — never merely because the record exists.
 */
export function VerificationBadge({ provenance }: { provenance: ProvenanceData }) {
  const verified = provenance.confidence !== "unverified";
  return (
    <Badge tone={verified ? "success" : "warning"}>
      {verified ? (
        <ShieldCheck className="size-3" aria-hidden />
      ) : (
        <ShieldQuestion className="size-3" aria-hidden />
      )}
      {verified ? "Sourced" : "Unverified"}
    </Badge>
  );
}

export function SourceNote({ provenance }: { provenance: ProvenanceData }) {
  const source = getSource(String(provenance.sourceId));
  const href = provenance.sourceUrl ?? source?.url;
  return (
    <div className="rounded-lg border bg-surface-muted/60 p-4 text-caption leading-relaxed text-muted">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-foreground">Source</span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {source?.name ?? "Reference"}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : (
          <span>Not available</span>
        )}
        <span aria-hidden>·</span>
        <span>Last verified {formatDate(provenance.verifiedAt)}</span>
        <span aria-hidden>·</span>
        <span className="capitalize">{provenance.confidence} confidence</span>
      </p>
      {provenance.caveat ? <p className="mt-1.5">{provenance.caveat}</p> : null}
    </div>
  );
}

/** Shown wherever a feature has no verified data behind it (§54, §56). */
export function NotAvailable({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0 rounded-xl border border-dashed p-6 text-center sm:p-8">
      <p className="font-display text-h3 text-balance-heading">{title}</p>
      <p className="mx-auto mt-2 w-full max-w-md text-body text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
