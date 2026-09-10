import { getCapsule } from "@/lib/destinations/content";

/**
 * A capsule's history, cultural notes and citations.
 *
 * WHY THIS LIVES ON THE DISCOVERY PAGE
 * ------------------------------------
 * Because a capsule entry does not deserve a page of its own. Sikkim's
 * history pages carry description paragraphs, key facts, a verification note,
 * related monasteries and a source list; a capsule's historical fact is one
 * retrieved sentence with a citation. Giving that its own route would produce
 * a page with a heading and a line on it, and eight destinations' worth of
 * them — which is how a product starts feeling broken.
 *
 * So the whole capsule renders in one place, anchored. `capsulePlaces()`,
 * `capsuleHistory()` and `capsuleStories()` point their records at these
 * anchors, which is why nothing in discovery or the planner links to a route
 * that does not exist.
 *
 * Every entry shows its source. That is not decoration: these sentences were
 * retrieved, not written, and the citation is the reason a reader can believe
 * them.
 */
export async function CapsuleContent({ destinationId }: { destinationId: string }) {
  const capsule = await getCapsule(destinationId);
  if (!capsule) return null;

  const sourceById = new Map(capsule.sources.map((source) => [source.id, source]));
  const cite = (sourceIds: string[]) =>
    sourceIds
      .map((id) => sourceById.get(id))
      .filter((source): source is NonNullable<typeof source> => source !== undefined);

  return (
    <>
      {capsule.history.length > 0 ? (
        <section className="mt-14" aria-labelledby="capsule-history">
          <h2 id="capsule-history" className="font-display text-h2 text-balance-heading">
            Historical highlights
          </h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            {capsule.history.length} dated facts, each one a sentence quoted from
            the source named beneath it. This is not a complete history of{" "}
            {capsule.scope.toLowerCase()} — it is what this capsule can show you
            with a citation.
          </p>
          <ol className="mt-6 space-y-5">
            {capsule.history.map((entry) => (
              <li
                key={entry.id}
                id={`history-${entry.id}`}
                className="scroll-mt-24 border-t border-border pt-5 first:border-0 first:pt-0"
              >
                <p className="font-mono text-eyebrow tracking-widest text-primary uppercase" data-numeric>
                  {entry.period}
                </p>
                <h3 className="mt-1 font-display text-h4">{entry.title}</h3>
                <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">
                  &ldquo;{entry.summary}&rdquo;
                </p>
                <p className="mt-2 text-caption text-subtle">
                  {cite(entry.sourceIds).map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {source.publisher}: {source.title}
                    </a>
                  ))}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {capsule.stories.length > 0 ? (
        <section className="mt-14" aria-labelledby="capsule-stories">
          <h2 id="capsule-stories" className="font-display text-h2 text-balance-heading">
            Cultural notes
          </h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            Descriptions of practice and construction, quoted from the same
            sources. Each carries its claim type, so a documented account is
            never mistaken for an oral tradition.
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {capsule.stories.map((story) => (
              <li
                key={story.id}
                id={`story-${story.id}`}
                className="scroll-mt-24 rounded-xl border border-border bg-surface p-5"
              >
                <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                  {story.claimType}
                </p>
                <h3 className="mt-2 font-display text-h4">{story.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-muted">
                  &ldquo;{story.summary}&rdquo;
                </p>
                <p className="mt-3 text-caption text-subtle">
                  {cite(story.sourceIds).map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {source.publisher}: {source.title}
                    </a>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 rounded-xl border border-border bg-surface-muted/60 p-5 md:p-6">
        <h2 className="font-display text-h3">Where this comes from</h2>
        <p className="mt-2 max-w-prose text-body text-muted">
          Every sentence on this page was retrieved from one of the{" "}
          {capsule.sources.length} sources below on {capsule.reviewedAt} and is
          quoted rather than rewritten. Nothing here states an opening time, a
          price or an availability, because no source was consulted for those.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {capsule.sources.map((source) => (
            <li key={source.id} className="text-caption text-muted">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {source.title}
              </a>{" "}
              — {source.publisher}, retrieved {source.retrievedAt} ({source.retrievalMethod},
              confidence {source.confidence})
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
