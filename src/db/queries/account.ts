import { and, count, desc, eq, inArray, max, ne, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import {
  destinationAffinity,
  travelEvents,
  userComparisons,
  userInterests,
  userJourneys,
  users,
} from "@/db/schema";

/**
 * Every read of a traveller's account. Each function takes the user id the
 * SESSION resolved to — never an id from a URL or a form — and every query
 * filters on it, so one traveller's rows cannot be read through another's
 * session. Lists are bounded: nothing here loads a whole history.
 */

export type ProfileRow = Pick<typeof users.$inferSelect, "id" | "email" | "fullName" | "locale" | "historyEnabled" | "createdAt" | "role">;

export async function profileFor(userId: string): Promise<ProfileRow | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      locale: users.locale,
      historyEnabled: users.historyEnabled,
      createdAt: users.createdAt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export async function interestsFor(userId: string): Promise<string[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ interestId: userInterests.interestId })
    .from(userInterests)
    .where(eq(userInterests.userId, userId))
    .orderBy(userInterests.interestId);
  return rows.map((row) => row.interestId);
}

export interface AffinityRow {
  destinationId: string;
  firstExploredAt: Date;
  lastExploredAt: Date;
  interactions: number;
}

export async function exploredDestinations(userId: string, limit = 18): Promise<AffinityRow[]> {
  if (!hasDatabase) return [];
  return db
    .select({
      destinationId: destinationAffinity.destinationId,
      firstExploredAt: destinationAffinity.firstExploredAt,
      lastExploredAt: destinationAffinity.lastExploredAt,
      interactions: destinationAffinity.interactions,
    })
    .from(destinationAffinity)
    .where(eq(destinationAffinity.userId, userId))
    .orderBy(desc(destinationAffinity.lastExploredAt))
    .limit(limit);
}

export interface ViewedRow {
  destinationId: string;
  entityId: string;
  eventType: string;
  lastViewedAt: Date;
  views: number;
}

/** Distinct places, stories, history entries and stays viewed, most recent first. */
export async function viewedEntities(userId: string, limit = 40): Promise<ViewedRow[]> {
  if (!hasDatabase) return [];
  const rows = await db
    .select({
      destinationId: travelEvents.destinationId,
      entityId: travelEvents.entityId,
      eventType: travelEvents.eventType,
      lastViewedAt: max(travelEvents.occurredAt),
      views: count(travelEvents.id),
    })
    .from(travelEvents)
    .where(and(eq(travelEvents.userId, userId), sql`${travelEvents.entityId} IS NOT NULL`))
    .groupBy(travelEvents.destinationId, travelEvents.entityId, travelEvents.eventType)
    .orderBy(desc(max(travelEvents.occurredAt)))
    .limit(limit);
  return rows
    .filter((row): row is typeof row & { destinationId: string; entityId: string; lastViewedAt: Date } =>
      row.destinationId !== null && row.entityId !== null && row.lastViewedAt !== null)
    .map((row) => ({ ...row, views: Number(row.views) }));
}

export type JourneyRow = typeof userJourneys.$inferSelect;

export async function currentJourney(userId: string): Promise<JourneyRow | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .select()
    .from(userJourneys)
    .where(and(eq(userJourneys.userId, userId), eq(userJourneys.status, "IN_PROGRESS")))
    .limit(1);
  return row ?? null;
}

export async function journeysFor(userId: string, limit = 12): Promise<JourneyRow[]> {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(userJourneys)
    .where(and(eq(userJourneys.userId, userId), ne(userJourneys.status, "ARCHIVED")))
    .orderBy(desc(userJourneys.updatedAt))
    .limit(limit);
}

export type ComparisonRow = typeof userComparisons.$inferSelect;

export async function comparisonsFor(userId: string, limit = 12): Promise<ComparisonRow[]> {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(userComparisons)
    .where(eq(userComparisons.userId, userId))
    .orderBy(desc(userComparisons.lastComparedAt))
    .limit(limit);
}

export interface ActivitySummary {
  destinations: number;
  places: number;
  stories: number;
  journeys: number;
  comparisons: number;
}

export async function activitySummary(userId: string): Promise<ActivitySummary> {
  const empty = { destinations: 0, places: 0, stories: 0, journeys: 0, comparisons: 0 };
  if (!hasDatabase) return empty;
  const [destinations, entities, journeys, comparisons] = await Promise.all([
    db.select({ n: count() }).from(destinationAffinity).where(eq(destinationAffinity.userId, userId)),
    db
      .select({ eventType: travelEvents.eventType, n: sql<number>`count(distinct ${travelEvents.entityId})` })
      .from(travelEvents)
      .where(and(eq(travelEvents.userId, userId), inArray(travelEvents.eventType, ["PLACE_VIEWED", "STORY_VIEWED"])))
      .groupBy(travelEvents.eventType),
    db.select({ n: count() }).from(userJourneys).where(and(eq(userJourneys.userId, userId), ne(userJourneys.status, "ARCHIVED"))),
    db.select({ n: count() }).from(userComparisons).where(eq(userComparisons.userId, userId)),
  ]);
  return {
    destinations: Number(destinations[0]?.n ?? 0),
    places: Number(entities.find((row) => row.eventType === "PLACE_VIEWED")?.n ?? 0),
    stories: Number(entities.find((row) => row.eventType === "STORY_VIEWED")?.n ?? 0),
    journeys: Number(journeys[0]?.n ?? 0),
    comparisons: Number(comparisons[0]?.n ?? 0),
  };
}
