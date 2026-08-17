import { ArrowRight, Landmark, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { EraNav } from "@/components/history/EraNav";
import { TimelineEvent } from "@/components/history/TimelineEvent";
import { Footer } from "@/components/layout/Footer";
import { VERIFICATION_LEGEND, VerificationChip } from "@/components/ui/VerificationChip";
import { ARCHIVE_COVERAGE } from "@/data/archive";
import { eraAnchor, getEventsForEra, HISTORY_COVERAGE, HISTORY_ERAS } from "@/data/history";
import { img } from "@/data/images";

export const metadata: Metadata = {
  title: "The Story of Sikkim",
  description:
    "An interactive timeline of Sikkim's history — from the Lepcha valleys and the crowning at Yuksom to the 1975 referendum and the first fully organic state. Every event carries its sources.",
};

/**
 * THE STORY OF SIKKIM — the historical timeline.
 *
 * A museum wall rather than a textbook page: the years are large, the spine is
 * continuous, and each event opens into its own room at /history/[slug].
 *
 * What it will not do is fill a gap with an invention. Events with no
 * legitimate photograph say so on the card, and events whose sources disagree
 * say that on their page.
 */
export default function HistoryPage() {
  const { total, verified, oralTradition, citations, withImage } = HISTORY_COVERAGE;

  return (
    <>
      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden bg-surface-inverse">
          <Image
            src={img("hero/kanchenjunga")}
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-45"
          />
          <div aria-hidden className="gradient-overlay absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 pt-32 pb-16 md:px-6 md:pt-40 md:pb-20">
            <p className="font-mono text-eyebrow tracking-[0.24em] text-accent uppercase">
              Interactive history
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-display text-foreground-inverse text-glow">
              The Story of Sikkim
            </h1>
            <p className="mt-5 max-w-2xl text-body-lg leading-relaxed text-foreground-inverse/85">
              A kingdom founded in a forest clearing in 1642, four treaties that
              took its independence, a referendum that ended a 333-year dynasty,
              and the monasteries that outlasted all of it. Travel through it
              year by year.
            </p>
            <dl className="mt-8 flex flex-wrap gap-2.5">
              {[
                { label: "events documented", value: total },
                { label: "citations", value: citations },
                { label: "eras", value: HISTORY_ERAS.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-dark flex items-baseline gap-2 rounded-full px-4 py-2"
                >
                  <dd data-numeric className="font-display text-h4 text-accent">
                    {stat.value}
                  </dd>
                  <dt className="text-caption text-foreground-inverse/85">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------- honesty statement */}
        <section className="border-b bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                <h2 className="font-display text-h3">How to read this timeline</h2>
                <p className="mt-2 text-small leading-relaxed text-muted">
                  Every event says how firmly it stands. {verified} of {total} are
                  verified against a government or institutional source, or two
                  references that agree. {oralTradition} are recorded as oral
                  tradition and are not presented as settled fact. Where sources
                  disagree — 15 May against 16 May 1975, the 8th century against
                  the 9th — the disagreement is written into the record.
                </p>
                <p className="mt-2 text-small leading-relaxed text-muted">
                  {withImage} of {total} events carry a photograph. The rest say
                  &ldquo;documentation currently unavailable&rdquo;, which is
                  true, and better than a stock picture of a mountain.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {VERIFICATION_LEGEND.filter((row) =>
                  ["verified", "source-backed", "oral tradition", "unverified"].includes(row.status),
                ).map((row) => (
                  <li key={row.status} className="rounded-lg border bg-background/60 p-3">
                    <VerificationChip status={row.status} />
                    <p className="mt-1.5 text-caption leading-relaxed text-subtle">{row.meaning}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- timeline */}
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <EraNav />

          <div className="pt-10 pb-16">
            {HISTORY_ERAS.map((era) => {
              const events = getEventsForEra(era.id);
              if (events.length === 0) return null;
              return (
                <section key={era.id} className="mb-6" aria-labelledby={eraAnchor(era.id)}>
                  <header
                    id={eraAnchor(era.id)}
                    data-era={era.id}
                    className="scroll-mt-32 border-b pt-8 pb-5 first:pt-0"
                  >
                    <p
                      data-numeric
                      className="font-mono text-eyebrow tracking-widest text-accent-ink uppercase"
                    >
                      {era.span}
                    </p>
                    <h2 className="mt-2 font-display text-h2 text-balance-heading">{era.id}</h2>
                    <p className="mt-2 max-w-2xl text-body text-muted">{era.blurb}</p>
                  </header>
                  <ol className="mt-8">
                    {events.map((event, index) => (
                      <TimelineEvent
                        key={event.slug}
                        event={event}
                        priority={era.id === HISTORY_ERAS[0]!.id && index === 0}
                      />
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------ onward links */}
        <section className="bg-primary-soft/60">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <h2 className="font-display text-h2 text-balance-heading">Where the history leads</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <Link
                href="/archive"
                className="card-lift group flex flex-col rounded-xl border bg-surface p-6"
              >
                <ScrollText className="size-5 text-accent-ink" aria-hidden />
                <h3 className="mt-3 font-display text-h3">The Digital Heritage Archive</h3>
                <p className="mt-2 text-small leading-relaxed text-muted">
                  {ARCHIVE_COVERAGE.total} catalogued objects — photographs,
                  documents, crafts, food, music and sacred landscapes — each with
                  its licence, its creator and its source.
                </p>
                <span className="mt-4 flex items-center gap-1.5 text-small font-medium text-primary">
                  Enter the archive
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
              <Link
                href="/monasteries"
                className="card-lift group flex flex-col rounded-xl border bg-surface p-6"
              >
                <Landmark className="size-5 text-accent-ink" aria-hidden />
                <h3 className="mt-3 font-display text-h3">The monasteries themselves</h3>
                <p className="mt-2 text-small leading-relaxed text-muted">
                  The institutions this history built, still working — with their
                  own histories, audio guides and locations on the map.
                </p>
                <span className="mt-4 flex items-center gap-1.5 text-small font-medium text-primary">
                  Explore monasteries
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
