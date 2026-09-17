import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";

/**
 * A traveller's own history with TerraStory: what they chose, what they
 * explored, the journeys and comparisons they made.
 *
 * WHY THESE TABLES AND NOT `trips`
 * --------------------------------
 * `trips` (schema/trip.ts) is the v2 bookable itinerary: dates, party size,
 * budget, day-by-day stops, and `destination_ids uuid[]` pointing at the
 * Sikkim-district `destinations` table. A TerraStory journey is an ordered
 * choice among the eighteen registry destinations (text ids such as
 * "jaipur") with per-destination progress. Forcing one into the other would
 * mean fake dates and ids that do not exist, so journeys get their own table
 * and `trips` stays for the booking extension.
 *
 * WHAT IS NEVER STORED
 * --------------------
 * No search text, no guide question text, no scroll, hover or click
 * streams, no IP address or device fingerprint. Destination ids are
 * validated against the registry and entity ids against that destination's
 * own records before a row is written (lib/account/events.ts), so a history
 * row can never name a place under the wrong destination.
 *
 * Every table cascades from `users`: deleting an account deletes its
 * history, and "clear history" is a set of deletes, not a soft flag.
 */

/** Meaningful exploration events. Nothing lower-level than a page or a choice. */
export const travelEventType = pgEnum("travel_event_type", [
  "DESTINATION_VIEWED",
  "PLACE_VIEWED",
  "STORY_VIEWED",
  "HISTORY_VIEWED",
  "CULTURE_VIEWED",
  "STAY_VIEWED",
  "JOURNEY_STARTED",
  "JOURNEY_COMPLETED",
  "COMPARISON_CREATED",
  "AI_GUIDE_USED",
]);

export const journeyStatus = pgEnum("journey_status", ["IN_PROGRESS", "COMPLETED", "ARCHIVED"]);

/**
 * Interests the traveller chose. `weight` is 1 for an explicit choice; the
 * column exists so a later "more / less of this" control needs no migration.
 * Demonstrated interests are never written here — they are derived from
 * history at read time, so clearing history removes them with nothing left
 * behind.
 */
export const userInterests = pgTable(
  "user_interests",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    interestId: text("interest_id").notNull(),
    weight: smallint("weight").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.interestId] }),
    check("user_interests_weight_range", sql`${table.weight} BETWEEN 1 AND 3`),
  ],
);

/**
 * Detailed events, kept for a bounded time (see RETENTION in
 * lib/account/store.ts) and aggregated into `destination_affinity`.
 * `client_event_id` makes a replayed batch — a retried beacon, or the
 * anonymous session merged at sign-in — idempotent.
 */
export const travelEvents = pgTable(
  "travel_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventType: travelEventType("event_type").notNull(),
    /* Null only for an event that belongs to no destination (the guide used
       from a global page, a comparison). */
    destinationId: text("destination_id"),
    /* "place:<slug>", "site:<slug>", "story:<slug>", "stay:<slug>", … */
    entityId: text("entity_id"),
    clientEventId: text("client_event_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("travel_events_user_time_idx").on(table.userId, table.occurredAt),
    index("travel_events_user_destination_idx").on(table.userId, table.destinationId),
    uniqueIndex("travel_events_user_client_event_unique").on(table.userId, table.clientEventId),
    check(
      "travel_events_viewed_has_destination",
      sql`${table.eventType} NOT IN ('DESTINATION_VIEWED','PLACE_VIEWED','STORY_VIEWED','HISTORY_VIEWED','CULTURE_VIEWED','STAY_VIEWED') OR ${table.destinationId} IS NOT NULL`,
    ),
  ],
);

/**
 * One row per destination a traveller has explored: first and last time,
 * and how many distinct explorations. This is what "Recently explored" and
 * "Destinations explored" read, so neither scans the event table.
 */
export const destinationAffinity = pgTable(
  "destination_affinity",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    destinationId: text("destination_id").notNull(),
    firstExploredAt: timestamp("first_explored_at", { withTimezone: true }).notNull().defaultNow(),
    lastExploredAt: timestamp("last_explored_at", { withTimezone: true }).notNull().defaultNow(),
    interactions: integer("interactions").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.destinationId] }),
    index("destination_affinity_user_recent_idx").on(table.userId, table.lastExploredAt),
  ],
);

export const userJourneys = pgTable(
  "user_journeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    destinationIds: text("destination_ids").array().notNull(),
    completedIds: text("completed_ids").array().notNull().default(sql`'{}'::text[]`),
    status: journeyStatus("status").notNull().default("IN_PROGRESS"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /* Set once, when the last destination is completed — never guessed. */
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("user_journeys_user_idx").on(table.userId, table.updatedAt),
    /* At most one journey in progress per traveller. */
    uniqueIndex("user_journeys_one_current").on(table.userId).where(sql`${table.status} = 'IN_PROGRESS'`),
    check(
      "user_journeys_completed_has_date",
      sql`${table.status} <> 'COMPLETED' OR ${table.completedAt} IS NOT NULL`,
    ),
  ],
);

/**
 * Comparisons, one row per distinct set of destinations. `comparison_key` is
 * the sorted ids joined by commas, so comparing Jaipur with Agra twice is one
 * row with `times_compared = 2`, not two.
 */
export const userComparisons = pgTable(
  "user_comparisons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    destinationIds: text("destination_ids").array().notNull(),
    comparisonKey: text("comparison_key").notNull(),
    timesCompared: integer("times_compared").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastComparedAt: timestamp("last_compared_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_comparisons_user_key_unique").on(table.userId, table.comparisonKey),
    index("user_comparisons_user_recent_idx").on(table.userId, table.lastComparedAt),
  ],
);
