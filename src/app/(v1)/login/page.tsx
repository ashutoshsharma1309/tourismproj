import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "@/components/partners/LoginForm";
import { authConfigured } from "@/lib/auth/server";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to follow a partnership request or review the partner queue.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Sign-in for partners and reviewers. Travellers need no account: every
 * traveller-facing feature works without one, and nothing here is offered
 * in the traveller navigation.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && /^\/(?!\/)[^\s]*$/.test(next) ? next : "/partner/dashboard";

  const session = await currentUser();
  if (session) redirect(safeNext);

  return (
    <>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">Partners and reviewers</p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">Sign in</h1>
        <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
          A one-time code by e-mail, no password. Exploring TerraStory never needs an account.
        </p>
        <div className="mt-8">
          {authConfigured() ? (
            <LoginForm next={safeNext} />
          ) : (
            <p className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
              Sign-in is not configured on this deployment.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
