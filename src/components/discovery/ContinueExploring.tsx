"use client";

import { ArrowRight, Landmark, Mountain, ScrollText, Clock3, Archive } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getVisitsServerSnapshot,
  getVisitsSnapshot,
  subscribeToVisits,
  suggestionsFrom,
} from "@/lib/visit-history";
import type { VisitKind, VisitLink } from "@/lib/visit-history";

const ICON: Record<VisitKind, typeof Landmark> = {
  monastery: Landmark,
  place: Mountain,
  story: ScrollText,
  event: Clock3,
  archive: Archive,
};

const LABEL: Record<VisitKind, string> = {
  monastery: "Monastery",
  place: "Place",
  story: "Story",
  event: "History",
  archive: "Archive",
};

function Row({ item }: { item: VisitLink }) {
  const Icon = ICON[item.kind] ?? Landmark;
  return (
    <li>
      <Link
        href={item.href}
        className="card-lift flex items-center gap-3 rounded-xl border bg-surface p-4"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold">{item.name}</span>
          <span className="mt-0.5 block font-mono text-caption text-subtle">
            {LABEL[item.kind] ?? "Page"}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Picks the thread back up.
 *
 * Renders nothing at all until it has read localStorage, and nothing on a first
 * visit — an empty "recommended for you" shelf is worse than no shelf, and this
 * section has to earn its place on the page by having something true to say.
 *
 * Reading storage happens in an effect rather than during render so the server
 * and the first client paint agree; the section then appears.
 */
export function ContinueExploring({ className }: { className?: string }) {
  const visits = useSyncExternalStore(
    subscribeToVisits,
    getVisitsSnapshot,
    getVisitsServerSnapshot,
  );

  /* Empty on the server and on a first visit — an empty "recommended for you"
     shelf is worse than no shelf. */
  if (visits.length === 0) return null;

  const recent = visits.slice(0, 3);
  const suggestions = suggestionsFrom(visits, 3);

  return (
    <section className={className} aria-labelledby="continue-exploring">
      <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
        Where you left off
      </p>
      <h2 id="continue-exploring" className="mt-3 font-display text-h2 text-balance-heading">
        Continue exploring
      </h2>
      <p className="mt-3 max-w-xl text-body text-muted">
        Taken from what you have opened on this device. It is not sent anywhere
        and it is not tied to you — clearing your browser storage clears it.
      </p>

      <div className="mt-7 grid gap-x-8 gap-y-8 md:grid-cols-2">
        <div>
          <h3 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
            Recently opened
          </h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {recent.map((visit) => (
              <Row key={visit.href} item={visit} />
            ))}
          </ul>
        </div>

        {suggestions.length > 0 ? (
          <div>
            <h3 className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
              Related to what you viewed
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {suggestions.map((item) => (
                <Row key={item.href} item={item} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <Link
        href="/explore"
        className="mt-6 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
      >
        Explore the whole map
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}
