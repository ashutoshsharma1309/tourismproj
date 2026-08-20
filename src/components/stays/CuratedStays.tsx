"use client";

import { ExternalLink, MapPin, Phone, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import type { CuratedStay, StarGrade } from "@/data/curated-stays";

/**
 * The curated stays grid.
 *
 * Twenty-two properties do not need pagination or a virtualised list, so this
 * shows all of them, grouped by grade — which is the only ranking in the data
 * that this project did not invent. Search and the two filters exist because a
 * visitor arriving with a name in mind should not have to scan for it.
 *
 * Each property has no photograph, and that is a researched finding rather than
 * a gap: Commons was searched for every one of them, OpenStreetMap carries no
 * image tags, and of the official websites only three resolve to a real
 * property page. So the card leads with a monogram panel — the property's
 * initials over a tint derived from its name, so the same hotel always looks
 * the same. It is plainly a graphic, which is the point: a stock hotel interior
 * would be the invention this directory exists to avoid.
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

function tintFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function CuratedStays({
  stays,
  districts,
  grades,
}: {
  stays: CuratedStay[];
  districts: string[];
  grades: StarGrade[];
}) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [grade, setGrade] = useState("");
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return stays.filter((stay) => {
      if (district && stay.district !== district) return false;
      if (grade && stay.starCategory !== grade) return false;
      if (!q) return true;
      return (
        stay.name.toLowerCase().includes(q) ||
        (stay.address ?? "").toLowerCase().includes(q) ||
        stay.district.toLowerCase().includes(q)
      );
    });
  }, [stays, deferred, district, grade]);

  const active = Boolean(query || district || grade);
  const reset = () => {
    setQuery("");
    setDistrict("");
    setGrade("");
  };

  /* Grouped by grade, highest first, so the page reads as a ranking rather
     than as an alphabetical list. */
  const groups = grades
    .map((g) => ({ grade: g, items: filtered.filter((s) => s.starCategory === g) }))
    .filter((group) => group.items.length > 0);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-subtle" aria-hidden />
          <span className="sr-only">Search state-graded stays</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by property or locality — Denzong, Pelling…"
            className="h-12 w-full rounded-full border bg-surface pr-4 pl-10 text-body focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="sr-only">District</span>
          <select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="h-12 rounded-full border border-border-strong bg-surface px-4 text-small"
          >
            <option value="">All districts</option>
            {districts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
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

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span>
          {filtered.length} {filtered.length === 1 ? "property" : "properties"}
          {active ? " match" : " graded by the state"}
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
          <section key={group.grade} className="mt-10" aria-labelledby={`grade-${group.grade}`}>
            <h2
              id={`grade-${group.grade}`}
              className="font-mono text-eyebrow tracking-widest text-subtle uppercase"
            >
              {group.grade} · {group.items.length}
            </h2>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((stay) => (
                <li
                  key={stay.slug}
                  className="flex flex-col gap-2 overflow-hidden rounded-xl border bg-surface p-5 shadow-soft"
                >
                  <div
                    aria-hidden
                    className={`-mx-5 -mt-5 mb-1 flex h-24 items-center justify-center bg-gradient-to-br ${tintFor(stay.name)}`}
                  >
                    <span className="font-display text-h2 text-foreground-inverse/90">
                      {monogram(stay.name)}
                    </span>
                  </div>

                  <p className="text-body font-semibold text-balance-heading">{stay.name}</p>

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
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-small font-medium">
                    {stay.phone ? (
                      <a
                        href={`tel:${(stay.phone.split(/[\/,]/)[0] ?? stay.phone).replace(/\s+/g, "")}`}
                        className={buttonClasses({ variant: "primary", size: "sm" })}
                      >
                        <Phone className="size-3.5" aria-hidden />
                        Call to book
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
                    {stay.officialWebsite ? (
                      <a
                        href={stay.officialWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        Website
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
