import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { allStories, hrefFor } from "@/lib/global-index";
import { SITE } from "@/lib/constants";

/**
 * Every story in the product, from every destination.
 *
 * WHY THIS PAGE EXISTS
 * --------------------
 * The navigation named Stories and the only stories were behind a
 * destination, so a visitor who did not yet know where they wanted to go had
 * no way in. That is the wrong order for a platform whose whole argument is
 * that a place is what happened there.
 *
 * Nothing here is new. Every card is a record its destination already
 * publishes, and every card names its owner — a story adrift from the place
 * it belongs to would be exactly the cross-destination leak this product
 * tests against.
 */
export const metadata: Metadata = {
  title: `Stories · ${SITE.name}`,
  description:
    "Cultural narratives from fifteen destinations, each quoted from a named source and labelled by the kind of claim it makes.",
};

const CLAIM_TONE: Record<string, string> = {
  "documented history": "text-primary",
  "oral tradition": "text-accent",
  legend: "text-subtle",
};

export default async function StoriesPage() {
  const stories = await allStories();

  /* Grouped by destination, in registry order, so the page reads as a
     platform rather than as one long undifferentiated list. */
  const byDestination = new Map<string, typeof stories>();
  for (const entry of stories) {
    const bucket = byDestination.get(entry.destination.id) ?? [];
    bucket.push(entry);
    byDestination.set(entry.destination.id, bucket);
  }

  const countries = new Set(stories.map((entry) => entry.destination.country.name));

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-6 pt-28 pb-20">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          The archive behind the places
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          A place is what happened there
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          {stories.length} stories from {byDestination.size} destinations across{" "}
          {countries.size} countries. Each is quoted from a named source and says
          how it should be read — a documented account is never dressed up as a
          legend.
        </p>

        {[...byDestination.entries()].map(([destinationId, entries]) => {
          const { destination } = entries[0]!;
          return (
            <section key={destinationId} className="mt-14 scroll-mt-20" id={destinationId}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="font-display text-h3">
                  <Link href={`/destinations/${destinationId}`} className="hover:text-primary hover:underline">
                    {destination.name}
                  </Link>
                  <span className="ml-2 text-body font-normal text-subtle">
                    {destination.country.name}
                  </span>
                </h2>
                <p className="text-caption text-subtle" data-numeric>
                  {entries.length}
                </p>
              </div>

              <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {entries.map(({ record }) => (
                  <li key={record.slug}>
                    <Link
                      href={hrefFor(record, destinationId, "stories")}
                      className="tile flex h-full flex-col p-5 hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {record.claimType ? (
                        <span
                          className={`font-mono text-eyebrow tracking-widest uppercase ${
                            CLAIM_TONE[record.claimType] ?? "text-subtle"
                          }`}
                        >
                          {record.claimType}
                        </span>
                      ) : null}
                      <span className="mt-2 font-display text-h4">{record.title}</span>
                      {record.summary ? (
                        <span className="mt-2 line-clamp-5 text-body leading-relaxed text-muted">
                          {record.summary}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
