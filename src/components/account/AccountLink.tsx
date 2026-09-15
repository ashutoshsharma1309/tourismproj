"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { hasSignedInHint } from "@/lib/account/hint";
import { cn } from "@/lib/cn";

const subscribe = () => () => {};

/**
 * "Log in" for visitors, "My TerraStory" for signed-in travellers. Reads only
 * the signed-in hint, so the prerendered header stays prerendered; the
 * account page itself checks the real session.
 */
export function AccountLink({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const signedIn = useSyncExternalStore(subscribe, hasSignedInHint, () => false);
  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        className,
      )}
    >
      <UserRound className="size-4" aria-hidden />
      {signedIn ? "My TerraStory" : "Log in"}
    </Link>
  );
}
