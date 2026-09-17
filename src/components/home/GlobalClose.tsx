import { ArrowRight, FileText, Quote, ScrollText } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getArchive, getPlaces, getSources } from "@/lib/destinations/content";
import { coverageDimensions } from "@/lib/destinations/earned-depth";
import { listDestinations } from "@/lib/destinations/registry";
import { allCulture, allHistory, allStories } from "@/lib/global-index";

/**
 * How the archive can be trusted, what a fully catalogued destination looks
 * like, and the last call — the three things the landing page has left to say.
 *
 * THREE SECTIONS WERE FOLDED INTO THIS ONE
 * ----------------------------------------
 * The page ended with a four-step planner block, a provenance section, an
 * "intelligence layer" section that repeated the provenance chain with
 * counts, and a "why an archive" section of four cards — then Sikkim, then
 * the final call. Measured, the homepage was 14,000px tall on desktop and
 * 26,000px on a phone, and the institutional material was most of the back
 * half. Nothing it said was wrong; it was said three times. The counts, the
 * chain and the four archive links are here once, compactly, and everything
 * they pointed at is still where it was.
 *
 * SIKKIM GETS ONE BLOCK, NOT NINE
 * -------------------------------
 * It is the deepest destination in the product and that is worth showing —
 * as a demonstration of what depth looks like, with its real numbers, linking
 * to its own pages. Everything else it had is on `/destinations/sikkim`.
 *
 * EVERY NUMBER IS COUNTED, AND THE ONES THAT CANNOT BE ARE NOT SHOWN
 * ------------------------------------------------------------------
 * Each figure is read at build time from the same accessors the pages render
 * from. There is no "10,000+ facts" here, because nobody counted ten thousand
 * of anything.
 */
export async function GlobalClose() {
  const destinations = listDestinations();

  const [sikkim, places, stories, history, culture, archive, sourceCounts] =
    await Promise.all([
      coverageDimensions("sikkim"),
      Promise.all(destinations.map((d) => getPlaces(d.id))),
      allStories(),
      allHistory(),
      allCulture(),
      getArchive("sikkim"),
      Promise.all(destinations.map(async (d) => (await getSources(d.id)).length)),
    ]);

  const sources = sourceCounts.reduce((n, c) => n + c, 0);
  const totals = [
    [places.reduce((n, p) => n + p.length, 0), "catalogued places"],
    [history.length, "dated events"],
    [stories.length, "stories"],
    [culture.length, "food, festival and craft records"],
    [sources, "cited sources"],
  ] as const;

  return (
    <>
      {/* --------------------------------------------------- Provenance */}
      <section
        id="trust"
        aria-labelledby="trust-heading"
        className="scroll-mt-20 border-y border-border bg-surface-muted/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 id="trust-heading" className="max-w-3xl font-display text-h1 text-balance-heading">
            Why you can believe what you read here
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
            Every claim names the source it came from — not a footnote you could
            check in principle, a link you can follow from the sentence to the
            page. Where something has not been verified, the page says so
            instead of filling the space.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-5">
            {totals.map(([value, label]) => (
              <div key={label}>
                <dt className="text-caption text-subtle">{label}</dt>
                <dd className="font-mono text-2xl font-medium" data-numeric>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* The chain, in one row. */}
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Quote,
                step: "Claim",
                body: "A sentence about a place, quoted rather than rewritten.",
              },
              {
                icon: FileText,
                step: "Source",
                body: "The publication it came from, named beside it, with the date it was retrieved.",
              },
              {
                icon: ScrollText,
                step: "Evidence",
                body: "For reviewed research, the exact span the claim rests on, re-checked at publication.",
              },
            ].map(({ icon: Icon, step, body }) => (
              <li key={step} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-display text-h4">{step}</p>
                  <p className="mt-1 text-small leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/*
            Built as an archive: the four artefacts that make it one. Each
            link goes to something that exists and works. Community
            contribution is named because the submission route is real and
            reviewed — it is NOT described as a live community, because there
            isn't one yet.
          */}
          <ul className="mt-8 flex flex-col gap-x-8 gap-y-2 text-small sm:flex-row sm:flex-wrap">
            {[
              { href: "/destinations/sikkim/archive", label: `Open the archive (${archive.length} objects)` },
              { href: "/destinations/sikkim/preservation", label: "See what is missing, and why" },
              { href: "/destinations/compare", label: "Compare coverage" },
              { href: "/destinations/sikkim/archive/contribute", label: "Contribute a record" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none md:min-h-6"
                >
                  {link.label}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------- Sikkim, the deepest example */}
      <section
        aria-labelledby="sikkim-heading"
        className="border-b border-border bg-surface-inverse text-foreground-inverse"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 id="sikkim-heading" className="max-w-3xl font-display text-h1 text-balance-heading">
            What a destination looks like when it has been fully catalogued
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted-inverse">
            Sikkim is the archive TerraStory was built around, and the reference
            every other destination is measured against. It is not a better
            place than the others — it is the one most of which has been
            catalogued and reviewed.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-border-inverse py-5">
            {[
              [sikkim.places, "catalogued records"],
              [sikkim.stories, "stories"],
              [sikkim.history, "dated events"],
              [sikkim.approvedClaims, "reviewer-approved claims"],
            ].map(([value, label]) => (
              <div key={String(label)}>
                <dt className="text-caption text-muted-inverse">{label}</dt>
                <dd className="font-mono text-2xl font-medium" data-numeric>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/destinations/sikkim"
              className={cn(buttonClasses({ variant: "accent", size: "lg" }))}
            >
              Explore Sikkim
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/destinations/sikkim/explore"
              className={cn(buttonClasses({ variant: "ghost-inverse", size: "lg" }))}
            >
              Open the heritage map
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Final call */}
      {/*
        `pb-28` on a phone: the guide launcher is fixed in the bottom-right
        corner, and the last button on the page must not sit under it.
      */}
      <section
        aria-labelledby="final-cta"
        className="mx-auto max-w-6xl px-6 pt-16 pb-28 text-center md:py-24"
      >
        <h2 id="final-cta" className="font-display text-h1 text-balance-heading">
          Travel further. Understand deeper.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body-lg leading-relaxed text-muted">
          {destinations.length} Indian destinations, each one honest about how
          much of it is known. Nothing here is priced, timed or booked.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/destinations" className={cn(buttonClasses({ size: "lg" }))}>
            Explore India
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/discover"
            prefetch={false}
            className={cn(buttonClasses({ variant: "outline", size: "lg" }))}
          >
            Find my destination
          </Link>
        </div>
      </section>
    </>
  );
}
