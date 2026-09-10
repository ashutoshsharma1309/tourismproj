import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { allHistory, hrefFor } from "@/lib/global-index";
import { SITE } from "@/lib/constants";

/**
 * One timeline, every destination, oldest first.
 *
 * WHY IT IS ONE LIST AND NOT FIFTEEN
 * ----------------------------------
 * Grouping by destination would have produced fifteen short chronologies and
 * hidden the only thing this page can show that a destination page cannot:
 * that the Roman republic, the founding of Kyoto and the Brooklyn Bridge are
 * entries in the same archive. Sorting across destinations is the argument.
 *
 * Eras are derived from the sorted years rather than declared, so a record
 * added later lands in the right band without anybody editing a constant.
 */
export const metadata: Metadata = {
  title: `History · ${SITE.name}`,
  description:
    "A single chronology across fifteen destinations, every dated event traced to a named source.",
};

/** Era bands. Wide on purpose: they orient a reader, they do not classify. */
const ERAS: { label: string; until: number }[] = [
  { label: "Antiquity", until: 500 },
  { label: "Early medieval", until: 1100 },
  { label: "Medieval", until: 1500 },
  { label: "Early modern", until: 1800 },
  { label: "Nineteenth century", until: 1900 },
  { label: "Modern", until: 10_000 },
];

const eraOf = (year: number) => ERAS.find((era) => year < era.until)!.label;

export default async function HistoryPage() {
  const events = await allHistory();
  const countries = new Set(events.map((entry) => entry.destination.country.name));

  /* Walk the sorted list once, opening a new band when the era changes. */
  const bands: { era: string; entries: typeof events }[] = [];
  for (const entry of events) {
    const era = eraOf(entry.year);
    const last = bands[bands.length - 1];
    if (last && last.era === era) last.entries.push(entry);
    else bands.push({ era, entries: [entry] });
  }

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-6 pt-28 pb-20">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Heritage across time
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          {events[0]?.record.yearLabel} to {events[events.length - 1]?.record.yearLabel}
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          {events.length} dated events across {countries.size} countries, in one
          chronology. Every one is traced to a named source, and where the
          evidence jumps, the gap is left as a gap.
        </p>

        {bands.map((band) => (
          <section key={`${band.era}-${band.entries[0]!.record.slug}`} className="mt-12">
            <h2 className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              {band.era}
            </h2>
            <ol className="mt-4">
              {band.entries.map(({ destination, record }) => (
                <li
                  key={`${destination.id}-${record.slug}`}
                  className="grid gap-x-6 gap-y-1 border-t border-border py-5 sm:grid-cols-[9rem_1fr]"
                >
                  <p className="font-mono text-eyebrow tracking-widest text-primary uppercase" data-numeric>
                    {record.yearLabel}
                  </p>
                  <div>
                    <Link
                      href={hrefFor(record, destination.id, "history")}
                      className="font-display text-h4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {record.title}
                    </Link>
                    <p className="mt-1 text-caption text-subtle">
                      <Link
                        href={`/destinations/${destination.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {destination.name}
                      </Link>{" "}
                      · {destination.country.name}
                    </p>
                    <p className="mt-2 max-w-2xl text-body leading-relaxed text-muted">
                      {record.shortDescription}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
