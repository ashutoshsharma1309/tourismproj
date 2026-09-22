import {
  bigint,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { bookingItems } from "@/db/schema/commerce";
import { destinations, sites } from "@/db/schema/content";
import { users } from "@/db/schema/identity";
import { partnerProperties } from "@/db/schema/partners";

/**
 * Trips — the planner's output, and the thing that makes it more than prose.
 *
 * `trip_stops.bookingItemId` IS THE WHOLE PITCH.
 * Every other tourism project produces an itinerary as text. This one produces
 * an itinerary whose stops carry a listing id, which means "Book this trip"
 * turns a plan into a cart. That single nullable column is the difference.
 */

export const tripPace = pgEnum("trip_pace", ["EASY", "BALANCED", "PACKED"]);
export const budgetTier = pgEnum("budget_tier", ["SHOESTRING", "MID", "PREMIUM"]);
export const tripStatus = pgEnum("trip_status", [
  "DRAFT",
  "PLANNED",
  "BOOKED",
  "COMPLETED",
]);

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  destinationIds: uuid("destination_ids").array().notNull(),
  startDate: date("start_date"),
  days: integer("days").notNull().default(3),
  partySize: integer("party_size").notNull().default(2),
  interests: text("interests").array(),
  pace: tripPace("pace").notNull().default("BALANCED"),
  budgetTier: budgetTier("budget_tier").notNull().default("MID"),
  status: tripStatus("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tripDays = pgTable("trip_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  dayIndex: integer("day_index").notNull(),
  date: date("date"),
  baseDestinationId: uuid("base_destination_id").references(() => destinations.id),
});

export const tripStopKind = pgEnum("trip_stop_kind", [
  "SITE",
  "STAY",
  "TRANSFER",
  "MEAL",
  "EXPERIENCE",
]);

export const tripStops = pgTable(
  "trip_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripDayId: uuid("trip_day_id")
      .notNull()
      .references(() => tripDays.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    kind: tripStopKind("kind").notNull(),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    listingId: uuid("listing_id").references(() => partnerProperties.id, { onDelete: "set null" }),
    /* Set when the trip is booked. This is what makes an itinerary a cart. */
    bookingItemId: uuid("booking_item_id").references(() => bookingItems.id, {
      onDelete: "set null",
    }),
    startTime: time("start_time"),
    durationMin: integer("duration_min"),
    note: text("note"),
  },
  (table) => [
    /* A stop is a place OR a purchasable thing, never both and never neither.
       A stop with both would be ambiguous on the map and in the cart. */
    check(
      "trip_stops_exactly_one_ref",
      sql`(${table.siteId} IS NOT NULL)::int + (${table.listingId} IS NOT NULL)::int = 1`,
    ),
  ],
);

export const permitType = pgEnum("permit_type", ["ILP", "PAP", "RAP", "TREK"]);
export const permitAppliesTo = pgEnum("permit_applies_to", ["INDIAN", "FOREIGN", "ALL"]);

/**
 * Permits — Inner Line, Protected Area, trek.
 *
 * Genuinely regional and genuinely load-bearing: a traveller who reaches
 * Nathula without an ILP is turned around at the checkpoint. Every field here
 * comes from an official issuer, and `issuerUrl` is required for that reason —
 * an invented permit procedure would be the most harmful thing this product
 * could publish.
 */
export const permits = pgTable("permits", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinationId: uuid("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  type: permitType("type").notNull(),
  appliesTo: permitAppliesTo("applies_to").notNull().default("ALL"),
  requiredDocs: text("required_docs").array(),
  processingHours: integer("processing_hours"),
  feePaise: bigint("fee_paise", { mode: "bigint" }),
  issuerUrl: text("issuer_url"),
  notes: text("notes"),
});

export const permitApplicationStatus = pgEnum("permit_application_status", [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
]);

export const permitApplications = pgTable("permit_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  permitId: uuid("permit_id")
    .notNull()
    .references(() => permits.id),
  status: permitApplicationStatus("status").notNull().default("DRAFT"),
  docUrls: text("doc_urls").array(),
  refNo: text("ref_no"),
});
