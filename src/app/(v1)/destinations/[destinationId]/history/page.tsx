/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
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
import { getDestination, listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { destinationOpenGraph } from "@/lib/destinations/social-card";
import { SITE_URL } from "@/lib/constants";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";
import { getHistory } from "@/lib/destinations/content";
import { groupByEra } from "@/lib/destinations/eras";
import type { HistoryEvent } from "@/data/history";

/* PHASE 18 — the page-bearing capability, not the content one. A capsule has
   history; it does not have history PAGES, and this index rendered Sikkim's
   archive under its URL until the two were told apart. */
const CAPABILITY = "historyPages" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  /*
   * CAPABILITY, not the content capability. These disagreed: params were
   * generated for every destination that HAS such records, while the page
   * requires records long enough to carry their own pages. The twelve
   * capsules were therefore built, rendered, 404'd and written to disk as
   * 404 shells — twelve pages that exist to not exist.
   */
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

/*
 * PHASE 19 — metadata belongs to the destination in the URL. See the note in
 * the sibling stories route: this was a static object naming Sikkim, and
 * every destination routed through this file inherited it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}): Promise<Metadata> {
  const { destinationId } = await params;
  const destination = getDestination(destinationId);
  if (!destination) return {};

  const title = `The Story of ${destination.name}`;
  const description = `An interactive timeline of ${destination.name}'s history. Every event carries its sources.`;
  return {
    title,
    description,
    openGraph: await destinationOpenGraph(destination, {
      title,
      description,
      url: `${SITE_URL}/destinations/${destinationId}/history`,
    }),
  };
}

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
export default async function HistoryPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  /*
   * TWO TIMELINES BEHIND ONE ROUTE.
   *
   * Everything below this block is Sikkim's page — its six named eras, its
   * archive coverage, "The Story of Sikkim". The moment fourteen destinations
   * gained `historyPages`, this route rendered that page at every one of
   * their URLs: New York City's history was the Namgyal Kingdom. Found by
   * looking at a screenshot, not by any test, because the tests asked only
   * whether the page served.
   *
   * A capsule destination renders its own events, grouped into the
   * historiographic bands its years fall in — never Sikkim's periodisation.
   */
  if (destinationId !== "sikkim") {
    const events = (await getHistory(destinationId)) as (HistoryEvent & { year?: number })[];
    const bands = groupByEra(events.map((event) => ({ ...event, year: event.sortYear })));
    const withPage = events.filter((event) => Array.isArray(event.description) && event.description.length > 0).length;
    const first = events[0];
    const last = events[events.length - 1];
    return (
      <>
        <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-24 md:px-6">
          <DestinationBreadcrumb destinationId={destinationId} destinationName={destination.name} section="History" />
          <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
            The history of {destination.name}
          </h1>
          <p className="mt-4 max-w-[68ch] text-body-lg leading-relaxed text-muted">
            {events.length} dated {events.length === 1 ? "event" : "events"}
            {first && last ? ` from ${first.yearLabel} to ${last.yearLabel}` : ""}, across {bands.length}{" "}
            {bands.length === 1 ? "era" : "eras"}; {withPage} open into a page whose account is quoted from the
            event&apos;s own source. An event without one stays here as a dated record.
          </p>

          {/* Era jumps. The bands are calendar bands, and the labels say so. */}
          <nav aria-label="Eras" className="mt-8 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
              {bands.map(({ era, events: inBand }) => (
                <li key={era.id}>
                  <a
                    href={`#era-${era.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-small hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {era.label}
                    <span className="font-mono text-caption text-subtle">{inBand.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {bands.map(({ era, events: inBand }, bandIndex) => (
            <section key={era.id} id={`era-${era.id}`} aria-labelledby={`era-h-${era.id}`} className="mt-16 scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-6">
                <h2 id={`era-h-${era.id}`} className="font-display text-h2">{era.label}</h2>
                <p className="font-mono text-caption text-subtle">{era.range}</p>
              </div>
              <ol className="mt-8">
                {inBand.map((event, index) => (
                  <TimelineEvent
                    key={event.slug}
                    event={event as HistoryEvent}
                    destinationId={destinationId}
                    priority={bandIndex === 0 && index === 0}
                    expectMedia={false}
                  />
                ))}
              </ol>
            </section>
          ))}

          <p className="mt-16 max-w-[68ch] border-t border-border pt-6 text-small leading-relaxed text-muted">
            Eras here are the conventional historiographic bands — claims about the calendar, not about{" "}
            {destination.name}. Every event names the source its date and account came from.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const { total, verified, oralTradition, citations, withImage } = HISTORY_COVERAGE;

  return (
    <>
      <main id="main">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="History"
        />
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
                  {withImage} of {total} events carry a photograph, each one a
                  licensed archive item with its author and licence recorded.
                  {withImage < total
                    ? " The rest say “documentation currently unavailable”, which is true, and better than a stock picture of a mountain."
                    : " Several are older than photography, so they carry a period map, portrait or document instead — every one captioned with what it actually shows, never captioned as the event itself."}
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
                        destinationId={destinationId}
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
                href={`/destinations/${destinationId}/archive`}
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
                href={`/destinations/${destinationId}/monasteries`}
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
