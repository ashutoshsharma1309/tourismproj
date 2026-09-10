/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { ExternalLink, FileCheck2, Info } from "lucide-react";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/components/seo/JsonLd";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import {
  PERMIT_STATS,
  permitDestinations,
  permitDocuments,
  rapRules,
} from "@/data/permits";

const CAPABILITY = "permits" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "permits",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

/* The canonical URL names the destination from the route, so this page
   cannot claim to be Sikkim's when served for another destination. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}): Promise<Metadata> {
  const { destinationId } = await params;
  return {
    title: "Permits for Sikkim",
    description:
      "Which Sikkim destinations need a Protected Area Permit, who issues it, and the Restricted Area Permit rules for foreign nationals — from the Tourism & Civil Aviation Department.",
    alternates: { canonical: `/destinations/${destinationId}/permits` },
    openGraph: {
      title: "Permits for Sikkim",
      description:
        "Protected Area Permit destinations and Restricted Area Permit rules, sourced to the Government of Sikkim.",
      type: "article",
    },
  };
}

/**
 * Permits.
 *
 * The single most practical thing on this site. A visitor can read every story
 * in the archive and still be turned back at a check post above Lachen for want
 * of a permit nobody told them about.
 */
export default async function PermitsPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  const regions = [...new Set(permitDestinations.map((d) => d.region))];

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: "Permits for Sikkim",
            description:
              "Protected Area Permit destinations and Restricted Area Permit rules for Sikkim.",
            url: `/destinations/${destinationId}/permits`,
            section: "Travel information",
          }),
          breadcrumbSchema([{ name: "Permits", url: `/destinations/${destinationId}/permits` }]),
        ]}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Permits"
        />
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Before you travel
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          Where you need a permit, and who issues it
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          Much of Sikkim&apos;s high country sits inside protected areas, and
          reaching it needs paperwork arranged before you set out — not at the
          check post. These are the {PERMIT_STATS.destinations} destinations the
          state lists as requiring a Protected Area Permit.
        </p>

        {/* ------------------------------------------------ PAP by district */}
        <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
          {regions.map((region) => (
            <section key={region} aria-labelledby={region}>
              <h2 id={region} className="font-display text-h3">
                {region}
              </h2>
              <dl className="mt-4 flex flex-col gap-4">
                {permitDestinations
                  .filter((d) => d.region === region)
                  .map((d) => (
                    <div key={d.slug} className="rounded-lg border bg-surface p-4">
                      <dt className="flex items-start gap-2 text-body font-semibold">
                        <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        {d.name}
                      </dt>
                      <dd className="mt-1.5 pl-6 text-small leading-relaxed text-muted">
                        {d.authority}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
        </div>

        {/* ------------------------------------------------------- documents */}
        <section className="mt-14" aria-labelledby="documents">
          <h2 id="documents" className="font-display text-h2">
            What to carry
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {permitDocuments.map((group) => (
              <div key={group.for} className="rounded-xl border bg-surface-muted/50 p-5">
                <h3 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                  {group.for}
                </h3>
                {/* A condition of entry, not a document — so it leads, above
                    the checklist. Turning up at a check post on a 125 cc bike
                    with every paper in order still means being turned back. */}
                {group.rule ? (
                  <p className="mt-3 rounded-lg border-l-4 border-warning bg-warning-soft px-3 py-2 text-small leading-relaxed">
                    {group.rule}
                  </p>
                ) : null}
                <ul className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 marker:font-mono marker:text-subtle">
                  {group.notes.map((note) => (
                    <li key={note} className="text-small leading-relaxed text-muted">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- RAP */}
        <section className="mt-14" aria-labelledby="rap">
          <h2 id="rap" className="font-display text-h2">
            If you are not an Indian national
          </h2>
          <p className="mt-3 max-w-2xl text-body text-muted">
            A Restricted Area Permit is required in addition to the above.
          </p>
          <ul className="mt-5 flex max-w-3xl flex-col gap-3">
            {rapRules.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-small leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-2xl rounded-lg border border-dashed p-4 text-caption leading-relaxed text-muted">
            The department lists thirteen offices that issue a RAP, with their
            addresses and telephone numbers. Those are not reproduced here: the
            page pairs each office name with the next office&apos;s address, and
            a wrong telephone number for a permit office is worse than none.{" "}
            <a
              href={PERMIT_STATS.rapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Read the office list on the department&apos;s own page
              <ExternalLink className="size-3" aria-hidden />
            </a>
            .
          </p>
        </section>

        <p className="mt-12 max-w-2xl text-caption leading-relaxed text-subtle">
          Permit rules change. Everything above was read from the{" "}
          <a
            href={PERMIT_STATS.papUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {PERMIT_STATS.sourceName}
          </a>{" "}
          on {PERMIT_STATS.retrievedAt} — confirm current requirements with the
          department or your operator before you travel.
        </p>
      </main>
      <Footer />
    </>
  );
}
