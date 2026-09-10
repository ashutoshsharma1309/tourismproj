/*
 * PHASE 15 — the global entry.
 *
 * The question this route asks is the one a traveller can actually answer
 * before they have chosen anywhere: not "which destination?" but "what do you
 * want to experience?". Everything it shows afterwards is derived — matched
 * destinations, the reason each one matched, and the evidence behind it.
 */
import { ArrowRight, Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { DepthBadge } from "@/components/ui/DepthBadge";
import { destinationLocationLine } from "@/lib/destinations/location";
import { destinationPath } from "@/lib/destinations/resolve";
import {
  allCoverage,
  destinationsWithTheme,
  globallyCoveredInterests,
  matchDestinations,
  THEMES,
  themeIndex,
} from "@/lib/global";
import { ALL_INTERESTS, INTEREST_LABEL } from "@/lib/planner/types";
import type { JourneyInterest } from "@/lib/planner/types";

export const metadata: Metadata = {
  title: "What do you want to experience?",
  description:
    "Choose what you want to experience and see which destinations have verified coverage of it — with the counts, the evidence and the gaps stated.",
  alternates: { canonical: "/discover" },
};

/** Query parsing. Everything is validated against a closed vocabulary. */
function parseInterests(value: string | string[] | undefined, offered: JourneyInterest[]): JourneyInterest[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const offeredSet = new Set(offered);
  return [
    ...new Set(
      values
        .filter((entry) => entry.length <= 200)
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim())
        .filter((entry): entry is JourneyInterest =>
          (ALL_INTERESTS as string[]).includes(entry) && offeredSet.has(entry as JourneyInterest),
        ),
    ),
  ];
}

function parseTheme(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw.length > 60) return null;
  return THEMES.some((theme) => theme.id === raw) ? raw : null;
}

export default async function GlobalDiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const coverage = await allCoverage();
  const offered = globallyCoveredInterests(coverage);
  const interests = parseInterests(params.interests, offered);
  const themeId = parseTheme(params.theme);
  const themes = themeIndex(coverage);

  const matches = matchDestinations(coverage, interests);
  const themeMatches = themeId ? destinationsWithTheme(themeId, coverage, themes) : [];
  const activeTheme = THEMES.find((theme) => theme.id === themeId) ?? null;

  /*
   * How many destinations can answer each interest. Counted from the same
   * coverage the results below are ordered by, so the number on a card and the
   * list it produces can never disagree.
   */
  const coverageByInterest = new Map<JourneyInterest, number>(
    offered.map((interest) => [
      interest,
      coverage.filter((entry) => entry.covered.includes(interest)).length,
    ]),
  );

  const registered = coverage.length;
  const withAnything = coverage.filter((entry) => !entry.empty).length;
  const awaiting = registered - withAnything;

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          TerraStory
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          What do you want to experience?
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
          Choose an interest and TerraStory shows which destinations have
          verified coverage of it, what that coverage consists of, and where it
          runs out. Nothing here is a recommendation of one place over another
          — it is a measurement of what has been catalogued and reviewed.
        </p>

        {/* Interest picker — a plain GET form, so the whole state is the URL. */}
        <form method="get" action="/discover" className="mt-8 rounded-xl border border-border bg-surface p-5 md:p-6">
          <fieldset className="min-w-0">
            <legend className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              Interests
            </legend>
            <p className="mt-2 text-caption text-muted">
              {offered.length} of the {ALL_INTERESTS.length} interests this system knows about are
              represented somewhere in the registry. The rest are not offered,
              because no destination could answer them.
            </p>
            {/*
              SELECTABLE CARDS, NOT A ROW OF CHECKBOXES.
              This was ten small pill-shaped checkboxes in a bordered box —
              functional, and indistinguishable from a settings form on the
              page that is supposed to be the product's main way in. Each
              interest is now a card carrying the thing a visitor actually
              wants before choosing: how many destinations can answer it.

              It is STILL a plain GET form with real checkbox inputs, so the
              whole state is the URL, it works without JavaScript, and the
              selection is keyboard-operable and announced. The checkbox is
              visually hidden and the card reflects its state through
              `peer-checked`, which is styling, not a re-implementation.
            */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {offered.map((interest) => (
                <label
                  key={interest}
                  className="group cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    defaultChecked={interests.includes(interest)}
                    className="peer sr-only"
                  />
                  <span className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-primary peer-checked:border-primary peer-checked:bg-primary/8 peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                    <span className="text-small font-medium">
                      {INTEREST_LABEL[interest]}
                    </span>
                    <span className="mt-2 text-caption text-subtle" data-numeric>
                      {coverageByInterest.get(interest) ?? 0} destinations
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="focus-visible:ring-primary rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
            >
              Show destinations
            </button>
            <a
              href="/discover"
              className="focus-visible:ring-primary rounded-full px-3 py-2 text-small font-medium text-muted hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
            >
              Clear
            </a>
          </div>
        </form>

        {/*
          Coverage is not quality. This is stated where the ranking is, not
          buried in a footnote: the order below is how much this archive holds,
          and nothing else.
        */}
        <section className="mt-10" aria-labelledby="matches-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 id="matches-heading" className="font-display text-h2 text-balance-heading">
              {interests.length === 0
                ? "Destinations with verified coverage"
                : `Destinations covering ${interests.map((i) => INTEREST_LABEL[i]).join(" + ")}`}
            </h2>
            <p className="text-caption text-muted">
              {matches.length} of {registered} registered
            </p>
          </div>
          <p className="mt-2 max-w-prose text-body text-muted">
            Ordered by how much verified material this archive holds on what you
            selected — <strong className="font-medium text-foreground">coverage, not quality</strong>.
            A destination lower down is not a lesser place; it is one this
            archive has covered less.
          </p>

          <ol className="mt-6 space-y-4">
            {matches.map((match) => {
              const { destination } = match.coverage;
              return (
                <li key={destination.id}>
                  <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-h3 text-balance-heading">
                          <Link
                            href={destinationPath(destination.id)}
                            prefetch={false}
                            className="hover:text-primary"
                          >
                            {destination.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-caption text-muted">
                          {destinationLocationLine(
                            destination.name,
                            destination.region?.name,
                            destination.country.name,
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <DepthBadge depth={match.coverage.depth} />
                        <span className="font-mono text-caption text-subtle" data-numeric>
                          coverage {match.score}/100
                        </span>
                      </div>
                    </div>

                    {/* Why it matched — one line per interest, each countable. */}
                    <ul className="mt-4 space-y-1.5">
                      {match.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2 text-body leading-relaxed text-muted">
                          <span aria-hidden className="text-primary">
                            ·
                          </span>
                          <span className="min-w-0">{reason}</span>
                        </li>
                      ))}
                    </ul>

                    {match.coverage.knowledgeOnly ? (
                      <p className="mt-4 rounded-lg border border-warning/40 bg-warning-soft/40 p-3 text-caption leading-relaxed">
                        Historical knowledge available. Tourism experience layer
                        not yet available — {destination.name} has{" "}
                        {match.coverage.totals.claims} reviewer-approved claims but no
                        catalogued site or place record, so no itinerary can be
                        built for it yet.
                      </p>
                    ) : null}

                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-caption">
                      <div className="flex gap-1.5">
                        <dt className="text-subtle">Catalogued records</dt>
                        <dd className="font-medium" data-numeric>
                          {match.coverage.totals.experiences > 0
                            ? match.coverage.totals.experiences
                            : "Not yet available"}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-subtle">Approved claims</dt>
                        <dd className="font-medium" data-numeric>
                          {match.coverage.totals.claims > 0
                            ? match.coverage.totals.claims
                            : "Not yet available"}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-subtle">Sources</dt>
                        <dd className="font-medium" data-numeric>
                          {match.coverage.totals.sources > 0
                            ? match.coverage.totals.sources
                            : "Not yet available"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Link
                        href={destinationPath(destination.id)}
                        prefetch={false}
                        className="focus-visible:ring-primary inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-caption font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Explore {destination.name}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                      {match.coverage.totals.experiences > 0 ? (
                        <Link
                          href={destinationPath(destination.id, "plan")}
                          prefetch={false}
                          className="focus-visible:ring-primary inline-flex items-center rounded-full border border-border px-4 py-2 text-caption font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Plan a journey
                        </Link>
                      ) : null}
                      <Link
                        href={`/destinations/compare?ids=${destination.id}`}
                        prefetch={false}
                        className="focus-visible:ring-primary inline-flex items-center rounded-full border border-border px-4 py-2 text-caption font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Compare
                      </Link>
                    </div>

                    {/* The arithmetic, open to inspection. */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-caption font-medium text-primary">
                        How this coverage figure was calculated
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {match.components.map((component) => (
                          <li key={component.label} className="text-caption text-muted">
                            <span className="font-medium text-foreground">
                              {component.label} {component.points}/{component.max}
                            </span>{" "}
                            — {component.detail}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                </li>
              );
            })}
          </ol>

          {matches.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed p-6 text-body text-muted">
              No registered destination has verified coverage of that
              combination. Nothing is shown rather than something approximate.
            </p>
          ) : null}

          {awaiting > 0 ? (
            <p className="mt-6 text-caption text-subtle">
              {awaiting} further {awaiting === 1 ? "destination is" : "destinations are"}{" "}
              registered with no verified content at all, and are not listed
              above. Their pages say so.
            </p>
          ) : null}
        </section>

        {/* Experience → destination: start from a theme, find the places. */}
        <section className="mt-14" aria-labelledby="themes-heading">
          <h2 id="themes-heading" className="flex items-center gap-2 font-display text-h2">
            <Compass className="size-5 text-primary" aria-hidden />
            Or start from a theme
          </h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            A theme is a list of terms, and a destination carries it when those
            terms appear in a reviewer-approved claim or in a catalogued
            record&apos;s own title and type. Every match below can be opened and
            read.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((theme) => {
              const carriers = destinationsWithTheme(theme.id, coverage, themes);
              if (carriers.length === 0) return null;
              return (
                <li key={theme.id}>
                  <Link
                    href={`/discover?theme=${theme.id}`}
                    prefetch={false}
                    aria-current={themeId === theme.id ? "true" : undefined}
                    className={`focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                      themeId === theme.id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {theme.label}
                    <span className="text-caption text-subtle">
                      {carriers.length} {carriers.length === 1 ? "destination" : "destinations"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {activeTheme ? (
            <div className="mt-6 rounded-xl border border-border bg-surface p-5 md:p-6">
              <h3 className="font-display text-h3">{activeTheme.label}</h3>
              <p className="mt-1 text-body text-muted">{activeTheme.description}</p>
              <p className="mt-2 font-mono text-caption text-subtle">
                Terms matched: {activeTheme.terms.join(", ")}
              </p>
              <ul className="mt-5 space-y-5">
                {themeMatches.map(({ coverage: entry, presence }) => (
                  <li key={entry.destination.id} className="border-t border-border pt-5 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-display text-h4">
                        <Link
                          href={destinationPath(entry.destination.id)}
                          prefetch={false}
                          className="hover:text-primary"
                        >
                          {entry.destination.name}
                        </Link>
                      </h4>
                      <DepthBadge depth={entry.depth} />
                      <Badge tone="neutral">
                        {presence.records > 0
                          ? `${presence.records} ${presence.records === 1 ? "record" : "records"}`
                          : "no record"}
                        {presence.claims > 0 ? ` · ${presence.claims} claims` : ""}
                      </Badge>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {presence.evidence.map((item) => (
                        <li key={`${item.kind}:${item.text}`} className="text-caption leading-relaxed text-muted">
                          <span className="font-mono text-subtle">[{item.term}]</span>{" "}
                          {item.href ? (
                            <Link href={item.href} prefetch={false} className="text-primary hover:underline">
                              {item.text}
                            </Link>
                          ) : (
                            <span>&ldquo;{item.text}&rdquo;</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="mt-14 rounded-xl border border-border bg-surface-muted/60 p-5 md:p-6">
          <h2 className="font-display text-h3">Where the knowledge runs out</h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            {withAnything} of {registered} registered destinations carry verified
            content today: {coverage.filter((e) => e.totals.experiences > 0).length} with a tourism
            experience layer, {coverage.filter((e) => e.knowledgeOnly).length} with approved
            historical knowledge and no experience layer yet, and {awaiting} with
            neither. Publishing that split is the point — a system that always
            has an answer is a system that invents them.
          </p>
          <Link
            href="/destinations"
            prefetch={false}
            className="mt-4 inline-block font-medium text-primary hover:underline"
          >
            Browse all {registered} destinations
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
