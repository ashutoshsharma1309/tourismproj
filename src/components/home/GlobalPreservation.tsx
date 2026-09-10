import { Archive, FileSearch, Landmark, Users } from "lucide-react";
import Link from "next/link";

import { getArchive, getSources } from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";

/**
 * Why an archive, and not just a guide.
 *
 * WHY THIS SECTION EXISTS
 * -----------------------
 * The reference product ends its homepage on preservation, and it is the
 * right place to end: everything above it is what a visitor can do, and this
 * is why the doing is worth anything. TerraStory had the same material —
 * a preservation report, a catalogued archive, a source registry, a
 * contribution route — and all of it lived on Sikkim sub-pages where nobody
 * arriving at the homepage would ever meet it.
 *
 * NOTHING HERE IS A CLAIM ABOUT CAPABILITY THIS PRODUCT LACKS
 * ----------------------------------------------------------
 * Every card links to something that exists and works, and the counts are
 * read from the archive at build time. Community contribution is named
 * because the submission route is real and reviewed — it is NOT described as
 * a live community, because there isn't one yet. A card describing an
 * ambition would be the same fabrication the rest of the product refuses.
 */
export async function GlobalPreservation() {
  const destinations = listDestinations();

  const [archive, sourceCounts] = await Promise.all([
    getArchive("sikkim"),
    Promise.all(destinations.map(async (d) => (await getSources(d.id)).length)),
  ]);

  const sources = sourceCounts.reduce((n, c) => n + c, 0);

  const cards = [
    {
      icon: Archive,
      title: "A catalogued archive",
      body: `${archive.length} objects — manuscripts, photographs, murals and records — each with its creator, its date where one is known, and its licence.`,
      href: "/destinations/sikkim/archive",
      cta: "Open the archive",
    },
    {
      icon: FileSearch,
      title: "A source registry",
      body: `${sources} sources behind the claims in this product, each one a link you can open and check for yourself.`,
      href: "/destinations/sikkim/preservation",
      cta: "See what is missing, and why",
    },
    {
      icon: Landmark,
      title: "Documented gaps",
      body: "Where a record has not been verified, the page says so instead of filling the space. The gaps are published as carefully as the findings.",
      href: "/destinations/compare",
      cta: "Compare coverage",
    },
    {
      icon: Users,
      title: "Community knowledge",
      body: "Submissions are accepted and reviewed before anything is published. Nothing reaches a page because it was submitted — only because it was checked.",
      href: "/destinations/sikkim/archive/contribute",
      cta: "Contribute a record",
    },
  ];

  return (
    <section
      aria-labelledby="preservation-heading"
      className="border-t border-border bg-surface-muted/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Why an archive
        </p>
        <h2
          id="preservation-heading"
          className="mt-3 max-w-3xl font-display text-h1 text-balance-heading"
        >
          Tourism finds a place. A record keeps it.
        </h2>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          A photograph of a monastery is worth something the day it is taken and
          more every decade after. TerraStory is built as an archive first and a
          travel guide second, because the guide is only as good as what has
          actually been written down.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, body, href, cta }) => (
            <li key={title}>
              <Link
                href={href}
                prefetch={false}
                className="tile flex h-full flex-col p-5 hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="mt-3 font-display text-h4">{title}</span>
                <span className="mt-2 flex-1 text-body leading-relaxed text-muted">
                  {body}
                </span>
                <span className="mt-4 text-caption font-medium text-primary">{cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
