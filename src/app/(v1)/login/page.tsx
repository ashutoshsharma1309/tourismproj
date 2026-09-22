import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { SignInForm } from "@/components/account/AuthForms";
import { safeNextPath } from "@/lib/account/next";
import { accountsAvailable } from "@/lib/auth/server";
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
            <Link href="/" className="text-muted hover:text-primary hover:underline">
              Continue exploring without an account
            </Link>
          </p>
          <p className="mt-3 border-t border-border pt-3 text-caption text-subtle">
            Hotel partner or reviewer?{" "}
            <Link href={`/login/code?next=${encodeURIComponent(next ? target : "/partner/dashboard")}`} className="font-medium text-primary hover:underline">
              Partner sign-in
            </Link>
          </p>
        </div>
      }
    >
      {accountsAvailable() ? (
        <SignInForm next={target} />
      ) : (
        <p className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
          Sign-in is temporarily unavailable. Everything on TerraStory can still be explored without an account.
        </p>
      )}
    </AuthShell>
  );
}
