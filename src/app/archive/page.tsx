import { ArrowRight, Camera, MapPin, Scale, Upload, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ArchiveCard } from "@/components/archive/ArchiveCard";
import { ArchiveExplorer } from "@/components/archive/ArchiveExplorer";
import { Footer } from "@/components/layout/Footer";
import { VERIFICATION_LEGEND, VerificationChip } from "@/components/ui/VerificationChip";
import {
  ARCHIVE_CATEGORIES,
  ARCHIVE_COMMUNITIES,
  ARCHIVE_COVERAGE,
  ARCHIVE_DISTRICTS,
  ARCHIVE_LICENCES,
  ARCHIVE_PERIODS,
  ARCHIVE_VERIFICATIONS,
  archiveItems,
  getArchiveByCategory,
  getArchiveItemByKey,
} from "@/data/archive";

export const metadata: Metadata = {
  title: "Digital Heritage Archive",
  description:
    "Sikkim's cultural heritage, catalogued: photographs, documents, crafts, music, food, festivals and sacred landscapes — every object with its source, its licence and its creator.",
};

/*
 * Static again.
 *
 * This page was `force-dynamic` because it read the pending-submission store on
 * every request, to label a link to the curator queue. That queue has been
 * removed, so the last live read is gone and the archive can be prerendered
 * with the rest of the catalogue.
 */

const FEATURED_KEYS = [
  "story/coronation-throne",
  "story/lepcha-portrait",
  "story/kabi-lungchok",
  "story/rumtek-interior",
];

/**
 * NEY DIGITAL HERITAGE ARCHIVE.
 *
 * A digital museum rather than an image gallery: every object carries where it
 * came from, who made it, what may be done with it, and how firmly it stands.
 * The counts on this page are computed from the records — there is no hardcoded
 * number anywhere on it.
 */
export default async function ArchivePage() {
  const featured = FEATURED_KEYS.map((key) => getArchiveItemByKey(key)).filter(
    (item) => item !== undefined,
  );
  const historical = [
    ...getArchiveByCategory("Historical photographs"),
    ...getArchiveByCategory("Historical documents"),
    ...getArchiveByCategory("Historic sites"),
  ].slice(0, 3);

  return (
    <>
      <main id="main">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden bg-surface-inverse">
          {featured[0] ? (
            <Image
              src={featured[0].mediaUrl}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-40"
            />
          ) : null}
          <div aria-hidden className="gradient-overlay absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 pt-32 pb-16 md:px-6 md:pt-40 md:pb-20">
            <p className="font-mono text-eyebrow tracking-[0.24em] text-accent uppercase">
              Sikkim Darshan Digital Heritage Archive
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-display text-foreground-inverse text-glow">
              Explore Sikkim&apos;s heritage
            </h1>
            <p className="mt-5 max-w-2xl text-body-lg leading-relaxed text-foreground-inverse/85">
              {ARCHIVE_COVERAGE.total} catalogued objects across{" "}
              {ARCHIVE_COVERAGE.categories} categories — monastery photography,
              historical portraits, manuscripts, crafts, instruments, dishes and
              sacred ground. Every one of them names its creator, its licence and
              its source.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <a
                href="#explore"
                className="flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-small font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover hover:shadow-lifted"
              >
                Search the archive
                <ArrowRight className="size-4" aria-hidden />
              </a>
              <Link
                href="/archive/contribute"
                className="flex h-12 items-center gap-2 rounded-full border border-foreground-inverse/40 px-7 text-small font-semibold text-foreground-inverse transition-colors hover:border-foreground-inverse hover:bg-foreground-inverse/10"
              >
                <Upload className="size-4" aria-hidden />
                Contribute
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ provenance */}
        <section className="border-b bg-surface" aria-label="Archive provenance">
          <div className="mx-auto grid max-w-6xl gap-px overflow-hidden px-4 py-8 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
            {[
              {
                icon: Camera,
                value: `${ARCHIVE_COVERAGE.licensed}/${ARCHIVE_COVERAGE.total}`,
                label: "objects with a named licence",
                note: `${ARCHIVE_LICENCES.length} distinct licences, all open`,
              },
              {
                icon: Users,
                value: `${ARCHIVE_COVERAGE.withKnownCreator}/${ARCHIVE_COVERAGE.total}`,
                label: "with a named creator",
                note: "The rest are credited to their holding institution",
              },
              {
                icon: MapPin,
                value: `${ARCHIVE_COVERAGE.photographedInSikkim}/${ARCHIVE_COVERAGE.total}`,
                label: "photographed in Sikkim",
                note: "The rest say so on the card and on the page",
              },
              {
                icon: Scale,
                value: `${ARCHIVE_COVERAGE.linkedToMonastery + ARCHIVE_COVERAGE.linkedToEvent}`,
                label: "links to a monastery or historical event",
                note: "The archive is not a separate gallery",
              },
            ].map((stat) => (
              <div key={stat.label} className="px-1 py-2 lg:px-5">
                <stat.icon className="size-4 text-accent-ink" aria-hidden />
                <p data-numeric className="mt-2 font-display text-h3">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-small font-medium">{stat.label}</p>
                <p className="mt-1 text-caption leading-relaxed text-subtle">{stat.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- featured */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20" aria-label="Featured heritage">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Featured heritage
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-h2 text-balance-heading">
            Start with the objects that carry the most history
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item, index) => (
              <ArchiveCard key={item.id} item={item} priority={index < 2} />
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ categories */}
        <section className="border-y bg-surface-muted/40" aria-label="Browse by category">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              The shelves
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-h2 text-balance-heading">
              {ARCHIVE_COVERAGE.categories} categories, none of them empty
            </h2>
            <p className="mt-3 max-w-2xl text-body text-muted">
              A category appears here only when there is legitimately sourced
              material to fill it. Music, dance and clothing are thin because the
              openly licensed record is thin — that is a gap worth seeing.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ARCHIVE_CATEGORIES.map((category) => {
                const count = getArchiveByCategory(category).length;
                const cover = getArchiveByCategory(category)[0];
                return (
                  <li key={category}>
                    <a
                      href="#explore"
                      className="card-lift flex items-center gap-4 rounded-xl border bg-surface p-3"
                    >
                      {cover ? (
                        <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                          <Image
                            src={cover.mediaUrl}
                            alt=""
                            aria-hidden
                            fill
                            loading="lazy"
                            sizes="64px"
                            className="object-cover"
                          />
                        </span>
                      ) : null}
                      <span className="min-w-0">
                        <span className="block text-body font-semibold">{category}</span>
                        <span data-numeric className="block font-mono text-caption text-subtle">
                          {count} {count === 1 ? "object" : "objects"}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------- search */}
        <section id="explore" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-20">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Search &amp; filter
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-h2 text-balance-heading">
            The whole archive, searchable
          </h2>
          <div className="mt-8">
            <ArchiveExplorer
              items={archiveItems}
              facets={{
                categories: ARCHIVE_CATEGORIES,
                communities: ARCHIVE_COMMUNITIES,
                districts: ARCHIVE_DISTRICTS,
                periods: ARCHIVE_PERIODS,
                verifications: ARCHIVE_VERIFICATIONS,
              }}
            />
          </div>
        </section>

        {/* --------------------------------------------- historical material */}
        {historical.length > 0 ? (
          <section className="border-y bg-surface-muted/40" aria-label="Featured historical material">
            <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
              <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                Historical material
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-h2 text-balance-heading">
                The oldest things in the collection
              </h2>
              <p className="mt-3 max-w-2xl text-body text-muted">
                Sikkim&apos;s manuscripts and historical photographs are held
                overwhelmingly in monastery libraries and family collections that
                have never been digitised. What is here is what exists in the open
                record — and it is not much.
              </p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {historical.map((item) => (
                  <ArchiveCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------ explore by place */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20" aria-label="Explore by location">
          <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Explore by location
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-h2 text-balance-heading">
            Where the collection comes from
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHIVE_DISTRICTS.map((district) => {
              const count = archiveItems.filter((item) => item.district === district).length;
              return (
                <li key={district} className="rounded-xl border bg-surface p-5">
                  <p className="flex items-center gap-2 text-body font-semibold">
                    <MapPin className="size-4 text-primary" aria-hidden />
                    {district} district
                  </p>
                  <p data-numeric className="mt-1 font-mono text-caption text-subtle">
                    {count} {count === 1 ? "object" : "objects"} located here
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 max-w-2xl text-small leading-relaxed text-subtle">
            {archiveItems.filter((i) => i.district === null).length} objects carry
            no district, either because they document a practice rather than a
            place, or because the photograph was not taken in Sikkim. Neither is
            given a location it does not have.
          </p>
        </section>

        {/* --------------------------------------------------- contributions */}
        <section className="bg-primary-soft/60" aria-label="Community contributions">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div>
                <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                  Community contributions
                </p>
                <h2 className="mt-3 font-display text-h2 text-balance-heading">
                  The archive grows when Sikkim adds to it
                </h2>
                <p className="mt-4 max-w-xl text-body-lg leading-relaxed text-muted">
                  Most of what this archive is missing is not lost — it is in
                  monastery libraries, family albums and the memories of people who
                  keep the festivals. If you hold a photograph, a document or a
                  practice worth recording, contribute it.
                </p>
                <p className="mt-3 max-w-xl text-body leading-relaxed text-muted">
                  Nothing you submit is published automatically. Every contribution
                  enters the queue as{" "}
                  <strong className="text-foreground">pending review</strong>, is
                  screened for duplicates and missing metadata, and waits for a
                  curator. Automated screening never marks anything verified.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/archive/contribute"
                    className="flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-small font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary-hover hover:shadow-lifted"
                  >
                    <Upload className="size-4" aria-hidden />
                    Contribute to the archive
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border bg-surface p-6">
                <h3 className="text-h4 font-semibold">How a record is marked</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {VERIFICATION_LEGEND.map((row) => (
                    <li key={row.status}>
                      <VerificationChip status={row.status} />
                      <p className="mt-1.5 text-caption leading-relaxed text-subtle">{row.meaning}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
