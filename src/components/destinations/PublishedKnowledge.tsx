import { Badge } from "@/components/ui/Badge";
import { CATEGORY_LABEL } from "@/data/published-knowledge";
import type { PublishedDestination } from "@/data/published-knowledge";

/**
 * Renders reviewer-approved research knowledge on a destination page.
 *
 * TWO THINGS THIS COMPONENT IS CAREFUL ABOUT
 * ------------------------------------------
 * 1. It must not make a researched destination look like Sikkim. The same
 *    component renders both, so the honesty has to come from what it says:
 *    the depth is stated, the basis for that depth is stated, and where a
 *    destination fell short of the next tier the reasons are shown rather
 *    than hidden behind a label.
 *
 * 2. Attribution without clutter. Citing every sentence inline would make
 *    the page unreadable; citing nothing would make it unverifiable. Each
 *    fact names its source, the full list sits once at the end, and the
 *    verbatim span stays reachable via `title` for anyone checking a claim.
 */

const CLAIM_TONE = {
  "documented history": "jade",
  "oral tradition": "marigold-soft",
  legend: "marigold-soft",
  "travel story": "neutral",
} as const;

const DEPTH_COPY: Record<string, string> = {
  deep: "A human-curated archive with sourced records, credited media and narrated guides.",
  curated:
    "Researched from official and reference sources, then reviewed and approved. Narrower than a curated archive.",
  researched: "Assembled from public sources and reviewed. Coverage is partial.",
  planned: "No researched content yet.",
};

export function PublishedKnowledge({ knowledge }: { knowledge: PublishedDestination }) {
  const { depth, categories, narrative, sourcesUsed } = knowledge;
  /* The overview block opens the page; the rest become named sections. */
  const intro = narrative.find((b) => b.mode === "DESTINATION_OVERVIEW") ?? narrative[0] ?? null;
  const otherNarrative = narrative.filter((b) => b.id !== intro?.id);

  return (
    <section id="evidence" className="mt-12">
      <h2 className="font-display text-h2">Researched knowledge</h2>

      {/*
        The honesty panel. Every destination gets one, including Sikkim —
        whose depth is declared rather than earned, and which this says out
        loud rather than letting a badge imply the research produced it.
      */}
      <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-body">{DEPTH_COPY[depth.depth] ?? DEPTH_COPY.researched}</p>
        <p className="mt-2 text-caption text-muted">
          {depth.basis === "declared"
            ? `Depth declared from curated content. On research evidence alone this destination would rank "${depth.earned}".`
            : `Depth earned from evidence: ${depth.metrics.approvedClaims} approved facts across ${depth.metrics.categories} topics, ${depth.metrics.higherTierClaims} from official or academic sources, ${depth.metrics.distinctSources} distinct sources.`}
        </p>
        {depth.basis === "earned" && depth.depth !== "curated" && depth.reasons.length > 0 ? (
          <p className="mt-1 text-caption text-muted">
            Short of the next level: {depth.reasons.join("; ")}.
          </p>
        ) : null}
      </div>

      {intro ? (
        <div className="mt-8">
          {/*
            The introduction leads, because a visitor arriving at a place
            wants to be told about it before being shown a catalogue. It is
            still composed only from approved facts, and every sentence was
            checked before it got here.
          */}
          <p className="max-w-2xl text-body-lg leading-relaxed">{intro.text}</p>
          <p className="mt-2 text-caption text-subtle">
            Composed from {intro.claimIds.length} verified{" "}
            {intro.claimIds.length === 1 ? "fact" : "facts"}. Unsupported sentences are
            discarded, not published.
          </p>
        </div>
      ) : null}

      {otherNarrative.length > 0 ? (
        <div className="mt-10 space-y-8">
          {otherNarrative.map((block) => (
            <div key={block.id}>
              <h3 className="font-display text-h3">
                {CATEGORY_LABEL[block.category] ?? block.category}
              </h3>
              {block.claimType !== "documented history" ? (
                <p className="mt-1">
                  <Badge tone={CLAIM_TONE[block.claimType] ?? "neutral"}>{block.claimType}</Badge>
                </p>
              ) : null}
              <p className="mt-2 max-w-2xl text-body leading-relaxed">{block.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/*
        * PHASE 20 FOLDED THIS AWAY, AND KEPT EVERY WORD OF IT.
        *
        * These lists are the evidence the prose above is built from, and they
        * were rendered open. Jaipur's hub ran to 9,900 pixels and 191 KB —
        * larger than Sikkim's, for a destination with no places — because a
        * visitor arriving to find out what there is to see met thirty-five
        * research claims with citations first. That is a bibliography wall,
        * which is precisely what a provenance-led product must not put between
        * a visitor and the destination.
        *
        * `<details>` is the whole mechanism: no client JavaScript, no state,
        * works with the keyboard and is announced by screen readers as a
        * disclosure. Nothing is hidden from anyone — the summary says how many
        * claims are inside and one click or Enter opens them, which is the
        * progressive disclosure the brief asks for rather than the deletion it
        * forbids. Search engines index closed `<details>` content, and Cmd-F
        * in Chrome opens it.
        */}
      <h2 className="mt-14 font-display text-h2">Every verified fact</h2>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Everything above is built from these. Each names the source it came
        from. Open a category to read the claims and follow them to their
        sources.
      </p>

      {categories.map(({ category, claims }) => (
        <details
          key={category}
          /* A stable hook for QA. The keyboard-disclosure check used to take
             the first <details> on the page, which stopped being a claim group
             the moment the language switcher — also a <details> — appeared
             above it. */
          data-claim-group
          className="group mt-4 rounded-xl border border-border bg-surface"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="font-display text-h4">{CATEGORY_LABEL[category] ?? category}</span>
            <span className="shrink-0 font-mono text-caption text-muted" data-numeric>
              {claims.length} {claims.length === 1 ? "claim" : "claims"}
              <span aria-hidden className="ml-3 inline-block transition-transform group-open:rotate-90">
                &rsaquo;
              </span>
            </span>
          </summary>
          <div className="px-5 pt-1 pb-5">
          <ul className="mt-3 space-y-4">
            {claims.map((claim) => (
              <li key={claim.id} className="border-l-2 border-border pl-4">
                <p className="text-body">{claim.statement}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted">
                  <Badge tone={CLAIM_TONE[claim.claimType] ?? "neutral"}>{claim.claimType}</Badge>
                  {claim.sources.map((s) => (
                    <a
                      key={s.sourceId}
                      href={s.url ?? "#"}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      title={s.quote ? `Source text: "${s.quote}"` : undefined}
                      className="text-primary hover:underline"
                    >
                      {s.publisher ?? s.title}
                    </a>
                  ))}
                </p>
              </li>
            ))}
          </ul>
          </div>
        </details>
      ))}

      {sourcesUsed.length > 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-surface p-4">
          <h3 className="font-display text-h4">Sources</h3>
          <ul className="mt-2 space-y-1 text-caption text-muted">
            {sourcesUsed.map((s) => (
              <li key={s.sourceId}>
                {s.url ? (
                  <a
                    href={s.url}
                    rel="noopener noreferrer nofollow"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
                {s.tier ? ` · ${s.tier.replace(/-/g, " ")}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
