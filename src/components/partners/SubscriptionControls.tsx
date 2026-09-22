"use client";

import { useActionState } from "react";

import { assignPlanAction, endPlanAction, type ReviewState } from "@/app/(v1)/admin/partners/actions";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const IDLE: ReviewState = { status: "idle" };
const control = "w-full rounded-lg border bg-surface px-3 py-2 text-small focus:border-primary focus:outline-none";

function Reply({ state }: { state: ReviewState }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={cn("mt-2 text-small", state.status === "error" ? "text-error" : "text-success")}>
      {state.message}
    </p>
  );
}

/** Reviewer console: assign or end a partner's plan. English, like the rest of the console. */
export function SubscriptionControls({
  partnerId,
  propertyId,
  plans,
  hasSubscription,
}: {
  partnerId: string;
  propertyId: string;
  plans: { code: string; name: string; trialDays: number }[];
  hasSubscription: boolean;
}) {
  const [assignState, assign, assigning] = useActionState(assignPlanAction, IDLE);
  const [endState, end, ending] = useActionState(endPlanAction, IDLE);
  return (
    <div className="mt-4 space-y-4">
      <form action={assign} className="space-y-3" data-plan-assign>
        <input type="hidden" name="partnerId" value={partnerId} />
        <input type="hidden" name="propertyId" value={propertyId} />
        <label className="flex flex-col gap-1 text-small font-medium">
          Plan
          <select name="planCode" className={control} defaultValue={plans[0]?.code}>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>{p.name}{p.trialDays ? ` (trial ${p.trialDays} days)` : ""}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-medium">
          As
          <select name="mode" className={control} defaultValue="ACTIVE">
            <option value="ACTIVE">Active subscription</option>
            <option value="TRIAL">Trial</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-medium">
          Active until (optional, ignored for a trial)
          <input type="date" name="periodEnd" className={control} />
        </label>
        <label className="flex flex-col gap-1 text-small font-medium">
          Note
          <input type="text" name="note" maxLength={500} className={control} />
        </label>
        <button type="submit" disabled={assigning} className={buttonClasses({ variant: "primary", size: "sm" })}>Set plan</button>
        <Reply state={assignState} />
      </form>
      {hasSubscription ? (
        <form action={end} className="flex flex-wrap gap-2" data-plan-end>
          <input type="hidden" name="partnerId" value={partnerId} />
          <input type="hidden" name="propertyId" value={propertyId} />
          <button type="submit" name="when" value="period-end" disabled={ending} className={buttonClasses({ variant: "secondary", size: "sm" })}>End at period end</button>
          <button type="submit" name="when" value="now" disabled={ending} className={buttonClasses({ variant: "secondary", size: "sm" })}>End now</button>
          <Reply state={endState} />
        </form>
      ) : null}
    </div>
  );
}
