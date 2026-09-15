import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import { listDestinations, listRegionNames } from "@/lib/destinations/registry";
import { formatINR } from "@/lib/money";
import { ILLUSTRATIVE_SCENARIO, illustrativeScenario } from "@/lib/partners/scenario";

export const metadata: Metadata = {
  title: "Partner with TerraStory",
  description:
    "TerraStory sends travellers who are already exploring a destination's culture to verified places to stay, through the property's own official channels. How the partnership works, what it costs, and how to apply.",
  alternates: { canonical: "/partner" },
};

/**
 * The partner programme, explained to a hotel — and the business model,
 * explained to anyone.
 *
 * WHAT THIS PAGE IS CAREFUL NOT TO SAY
 * ------------------------------------
 * It promises visibility to travellers who are already exploring the
 * destination, and referral through the property's own channels. It does not
 * promise bookings, quote a commission that no agreement carries, or show a
 * number that was not counted. The one worked example is labelled as an
 * illustration and computed from stated assumptions in lib/partners/scenario.
 */
export default function PartnerPage() {
  const destinations = listDestinations();
  const states = listRegionNames();
  const scenario = illustrativeScenario();

  return (
    <>
      <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          For hotels, homestays and heritage properties
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Partner with TerraStory
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          TerraStory is where travellers explore {destinations.length} Indian destinations through
          their places, history, food and festivals. When they need somewhere to stay, they see
          verified properties in the destination they are already exploring — and reach you
          through your own website, booking page or telephone. No marketplace, no inventory, no
          middleman between you and the guest.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/partner/apply" className={buttonClasses({ variant: "primary", size: "md" })}>
            List your property
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/partner/dashboard" className={buttonClasses({ variant: "secondary", size: "md" })}>
            Partner sign-in
          </Link>
        </div>

        {/* ------------------------------------------------ what you get */}
        <section className="mt-14" aria-labelledby="value">
          <h2 id="value" className="font-display text-h2">What a partnership gives you</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Travellers already in your destination", "Your property appears on the destination page a traveller is reading — beside its places, stories and food — not in a list of every hotel in India."],
              ["Qualified interest, not traffic", "A visitor who reaches your site from TerraStory has chosen the destination, read about it, and clicked through to you. That is a lead worth having."],
              ["Your own channels, always", "\"Book on official website\" goes to your website. \"Call\" dials your number. TerraStory never takes the booking, the payment or the guest relationship."],
              ["A verified record", "A reviewer confirms the property, its address and its channels against public records before it is published. Verified means a person checked."],
              ["Referral counts you can see", "Your dashboard shows outbound clicks to your channels, counted from real events. When there is nothing yet, it says so."],
              ["Terms agreed, not imposed", "Commission or referral fees apply only under an agreement you have signed. There is no default rate and no charge for being listed."],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl border border-border bg-surface p-5">
                <h3 className="font-display text-h4">{title}</h3>
                <p className="mt-2 text-body leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------ how it works */}
        <section className="mt-14" aria-labelledby="how">
          <h2 id="how" className="font-display text-h2">How it works</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Apply", "Tell us about the property: where it is, what it is, and how guests reach you."],
              ["Verification", "A reviewer checks the property against public records and your official channels."],
              ["Published", "The property appears on its destination's page for travellers exploring it."],
              ["Referrals", "Travellers reach your channels; each click is counted and shown to you."],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-xl border border-border bg-surface p-4">
                <p className="font-mono text-caption text-primary">0{i + 1}</p>
                <h3 className="mt-1 font-display text-h4">{title}</h3>
                <p className="mt-1 text-caption leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-2xl text-small text-muted">
            Submitting a request does not create a listing. Nothing is shown to travellers until
            it has been verified and approved.
          </p>
        </section>

        {/* ------------------------------------------- the business model */}
        <section className="mt-14" aria-labelledby="model">
          <h2 id="model" className="font-display text-h2">How TerraStory sustains itself</h2>
          <p className="mt-3 max-w-2xl text-body leading-relaxed text-muted">
            TerraStory is a cultural discovery platform first. The commercial layer follows the
            traveller&rsquo;s own path: discovery leads to a destination, the destination leads to
            places and experiences, and the trip needs somewhere to stay. Revenue comes from
            partnerships at that last step, never from selling the traveller.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["For travellers", "Free cultural discovery, verified knowledge and a guide that answers only from records."],
              ["For partners", "Qualified visibility to travellers exploring your destination, and referral opportunities through your own channels."],
              ["For destinations", `Digital cultural discovery across ${states.length} states and union territories, and an honest picture of what is documented.`],
              ["For TerraStory", "Referral and commission revenue under signed agreements today; institutional and B2B licensing of verified destination knowledge as the network grows."],
            ].map(([term, detail]) => (
              <div key={term} className="rounded-xl border border-border bg-surface-muted/40 p-5">
                <dt className="font-display text-h4">{term}</dt>
                <dd className="mt-2 text-body leading-relaxed text-muted">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-xl border border-border p-5">
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">The path to revenue</p>
            <p className="mt-2 text-body text-muted">
              Traffic → destination discovery → stay and experience discovery → qualified referral →
              partner conversion → commission or referral fee.
            </p>
            <p className="mt-3 text-small leading-relaxed text-muted">
              Three figures are kept apart. <strong className="font-medium text-foreground">Gross merchandise value</strong> is
              what guests spend at partners and is not TerraStory&rsquo;s money.{" "}
              <strong className="font-medium text-foreground">Commission</strong> is what one qualifying transaction yields
              under one active agreement. <strong className="font-medium text-foreground">Revenue</strong> is the sum of
              commissions and fees actually earned. A page visit or an outbound click carries no amount and earns nothing.
            </p>
          </div>

          {/* --------------------------------- illustrative scenario */}
          <div className="mt-6 rounded-xl border border-dashed border-border p-5">
            <p className="font-mono text-eyebrow tracking-widest text-warning uppercase">
              {ILLUSTRATIVE_SCENARIO.label}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-muted">{ILLUSTRATIVE_SCENARIO.disclaimer}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
              {[
                ["Qualified bookings / month", String(scenario.monthlyQualifiedBookings)],
                ["Average booking value", formatINR(scenario.averageBookingValuePaise)],
                ["Illustrative GMV", formatINR(scenario.gmvPaise)],
                ["Illustrative commission", `${scenario.commissionBps / 100}%`],
                ["Illustrative platform revenue", formatINR(scenario.revenuePaise)],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-caption text-subtle">{term}</dt>
                  <dd className="mt-0.5 font-mono text-body" data-numeric>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------- current vs future */}
        <section className="mt-14" aria-labelledby="scope">
          <h2 id="scope" className="font-display text-h2">What exists today, and what does not</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display text-h4">Today</h3>
              <ul className="mt-3 space-y-1.5 text-body text-muted">
                <li>Verified stays on every destination page, with official website and contact where a source publishes them</li>
                <li>Partner application, review and publication workflow</li>
                <li>Referral events counted on outbound clicks</li>
                <li>Configurable commercial agreements — none active yet</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-5">
              <h3 className="font-display text-h4">Not yet</h3>
              <ul className="mt-3 space-y-1.5 text-body text-muted">
                <li>Direct booking, live availability or rates</li>
                <li>Payments, reservations or cancellations</li>
                <li>Automated commission settlement</li>
                <li>Channel-manager or property-system integrations</li>
              </ul>
              <p className="mt-3 text-caption text-subtle">
                The data model is built so direct booking can be added to a verified property later without changing the platform underneath it.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-14 rounded-xl bg-primary px-6 py-8 text-primary-foreground">
          <h2 className="font-display text-h2">Ready to be found by the right travellers?</h2>
          <p className="mt-2 max-w-2xl text-body opacity-90">
            The application takes a few minutes. A reviewer replies to the e-mail you give.
          </p>
          <Link
            href="/partner/apply"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-5 text-small font-medium text-primary transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-surface focus-visible:outline-none"
          >
            List your property
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
