"use client";

import { ArrowRight, ExternalLink, MapPin, Phone, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import type { DistrictGroup, StarGrade } from "@/data/curated-stays";
import { stayImages } from "@/data/stay-images";
import { stayPhoto } from "@/data/stay-photos";

/**
 * The curated stays directory, organised by district.
 *
 * WHY DISTRICT AND NOT GRADE
 * --------------------------
 * Grouping by star grade made the page read as a ranking, which is how a
 * booking site is organised, not how a journey is. Nobody plans a Sikkim trip
 * by deciding to stay somewhere four-star; they decide to go to Pelling, or to
 * Lachung, and then look for a bed there. Geography is the axis the visitor
 * already has in their head when they arrive on this page, so it is the axis
 * the page is built on. The grade has not gone anywhere — it is on every card
 * and it still orders the properties inside each district — but it is now an
 * attribute of a stay rather than the shape of the directory.
 *
 * Twenty-two properties need no pagination, so every one is on the page and
 * the district navigation jumps between them.
 *
 * No property has a photograph of itself, and that is a researched finding
 * rather than a gap: Commons was searched for every one of them, OpenStreetMap
 * carries no image tags, and of the official websites only three resolve to a
 * real property page. A stock hotel interior would be the invention this
 * directory exists to avoid.
 *
 * What the card leads with instead is a photograph of a catalogued place in the
 * same district, captioned with the place it actually shows and credited to the
 * photographer who released it — see src/data/stay-photos.ts for how one is
 * chosen. The caption is not decoration and must not be dropped: it is the only
 * thing separating "somewhere in this district looks like this" from "this is
 * the hotel". The monogram remains as the fallback for a district with no
 * qualifying photograph, and as the property's own mark over the frame.
 */

const TINTS = [
  "from-[#2f3f34] to-[#43614d]",
  "from-[#3b3226] to-[#6b5a3e]",
  "from-[#2b3540] to-[#44566b]",
  "from-[#3d2b2b] to-[#6b4444]",
  "from-[#2f3a3a] to-[#4a6060]",
  "from-[#37324a] to-[#565073]",
];

function monogram(name: string) {
  const words = name
    .replace(/^M\/s\.?\s*/i, "")
    .split(/[\s.]+/)
    .filter((w) => /[a-z]/i.test(w) && !/^(hotel|the|and|of)$/i.test(w));
  return ((words[0]?.[0] ?? name[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

/**
 * A number an international visitor can actually dial.
 *
 * The register prints local STD form — "03592-250304", sometimes with further
 * numbers after a slash. That is correct as printed and valid as a tel: URI,
 * but a phone abroad cannot place the call: the leading 0 is India's national
 * trunk prefix and has to become +91. This platform now narrates in Japanese,
 * Korean, Mandarin, Arabic and Russian, so its visitors are exactly the people
 * for whom the local form does not work.
 *
 * The displayed text is left as the register prints it. Only the dial string
 * is rewritten, and only when the shape is unambiguous — anything already
 * carrying a country code, or too short to be a full number, is passed through
 * rather than guessed at.
 */
function dialable(raw: string): string {
  const first = (raw.split(/[\/,;]/)[0] ?? raw).replace(/[^\d+]/g, "");
  if (first.startsWith("+")) return first;
  if (first.startsWith("0") && first.length >= 10) return `+91${first.slice(1)}`;
  if (first.length === 10) return `+91${first}`;
  return first;
}

function tintFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function CuratedStays({
  districts,
  grades,
}: {
  districts: DistrictGroup[];
  grades: StarGrade[];
}) {
  const stays = useMemo(() => districts.flatMap((d) => d.stays), [districts]);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [grade, setGrade] = useState("");
  const deferred = useDeferredValue(query);

  /*
   * Matching ignores spacing and punctuation.
   *
   * The register writes "May Fair Resort" as two words; every visitor writes
   * "Mayfair". Matched literally, the best-known hotel in Gangtok returns
   * nothing to the one query most likely to be typed for it. Collapsing both
   * sides to letters and digits fixes that whole class — "Nor-Khill" against
   * "Norkhill", "M/s.Mintokling" against "Mintokling" — without any per-name
   * alias list to maintain.
   */
  const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

  /*
   * Matching also runs over the former cardinal district name, because a
   * visitor who types "West Sikkim" is asking a real question and the register
   * only knows the word "Gyalshing".
   */
  const groups = useMemo(() => {
    const q = squash(deferred);
    return districts
      .filter((group) => !district || group.name === district)
      .map((group) => ({
        ...group,
        stays: group.stays.filter((stay) => {
          if (grade && stay.starCategory !== grade) return false;
          if (!q) return true;
          return (
            squash(stay.name).includes(q) ||
            squash(stay.address ?? "").includes(q) ||
            squash(stay.district).includes(q) ||
            squash(group.formerName).includes(q)
          );
        }),
      }))
      .filter((group) => group.stays.length > 0);
  }, [districts, deferred, district, grade]);

  const matchCount = groups.reduce((total, group) => total + group.stays.length, 0);

  const active = Boolean(query || district || grade);
  const reset = () => {
    setQuery("");
    setDistrict("");
    setGrade("");
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-subtle" aria-hidden />
          <span className="sr-only">Search state-graded stays</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by property, locality or district — Mayfair, Pelling, West Sikkim…"
            className="h-12 w-full rounded-full border bg-surface pr-4 pl-10 text-body focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="sr-only">Grade</span>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="h-12 rounded-full border border-border-strong bg-surface px-4 text-small"
          >
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* District navigation.
          Selecting a district filters to it; the counts are live, so a chip
          reading "0" never appears and a visitor can see where the graded
          properties actually are before clicking anything. */}
      <nav className="mt-4 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Districts">
        <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
          <li>
            <DistrictChip
              selected={district === ""}
              onClick={() => setDistrict("")}
              label="All districts"
              count={stays.length}
            />
          </li>
          {districts.map((group) => (
            <li key={group.name}>
              <DistrictChip
                selected={district === group.name}
                onClick={() => setDistrict(group.name)}
                label={group.name}
                sublabel={group.formerName}
                count={
                  groups.find((candidate) => candidate.name === group.name)?.stays.length ??
                  0
                }
                total={group.stays.length}
              />
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span>
          {matchCount} {matchCount === 1 ? "property" : "properties"}
          {active ? " match" : ` graded by the state, across ${districts.length} districts`}
        </span>
        {active ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <X className="size-3.5" aria-hidden /> Clear
          </button>
        ) : null}
      </p>

      {groups.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-8 text-center text-body text-muted">
          No graded property matches that. Only {stays.length} of Sikkim&apos;s
          registered hotels carry a state grade — the rest are on the full
          register.
        </p>
      ) : (
        groups.map((group) => (
          <section
            key={group.name}
            id={`district-${group.slug}`}
            className="mt-10 scroll-mt-24"
            aria-labelledby={`district-heading-${group.slug}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-2">
              <h2 id={`district-heading-${group.slug}`} className="font-display text-h3">
                {group.name}
              </h2>
              <p className="font-mono text-caption tracking-wide text-subtle uppercase">
                formerly {group.formerName} · {group.stays.length}{" "}
                {group.stays.length === 1 ? "property" : "properties"}
              </p>
            </div>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.stays.map((stay) => {
                /* A photograph of the hotel itself where one exists; the
                   captioned district stand-in where none does. Six of the
                   twenty-two have their own. */
                const own = stayImages(stay.slug)[0];
                const photo = own ? undefined : stayPhoto(stay);
                return (
                <li
                  key={stay.slug}
                  className="relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-surface p-5 shadow-soft transition-colors hover:border-accent"
                >
                  {own ? (
                    <figure className="-mx-5 -mt-5 mb-1">
                      <div className="relative h-32 overflow-hidden bg-surface-muted">
                        {/* Served from the property's own site — see
                            StayGallery for why no copy is taken. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={own.url}
                          alt={`${stay.name}${own.alt ? ` — ${own.alt}` : ""}`}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <div className="gradient-overlay absolute inset-0" aria-hidden />
                        <span
                          aria-hidden
                          className="absolute top-2 left-3 font-display text-h4 text-foreground-inverse text-glow"
                        >
                          {monogram(stay.name)}
                        </span>
                      </div>
                    </figure>
                  ) : photo ? (
                    <figure className="-mx-5 -mt-5 mb-1">
                      <div className="relative h-32 bg-surface-muted">
                        <Image
                          src={photo.localPath}
                          alt={`${photo.placeName}, ${photo.placeDistrict} district — not a photograph of ${stay.name}`}
                          fill
                          sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 92vw"
                          className="object-cover"
                        />
                        <div className="gradient-overlay absolute inset-0" aria-hidden />
                        {/* The property's own mark stays, over the frame: it is
                            what makes one card distinguishable from another at a
                            glance, and it is the only graphic here that belongs
                            to the hotel. */}
                        <span
                          aria-hidden
                          className="absolute top-2 left-3 font-display text-h4 text-foreground-inverse text-glow"
                        >
                          {monogram(stay.name)}
                        </span>
                        <figcaption className="absolute inset-x-0 bottom-0 px-3 pb-2 font-mono text-caption text-foreground-inverse/90">
                          {photo.placeName} · not this property
                        </figcaption>
                      </div>
                    </figure>
                  ) : (
                    <div
                      aria-hidden
                      className={`-mx-5 -mt-5 mb-1 flex h-24 items-center justify-center bg-linear-to-br ${tintFor(stay.name)}`}
                    >
                      <span className="font-display text-h2 text-foreground-inverse/90">
                        {monogram(stay.name)}
                      </span>
                    </div>
                  )}

                  <h3 className="text-body font-semibold text-balance-heading">
                    <Link
                      href={`/stays/${stay.slug}`}
                      className="after:absolute after:inset-0 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {stay.name}
                    </Link>
                  </h3>

                  {stay.address ? (
                    <p className="text-caption leading-relaxed text-muted">{stay.address}</p>
                  ) : null}

                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-caption text-subtle">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden />
                      {stay.district}
                    </span>
                    <Badge tone="neutral">{stay.starCategory}</Badge>
                  </p>

                  {stay.registrationNo ? (
                    <p className="font-mono text-caption text-subtle">
                      Reg. {stay.registrationNo}
                    </p>
                  ) : null}

                  {/* Calling is the only booking route that could be verified
                      for these properties, so it leads. */}
                  <div className="relative z-1 mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-small font-medium">
                    <Link
                      href={`/stays/${stay.slug}`}
                      className={buttonClasses({ variant: "primary", size: "sm" })}
                    >
                      View stay
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                    {stay.phone ? (
                      <a
                        href={`tel:${dialable(stay.phone)}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        Call
                      </a>
                    ) : null}
                    <a
                      href={stay.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      {stay.mapsIsExact ? "Open location" : "Find on Maps"}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </div>

                  {/* The licence is satisfied by naming the author and the
                      terms, not by the file page link alone — so both are here,
                      under the frame they belong to. */}
                  {photo ? (
                    <p className="relative z-1 border-t pt-2 text-caption text-subtle">
                      Photograph: {photo.placeName}, {photo.placeDistrict} district. ©{" "}
                      {photo.attribution} ·{" "}
                      <a
                        href={photo.descriptionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-dotted underline-offset-2 hover:no-underline"
                      >
                        {photo.license}
                      </a>
                    </p>
                  ) : null}
                </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/**
 * One district in the navigation.
 *
 * The count is the number matching the current search and grade, and `total`
 * is how many the district holds in all. Showing "2 of 4" while a filter is
 * active tells a visitor that the district has more than they are seeing,
 * which a bare number does not.
 */
function DistrictChip({
  selected,
  onClick,
  label,
  sublabel,
  count,
  total,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
  count: number;
  total?: number;
}) {
  const narrowed = total !== undefined && count !== total;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-surface hover:border-accent"
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      {sublabel ? (
        <span
          className={`hidden font-mono text-caption whitespace-nowrap sm:inline ${
            selected ? "text-primary-foreground/75" : "text-subtle"
          }`}
        >
          {sublabel}
        </span>
      ) : null}
      <span
        className={`font-mono text-caption tabular-nums ${
          selected ? "text-primary-foreground/75" : "text-subtle"
        }`}
      >
        {narrowed ? `${count}/${total}` : count}
      </span>
    </button>
  );
}
