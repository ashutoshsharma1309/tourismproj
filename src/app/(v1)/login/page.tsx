import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { SignInForm } from "@/components/account/AuthForms";
import { safeNextPath } from "@/lib/account/next";
import { authConfigured } from "@/lib/auth/server";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to continue your travel history, journeys and recommendations on TerraStory.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Log in. Exploring TerraStory never needs this page: an account adds
 * memory — history, journeys, interests — to a product that already works
 * without one.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  if (await currentUser()) redirect(target);

  return (
    <AuthShell
      title="Welcome back."
      footer={
        <div className="flex flex-col gap-2">
          <p>
            Don&rsquo;t have an account?{" "}
            <Link href={`/signup${next ? `?next=${encodeURIComponent(target)}` : ""}`} className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </p>
          <p>
            Hotel partner or reviewer?{" "}
            <Link href={`/login/code?next=${encodeURIComponent(next ? target : "/partner/dashboard")}`} className="font-medium text-primary hover:underline">
              Sign in with a one-time code
            </Link>
          </p>
        </div>
      }
    >
      {authConfigured() ? (
        <SignInForm next={target} />
      ) : (
        <p className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
          Accounts are not available on this deployment. Everything on TerraStory can still be explored without one.
        </p>
      )}
    </AuthShell>
  );
}
