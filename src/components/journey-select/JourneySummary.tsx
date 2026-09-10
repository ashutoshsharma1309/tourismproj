"use client";

import { ArrowRight, Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useJourney } from "@/lib/journey/JourneyProvider";

interface Coverage {
  name: string;
  country: string;
  places: number;
  stories: number;
  history: number;
}

/**
 * The journey, summarised.
 *
 * EVERY NUMBER HERE IS INVENTORY, NOT ENGAGEMENT
 * ----------------------------------------------
 * "12 places, 5 stories" means the destination HOLDS those; it does not claim
 * the visitor read them, because nothing in this product measures that. The
 * wording says so. An engagement figure would be the easiest fabrication in
 * the whole product to ship and the hardest for a reader to catch.
 *
 * RESETTING ASKS FIRST
 * --------------------
 * Clearing is the one destructive action here, and it is two clicks with the
 * consequence stated — a journey somebody built over several minutes should
 * not evaporate on a mis-tap.
 */
export function JourneySummary({ coverage }: { coverage: Record<string, Coverage> }) {
  const { journey, hydrated, isComplete, current, finished, clear } = useJourney();
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!hydrated) {
    return <p className="text-body text-muted">Loading your journey…</p>;
  }

  if (journey.destinations.length === 0) {
    return (
      <>
        <h1 className="font-display text-h1 text-balance-heading">No journey yet</h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          Choose destinations on the homepage and they will appear here, in the
          order you picked them, with what each one holds.
        </p>
        <Link
          href="/#destinations"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Choose destinations
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </>
    );
  }

  const chosen = journey.destinations;
  const totals = chosen.reduce(
    (sum, id) => {
      const c = coverage[id];
      if (!c) return sum;
      return {
        places: sum.places + c.places,
        stories: sum.stories + c.stories,
        history: sum.history + c.history,
      };
    },
    { places: 0, stories: 0, history: 0 },
  );
  const countries = new Set(chosen.map((id) => coverage[id]?.country).filter(Boolean));

  return (
    <>
      <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
        {finished ? "Journey complete" : "Your journey"}
      </p>
      <h1 className="mt-3 font-display text-h1 text-balance-heading">
        {finished
          ? `${chosen.length} destination${chosen.length === 1 ? "" : "s"}, explored`
          : `${journey.completed.length} of ${chosen.length} complete`}
      </h1>
      <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
        {chosen.length === 1
          ? "One destination, in the order you chose."
          : `${chosen.length} destinations across ${countries.size} ${countries.size === 1 ? "country" : "countries"}, in the order you chose them.`}
      </p>

      <ol className="mt-10 space-y-3">
        {chosen.map((id, index) => {
          const c = coverage[id];
          const done = isComplete(id);
          const here = id === current;
          return (
            <li
              key={id}
              className={`tile flex flex-wrap items-center gap-x-5 gap-y-2 p-5 ${
                here ? "border-primary" : ""
              }`}
            >
              <span
                className="font-mono text-h4 font-medium text-subtle"
                data-numeric
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/destinations/${id}`}
                  prefetch={false}
                  className="font-display text-h4 hover:text-primary hover:underline"
                >
                  {c?.name ?? id}
                </Link>
                <span className="mt-0.5 block text-caption text-subtle">
                  {c ? `${c.country} · ${c.places} places · ${c.stories} stories · ${c.history} dated events` : id}
                </span>
              </span>
              <span className="text-caption font-medium">
                {done ? (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Check className="size-4" aria-hidden />
                    Complete
                  </span>
                ) : here ? (
                  <span className="text-primary">Current</span>
                ) : (
                  <span className="text-subtle">Upcoming</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Inventory, stated as inventory. */}
      <section aria-labelledby="journey-holds" className="mt-10 border-t border-border pt-6">
        <h2 id="journey-holds" className="font-display text-h4">
          What these destinations hold
        </h2>
        <p className="mt-2 max-w-2xl text-body text-muted">
          Counted from the archive at build time. These are what is catalogued —
          not a measure of how much of it you read, which nothing here tracks.
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          {[
            [totals.places, "catalogued places"],
            [totals.stories, "stories"],
            [totals.history, "dated events"],
          ].map(([value, label]) => (
            <div key={String(label)}>
              <dt className="text-caption text-subtle">{label}</dt>
              <dd className="font-mono text-2xl font-medium" data-numeric>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        {current ? (
          <Link
            href={`/destinations/${current}`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {journey.completed.length > 0 ? "Continue your journey" : "Begin"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
        {chosen.length > 1 ? (
          <Link
            href={`/destinations/compare?ids=${chosen.slice(0, 4).join(",")}`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-small font-medium transition-colors hover:border-primary hover:text-primary"
          >
            Compare these destinations
          </Link>
        ) : null}

        {confirmingReset ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1.5">
            <span className="text-caption text-muted">
              Clear your destinations and progress?
            </span>
            <button
              type="button"
              onClick={() => {
                clear();
                setConfirmingReset(false);
              }}
              className="rounded-full bg-secondary px-3 py-1 text-caption font-medium text-foreground-inverse"
            >
              Yes, reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="rounded-full px-2 py-1 text-caption text-muted hover:text-primary"
            >
              Keep it
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-small font-medium text-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RotateCcw className="size-4" aria-hidden />
            Start over
          </button>
        )}
      </div>
    </>
  );
}
