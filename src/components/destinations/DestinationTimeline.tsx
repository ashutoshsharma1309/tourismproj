import type { PublishedTimelineEntry } from "@/data/published-knowledge";

/**
 * The historical spine of a destination.
 *
 * Built only from approved facts that carry a date. Nothing is interpolated
 * between them, so the gaps are real: a century with no sourced fact shows as
 * a jump, which is more honest than a smooth line that implies continuous
 * knowledge. The existing archive already works this way — /preservation
 * publishes what is missing rather than hiding it.
 *
 * Each entry carries its own attribution, because a timeline is exactly where
 * a reader is most likely to want to check a date.
 */
export function DestinationTimeline({ entries }: { entries: PublishedTimelineEntry[] }) {
  const first = entries[0];
  const last = entries[entries.length - 1];
  if (!first || !last) return null;

  return (
    <section className="mt-14">
      <h2 className="font-display text-h2">The story so far</h2>
      <p className="mt-2 max-w-2xl text-body text-muted">
        {entries.length} dated {entries.length === 1 ? "moment" : "moments"} between{" "}
        {first.year} and {last.year === first.year ? "the same year" : last.year}, each traced
        to a named source. Where a century is missing, nothing was found — the gap is real.
      </p>

      <ol className="mt-8 border-l border-border">
        {entries.map((entry) => (
          <li key={entry.claimId} className="relative pb-8 pl-6 last:pb-0">
            {/* The marker sits on the spine rather than beside it. */}
            <span
              aria-hidden
              className="absolute -left-[5px] top-[7px] size-[9px] rounded-full bg-primary"
            />
            <p className="font-mono text-caption tracking-wide text-primary">
              {entry.year}
              {entry.endYear && entry.endYear !== entry.year ? `–${entry.endYear}` : ""}
            </p>
            <p className="mt-1 text-body">{entry.title}</p>
            {entry.sources.length > 0 ? (
              <p className="mt-1 text-caption text-subtle">
                {entry.sources.map((s, i) => (
                  <span key={s.url ?? i}>
                    {i > 0 ? " · " : ""}
                    {s.url ? (
                      <a
                        href={s.url}
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                        className="hover:text-primary hover:underline"
                      >
                        {s.publisher ?? s.title}
                      </a>
                    ) : (
                      (s.publisher ?? s.title)
                    )}
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
