/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { ContributeForm } from "@/components/archive/ContributeForm";
import { Footer } from "@/components/layout/Footer";
import { ARCHIVE_COVERAGE } from "@/data/archive";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationPath, destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

const CAPABILITY = "archive" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  /*
   * SIKKIM ONLY. This form feeds Sikkim's archive contribution pipeline —
   * community submissions reviewed against its catalogue. The other fourteen
   * archives are retrieved from open collections and have no such pipeline,
   * so the moment they gained the `archive` capability this page prerendered
   * Sikkim's contribution form at fourteen other destinations' URLs. Found by
   * qa:archive's ownership check, not by anyone looking.
   */
  const ids = await destinationsWithCapability(
    "archive",
    listDestinations().map((d) => d.id),
  );
  return ids.filter((destinationId) => destinationId === "sikkim").map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "Contribute to Sikkim's heritage",
  description:
    "Contribute a photograph, a document, an oral history or a cultural practice to the Sikkim Darshan Digital Heritage Archive. Every contribution is reviewed by a curator before it is published.",
};

/**
 * The contribution surface.
 *
 * The workflow is stated on the page before the form, because the single worst
 * outcome for a heritage archive is a contributor who thinks they published
 * something and a reader who thinks a queued submission is verified fact.
 */
const WORKFLOW = [
  { step: "You submit", detail: "Your material and everything you know about it." },
  { step: "Pending review", detail: "The record is created with that status. Nothing is public yet." },
  { step: "Automated screening", detail: "Duplicates, missing metadata, location and spam checks — advisory only." },
  { step: "Curator review", detail: "A person checks the claim against a source." },
  { step: "Published", detail: "Credited to you, and marked as a community contribution." },
];

export default async function ContributePage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-24 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Archive"
          sectionHref={destinationPath(destinationId, "archive")}
          current="Contribute"
        />

        <header className="mt-5">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Community preservation
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            Contribute to Sikkim&apos;s heritage
          </h1>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            This archive holds {ARCHIVE_COVERAGE.total} objects. That is a small
            fraction of what exists, and almost none of what is missing is lost —
            it is in monastery libraries, family albums, and the memory of people
            who keep the festivals. If you hold something worth recording, this is
            where it goes.
          </p>
        </header>

        {/* ---------------------------------------------------------- workflow */}
        <section className="mt-10 rounded-xl border bg-surface p-6" aria-label="How contributions are handled">
          <h2 className="flex items-center gap-2 font-display text-h3">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            What happens to what you send
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW.map((row, index) => (
              <li key={row.step} className="flex min-w-0 flex-col">
                <span
                  data-numeric
                  className="font-mono text-eyebrow tracking-widest text-accent-ink uppercase"
                >
                  Step {index + 1}
                </span>
                <span className="mt-1.5 text-small font-semibold">{row.step}</span>
                <span className="mt-1 text-caption leading-relaxed text-muted">{row.detail}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-lg border-l-4 border-primary bg-primary-soft/60 p-4 text-small leading-relaxed">
            Automated screening assists the curator. It flags likely duplicates,
            missing metadata, unfamiliar locations and spam patterns. It does not
            decide whether something is true, it cannot approve a submission, and
            it never marks anything verified — a cultural verification decision is
            a human decision.
          </p>
        </section>

        {/* -------------------------------------------------------------- form */}
        <section className="mt-12" aria-label="Contribution form">
          <ContributeForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
