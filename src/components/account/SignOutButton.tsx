"use client";

import { signOutTraveller } from "@/app/(v1)/login/account-actions";
import { buttonClasses } from "@/components/ui/Button";
import { clearLocalAccountData } from "@/lib/account/client";
import { cn } from "@/lib/cn";

/**
 * Log out: the server ends the session; this browser forgets the journey,
 * the visit list and the session buffer, so the next person to use the
 * device starts from nothing.
 */
export function SignOutButton({ className, variant = "secondary" }: { className?: string; variant?: "primary" | "secondary" }) {
  return (
    <form action={signOutTraveller} onSubmit={() => clearLocalAccountData()}>
      <button type="submit" className={cn(buttonClasses({ variant, size: "md" }), className)}>
        Log out
      </button>
    </form>
  );
}
