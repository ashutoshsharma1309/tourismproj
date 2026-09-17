import "server-only";

import { exploredDestinations, interestsFor, viewedEntities } from "@/db/queries/account";
import type { Signals } from "@/lib/personalization/engine";
import { sanitiseInterests } from "@/lib/account/store";

/**
 * A traveller's personalization signals, read fresh from their account on
 * every call. Nothing derived is cached or stored, so clearing history or
 * changing interests changes the next recommendation immediately.
 */
export async function signalsFor(userId: string): Promise<Signals> {
  const [interests, explored, viewed] = await Promise.all([
    interestsFor(userId),
    exploredDestinations(userId, 18),
    viewedEntities(userId, 200),
  ]);
  return {
    interests: sanitiseInterests(interests),
    explored: explored.map((row) => ({
      destinationId: row.destinationId,
      interactions: row.interactions,
      lastExploredAt: row.lastExploredAt,
    })),
    viewed: viewed
      .filter((row) => row.eventType === "PLACE_VIEWED")
      .map((row) => ({ destinationId: row.destinationId, entityId: row.entityId })),
  };
}

export function hasAnySignal(signals: Signals): boolean {
  return signals.interests.length > 0 || signals.explored.length > 0 || signals.viewed.length > 0;
}
