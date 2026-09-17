import type { Metadata } from "next";

import { AuthShell } from "@/components/account/AuthShell";
import { buttonClasses } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/account/next";

export const metadata: Metadata = { title: "Continue signing in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PURPOSE: Record<string, string> = {
  recovery: "Continue to choose a new password.",
  signup: "Continue to finish creating your account.",
  email: "Continue to finish signing in.",
  magiclink: "Continue to finish signing in.",
  invite: "Continue to accept the invitation.",
  email_change: "Continue to confirm your new e-mail address.",
};

/**
 * One deliberate click between an e-mail link and a session. See
 * app/auth/callback/route.ts for why a link that works in any browser must
 * not sign anyone in on a plain page load.
 */
export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash = "", type = "", next } = await searchParams;
  const valid = tokenHash.length > 0 && tokenHash.length < 512 && type in PURPOSE;
  return (
    <AuthShell
      title="Continue signing in"
      intro={valid ? PURPOSE[type] : "This link is incomplete. Request a new one."}
    >
      {valid ? (
        <form method="post" action="/auth/callback">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={safeNextPath(next)} />
          <button type="submit" className={`${buttonClasses({ variant: "primary", size: "md" })} w-full justify-center`}>
            Continue
          </button>
          <p className="mt-4 text-caption leading-relaxed text-subtle">
            Only continue if you asked TerraStory for this e-mail. If you didn&rsquo;t, close this page.
          </p>
        </form>
      ) : null}
    </AuthShell>
  );
}
