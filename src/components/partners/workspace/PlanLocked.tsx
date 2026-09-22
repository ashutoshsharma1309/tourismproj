import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";

/** What a gated section shows a partner whose plan does not include it. */
export function PlanLocked({ message, cta }: { message: string; cta: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-5" role="note" data-plan-locked>
      <p className="text-body">{message}</p>
      <Link href="/partner/plan" className={`${buttonClasses({ variant: "outline", size: "sm" })} mt-4`}>{cta}</Link>
    </div>
  );
}
