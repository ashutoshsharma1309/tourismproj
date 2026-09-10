import type { PublishedConnection } from "@/data/published-knowledge";

/**
 * Threads a reader can follow.
 *
 * A subject that several approved facts speak about — a place, a dynasty, a
 * monastery. The relationships come from the claim graph, where an edge
 * exists only because two claims name the same subject, and every edge
 * records why. Nothing here is inferred from similarity, and nothing suggests
 * a connection the sources did not make.
 *
 * This is the difference between reading a database and discovering a place:
 * the facts are the same, but arriving at them through a subject you were
 * curious about is a different act from scrolling a list.
 */
export function StoryConnections({ connections }: { connections: PublishedConnection[] }) {
  if (connections.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-display text-h2">Follow a thread</h2>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Subjects that more than one verified fact speaks about. These threads
        exist because the sources drew them, not because anything inferred a
        resemblance.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {connections.map((connection) => (
          <article
            key={connection.subject}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <h3 className="font-display text-h4">{connection.subject}</h3>
            <p className="mt-1 text-caption text-subtle">
              {connection.statements.length} verified{" "}
              {connection.statements.length === 1 ? "fact" : "facts"}
            </p>
            <ul className="mt-3 space-y-2">
              {connection.statements.slice(0, 3).map((statement, i) => (
                <li key={i} className="text-body text-muted">
                  {statement.length > 150 ? `${statement.slice(0, 147)}…` : statement}
                </li>
              ))}
            </ul>
            {connection.statements.length > 3 ? (
              <p className="mt-2 text-caption text-subtle">
                and {connection.statements.length - 3} more below
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
