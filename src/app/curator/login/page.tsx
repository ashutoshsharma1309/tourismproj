import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { CuratorLoginForm } from "@/components/archive/CuratorLoginForm";
import { authConfigured, currentRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Curator sign-in",
  /* Never index a sign-in page for a non-public queue. */
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CuratorLoginPage() {
  if ((await currentRole()) === "curator") redirect("/preservation/review");
  const configured = authConfigured();

  return (
    <>
      <main id="main" className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-28 md:px-6">
        <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-primary">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-h2 text-balance-heading">Curator sign-in</h1>
        <p className="mt-3 text-body leading-relaxed text-muted">
          The review queue holds contributions that have not been checked, and
          the contact details of the people who sent them. It is not public.
        </p>

        {configured ? (
          <CuratorLoginForm />
        ) : (
          <p className="mt-7 rounded-lg border border-dashed p-4 text-small leading-relaxed text-muted">
            Curator access is not configured on this deployment, so the queue
            cannot be opened by anyone. Set <code>AUTH_SECRET</code> and{" "}
            <code>CURATOR_PASSPHRASE</code> in the environment to enable it.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
