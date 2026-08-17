import { CircleDashed, Clock3, ShieldCheck, ShieldQuestion, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { VERIFICATION_LABEL } from "@/data/history";
import type { VerificationStatus } from "@/data/history";

/**
 * One visual vocabulary for how firmly a record stands, used by the timeline,
 * the archive and the review queue alike.
 *
 * The states are deliberately not interchangeable colours: "Verified" is the
 * only one that reads as settled, and it is the only one shown in success
 * green. Everything else is visibly something other than fact.
 */

const TONE: Record<VerificationStatus, "success" | "info" | "warning" | "neutral"> = {
  verified: "success",
  "source-backed": "info",
  "oral tradition": "neutral",
  "community contribution": "neutral",
  unverified: "warning",
};

const ICON: Record<VerificationStatus, typeof ShieldCheck> = {
  verified: ShieldCheck,
  "source-backed": ShieldQuestion,
  "oral tradition": CircleDashed,
  "community contribution": Users,
  unverified: ShieldQuestion,
};

export function VerificationChip({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const Icon = ICON[status];
  return (
    <Badge tone={TONE[status]} className={className}>
      <Icon className="size-3 shrink-0" aria-hidden />
      {VERIFICATION_LABEL[status]}
    </Badge>
  );
}

/** Community submissions, which are never verified inside this application. */
export function PendingReviewChip({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={className}>
      <Clock3 className="size-3 shrink-0" aria-hidden />
      Pending review
    </Badge>
  );
}

/** What each state means, spelled out where a visitor first meets them. */
export const VERIFICATION_LEGEND: { status: VerificationStatus; meaning: string }[] = [
  {
    status: "verified",
    meaning:
      "For an event: stated by a government or institutional source. For an object: its licence, creator and subject are all confirmed, and it was photographed in Sikkim.",
  },
  {
    status: "source-backed",
    meaning:
      "Stated by a reference work, with nothing found to contradict it — or an object that documents a tradition shared beyond Sikkim. Agreement between two articles in the same reference work does not upgrade this.",
  },
  {
    status: "oral tradition",
    meaning: "Transmitted and attested as tradition. Retold as the tradition tells it, not as settled fact.",
  },
  {
    status: "community contribution",
    meaning: "Given by a member of the community and reviewed by a curator. Credited to its contributor.",
  },
  {
    status: "unverified",
    meaning: "Retained as a research lead. Shown as unresolved rather than quietly dropped or quietly promoted.",
  },
];
