import type { Metadata } from "next";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import Link from "next/link";

import { DestinationTileCard } from "@/components/account/DestinationTileCard";
import { JourneyClaim } from "@/components/account/JourneyClaim";
import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import {
  comparisonsFor,
  currentJourney,
  exploredDestinations,
  interestsFor,
  profileFor,
} from "@/db/queries/account";
import { whenExplored, formatDate } from "@/lib/account/format";
import { destinationName, destinationTiles, journeyTitle } from "@/lib/account/views";
import { requireTraveller } from "@/lib/auth/session";
import { listDestinations } from "@/lib/destinations/registry";
import { recommendDestinations, recommendPlaces } from "@/lib/personalization/engine";
import { knowledge } from "@/lib/personalization/knowledge";
import { signalsFor } from "@/lib/personalization/signals";
import { INTEREST_LABEL, type JourneyInterest } from "@/lib/planner/types";

export const metadata: Metadata = { title: "Your TerraStory", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The signed-in home. It answers two questions in order: "where was I?" and
 * "what next?". A traveller with history sees continuation first; a new one
 * sees a single honest prompt to choose interests. Nothing on this page is
 * shown to fill space — every card is a stored fact or a recommendation
 * with its reason.
 */
export default async function AccountHome() {
  const session = await requireTraveller("/account");
  const [profile, interests, explored, journey, comparisons, signals, known] = await Promise.all([
    profileFor(session.id),
    interestsFor(session.id),
    exploredDestinations(session.id, 6),
    currentJourney(session.id),
    comparisonsFor(session.id, 3),
    signalsFor(session.id),
    knowledge(),
  ]);
  const locale = profile?.locale ?? "en";
  const now = new Date();
  const name = profile?.fullName?.split(" ")[0] ?? null;
  const hasHistory = explored.length > 0 || Boolean(journey) || comparisons.length > 0;

  const recommendations = recommendDestinations(signals, known, 4);
  /* A reason every card shares (usually "You explored …") is said once above
     the cards; each card keeps what is particular to it. */
  const sharedReasons =
    recommendations.length > 1
      ? (recommendations[0]?.reasons ?? []).filter((reason) => recommendations.every((rec) => rec.reasons.includes(reason)))
      : [];
  const [recentTiles, recommendedTiles, journeyTiles] = await Promise.all([
    destinationTiles(explored.map((row) => row.destinationId), locale),
    destinationTiles(recommendations.map((row) => row.destinationId), locale),
    destinationTiles(journey?.destinationIds ?? [], locale),
  ]);
  const latest = explored[0];
  const latestTile = recentTiles[0];
  const placesThere = latest ? recommendPlaces(latest.destinationId, signals, known, 3) : [];
  const destinationNames = Object.fromEntries(listDestinations().map((d) => [d.id, d.name]));
  const total = listDestinations().length;

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-h1 text-balance-heading">
              {hasHistory ? `Welcome back${name ? `, ${name}` : ""}` : "Welcome to TerraStory"}
            </h1>
            <p className="mt-2 max-w-2xl text-body-lg text-muted">
              {hasHistory
                ? "Pick up where you left off."
                : interests.length === 0
                  ? "Start by choosing what interests you."
                  : "Your interests are set. Open a destination and TerraStory will remember it for next time."}
            </p>
          </div>
          <nav aria-label="Account" className="flex flex-wrap gap-x-5 gap-y-2 text-small font-medium">
            <Link href="/account/history" className="text-primary hover:underline">Travel history</Link>
            <Link href="/account/interests" className="text-primary hover:underline">Interests</Link>
            <Link href="/account/profile" className="text-primary hover:underline">Profile &amp; privacy</Link>
          </nav>
        </header>

        <div className="mt-8">
          <JourneyClaim destinationNames={destinationNames} hasSavedJourney={Boolean(journey)} />
        </div>

        {/* ------------------------------------------- continue exploring */}
        {latest && latestTile ? (
          <section className="mt-10" aria-labelledby="continue">
            <h2 id="continue" className="font-display text-h2">Continue exploring</h2>
            <div className="mt-4">
              <DestinationTileCard
                tile={latestTile}
                size="lg"
                meta={`Last explored ${whenExplored(latest.lastExploredAt, now)}`}
              >
                {placesThere.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-caption text-subtle">Not yet seen, and matching your interests</p>
                    <ul className="mt-2 space-y-2">
                      {placesThere.map((place) => (
                        <li key={place.experience.id}>
                          <Link href={place.experience.href} prefetch={false} className="font-medium hover:text-primary">
                            {place.experience.title}
                          </Link>
                          <span className="block text-caption text-muted">{place.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </DestinationTileCard>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------- recently explored */}
        {recentTiles.length > 1 ? (
          <section className="mt-12" aria-labelledby="recent">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="recent" className="font-display text-h2">Recently explored</h2>
              <Link href="/account/history" className="text-small font-medium text-primary hover:underline">All travel history</Link>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentTiles.slice(1, 4).map((tile) => {
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

        {/* ------------------------------------------- recommended for you */}
        <section className="mt-12" aria-labelledby="recommended">
          <h2 id="recommended" className="flex items-center gap-2 font-display text-h2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            Recommended for you
          </h2>
          {recommendations.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="text-body text-muted">
                {interests.length === 0 && !hasHistory
                  ? "Choose your interests to get personalized recommendations."
                  : "Nothing new matches yet — you have explored every destination that fits your interests. Try adding an interest."}
              </p>
              <Link href="/account/interests" className={`${buttonClasses({ variant: "primary", size: "md" })} mt-4`}>
                Choose interests
              </Link>
            </div>
          ) : (
            <>
              {interests.length > 0 ? (
                <p className="mt-2 text-small text-muted">
                  Your interests: {interests.map((i) => INTEREST_LABEL[i as JourneyInterest] ?? i).join(", ")} ·{" "}
                  <Link href="/account/interests" className="font-medium text-primary hover:underline">Edit interests</Link>
                </p>
              ) : null}
              {sharedReasons.map((reason) => (
                <p key={reason} className="mt-2 text-small text-muted">{reason}</p>
              ))}
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {recommendations.map((recommendation) => {
                  const tile = recommendedTiles.find((entry) => entry.id === recommendation.destinationId);
                  if (!tile) return null;
                  return (
                    <li key={recommendation.destinationId}>
                      <DestinationTileCard tile={tile} cta="Explore">
                        <ul className="mt-3 space-y-1.5" aria-label={`Why ${tile.name} is recommended`}>
                          {recommendation.reasons.filter((reason) => !sharedReasons.includes(reason)).map((reason) => (
                            <li key={reason} className="text-small leading-relaxed text-muted">{reason}</li>
                          ))}
                        </ul>
                      </DestinationTileCard>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* ------------------------------------------- your journey */}
        <section className="mt-12" aria-labelledby="journey">
          <h2 id="journey" className="font-display text-h2">Your journey</h2>
          {journey ? (
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="font-display text-h4">{journeyTitle(journey)}</p>
              <p className="mt-1 text-small text-muted">
                In progress · {journey.completedIds.length} of {journey.destinationIds.length} explored · started {formatDate(journey.createdAt)}
              </p>
              <ol className="mt-3 flex flex-wrap gap-2">
                {journeyTiles.map((tile) => (
                  <li key={tile.id}>
                    <Link
                      href={tile.href}
                      prefetch={false}
                      className="inline-flex min-h-10 items-center rounded-full border border-border px-3 text-small hover:border-primary"
                    >
                      {journey.completedIds.includes(tile.id) ? "✓ " : ""}
                      {tile.name}
                    </Link>
                  </li>
                ))}
              </ol>
              <Link href="/journey" className={`${buttonClasses({ variant: "primary", size: "md" })} mt-4`}>
                Continue journey
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="text-body text-muted">You haven&rsquo;t started a journey yet.</p>
              <Link href="/destinations" className={`${buttonClasses({ variant: "secondary", size: "md" })} mt-4`}>
                Explore destinations
              </Link>
            </div>
          )}
        </section>

        {comparisons.length > 0 ? (
          <section className="mt-12" aria-labelledby="comparisons">
            <h2 id="comparisons" className="font-display text-h2">Recent comparisons</h2>
            <ul className="mt-4 space-y-2">
              {comparisons.map((comparison) => (
                <li key={comparison.id}>
                  <Link
                    href={`/destinations/compare?ids=${comparison.destinationIds.join(",")}`}
                    prefetch={false}
                    className="font-medium hover:text-primary"
                  >
                    {comparison.destinationIds.map((id) => destinationName(id) ?? id).join(" · ")}
                  </Link>
                  <span className="ml-2 text-caption text-muted">{formatDate(comparison.lastComparedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-14 rounded-xl bg-primary px-6 py-7 text-primary-foreground" aria-labelledby="explore-all">
          <h2 id="explore-all" className="flex items-center gap-2 font-display text-h3">
            <Compass className="size-5" aria-hidden />
            Explore {total} Indian destinations
          </h2>
          <p className="mt-1 text-body opacity-90">Places, stories, history, food and festivals — every one sourced.</p>
          <Link
            href="/destinations"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-5 text-small font-medium text-primary hover:opacity-90"
          >
            Explore {total} destinations
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
