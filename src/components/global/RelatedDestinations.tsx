import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { destinationPath } from "@/lib/destinations/resolve";
import { allCoverage, connectionsFrom, themeIndex } from "@/lib/global";

/**
 * "Where else does this archive hold the same kind of material?"
 *
 * The point of this block is to stop a destination being a cul-de-sac. A
 * visitor reading about Sikkim's monasteries should be able to find that
 * Kyoto's approved claims speak about temples too, see what was matched and
 * how much of it there is, and follow one link to the sentences themselves.
 *
 * The evidence is LINKED rather than quoted here — see the note below the
 * reason line. Destination isolation outranks the convenience of an inline
 * quotation.
 *
 * Every edge here comes from `lib/global/connections.ts`: a shared theme
 * evidenced by claims and records, or shared interest coverage. Nothing is a
 * similarity score, and the block renders nothing at all when no edge exists,
 * rather than reaching for a weaker rule to fill the space.
 *
 * Server component; the graph is computed at build time.
 */
export async function RelatedDestinations({ destinationId }: { destinationId: string }) {
  const coverage = await allCoverage();
  const subject = coverage.find((entry) => entry.destination.id === destinationId);
  if (!subject) return null;

  const connections = connectionsFrom(subject, coverage, themeIndex(coverage), 4);
  if (connections.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="related-destinations">
      <h2 id="related-destinations" className="font-display text-h3">
        Destinations with related material
      </h2>
      <p className="mt-2 max-w-prose text-body text-muted">
        Not places that resemble {subject.destination.name} — places this
        archive holds the same kind of verified material about. Each row states
        what was matched and how much stands behind it on each side; the
        evidence itself is one link away.
      </p>

      <ul className="mt-4 space-y-3">
        {connections.map((connection) => (
          <li key={`${connection.otherId}:${connection.subject}`}>
            <article className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-h4">
                    <Link
                      href={destinationPath(connection.otherId)}
                      prefetch={false}
                      className="hover:text-primary"
                    >
                      {connection.otherName}
                    </Link>
                  </h3>
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-medium text-primary">
                    {connection.subjectLabel}
                  </span>
                </div>
                <Link
                  href={`/destinations/compare?ids=${destinationId},${connection.otherId}`}
                  prefetch={false}
                  className="focus-visible:ring-primary inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-caption font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
                >
                  Compare
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>

              <p className="mt-2 text-caption leading-relaxed text-muted">{connection.reason}</p>

              {/*
                The evidence is LINKED, not copied.

                Quoting Kyoto's approved claims onto Sikkim's page would put
                another destination's content inside this one's document — the
                exact isolation the architecture has guaranteed since Phase 2.5,
                and a guarantee worth more than the convenience of an inline
                quote. The global theme view carries the evidence for every
                destination at once, which is where a cross-destination
                question belongs.
              */}
              {connection.kind === "shared-theme" ? (
                <p className="mt-2 text-caption">
                  <Link
                    href={`/discover?theme=${connection.subject}`}
                    prefetch={false}
                    className="font-medium text-primary hover:underline"
                  >
                    See the evidence on both sides
                  </Link>
                </p>
              ) : null}
            </article>
          </li>
        ))}
      </ul>

      <p className="mt-4">
        <Link href="/discover" prefetch={false} className="font-medium text-primary hover:underline">
          Start from an interest instead
        </Link>
      </p>
    </section>
  );
}
