import { ExternalLink, Quote } from "lucide-react";

import { getVoices } from "@/data/reviews";

/**
 * Visitor voices.
 *
 * What is shown here is short, attributed and licensed: traveller-written notes
 * from Wikivoyage under CC BY-SA 4.0. What is deliberately absent is a star
 * rating, an average, an author name and a sentiment percentage — because no
 * source available to this build supplies any of them, and the alternative to
 * absence is invention.
 *
 * The section says that out loud rather than hiding it, because a visitor who
 * sees four quotes and no rating deserves to know why.
 */
export function VisitorVoices({ monasterySlug, monasteryName }: { monasterySlug: string; monasteryName: string }) {
  const data = getVoices(monasterySlug);

  return (
    <section aria-labelledby="voices-heading" className="mt-14 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="voices-heading" className="font-display text-h2">
          Visitor voices
        </h2>
        {data ? (
          <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
            {data.voices.length} sourced {data.voices.length === 1 ? "note" : "notes"}
          </p>
        ) : null}
      </div>

      {data ? (
        <>
          {data.themes.length > 0 ? (
            <p className="mt-3 max-w-2xl text-body text-muted">
              Across {data.voices.length} sourced {data.voices.length === 1 ? "note" : "notes"}, travellers
              mention{" "}
              {data.themes.map((theme, i) => (
                <span key={theme.id}>
                  {i > 0 ? (i === data.themes.length - 1 ? " and " : ", ") : ""}
                  <strong className="font-medium text-foreground">{theme.label}</strong>
                </span>
              ))}
              .
            </p>
          ) : null}

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.voices.map((voice) => (
              <li
                key={voice.id}
                className="flex min-w-0 flex-col rounded-xl border bg-surface p-5 shadow-soft"
              >
                <Quote className="size-4 shrink-0 text-accent-ink/60" aria-hidden />
                <blockquote className="mt-2 grow text-body leading-relaxed text-pretty">
                  {voice.excerpt}
                </blockquote>
                <footer className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-caption text-subtle">
                  <a
                    href={voice.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    {voice.sourceLabel}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                  <span aria-hidden>·</span>
                  <span>{voice.licence}</span>
                  {voice.rating !== null ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{voice.rating} out of 5</span>
                    </>
                  ) : null}
                  {voice.authorName ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{voice.authorName}</span>
                    </>
                  ) : null}
                </footer>
              </li>
            ))}
          </ul>

          <p className="mt-5 rounded-lg border border-dashed bg-surface-muted/50 p-4 text-caption leading-relaxed text-muted">
            <strong className="font-medium text-foreground">No rating is shown, and that is deliberate.</strong>{" "}
            These are traveller-written guide notes, not star-rated reviews — Wikivoyage
            listings are unsigned, so there is no author to name and no score to average.
            Google Maps holds thousands of genuine reviews of {monasteryName}, but its terms
            forbid collecting them without the Places API, and this build has no key for it.
            Inventing a &ldquo;4.6 from 812 reviews&rdquo; would have been trivial and dishonest.
          </p>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed p-6 text-center sm:p-8">
          <p className="font-display text-h3 text-balance-heading">Visitor feedback is still being collected</p>
          <p className="mx-auto mt-2 max-w-lg text-body text-muted">
            No licensed, attributable visitor commentary about {monasteryName} was found. Review
            platforms hold some, but their terms forbid collecting it and their text is the
            reviewers&apos; own — so this space stays empty rather than being filled with
            plausible-sounding sentences nobody wrote.
          </p>
        </div>
      )}
    </section>
  );
}
