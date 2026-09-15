import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { SignUpForm } from "@/components/account/AuthForms";
import { authConfigured } from "@/lib/auth/server";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a TerraStory account to remember what you explore and get recommendations that explain themselves.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/account");
  return (
    <AuthShell
      title="Create your account"
      intro="Name, e-mail and a password. Interests come next, and you can skip them."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      {authConfigured() ? (
        <SignUpForm />
      ) : (
        <p className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
          Accounts are not available on this deployment. Everything on TerraStory can still be explored without one.
        </p>
      )}
    </AuthShell>
  );
}
