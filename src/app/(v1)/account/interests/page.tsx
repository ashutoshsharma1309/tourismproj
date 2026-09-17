import type { Metadata } from "next";
import Link from "next/link";

import { saveInterestsAction } from "@/app/(v1)/account/actions";
import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import { interestsFor } from "@/db/queries/account";
import { INTEREST_DESCRIPTION } from "@/lib/account/interests";
import { requireTraveller } from "@/lib/auth/session";
import { ALL_INTERESTS, INTEREST_LABEL } from "@/lib/planner/types";

export const metadata: Metadata = { title: "Your interests", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Choose interests, now or any time later. They are the strongest signal a
 * traveller gives, so they are never inferred into this list: what TerraStory
 * infers from history is shown as a reason on a recommendation, not saved here.
 */
export default async function InterestsPage({ searchParams }: { searchParams: Promise<{ welcome?: string; error?: string }> }) {
  const session = await requireTraveller("/account/interests");
  const { welcome, error } = await searchParams;
  const chosen = new Set(await interestsFor(session.id));
  const isWelcome = welcome === "1";

  return (
    <>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
        {!isWelcome ? (
          <p className="text-small">
            <Link href="/account" className="font-medium text-primary hover:underline">Your TerraStory</Link>
          </p>
        ) : null}
        <h1 className="mt-2 font-display text-h1 text-balance-heading">
          {isWelcome ? "What interests you?" : "Your interests"}
        </h1>
        <p className="mt-2 max-w-2xl text-body-lg text-muted">
          Choose as many as you like. Recommendations use them, together with what you explore, and always say which one they are based on.
        </p>
        {error === "rate" ? (
          <p role="alert" className="mt-4 rounded-lg border border-error/40 bg-error-soft/40 p-3 text-small">Too many changes. Please wait a few minutes.</p>
        ) : null}

        <form action={saveInterestsAction} className="mt-8">
          {isWelcome ? <input type="hidden" name="welcome" value="1" /> : null}
          <fieldset>
            <legend className="sr-only">Interests</legend>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ALL_INTERESTS.map((interest) => (
                <li key={interest}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 has-checked:border-primary has-checked:bg-primary-soft/40 focus-within:ring-2 focus-within:ring-primary/40">
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest}
                      defaultChecked={chosen.has(interest)}
                      className="mt-1 size-4 shrink-0 accent-primary"
                    />
                    <span>
                      <span className="block font-medium">{INTEREST_LABEL[interest]}</span>
                      <span className="block text-caption leading-relaxed text-muted">{INTEREST_DESCRIPTION[interest]}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" className={buttonClasses({ variant: "primary", size: "md" })}>
              Save interests
            </button>
            <Link href={isWelcome ? "/account" : "/account/profile"} className={buttonClasses({ variant: "secondary", size: "md" })}>
              {isWelcome ? "Skip for now" : "Cancel"}
            </Link>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
