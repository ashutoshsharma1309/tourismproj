"use client";

import { ExternalLink, MapPin, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

/**
 * The register, made searchable.
 *
 * The page previously showed twelve properties per district and linked out for
 * the rest, which left 835 of the 905 registered hotels unreachable from this
 * site — a visitor looking for a place they had already been recommended could
 * not find it here. Nothing below adds data. It makes the data that exists
 * findable, which is the part that was actually missing.
 *
 * The row shape is deliberately lean. Sending 905 full records into the browser
 * is how this project once shipped its entire story corpus to every route; the
 * Google Maps URL in particular is longer than the rest of a record put
 * together, so it is rebuilt on the client from the name and district instead
 * of being serialised 905 times.
 */

export interface StayRow {
  slug: string;
  name: string;
  district: string;
  address: string | null;
  category: string | null;
  registrationNo: string | null;
  mapsUrl: string;
  /** Present only where OpenStreetMap held a corroborated match. */
  located: boolean;
  confidence: "high" | "medium" | null;
  website: string | null;
  phone: string | null;
  /** Straight-line km to the landmarks a visitor measures against. */
  distances: Record<string, number> | null;
}

const PAGE = 24;

export function StaysExplorer({
  rows,
  districts,
}: {
  rows: StayRow[];
  districts: string[];
}) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [starred, setStarred] = useState(false);
  const [locatedOnly, setLocatedOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return rows.filter((row) => {
      if (district && row.district !== district) return false;
      if (starred && !row.category) return false;
      if (locatedOnly && !row.located) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        (row.address ?? "").toLowerCase().includes(q) ||
        row.district.toLowerCase().includes(q)
      );
    });
  }, [rows, deferred, district, starred, locatedOnly]);

  const visible = filtered.slice(0, shown);
  const active = Boolean(query || district || starred || locatedOnly);

  const reset = () => {
    setQuery("");
    setDistrict("");
    setStarred(false);
    setLocatedOnly(false);
    setShown(PAGE);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-subtle" aria-hidden />
          <span className="sr-only">Search registered stays</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE);
            }}
            placeholder="Search by property or locality — Pelling, Mayfair…"
            className="h-12 w-full rounded-full border bg-surface pr-4 pl-10 text-body focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="sr-only">District</span>
          <select
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setShown(PAGE);
            }}
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

        <button
          type="button"
          onClick={() => {
            setStarred((value) => !value);
            setShown(PAGE);
          }}
          aria-pressed={starred}
          className={buttonClasses({ variant: starred ? "primary" : "outline", size: "lg" })}
        >
          Star-graded only
        </button>

        <button
          type="button"
          onClick={() => {
            setLocatedOnly((value) => !value);
            setShown(PAGE);
          }}
          aria-pressed={locatedOnly}
          className={buttonClasses({ variant: locatedOnly ? "primary" : "outline", size: "lg" })}
        >
          Mapped only
        </button>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span>
          {filtered.length.toLocaleString()}{" "}
          {filtered.length === 1 ? "property" : "properties"}
          {active ? " match" : " on the register"}
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

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-8 text-center text-body text-muted">
          No registered property matches that. The register lists each name as
          the department recorded it, which is not always the name on the sign.
        </p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => (
              <li
                key={row.slug}
                className="flex flex-col gap-2 rounded-xl border bg-surface p-5 shadow-soft"
              >
                {/* The badge sat beside the name and squeezed it — at three
                    columns "May Fair Resort" broke across two lines to make
                    room for a grade only 22 of 905 properties even have. The
                    name gets the full width; the grade joins the meta line. */}
                <h3 className="text-body font-semibold text-balance-heading">{row.name}</h3>

                {row.address ? (
                  <p className="text-caption leading-relaxed text-muted">{row.address}</p>
                ) : null}

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-caption text-subtle">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden />
                    {row.district}
                  </span>
                  {row.category ? <Badge tone="neutral">{row.category}</Badge> : null}
                  {row.registrationNo ? <span>Reg. {row.registrationNo}</span> : null}
                </p>

                {/* Distances are straight-line from an OpenStreetMap coordinate,
                    so they are shown as "approx." and rounded to the kilometre.
                    Roads through this terrain are nothing like straight, and a
                    decimal place would be precision the number does not have. */}
                {row.distances ? (
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted">
                    <span>approx. {row.distances.bagdogra} km from Bagdogra</span>
                    <span>·</span>
                    <span>{row.distances.mgmarg} km from M.G. Marg</span>
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-small font-medium">
                  <a
                    href={row.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    {row.located ? "Open location" : "Find on Google Maps"}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                  {row.website ? (
                    <a
                      href={row.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      Website
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                  {row.phone ? (
                    <a href={`tel:${row.phone.replace(/\s+/g, "")}`} className="text-primary hover:underline">
                      Call
                    </a>
                  ) : null}
                </div>

                {row.confidence === "medium" ? (
                  <p className="text-caption text-subtle">
                    Location matched on a partial name; treat as approximate.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {shown < filtered.length ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((count) => count + PAGE * 2)}
                className={buttonClasses({ variant: "outline", size: "lg" })}
              >
                Show more — {(filtered.length - shown).toLocaleString()} remaining
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
