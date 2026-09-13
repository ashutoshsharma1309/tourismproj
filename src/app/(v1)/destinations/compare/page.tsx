/*
 * PHASE 15 — destination comparison.
 *
 * Side by side, counts only. The hardest rule in this file is what it must
 * NOT say: no "better", no "richer", no "more beautiful", and never a zero
 * where the truth is "nobody has catalogued this yet".
 */
import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { DepthBadge } from "@/components/ui/DepthBadge";
import { destinationPath } from "@/lib/destinations/resolve";
import { allCoverage } from "@/lib/global";
import type { DestinationCoverage } from "@/lib/global";
import type { InterestCoverage } from "@/lib/global/coverage";
import { INTEREST_LABEL } from "@/lib/planner/types";
import type { JourneyInterest } from "@/lib/planner/types";

export const metadata: Metadata = {
  title: "Compare destinations",
  description:
    "Compare what has actually been catalogued and reviewed for each destination — records, approved claims, timeline entries and research depth. Coverage, not ranking.",
  alternates: { canonical: "/destinations/compare" },
};

/** Ids from the query, validated against the registry. Two to four columns. */
function parseIds(value: string | string[] | undefined, known: Set<string>): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [
    ...new Set(
      values
        .filter((entry) => entry.length <= 200)
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim())
        .filter((entry) => known.has(entry)),
    ),
  ].slice(0, 4);
}

/**
 * A comparison row.
 *
 * `value` returns a number, or null for "this dataset does not exist here".
 * The distinction is the whole point: 0 would claim Kyoto has no heritage,
 * when what is true is that nobody has catalogued Kyoto's heritage records.
 */
interface Row {
  label: string;
  hint: string;
  value: (coverage: DestinationCoverage) => number | null;
}

const INTEREST_ROWS: JourneyInterest[] = ["history", "heritage", "culture", "nature", "architecture", "sacred"];

const ROWS: Row[] = [
  {
    label: "Catalogued records you can visit",
    hint: "Place records with sources",
    value: (c) => (c.totals.experiences > 0 ? c.totals.experiences : null),
  },
  {
    label: "Records with published coordinates",
    hint: "The subset that can be plotted or measured",
    value: (c) => (c.totals.experiences > 0 ? c.totals.mapped : null),
  },
  {
    label: "Links to dated historical events",
    hint: "Edges authored on the events themselves",
    value: (c) => (c.totals.experiences > 0 ? c.totals.historyLinks : null),
  },
  {
    label: "Links to archive stories",
    hint: "Edges authored on the stories themselves",
    value: (c) => (c.totals.experiences > 0 ? c.totals.storyLinks : null),
  },
  {
    label: "Reviewer-approved claims",
    hint: "Passed the seven-condition approval gate",
    value: (c) => (c.totals.claims > 0 ? c.totals.claims : null),
  },
  {
    label: "Timeline entries",
    hint: "Approved claims carrying a date",
    value: (c) => (c.totals.timeline > 0 ? c.totals.timeline : null),
  },
  {
    label: "Distinct sources behind the knowledge",
    hint: "Named publications, not counts of citations",
    value: (c) => (c.totals.sources > 0 ? c.totals.sources : null),
  },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const coverage = await allCoverage();
  const known = new Set(coverage.map((entry) => entry.destination.id));
  const params = await searchParams;

  const requested = parseIds(params.ids, known);
  /*
   * Default to the destinations that actually have something to compare.
   * Defaulting to the whole registry would fill the table with twelve columns
   * of "Not yet available", which is honest and useless.
   */
  const withContent = coverage.filter((entry) => !entry.empty).map((entry) => entry.destination.id);
  const ids = requested.length >= 2 ? requested : withContent.slice(0, 3);
  const columns = ids
    .map((id) => coverage.find((entry) => entry.destination.id === id))
    .filter((entry): entry is DestinationCoverage => entry !== undefined);

  const comparable = coverage.filter((entry) => !entry.empty);

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          <Link href="/destinations" prefetch={false} className="hover:underline">
            Destinations
          </Link>{" "}
          · Compare
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Which destination fits you better?
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
          Pick two or three destinations and see what each offers for history,
          heritage, culture, nature, architecture and religious heritage.
          Counts show how much has been documented, not which place is better.
        </p>

        {/* Column picker. A GET form, so a comparison is a shareable URL. */}
        <form method="get" action="/destinations/compare" className="mt-8 rounded-xl border border-border bg-surface p-5">
          <fieldset className="min-w-0">
            <legend className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              Choose destinations
            </legend>
            <p className="mt-2 text-caption text-muted">
              Tick two or three.
              {coverage.length - comparable.length > 0
                ? ` ${coverage.length - comparable.length} ${coverage.length - comparable.length === 1 ? "destination is" : "destinations are"} still being catalogued and cannot be compared yet.`
                : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {comparable.map((entry) => (
                <label
                  key={entry.destination.id}
                  className="focus-within:ring-primary flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-small font-medium transition-colors hover:border-primary focus-within:ring-2"
                >
                  <input
                    type="checkbox"
                    name="ids"
                    value={entry.destination.id}
                    defaultChecked={ids.includes(entry.destination.id)}
                    className="accent-primary size-4"
                  />
                  {entry.destination.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="focus-visible:ring-primary mt-5 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            Compare
          </button>
        </form>

        {/*
          STRONGEST FOR — the one-glance answer the table below makes you
          work for. For each interest, the compared destination holding the
          MOST catalogued records that carry it. This is a count, stated as a
          count: "23 records", never "Excellent". A rating would be an
          opinion nobody sourced; a count is something a reader can check in
          the row beneath. Ties are said to be ties, and an interest no
          compared destination covers is left out rather than awarded.
        */}
        {columns.length >= 2
          ? (() => {
              const leaders = INTEREST_ROWS.flatMap((interest) => {
                const ranked = columns
                  .map((entry) => ({
                    entry,
                    row: entry.interests.find((item) => item.interest === interest),
                  }))
                  .filter((c): c is { entry: DestinationCoverage; row: InterestCoverage } =>
                    Boolean(c.row && c.row.covered && c.row.experiences > 0),
                  )
                  .sort((a, b) => b.row.experiences - a.row.experiences);
                if (ranked.length === 0) return [];
                const top = ranked[0]!.row.experiences;
                const tied = ranked.filter((c) => c.row.experiences === top);
                return [{ interest, tied, top, alone: tied.length === 1 && ranked.length > 1 }];
              });
              if (leaders.length === 0) return null;
              return (
                <section className="mt-10" aria-labelledby="strongest-for">
                  <h2 id="strongest-for" className="font-display text-h3 text-balance-heading">
                    Where each one is strongest
                  </h2>
                  <p className="mt-1 max-w-2xl text-caption text-muted">
                    For each interest, the destination with the most documented places for it.
                    Counted, not rated — every figure is in the table below.
                  </p>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {leaders.map(({ interest, tied, top, alone }) => (
                      <div key={interest} className="flex flex-col border-l-2 border-border ps-3">
                        <dt className="text-caption text-subtle">{INTEREST_LABEL[interest]}</dt>
                        <dd className="mt-0.5 text-small">
                          <span className="font-medium">
                            {tied.map((c) => c.entry.destination.name).join(" · ")}
                          </span>
                          <span className="text-muted" data-numeric>
                            {" "}
                            — {top} {top === 1 ? "record" : "records"}
                            {alone ? "" : tied.length > 1 ? ", tied" : ""}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {/*
                    WHY EACH MAY SUIT YOU — derived from the same leaders, so it
                    is explainable by construction: a destination is named for
                    exactly the interests where it holds the most documented
                    places among those compared, with the counts.
                  */}
                  <h3 className="mt-8 font-display text-h4">Why each may suit you</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {columns.map((entry) => {
                      const leads = leaders.filter(({ tied }) =>
                        tied.some((c) => c.entry.destination.id === entry.destination.id),
                      );
                      return (
                        <li key={entry.destination.id} className="rounded-xl border border-border bg-surface p-4">
                          <p className="font-medium">{entry.destination.name}</p>
                          <p className="mt-1 text-caption leading-relaxed text-muted">
                            {leads.length > 0
                              ? `Strongest for ${leads.map(({ interest, top, tied }) => `${INTEREST_LABEL[interest].toLowerCase()} (${top} ${top === 1 ? "place" : "places"}${tied.length > 1 ? ", tied" : ""})`).join(", ")}.`
                              : `Documented for the same interests, with fewer places for each than the others here — a smaller archive, not a lesser place.`}
                          </p>
                          <Link
                            href={`/destinations/${entry.destination.id}`}
                            className="mt-3 inline-flex min-h-11 items-center text-small font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            Explore {entry.destination.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })()
          : null}

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-small">
            <caption className="sr-only">
              Catalogued coverage by destination. Values are counts of records in
              this archive; &ldquo;Not yet available&rdquo; means the dataset does not
              exist for that destination.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-3 pr-4 text-caption font-medium text-subtle">
                  Dimension
                </th>
                {columns.map((entry) => (
                  <th key={entry.destination.id} scope="col" className="py-3 pr-4">
                    <Link
                      href={destinationPath(entry.destination.id)}
                      prefetch={false}
                      className="font-display text-h4 hover:text-primary"
                    >
                      {entry.destination.name}
                    </Link>
                    <span className="mt-1 block text-caption font-normal text-subtle">
                      {entry.destination.country.name}
                    </span>
                    <span className="mt-2 block">
                      <DepthBadge depth={entry.depth} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-3 pr-4 font-medium">
                    {row.label}
                    <span className="mt-0.5 block text-caption font-normal text-subtle">{row.hint}</span>
                  </th>
                  {columns.map((entry) => {
                    const value = row.value(entry);
                    return (
                      <td key={entry.destination.id} className="py-3 pr-4">
                        {value === null ? (
                          <span className="text-caption text-subtle">Not yet available</span>
                        ) : (
                          <span className="font-medium" data-numeric>
                            {value.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Per-interest coverage: records and claims kept separate. */}
              {INTEREST_ROWS.map((interest) => (
                <tr key={interest} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-3 pr-4 font-medium">
                    {INTEREST_LABEL[interest]} coverage
                    <span className="mt-0.5 block text-caption font-normal text-subtle">
                      Records carrying it · approved claims evidencing it
                    </span>
                  </th>
                  {columns.map((entry) => {
                    const row = entry.interests.find((item) => item.interest === interest);
                    if (!row || !row.covered) {
                      return (
                        <td key={entry.destination.id} className="py-3 pr-4">
                          <span className="text-caption text-subtle">Not yet available</span>
                        </td>
                      );
                    }
                    return (
                      <td key={entry.destination.id} className="py-3 pr-4">
                        <span className="font-medium" data-numeric>
                          {row.experiences > 0 ? `${row.experiences} records` : "no records"}
                        </span>
                        <span className="mt-0.5 block text-caption text-muted" data-numeric>
                          {row.claims > 0 ? `${row.claims} approved claims` : "no approved claims"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="align-top">
                <th scope="row" className="py-3 pr-4 font-medium">
                  Tourism experience layer
                </th>
                {columns.map((entry) => (
                  <td key={entry.destination.id} className="py-3 pr-4 text-caption">
                    {entry.totals.experiences > 0 ? (
                      <Link
                        href={destinationPath(entry.destination.id, "plan")}
                        prefetch={false}
                        className="font-medium text-primary hover:underline"
                      >
                        Available — plan a journey
                      </Link>
                    ) : entry.knowledgeOnly ? (
                      <span className="text-muted">
                        Not yet available — historical knowledge only
                      </span>
                    ) : (
                      <span className="text-subtle">Not yet available</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-prose text-caption text-subtle">
          Counts come from the same records the destination pages render:
          catalogued place records, the authored edges on history
          events and stories, and the reviewer-approved claim set published by{" "}
          <code className="font-mono">npm run publish:knowledge</code>. Nothing on
          this page is estimated.
        </p>
      </main>
      <Footer />
    </>
  );
}
