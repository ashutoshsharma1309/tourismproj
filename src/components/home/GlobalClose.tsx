import { ArrowRight, FileText, Quote, ScrollText } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { coverageDimensions } from "@/lib/destinations/earned-depth";

/**
 * How a journey gets built, why the archive can be trusted, and where Sikkim
 * sits — the last three things the landing page has to say.
 *
 * SIKKIM GETS ONE BLOCK, NOT NINE
 * -------------------------------
 * It used to have the whole page below the fold: monasteries, the heritage
 * map, its stories, its culture films, its planner, its preservation report.
 * It is the deepest destination in the product and that is worth showing — as
 * a demonstration of what depth looks like, with its real numbers, linking to
 * its own pages. One block. Everything else it had is still there, on
 * `/destinations/sikkim`.
 *
 * The counts are read from the archive at build time. None is typed.
 */
export async function GlobalClose() {
  const sikkim = await coverageDimensions("sikkim");

  return (
    <>
      {/* ------------------------------------------- Plan your journey */}
      <section
        id="plan"
        aria-labelledby="plan-heading"
        className="scroll-mt-20 border-y border-border bg-surface-muted/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Turn discovery into a journey
          </p>
          <h2 id="plan-heading" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            A plan that tells you why each stop is on it
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            Choose a destination, say what interests you and how long you have.
            The planner orders real records by a documented formula and states
            its reasoning for every stop — and states, just as plainly, what it
            cannot tell you.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Choose a destination", "Any of the fifteen. The planner only ever offers that destination's own records."],
              ["Say what interests you", "Only interests that destination can actually satisfy are listed."],
              ["Set the length and pace", "Days and stops per day. The same choices always produce the same plan."],
              ["Read why", "Each stop names the evidence behind it, and the plan says what is missing."],
            ].map(([title, body], index) => (
              <li key={title} className="tile flex flex-col p-5">
                <span className="font-mono text-eyebrow tracking-widest text-primary uppercase" data-numeric>
                  Step {index + 1}
                </span>
                <span className="mt-2 font-display text-h4">{title}</span>
                <span className="mt-2 text-body text-muted">{body}</span>
              </li>
            ))}
          </ol>

          {/*
            No prices, no times, no availability — and the page says so here
            rather than leaving a visitor to discover it in the planner.
          */}
          <p className="mt-6 max-w-2xl text-body text-muted">
            Nothing is priced, timed or booked. There is no licensed rates feed
            behind this product, and a guessed total would be worse than none.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- Provenance */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Why you can believe it
        </p>
        <h2 id="trust-heading" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          Every historical insight is tied to its source
        </h2>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          Not a footnote you could check in principle — a link you can follow
          from the sentence to the page it came from.
        </p>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Quote,
              step: "Claim",
              body: "A sentence about a place, quoted rather than rewritten, so the words on the page are the words in the source.",
            },
            {
              icon: FileText,
              step: "Source",
              body: "The publication it came from, named beside it, with the date it was retrieved and how much confidence it carries.",
            },
            {
              icon: ScrollText,
              step: "Evidence",
              body: "For reviewed research, the exact span the claim rests on — re-checked against the document at publication.",
            },
          ].map(({ icon: Icon, step, body }) => (
            <li key={step} className="tile flex flex-col p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="mt-3 font-display text-h4">{step}</span>
              <span className="mt-2 text-body leading-relaxed text-muted">{body}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-2xl text-body text-muted">
          Where something has not been verified, the page says so instead of
          filling the space.{" "}
          <Link
            href="/destinations/sikkim/preservation"
            className="font-medium text-primary hover:underline"
          >
            See what is missing, and why
          </Link>
          .
        </p>
      </section>

      {/* ----------------------------------- Sikkim, the deepest example */}
      <section
        aria-labelledby="sikkim-heading"
        className="border-y border-border bg-surface-inverse text-foreground-inverse"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
            The deepest destination
          </p>
          <h2 id="sikkim-heading" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            What a destination looks like when it has been fully catalogued
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted-inverse">
            Sikkim is the archive TerraStory was built around, and the reference
            every other destination is measured against. It is not a better
            place than the other fourteen — it is the one most of which has
            been catalogued and reviewed.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-border-inverse py-5">
            {[
              [sikkim.places, "catalogued records"],
              [sikkim.stories, "stories"],
              [sikkim.history, "dated events"],
              [sikkim.approvedClaims, "reviewer-approved claims"],
            ].map(([value, label]) => (
              <div key={String(label)}>
                <dt className="text-caption text-muted-inverse">{label}</dt>
                <dd className="font-mono text-2xl font-medium" data-numeric>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/destinations/sikkim"
              className={cn(buttonClasses({ variant: "accent", size: "lg" }))}
            >
              Explore Sikkim
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/destinations/sikkim/explore"
              className={cn(buttonClasses({ variant: "ghost-inverse", size: "lg" }))}
            >
              Open the heritage map
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Final call */}
      <section aria-labelledby="final-cta" className="mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
        <h2 id="final-cta" className="font-display text-h1 text-balance-heading">
          Travel further. Understand deeper.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body-lg leading-relaxed text-muted">
          Fifteen destinations, each one honest about how much of it is known.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/destinations" className={cn(buttonClasses({ size: "lg" }))}>
            Explore the destinations
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/discover"
            prefetch={false}
            className={cn(buttonClasses({ variant: "outline", size: "lg" }))}
          >
            Start from an interest
          </Link>
        </div>
      </section>
    </>
  );
}
