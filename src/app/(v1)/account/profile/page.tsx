import type { Metadata } from "next";
import Link from "next/link";

import { setHistoryRecordingAction } from "@/app/(v1)/account/actions";
import { SignOutButton } from "@/components/account/SignOutButton";
import { ClearHistoryForm, DeleteAccountForm, ProfileForm } from "@/components/account/SettingsForms";
import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import { activitySummary, interestsFor, profileFor } from "@/db/queries/account";
import { formatDate } from "@/lib/account/format";
import { RETENTION_DAYS, RETENTION_MAX_EVENTS } from "@/lib/account/store";
import { requireTraveller } from "@/lib/auth/session";
import { LANGUAGES } from "@/lib/i18n/languages";
import { INTEREST_LABEL, type JourneyInterest } from "@/lib/planner/types";

export const metadata: Metadata = { title: "Profile and privacy", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Profile, interests, and every privacy control in one place: what is
 * stored and why, pausing history, clearing it, deleting the account, and
 * logging out. Deliberately plain — there is no public profile, no photo
 * wall, nothing another person can see.
 */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await requireTraveller("/account/profile");
  const { saved, error } = await searchParams;
  const [profile, interests, summary] = await Promise.all([
    profileFor(session.id),
    interestsFor(session.id),
    activitySummary(session.id),
  ]);
  const languages = LANGUAGES.map((language) => ({
    code: language.code,
    label: language.code === "en" ? "English" : `${language.endonym} — ${language.english}`,
  }));

  return (
    <>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
        <p className="text-small">
          <Link href="/account" className="font-medium text-primary hover:underline">Your TerraStory</Link>
        </p>
        <h1 className="mt-2 font-display text-h1 text-balance-heading">Profile and privacy</h1>
        {saved ? (
          <p role="status" className="mt-4 rounded-lg border border-border bg-surface p-3 text-small">
            {saved === "interests" ? "Interests saved. Recommendations now use them." : "Saved."}
          </p>
        ) : null}
        {error === "rate" ? (
          <p role="alert" className="mt-4 rounded-lg border border-error/40 bg-error-soft/40 p-3 text-small">Too many changes. Please wait a few minutes.</p>
        ) : null}

        {/* --------------------------------------------------------- profile */}
        <section className="mt-10" aria-labelledby="profile">
          <h2 id="profile" className="font-display text-h2">Profile</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-subtle">Email</dt>
              <dd className="mt-0.5 break-all">{profile?.email ?? session.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">Member since</dt>
              <dd className="mt-0.5" data-numeric>{profile ? formatDate(profile.createdAt) : "—"}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <ProfileForm fullName={profile?.fullName ?? session.name ?? ""} locale={profile?.locale ?? "en"} languages={languages} />
          </div>
        </section>

        {/* --------------------------------------------------------- activity */}
        <section className="mt-12" aria-labelledby="activity">
          <h2 id="activity" className="font-display text-h2">Your activity</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              ["Destinations", summary.destinations],
              ["Places", summary.places],
              ["Stories", summary.stories],
              ["Journeys", summary.journeys],
              ["Comparisons", summary.comparisons],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-surface p-3">
                <dt className="text-caption text-subtle">{label}</dt>
                <dd className="mt-0.5 font-display text-h3" data-numeric>{value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/account/history" className="mt-3 inline-flex min-h-11 items-center text-small font-medium text-primary hover:underline">
            See your travel history
          </Link>
        </section>

        {/* --------------------------------------------------------- interests */}
        <section className="mt-12" aria-labelledby="interests">
          <h2 id="interests" className="font-display text-h2">Interests</h2>
          <p className="mt-2 text-body text-muted">
            {interests.length > 0
              ? interests.map((interest) => INTEREST_LABEL[interest as JourneyInterest] ?? interest).join(", ")
              : "None chosen yet."}
          </p>
          <Link href="/account/interests" className={`${buttonClasses({ variant: "secondary", size: "md" })} mt-3`}>
            Edit interests
          </Link>
        </section>

        {/* --------------------------------------------------------- privacy */}
        <section id="privacy" className="mt-12 scroll-mt-24" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="font-display text-h2">Privacy</h2>
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-5 text-body leading-relaxed text-muted">
            <p>
              <strong className="font-medium text-foreground">What is stored.</strong> Your name, e-mail and preferred
              language; the interests you choose; which destinations, places, stories, history entries and stays you open
              while signed in, and when; your journeys; the destinations you compare.
            </p>
            <p>
              <strong className="font-medium text-foreground">What is not.</strong> Searches, questions you type to the
              guide, scrolling, clicks, your location, or your IP address. Exploring while signed out stays in this
              browser tab and is added to your account only if you log in during that visit.
            </p>
            <p>
              <strong className="font-medium text-foreground">Why.</strong> To show where you left off, and to recommend
              destinations and places that match your interests and what you have explored. Every recommendation says
              which of these it is based on.
            </p>
            <p>
              <strong className="font-medium text-foreground">Who sees it.</strong> Only you. It is never shown to hotel
              partners or other travellers, and never sold.
            </p>
            <p>
              <strong className="font-medium text-foreground">How long.</strong> Individual explorations are kept for{" "}
              {RETENTION_DAYS} days (at most {RETENTION_MAX_EVENTS.toLocaleString("en-IN")}); your list of explored
              destinations stays until you clear it.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-border p-5">
            <h3 className="font-display text-h4">Record my travel history</h3>
            <form action={setHistoryRecordingAction} className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-3 text-body">
                <input type="checkbox" name="enabled" defaultChecked={profile?.historyEnabled ?? true} className="size-4 accent-primary" />
                Remember what I explore while signed in
              </label>
              <button type="submit" className={buttonClasses({ variant: "secondary", size: "md" })}>Save</button>
            </form>
            <p className="mt-2 text-caption text-subtle">
              Turning this off stops new history being recorded. Your journey and interests are still saved when you change them.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-border p-5">
            <h3 className="font-display text-h4">Clear travel history</h3>
            <p className="mt-1 text-small text-muted">
              Keeps your account, your interests and the journey in progress. Recommendations immediately stop using what you had explored.
            </p>
            <div className="mt-3">
              <ClearHistoryForm />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-error/30 p-5">
            <h3 className="font-display text-h4">Delete account</h3>
            <p className="mt-1 text-small text-muted">
              Permanently deletes your account, interests, travel history, journeys and comparisons, and your sign-in.
            </p>
            <div className="mt-3">
              <DeleteAccountForm />
            </div>
          </div>
        </section>

        <div className="mt-12 border-t border-border pt-6">
          <SignOutButton />
        </div>
      </main>
      <Footer />
    </>
  );
}
