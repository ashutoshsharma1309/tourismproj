"use client";

import { useActionState } from "react";

import { reviewEdit, reviewTransition, type ReviewState } from "@/app/(v1)/admin/partners/actions";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { nextStatuses, REVIEW_STEP, type PropertyStatus } from "@/lib/partners/lifecycle";

const IDLE: ReviewState = { status: "idle" };

const VERIFICATION_CHECKS: { field: string; label: string }[] = [
  { field: "exists", label: "The property exists and operates under this name" },
  { field: "destination", label: "It sits in the stated TerraStory destination" },
  { field: "address", label: "The address matches public records" },
  { field: "officialWebsite", label: "The website is the property's own" },
  { field: "bookingUrl", label: "The booking page belongs to the property" },
  { field: "phone", label: "The telephone number reaches the property" },
  { field: "mapsUrl", label: "The map location matches the address" },
];

/**
 * The reviewer's controls for one property: the transitions the lifecycle
 * allows from its current status, with a note, and for verification the
 * list of what was confirmed. Buttons for steps the machine does not allow
 * are not rendered rather than disabled — there is nothing to explain.
 */
export function ReviewControls({ propertyId, status }: { propertyId: string; status: PropertyStatus }) {
  const [state, action, pending] = useActionState(reviewTransition, IDLE);
  const targets = nextStatuses(status);
  const canVerify = targets.includes("VERIFIED");

  return (
    <form action={action} className="rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">Next step</p>
      <p className="mt-2 text-body text-muted">{REVIEW_STEP[status]}</p>

      {canVerify ? (
        <fieldset className="mt-4">
          <legend className="text-small font-medium">What you confirmed</legend>
          <ul className="mt-2 space-y-1.5">
            {VERIFICATION_CHECKS.map((c) => (
              <li key={c.field}>
                <label className="flex items-start gap-2 text-small">
                  <input type="checkbox" name="checks" value={c.field} className="mt-0.5 size-4 accent-primary" />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-small font-medium">Note to the partner</span>
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none"
          placeholder="Required when rejecting: say what could not be verified."
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {targets.map((to) => (
          <button
            key={to}
            type="submit"
            name="to"
            value={to}
            disabled={pending}
            className={buttonClasses({ variant: to === "REJECTED" ? "secondary" : "primary", size: "sm" })}
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

const VERB: Record<PropertyStatus, string> = {
  PENDING: "Return to queue",
  UNDER_REVIEW: "Start review",
  VERIFIED: "Mark verified",
  APPROVED: "Approve",
  PUBLISHED: "Publish",
  UNPUBLISHED: "Unpublish",
  REJECTED: "Reject",
};

export function EditControls({
  propertyId,
  values,
}: {
  propertyId: string;
  values: {
    address: string; area: string | null; mapsUrl: string | null; officialWebsite: string | null;
    bookingUrl: string | null; description: string | null; localCharacter: string | null;
  };
}) {
  const [state, action, pending] = useActionState(reviewEdit, IDLE);
  const input = "w-full rounded-lg border bg-surface px-3 py-2 text-small focus:border-primary focus:outline-none";
  return (
    <details className="group mt-6 rounded-xl border border-border">
      <summary className="cursor-pointer list-none px-5 py-3 text-small font-medium text-primary [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Correct a detail</span>
        <span className="hidden group-open:inline">Close editor</span>
      </summary>
      <form action={action} className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
        <input type="hidden" name="propertyId" value={propertyId} />
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption font-medium">Address</span>
          <textarea name="address" rows={2} defaultValue={values.address} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption font-medium">Area</span>
          <input name="area" defaultValue={values.area ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption font-medium">Maps URL</span>
          <input name="mapsUrl" defaultValue={values.mapsUrl ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption font-medium">Official website</span>
          <input name="officialWebsite" defaultValue={values.officialWebsite ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption font-medium">Booking URL</span>
          <input name="bookingUrl" defaultValue={values.bookingUrl ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption font-medium">Description</span>
          <textarea name="description" rows={4} defaultValue={values.description ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption font-medium">Local character</span>
          <textarea name="localCharacter" rows={3} defaultValue={values.localCharacter ?? ""} className={input} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "sm" })}>
            {pending ? "Saving…" : "Save correction"}
          </button>
          {state.message ? (
            <span className={cn("text-small", state.status === "error" ? "text-error" : "text-success")}>{state.message}</span>
          ) : null}
        </div>
      </form>
    </details>
  );
}

