import type { Metadata } from "next";
import Link from "next/link";

import { DestinationTileCard } from "@/components/account/DestinationTileCard";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { comparisonsFor, exploredDestinations, journeysFor, profileFor, viewedEntities } from "@/db/queries/account";
import { formatDate, whenExplored } from "@/lib/account/format";
import { describeViewed, destinationName, destinationTiles, journeyTitle } from "@/lib/account/views";
import { requireTraveller } from "@/lib/auth/session";
import { listDestinations } from "@/lib/destinations/registry";

export const metadata: Metadata = { title: "Travel history", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PLACES_SHOWN = 40;

/**
 * "What have I already explored, and what should I continue with?"
 *
 * Grouped, not a log: destinations with first and last visit, the places,
 * stories and stays opened, journeys and comparisons. Each list is bounded;
 * nothing loads the whole event table.
 */
export default async function TravelHistoryPage() {
  const session = await requireTraveller("/account/history");
  const [profile, explored, viewed, journeys, comparisons] = await Promise.all([
    profileFor(session.id),
    exploredDestinations(session.id, 18),
    viewedEntities(session.id, PLACES_SHOWN),
    journeysFor(session.id, 20),
    comparisonsFor(session.id, 20),
  ]);
  const now = new Date();
  const [tiles, items] = await Promise.all([
    destinationTiles(explored.map((row) => row.destinationId), profile?.locale ?? "en"),
    describeViewed(viewed),
  ]);
  const total = listDestinations().length;
  const nothing = explored.length === 0 && items.length === 0 && journeys.length === 0 && comparisons.length === 0;

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <p className="text-small">
          <Link href="/account" className="font-medium text-primary hover:underline">Your TerraStory</Link>
        </p>
        <h1 className="mt-2 font-display text-h1 text-balance-heading">Travel history</h1>
        <p className="mt-2 max-w-2xl text-body text-muted">
          What you have explored on TerraStory while signed in.{" "}
          {profile?.historyEnabled === false ? (
            <strong className="font-medium text-foreground">Recording is paused — nothing new is being added.</strong>
          ) : null}{" "}
          <Link href="/account/profile#privacy" className="font-medium text-primary hover:underline">Privacy controls</Link>
        </p>

        {nothing ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-6">
            <p className="text-body-lg">You haven&rsquo;t explored any destinations yet.</p>
            <Link href="/destinations" className={`${buttonClasses({ variant: "primary", size: "md" })} mt-4`}>
              Explore {total} destinations
            </Link>
          </div>
        ) : null}

        {/* ---------------------------------------------- recently explored */}
        {tiles.length > 0 ? (
          <section className="mt-10" aria-labelledby="recent">
            <h2 id="recent" className="font-display text-h2">Recently explored</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.slice(0, 3).map((tile) => {
                const row = explored.find((entry) => entry.destinationId === tile.id);
                return (
                  <li key={tile.id}>
                    <DestinationTileCard tile={tile} meta={row ? `Last explored ${whenExplored(row.lastExploredAt, now)}` : undefined} />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ---------------------------------------------- destinations explored */}
        {explored.length > 0 ? (
          <section className="mt-12" aria-labelledby="destinations">
            <h2 id="destinations" className="font-display text-h2">
              Destinations explored <span className="text-muted" data-numeric>({explored.length} of {total})</span>
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-small">
                <caption className="sr-only">Destinations you have explored, with first and last visit</caption>
                <thead>
                  <tr className="border-b border-border text-caption text-subtle">
                    <th scope="col" className="py-2 pr-4 font-medium">Destination</th>
                    <th scope="col" className="py-2 pr-4 font-medium">First explored</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Last explored</th>
                    <th scope="col" className="py-2 font-medium">Explorations</th>
                  </tr>
                </thead>
                <tbody>
                  {explored.map((row) => {
                    const tile = tiles.find((entry) => entry.id === row.destinationId);
                    if (!tile) return null;
                    return (
                      <tr key={row.destinationId} className="border-b border-border/60">
                        <th scope="row" className="py-3 pr-4 font-medium">
                          <Link href={tile.href} prefetch={false} className="hover:text-primary">{tile.name}</Link>
                        </th>
                        <td className="py-3 pr-4" data-numeric>{formatDate(row.firstExploredAt)}</td>
                        <td className="py-3 pr-4" data-numeric>{whenExplored(row.lastExploredAt, now)}</td>
                        <td className="py-3" data-numeric>{row.interactions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------- places explored */}
        {items.length > 0 ? (
          <section className="mt-12" aria-labelledby="places">
            <h2 id="places" className="font-display text-h2">Places, stories and stays explored</h2>
            {viewed.length >= PLACES_SHOWN ? (
              <p className="mt-1 text-caption text-subtle">The {PLACES_SHOWN} most recent.</p>
            ) : null}
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
              {items.map((item) => (
                <li key={item.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={item.href} prefetch={false} className="font-medium hover:text-primary">{item.title}</Link>
                    <p className="text-caption text-muted">{item.kindLabel} · {item.destinationName}</p>
                  </div>
                  <span className="text-caption text-subtle" data-numeric>{whenExplored(item.lastViewedAt, now)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---------------------------------------------- journeys */}
        <section className="mt-12" aria-labelledby="journeys">
          <h2 id="journeys" className="font-display text-h2">Journeys</h2>
          {journeys.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="text-body text-muted">You haven&rsquo;t started a journey yet.</p>
              <Link href="/destinations" className={`${buttonClasses({ variant: "secondary", size: "md" })} mt-4`}>Explore destinations</Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {journeys.map((journey) => (
                <li key={journey.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-h4">{journeyTitle(journey)}</p>
                    <Badge tone={journey.status === "COMPLETED" ? "success" : "info"}>
                      {journey.status === "COMPLETED" ? "Completed" : "In progress"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-small text-muted" data-numeric>
                    {journey.completedIds.length} of {journey.destinationIds.length} explored · started {formatDate(journey.createdAt)}
                    {journey.completedAt ? ` · completed ${formatDate(journey.completedAt)}` : ""}
                  </p>
                  {journey.status === "IN_PROGRESS" ? (
                    <Link href="/journey" className="mt-2 inline-flex min-h-11 items-center text-small font-medium text-primary hover:underline">Continue journey</Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------- comparisons */}
        <section className="mt-12" aria-labelledby="comparisons">
          <h2 id="comparisons" className="font-display text-h2">Comparisons</h2>
          {comparisons.length === 0 ? (
            <p className="mt-3 text-body text-muted">
              No comparisons yet.{" "}
              <Link href="/destinations/compare" className="font-medium text-primary hover:underline">Compare destinations</Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
              {comparisons.map((comparison) => (
                <li key={comparison.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <Link href={`/destinations/compare?ids=${comparison.destinationIds.join(",")}`} prefetch={false} className="font-medium hover:text-primary">
                    {comparison.destinationIds.map((id) => destinationName(id) ?? id).join(" · ")}
                  </Link>
                  <span className="text-caption text-subtle" data-numeric>
                    {formatDate(comparison.lastComparedAt)}
                    {comparison.timesCompared > 1 ? ` · compared ${comparison.timesCompared} times` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
