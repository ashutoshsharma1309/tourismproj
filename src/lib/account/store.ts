import "server-only";

import { and, desc, eq, gt, inArray, lt, ne, notInArray, or, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import {
  auditLogs,
  bookings,
  destinationAffinity,
  permitApplications,
  reviews,
  trips,
  vendorDocuments,
  partnerProperties,
  partners,
  travelEvents,
  userComparisons,
  userInterests,
  userJourneys,
  users,
} from "@/db/schema";
import type { ValidEvent } from "@/lib/account/events";
import { isKnownDestination } from "@/lib/destinations/registry";
import { JOURNEY_PLACE_ID, MAX_JOURNEY_PLACES, placeDestination } from "@/lib/journey/state";
import { isLanguageCode } from "@/lib/i18n/languages";
import { ALL_INTERESTS, type JourneyInterest } from "@/lib/planner/types";

/**
 * Every write to a traveller's account. Each function takes the user id the
 * session resolved to; none accepts a target user from the client.
 *
 * RETENTION
 * ---------
 * Detailed events are kept for 180 days and at most 1,000 per traveller;
 * older ones are deleted as new ones arrive. What they added up to survives
 * in `destination_affinity` (first/last explored, how often) until the
 * traveller clears their history. Stated on the profile page.
 */

export const RETENTION_DAYS = 180;
export const RETENTION_MAX_EVENTS = 1_000;
/** The same view repeated within this window is one exploration, not several. */
const REPEAT_WINDOW_MS = 30 * 60 * 1000;

const EXPLORATION: readonly string[] = [
  "DESTINATION_VIEWED",
  "PLACE_VIEWED",
  "STORY_VIEWED",
  "HISTORY_VIEWED",
  "CULTURE_VIEWED",
  "STAY_VIEWED",
];

export type StoreResult<T> = { ok: true; data: T } | { ok: false; error: string };

/* ----------------------------------------------------------------- profile */

export async function saveProfile(
  userId: string,
  patch: { fullName?: string; locale?: string },
): Promise<StoreResult<null>> {
  if (!hasDatabase) return { ok: false, error: "Accounts are not available on this deployment." };
  const set: Partial<typeof users.$inferInsert> = {};
  if (patch.fullName !== undefined) set.fullName = patch.fullName;
  if (patch.locale !== undefined) {
    if (!isLanguageCode(patch.locale)) return { ok: false, error: "Unknown language." };
    set.locale = patch.locale;
  }
  if (Object.keys(set).length === 0) return { ok: true, data: null };
  await db.update(users).set(set).where(eq(users.id, userId));
  return { ok: true, data: null };
}

export async function setHistoryEnabled(userId: string, enabled: boolean): Promise<void> {
  if (!hasDatabase) return;
  await db.update(users).set({ historyEnabled: enabled }).where(eq(users.id, userId));
}

/* --------------------------------------------------------------- interests */

export function sanitiseInterests(values: readonly string[]): JourneyInterest[] {
  const known = new Set<string>(ALL_INTERESTS);
  return [...new Set(values)].filter((value): value is JourneyInterest => known.has(value));
}

/** Replace the traveller's chosen interests with exactly this set. */
export async function setInterests(userId: string, values: readonly string[]): Promise<JourneyInterest[]> {
  const interests = sanitiseInterests(values);
  if (!hasDatabase) return interests;
  await db.transaction(async (tx) => {
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));
    if (interests.length > 0) {
      await tx.insert(userInterests).values(interests.map((interestId) => ({ userId, interestId, weight: 1 })));
    }
  });
  return interests;
}

/* ------------------------------------------------------------------ events */

/** The client or an open transaction. Inside a transaction every query must
    use the transaction: on Vercel the pool holds ONE connection, and a second
    query through `db` would wait for it forever. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function historyOn(userId: string, executor: Executor = db): Promise<boolean> {
  const [row] = await executor.select({ on: users.historyEnabled }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.on ?? false;
}

/**
 * Store validated events for one traveller, set-based: one read of recent
 * repeats, one insert, one aggregate upsert per destination touched, one
 * prune. Idempotent per `clientEventId`; a view repeated within 30 minutes
 * is not stored again; nothing is stored while history is paused, and
 * nothing that happened before the last "clear history".
 */
export async function recordEvents(userId: string, events: ValidEvent[]): Promise<number> {
  if (!hasDatabase || events.length === 0) return 0;
  const [owner] = await db
    .select({ on: users.historyEnabled, clearedAt: users.historyClearedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!owner?.on) return 0;

  const key = (e: { type: string; destinationId: string | null; entityId: string | null }) =>
    `${e.type}|${e.destinationId ?? ""}|${e.entityId ?? ""}`;
  const oldest = events.reduce((min, event) => Math.min(min, event.occurredAt.getTime()), Date.now());
  const recent = await db
    .select({ eventType: travelEvents.eventType, destinationId: travelEvents.destinationId, entityId: travelEvents.entityId, occurredAt: travelEvents.occurredAt })
    .from(travelEvents)
    .where(and(eq(travelEvents.userId, userId), gt(travelEvents.occurredAt, new Date(oldest - REPEAT_WINDOW_MS))));
  const lastSeen = new Map<string, number>();
  for (const row of recent) {
    const k = key({ type: row.eventType, destinationId: row.destinationId, entityId: row.entityId });
    lastSeen.set(k, Math.max(lastSeen.get(k) ?? 0, row.occurredAt.getTime()));
  }

  const fresh: ValidEvent[] = [];
  for (const event of [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())) {
    if (owner.clearedAt && event.occurredAt <= owner.clearedAt) continue;
    const k = key(event);
    const seen = lastSeen.get(k);
    if (seen !== undefined && Math.abs(event.occurredAt.getTime() - seen) < REPEAT_WINDOW_MS) continue;
    lastSeen.set(k, event.occurredAt.getTime());
    fresh.push(event);
  }
  if (fresh.length === 0) return 0;

  const inserted = await db
    .insert(travelEvents)
    .values(
      fresh.map((event) => ({
        userId,
        eventType: event.type,
        destinationId: event.destinationId,
        entityId: event.entityId,
        clientEventId: event.clientEventId,
        occurredAt: event.occurredAt,
      })),
    )
    .onConflictDoNothing({ target: [travelEvents.userId, travelEvents.clientEventId] })
    .returning({ eventType: travelEvents.eventType, destinationId: travelEvents.destinationId, occurredAt: travelEvents.occurredAt });

  const perDestination = new Map<string, { count: number; first: Date; last: Date }>();
  for (const row of inserted) {
    if (!row.destinationId || !EXPLORATION.includes(row.eventType)) continue;
    const entry = perDestination.get(row.destinationId);
    if (!entry) perDestination.set(row.destinationId, { count: 1, first: row.occurredAt, last: row.occurredAt });
    else {
      entry.count += 1;
      if (row.occurredAt < entry.first) entry.first = row.occurredAt;
      if (row.occurredAt > entry.last) entry.last = row.occurredAt;
    }
  }
  for (const [destinationId, entry] of perDestination) {
    await db
      .insert(destinationAffinity)
      .values({ userId, destinationId, firstExploredAt: entry.first, lastExploredAt: entry.last, interactions: entry.count })
      .onConflictDoUpdate({
        target: [destinationAffinity.userId, destinationAffinity.destinationId],
        set: {
          interactions: sql`${destinationAffinity.interactions} + ${entry.count}`,
          lastExploredAt: sql`greatest(${destinationAffinity.lastExploredAt}, excluded.last_explored_at)`,
          firstExploredAt: sql`least(${destinationAffinity.firstExploredAt}, excluded.first_explored_at)`,
        },
      });
  }

  if (inserted.length > 0) await pruneEvents(userId);
  return inserted.length;
}

async function pruneEvents(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const keep = db
    .select({ id: travelEvents.id })
    .from(travelEvents)
    .where(eq(travelEvents.userId, userId))
    .orderBy(desc(travelEvents.occurredAt))
    .limit(RETENTION_MAX_EVENTS);
  /* One statement: older than the retention window, or beyond the newest 1,000. */
  await db
    .delete(travelEvents)
    .where(and(eq(travelEvents.userId, userId), or(lt(travelEvents.occurredAt, cutoff), notInArray(travelEvents.id, keep))));
}

/** A server-originated event (journey, comparison), respecting the pause. */
async function serverEvent(
  executor: Executor,
  userId: string,
  type: "JOURNEY_STARTED" | "JOURNEY_COMPLETED" | "COMPARISON_CREATED",
): Promise<void> {
  if (!(await historyOn(userId, executor))) return;
  await executor.insert(travelEvents).values({ userId, eventType: type });
}

/* ---------------------------------------------------------------- journeys */

export interface JourneyInput {
  destinationIds: string[];
  completedIds: string[];
  placeIds?: string[];
}

export function sanitiseJourney(input: JourneyInput): Required<JourneyInput> {
  const destinationIds = [...new Set(input.destinationIds)].filter(isKnownDestination).slice(0, 18);
  const completedIds = [...new Set(input.completedIds)].filter((id) => destinationIds.includes(id));
  const placeIds = [...new Set(input.placeIds ?? [])]
    .filter((id) => JOURNEY_PLACE_ID.test(id) && destinationIds.includes(placeDestination(id) ?? ""))
    .slice(0, MAX_JOURNEY_PLACES);
  return { destinationIds, completedIds, placeIds };
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value) => b.includes(value));

/**
 * Save the traveller's current journey from their device.
 *
 *   empty            → the journey in progress (if any) is archived, not "completed"
 *   no journey yet   → a new IN_PROGRESS journey (JOURNEY_STARTED)
 *   all completed    → COMPLETED with completed_at = now (JOURNEY_COMPLETED)
 *
 * Completion is recorded when TerraStory learns of it, and only when every
 * destination in the journey is marked done by the traveller.
 */
export async function saveCurrentJourney(userId: string, raw: JourneyInput) {
  if (!hasDatabase) return null;
  const { destinationIds, completedIds, placeIds } = sanitiseJourney(raw);
  const allDone = destinationIds.length > 0 && completedIds.length === destinationIds.length;

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(userJourneys)
      .where(and(eq(userJourneys.userId, userId), eq(userJourneys.status, "IN_PROGRESS")))
      .limit(1)
      .for("update");
    const now = new Date();

    if (destinationIds.length === 0) {
      if (current) {
        await tx.update(userJourneys).set({ status: "ARCHIVED", updatedAt: now }).where(eq(userJourneys.id, current.id));
      }
      return null;
    }

    if (!current) {
      /* The device still shows a journey that was already completed and
         saved: nothing new happened. */
      const [latest] = await tx
        .select()
        .from(userJourneys)
        .where(and(eq(userJourneys.userId, userId), eq(userJourneys.status, "COMPLETED")))
        .orderBy(desc(userJourneys.completedAt))
        .limit(1);
      if (latest && allDone && sameSet(latest.destinationIds, destinationIds)) return latest;

      const [created] = await tx
        .insert(userJourneys)
        .values({
          userId,
          destinationIds,
          completedIds,
          placeIds,
          status: allDone ? "COMPLETED" : "IN_PROGRESS",
          completedAt: allDone ? now : null,
        })
        .returning();
      await serverEvent(tx, userId, "JOURNEY_STARTED");
      if (allDone) await serverEvent(tx, userId, "JOURNEY_COMPLETED");
      return created ?? null;
    }

    const [updated] = await tx
      .update(userJourneys)
      .set({
        destinationIds,
        completedIds,
        placeIds,
        updatedAt: now,
        ...(allDone ? { status: "COMPLETED" as const, completedAt: now } : {}),
      })
      .where(and(eq(userJourneys.id, current.id), eq(userJourneys.userId, userId)))
      .returning();
    if (allDone) await serverEvent(tx, userId, "JOURNEY_COMPLETED");
    return updated ?? null;
  });
}

/* ------------------------------------------------------------- comparisons */

export async function recordComparison(userId: string, ids: readonly string[]): Promise<boolean> {
  if (!hasDatabase) return false;
  const destinationIds = [...new Set(ids)].filter(isKnownDestination).slice(0, 4);
  if (destinationIds.length < 2) return false;
  if (!(await historyOn(userId))) return false;
  const comparisonKey = [...destinationIds].sort().join(",");
  const now = new Date();
  const [row] = await db
    .insert(userComparisons)
    .values({ userId, destinationIds, comparisonKey, createdAt: now, lastComparedAt: now })
    .onConflictDoUpdate({
      target: [userComparisons.userId, userComparisons.comparisonKey],
      set: {
        timesCompared: sql`CASE WHEN ${userComparisons.lastComparedAt} > now() - interval '30 minutes' THEN ${userComparisons.timesCompared} ELSE ${userComparisons.timesCompared} + 1 END`,
        lastComparedAt: now,
      },
    })
    .returning({ timesCompared: userComparisons.timesCompared });
  if (row?.timesCompared === 1) await serverEvent(db, userId, "COMPARISON_CREATED");
  return true;
}

/* --------------------------------------------------------- privacy controls */

/**
 * Clear travel history: every event, every destination aggregate, every
 * comparison, and every journey that is not the one in progress. Chosen
 * interests stay — the traveller edits those separately — and the journey in
 * progress stays, because it is a plan rather than a record. Nothing derived
 * from history is cached anywhere, so recommendations change immediately.
 */
export async function clearHistory(userId: string) {
  if (!hasDatabase) return { events: 0, destinations: 0, comparisons: 0, journeys: 0 };
  return db.transaction(async (tx) => {
    await tx.update(users).set({ historyClearedAt: new Date() }).where(eq(users.id, userId));
    const events = await tx.delete(travelEvents).where(eq(travelEvents.userId, userId)).returning({ id: travelEvents.id });
    const destinations = await tx
      .delete(destinationAffinity)
      .where(eq(destinationAffinity.userId, userId))
      .returning({ id: destinationAffinity.destinationId });
    const comparisons = await tx.delete(userComparisons).where(eq(userComparisons.userId, userId)).returning({ id: userComparisons.id });
    const journeys = await tx
      .delete(userJourneys)
      .where(and(eq(userJourneys.userId, userId), ne(userJourneys.status, "IN_PROGRESS")))
      .returning({ id: userJourneys.id });
    return {
      events: events.length,
      destinations: destinations.length,
      comparisons: comparisons.length,
      journeys: journeys.length,
    };
  });
}

/**
 * Remove a traveller's data before their sign-in identity is deleted.
 * History tables cascade from `users`; the partner programme references the
 * user without cascading (a hotel's record and an audit trail outlive the
 * person who once signed in), so those references are cut first.
 */
export async function deleteAccountData(userId: string): Promise<StoreResult<null>> {
  if (!hasDatabase) return { ok: false, error: "Accounts are not available on this deployment." };
  /* Financial and business records are not erased by a self-service click:
     a booking (with its payment) or an operator business needs a person. */
  const [booking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.userId, userId)).limit(1);
  const [vendor] = await db
    .select({ id: partners.id })
    .from(partners)
    .innerJoin(partnerProperties, eq(partnerProperties.partnerId, partners.id))
    .where(and(eq(partners.ownerUserId, userId), inArray(partnerProperties.status, ["APPROVED", "PUBLISHED", "UNPUBLISHED"])))
    .limit(1);
  if (booking || vendor) {
    return { ok: false, error: "This account holds bookings or an operator business, which we must close with you. Please contact TerraStory from the About page." };
  }
  await db.transaction(async (tx) => {
    /* References that outlive the person: detach. */
    await tx.update(partners).set({ ownerUserId: null }).where(eq(partners.ownerUserId, userId));
    await tx.update(partnerProperties).set({ reviewerId: null }).where(eq(partnerProperties.reviewerId, userId));
    await tx.update(vendorDocuments).set({ reviewerId: null }).where(eq(vendorDocuments.reviewerId, userId));
    await tx.update(vendorDocuments).set({ uploadedBy: null }).where(eq(vendorDocuments.uploadedBy, userId));
    await tx.update(partners).set({ verifiedBy: null }).where(eq(partners.verifiedBy, userId));
    await tx.update(auditLogs).set({ actorId: null }).where(eq(auditLogs.actorId, userId));
    /* Personal records: delete (trip days and stops cascade from trips). */
    await tx.delete(reviews).where(eq(reviews.userId, userId));
    await tx.delete(permitApplications).where(eq(permitApplications.userId, userId));
    await tx.delete(trips).where(eq(trips.userId, userId));
    /* History, interests, journeys and comparisons cascade from users. */
    await tx.delete(users).where(eq(users.id, userId));
  });
  return { ok: true, data: null };
}
