import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/account/AuthShell";
import { ResetPasswordForm } from "@/components/account/AuthForms";
import { currentUser, recentInboxProof } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Reached from the reset e-mail, which signs the traveller in for this one step. */
export default async function ResetPasswordPage() {
  const session = await currentUser();
  return (
    <AuthShell title="Choose a new password">
      {session && recentInboxProof(session) ? (
        <ResetPasswordForm />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-body leading-relaxed text-muted">
            This page opens from the link in a password-reset e-mail, on the device that asked for it.
            The link may have expired.
          </p>
          <Link href="/forgot-password" className="mt-3 inline-block font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
