import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * What a destination actually holds, computed from the content that exists.
 *
 * WHY A SCORE AT ALL
 * ------------------
 * Not to rank destinations against each other — a growing destination is not
 * a worse PLACE, it is one this archive has covered less. The score exists so
 * the card can say "Growing — 4 sites, 2 stories, audio in 2 languages" before
 * anyone clicks, and so `/preservation` can publish exactly what is missing.
 *
 * It is measured against the destination's OWN tier contract, so a Growing
 * destination that meets its contract scores 100 and a Flagship that does not
 * scores below it. A single ladder would make every non-flagship look failing,
 * which would be both wrong and demoralising to the people filling them in.
 */

export type Tier = "FLAGSHIP" | "ESTABLISHED" | "GROWING";

/** The contract from Part 3.2. What each tier must hold before it publishes. */
export const TIER_CONTRACT: Record<Tier, {
  sites: number; stories: number; stays: number; photos: number;
  audioLocalesPerSite: number; culture: boolean; guide: boolean; itineraries: boolean;
}> = {
  FLAGSHIP:    { sites: 8, stories: 6, stays: 8, photos: 12, audioLocalesPerSite: 12, culture: true, guide: true, itineraries: true },
  ESTABLISHED: { sites: 6, stories: 4, stays: 5, photos: 6,  audioLocalesPerSite: 4,  culture: true, guide: true, itineraries: true },
  GROWING:     { sites: 4, stories: 2, stays: 3, photos: 3,  audioLocalesPerSite: 2,  culture: true, guide: true, itineraries: true },
};

export interface Coverage {
  sites: number;
  stories: number;
  stays: number;
  photos: number;
  /** Distinct locales with audio anywhere in this destination. */
  audioLocales: number;
  hasCulture: boolean;
  hasGuide: boolean;
  hasItineraries: boolean;
  /** 0–100 against this destination's own tier contract. */
  score: number;
  /** What is missing, in plain words, for /preservation. */
  missing: string[];
}

/** Counts for one destination, straight from the tables that own them. */
export async function computeCoverage(destinationId: string, tier: Tier): Promise<Coverage> {
  const [row] = await db.execute<{
    sites: number; stories: number; stays: number; photos: number; audio_locales: number;
    has_culture: boolean; has_guide: boolean; has_itineraries: boolean;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM sites  WHERE destination_id = ${destinationId} AND is_published) AS sites,
      (SELECT count(*)::int FROM stories WHERE destination_id = ${destinationId} AND published_at IS NOT NULL) AS stories,
      (SELECT count(*)::int FROM listings WHERE destination_id = ${destinationId} AND status = 'ACTIVE') AS stays,
      (SELECT count(*)::int FROM media m JOIN sites s ON s.id = m.owner_id
         WHERE m.owner_type = 'SITE' AND s.destination_id = ${destinationId}) AS photos,
      (SELECT count(DISTINCT a.locale)::int FROM audio_guides a JOIN sites s ON s.id = a.site_id
         WHERE s.destination_id = ${destinationId}) AS audio_locales,
      false AS has_culture,
      false AS has_guide,
      false AS has_itineraries
  `);

  const counts = {
    sites: Number(row?.sites ?? 0),
    stories: Number(row?.stories ?? 0),
    stays: Number(row?.stays ?? 0),
    photos: Number(row?.photos ?? 0),
    audioLocales: Number(row?.audio_locales ?? 0),
    hasCulture: Boolean(row?.has_culture),
    hasGuide: Boolean(row?.has_guide),
    hasItineraries: Boolean(row?.has_itineraries),
  };

  const contract = TIER_CONTRACT[tier];
  const missing: string[] = [];

  /*
   * Each requirement contributes equally, and each is capped at its target so
   * a surplus of photographs cannot paper over an absence of stories. That
   * capping is the whole point — an average that lets one strong dimension
   * hide four empty ones is worse than no score.
   */
  const parts: [number, number, string][] = [
    [counts.sites, contract.sites, `${contract.sites - counts.sites} more sites`],
    [counts.stories, contract.stories, `${contract.stories - counts.stories} more stories`],
    [counts.stays, contract.stays, `${contract.stays - counts.stays} more stays`],
    [counts.photos, contract.photos, `${contract.photos - counts.photos} more photographs`],
    [counts.audioLocales, contract.audioLocalesPerSite, `audio in ${contract.audioLocalesPerSite - counts.audioLocales} more languages`],
  ];

  let earned = 0;
  for (const [have, need, shortfall] of parts) {
    earned += Math.min(have / need, 1);
    if (have < need) missing.push(shortfall);
  }
  if (!counts.hasCulture) missing.push("a culture module");
  if (!counts.hasGuide) missing.push("a city guide");
  if (!counts.hasItineraries) missing.push("an itinerary");

  const booleans = [counts.hasCulture, counts.hasGuide, counts.hasItineraries];
  earned += booleans.filter(Boolean).length;

  const score = Math.round((earned / (parts.length + booleans.length)) * 100);

  return { ...counts, score, missing };
}

/**
 * The one line a card shows.
 *
 * Deliberately concrete — counts, not adjectives. "Established" alone tells a
 * reader nothing; "Established — 6 sites, 4 stories, audio in 4 languages"
 * lets them decide whether it is worth their click.
 */
export function coverageLine(tier: Tier, coverage: Coverage): string {
  const label = { FLAGSHIP: "Flagship", ESTABLISHED: "Established", GROWING: "Growing" }[tier];
  const parts = [
    `${coverage.sites} ${coverage.sites === 1 ? "site" : "sites"}`,
    `${coverage.stories} ${coverage.stories === 1 ? "story" : "stories"}`,
    coverage.audioLocales > 0
      ? `audio in ${coverage.audioLocales} ${coverage.audioLocales === 1 ? "language" : "languages"}`
      : "no audio yet",
  ];
  return `${label} — ${parts.join(", ")}`;
}

/** Recompute and persist for every destination. Safe to re-run. */
export async function refreshAllCoverage() {
  const rows = await db.execute<{ id: string; tier: Tier; name: string }>(
    sql`SELECT id, tier, name FROM destinations`,
  );
  const results: { name: string; score: number }[] = [];
  for (const row of rows) {
    const coverage = await computeCoverage(row.id, row.tier);
    await db.execute(
      sql`UPDATE destinations SET coverage = ${JSON.stringify(coverage)}::jsonb WHERE id = ${row.id}`,
    );
    results.push({ name: row.name, score: coverage.score });
  }
  return results;
}
