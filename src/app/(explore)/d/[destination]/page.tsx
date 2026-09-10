import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getDestinationBySlug,
  getHubCounts,
  getSitesForDestination,
  publishedDestinationSlugs,
} from "@/db/queries/destinations";
import { coverageLine, type Coverage, type Tier } from "@/lib/coverage";

/**
 * THE destination page. There is exactly one, and it renders all of them.
 *
 * This file is the fix for v1's central failure. v1 had fifteen destinations
 * expressed as fifteen sets of modules and routes, so a sixteenth was a
 * release. Here a sixteenth is an INSERT — `generateStaticParams` reads the
 * slugs from Postgres, and nothing in this file knows the name of a single
 * destination.
 *
 * If you ever find yourself writing `if (slug === 'gangtok')` here, the thing
 * you want belongs in the data model. (CLAUDE.md §2 R1.)
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await publishedDestinationSlugs();
  return slugs.map((destination) => ({ destination }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string }>;
}): Promise<Metadata> {
  const { destination: slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) return {};
  return {
    title: `${destination.name} — Darshan`,
    description: destination.blurb ?? `Heritage sites and stories in ${destination.name}.`,
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ destination: string }>;
}) {
  const { destination: slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const [sites, counts] = await Promise.all([
    getSitesForDestination(destination.id),
    getHubCounts(destination.id),
  ]);
  const hero = sites.find((site) => site.imageUrl);
  const coverage = destination.coverage as Coverage;

  const base = `/d/${destination.slug}`;
  const doors = [
    { label: "Guide", href: `${base}/guide`, count: 0, detail: "getting there, costs" },
    { label: "Culture", href: `${base}/culture`, count: counts.culture, detail: "food, festivals, crafts" },
    { label: "Sites", href: `${base}/sites`, count: counts.sites, detail: `${counts.sites} places` },
    /* "documented", not "to book": nothing in this product is bookable, and
       a door that promises booking is the OTA framing the product refuses. */
    { label: "Stays", href: `${base}/stays`, count: counts.stays, detail: `${counts.stays} documented` },
    { label: "Itineraries", href: `${base}/itineraries`, count: counts.itineraries, detail: "1/3/5 days" },
    { label: "Stories", href: `${base}/stories`, count: counts.stories, detail: `${counts.stories}` },
  ];

  return (
    <main className="min-h-screen bg-[var(--ink)] text-[var(--parchment)]">
      {/* The hero is a credited photograph and the destination's own name.
          Not a stat counter with a gradient. (CLAUDE.md §6.) */}
      <header className="relative">
        {hero?.imageUrl ? (
          <div className="relative h-[52vh] min-h-[22rem] w-full">
            <Image
              src={hero.imageUrl}
              alt={hero.imageAlt ?? `${destination.name}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/55 to-transparent"
            />
          </div>
        ) : (
          <div className="h-[30vh] min-h-[14rem] w-full bg-[var(--ink)]" />
        )}

        <div className="relative z-10 mx-auto -mt-32 max-w-5xl px-6 pb-10">
          {destination.nameLocal ? (
            <p className="font-serif text-[34px] leading-tight text-[var(--brass)]">
              {destination.nameLocal}
            </p>
          ) : null}
          <h1 className="font-serif text-[46px] leading-[1.05] tracking-tight">
            {destination.name}
          </h1>
          <p className="mt-2 text-[16px] text-[var(--parchment)]/70">
            {[destination.state, destination.region].filter(Boolean).join(", ")}
          </p>
          {/* The coverage line, before anyone clicks. Part 3.3. */}
          <p className="mt-3 text-[14px] text-[var(--brass)]">
            {coverageLine(destination.tier as Tier, coverage)}
          </p>

          {destination.blurb ? (
            <p className="mt-5 max-w-[68ch] text-[16px] leading-relaxed text-[var(--parchment)]/80">
              {destination.blurb}
            </p>
          ) : null}

          {destination.permitRequired ? (
            <p className="mt-6 inline-block rounded border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-3 py-2 text-[14px] text-[var(--brass)]">
              An Inner Line Permit is required for some areas here.
            </p>
          ) : null}
        </div>
      </header>

      {/*
        SIX DOORS, EACH WITH A REAL COUNT.

        The hub is a launcher, not an essay (Part 2.3 R5). A visitor should be
        able to see what exists here in four seconds without scrolling, and a
        door with nothing behind it says so and stays un-clickable rather than
        leading somewhere empty — which is the same published-gap discipline
        the archive applies to sources.
      */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="sr-only">What is here</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {doors.map((door) => {
            const empty = door.count === 0;
            const inner = (
              <>
                <span className="font-serif text-[20px]">{door.label}</span>
                <span className="mt-1 block text-[12px] text-[var(--parchment)]/50">
                  {empty ? "not yet documented" : door.detail}
                </span>
              </>
            );
            return (
              <li key={door.label}>
                {empty ? (
                  <span
                    aria-disabled="true"
                    className="block h-full rounded border border-[var(--slate)]/20 px-4 py-4 opacity-45"
                  >
                    {inner}
                  </span>
                ) : (
                  <Link
                    href={door.href}
                    className="block h-full rounded border border-[var(--slate)]/35 px-4 py-4 transition-colors hover:border-[var(--brass)] hover:bg-[var(--brass)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brass)]"
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="font-serif text-[26px]">
          {sites.length} catalogued {sites.length === 1 ? "site" : "sites"}
        </h2>

        {sites.length === 0 ? (
          <p className="mt-4 max-w-[68ch] text-[var(--parchment)]/70">
            Nothing is catalogued here yet. Sites appear as they are researched
            and sourced — this page is generated from the archive, so it fills
            in without a release.
          </p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sites.slice(0, 6).map((site) => (
              <li key={site.id}>
                <Link
                  href={`/d/${destination.slug}/s/${site.slug}`}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brass)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--slate)]/20">
                    {site.imageUrl ? (
                      <Image
                        src={site.imageUrl}
                        alt={site.imageAlt ?? site.name}
                        fill
                        sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-serif text-[20px] group-hover:text-[var(--brass)]">
                    {site.name}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-[var(--parchment)]/50">
                    {site.lineage ?? site.category.toLowerCase().replace("_", " ")}
                    {site.foundedYear ? `, ${site.foundedYear}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {sites.length > 6 ? (
          <Link
            href={`/d/${destination.slug}/sites`}
            className="mt-8 inline-block text-[14px] text-[var(--brass)] hover:underline"
          >
            All {sites.length} sites
          </Link>
        ) : null}
      </section>
    </main>
  );
}
