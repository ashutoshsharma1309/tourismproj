import { ArrowRight, FileText, GitCompare, Quote, ScrollText } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { allCulture, allHistory, allStories } from "@/lib/global-index";
import { getPlaces, getSources } from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";

/**
 * The layer that makes this a platform rather than a website.
 *
 * WHY THIS SECTION EXISTS
 * -----------------------
 * Everything above it shows what the archive HOLDS. Nothing showed how it
 * holds it — and the provenance chain is the single thing here that a tourism
 * department cannot get from a travel blog. It was documented in three places
 * and visible in none.
 *
 * EVERY NUMBER IS COUNTED, AND THE ONES THAT CANNOT BE ARE NOT SHOWN
 * ------------------------------------------------------------------
 * Each figure below is read at build time from the same accessors the pages
 * render from. There is no "10,000+ facts" here, because nobody counted ten
 * thousand of anything.
 */
export async function GlobalIntelligence() {
  const destinations = listDestinations();

  const [places, stories, history, culture] = await Promise.all([
    Promise.all(destinations.map((d) => getPlaces(d.id))),
    allStories(),
    allHistory(),
    allCulture(),
  ]);

  const sourceCounts = await Promise.all(
    destinations.map(async (d) => (await getSources(d.id)).length),
  );

  const totals = [
    { value: places.reduce((n, p) => n + p.length, 0), label: "catalogued places", detail: "each one a record a visitor can stand in front of" },
    { value: history.length, label: "dated events", detail: "every one traced to a named source" },
    { value: stories.length, label: "cultural narratives", detail: "labelled documented, oral tradition or legend" },
    { value: culture.length, label: "food, festival and craft records", detail: "quoted, never described from memory" },
    { value: sourceCounts.reduce((n, c) => n + c, 0), label: "cited sources", detail: "each a link you can open" },
  ];

  return (
    <section
      aria-labelledby="intelligence-heading"
      className="border-y border-border bg-surface-inverse text-foreground-inverse"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
          The intelligence layer
        </p>
        <h2
          id="intelligence-heading"
          className="mt-3 max-w-3xl font-display text-h1 text-balance-heading"
        >
          From destination discovery to the evidence underneath it
        </h2>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted-inverse">
          Most travel content asks you to take its word. TerraStory carries the
          chain: every claim names the source it came from, the method it was
          retrieved by, and how much confidence it carries — and says so when
          nothing has been verified yet.
        </p>

        {/* -------------------------------------------------- what it holds */}
        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border-inverse py-7 lg:grid-cols-5">
          {totals.map((entry) => (
            <div key={entry.label}>
              <dt className="font-mono text-2xl font-medium" data-numeric>
                {entry.value}
              </dt>
              <dd className="mt-1 text-caption text-muted-inverse">{entry.label}</dd>
            </div>
          ))}
        </dl>

        {/* ------------------------------------------------- the chain itself */}
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Quote,
              step: "Claim",
              body: "A sentence about a place, quoted rather than rewritten — so the words on the page are the words in the source.",
            },
            {
              icon: FileText,
              step: "Source",
              body: "The publication it came from, named beside it, with the date it was retrieved and how it was retrieved.",
            },
            {
              icon: ScrollText,
              step: "Evidence",
              body: "For reviewed research, the exact span the claim rests on — re-checked against the document at publication.",
            },
          ].map(({ icon: Icon, step, body }, index) => (
            <li
              key={step}
              className="rounded-xl border border-border-inverse/40 p-5"
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5 text-accent" aria-hidden />
                <span className="font-mono text-eyebrow tracking-widest text-muted-inverse uppercase">
                  Step {index + 1}
                </span>
              </div>
              <p className="mt-3 font-display text-h4">{step}</p>
              <p className="mt-2 text-body leading-relaxed text-muted-inverse">{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/destinations/compare"
            prefetch={false}
            className={cn(buttonClasses({ variant: "accent", size: "lg" }))}
          >
            <GitCompare className="size-4" aria-hidden />
            Compare destinations
          </Link>
          <Link
            href="/destinations/sikkim/preservation"
            className={cn(buttonClasses({ variant: "ghost-inverse", size: "lg" }))}
          >
            See what is missing, and why
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
