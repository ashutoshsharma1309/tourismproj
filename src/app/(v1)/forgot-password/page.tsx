import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/account/AuthShell";
import { ForgotPasswordForm } from "@/components/account/AuthForms";
import { accountsAvailable } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      intro="Enter the e-mail address you signed up with and we will send a link to choose a new one."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      {accountsAvailable() ? (
        <ForgotPasswordForm />
      ) : (
        <p className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
          Sign-in is temporarily unavailable. Everything on TerraStory can still be explored without an account.
        </p>
      )}
    </AuthShell>
  );
}
