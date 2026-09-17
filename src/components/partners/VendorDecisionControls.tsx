"use client";

import { useActionState } from "react";

import { vendorDecision, type ReviewState } from "@/app/(v1)/admin/partners/actions";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { nextVendorStatuses, type VendorStatus } from "@/lib/partners/vendor";

const IDLE: ReviewState = { status: "idle" };

const VERB: Record<VendorStatus, string> = {
  PENDING: "Return to queue",
  UNDER_REVIEW: "Review organisation",
  VERIFIED: "Verify organisation",
  APPROVED: "Approve organisation",
  REJECTED: "Reject organisation",
  SUSPENDED: "Suspend organisation",
};

/**
 * The reviewer's controls for the organisation behind a property. Reviewer
 * surface: English, like the rest of the review console.
 */
export function VendorDecisionControls({ partnerId, propertyId, status }: { partnerId: string; propertyId: string; status: VendorStatus }) {
  const [state, action, pending] = useActionState(vendorDecision, IDLE);
  const targets = nextVendorStatuses(status);
  return (
    <form action={action} className="rounded-xl border border-border bg-surface p-5" data-vendor-controls>
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <h2 className="font-display text-h4">Organisation decision</h2>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-small font-medium">Note to the partner</span>
        <textarea
          name="note"
          rows={2}
          maxLength={1000}
          className="w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none"
          placeholder="Required to reject or suspend."
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {targets.map((to) => (
          <button
            key={to}
            type="submit"
            name="decision"
            value={`vendor:${to}`}
            disabled={pending}
            className={buttonClasses({ variant: to === "REJECTED" || to === "SUSPENDED" ? "secondary" : "primary", size: "sm" })}
          >
            {VERB[to]}
          </button>
        ))}
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} className={cn("mt-3 text-small", state.status === "error" ? "text-error" : "text-success")}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
