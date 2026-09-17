import {
  bigint,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { destinations } from "@/db/schema/content";
import { users, vendorType, vendors } from "@/db/schema/identity";
import { partnerProperties, partners } from "@/db/schema/partners";

/**
 * Commerce — inventory, money, and the one table the whole product turns on.
 *
 * MONEY IS bigint PAISE. ALWAYS.
 * No floats, no rupees, no `number`. Every field ends in `Paise`, and the
 * only place a rupee exists is `formatINR()` at the render boundary. A float
 * rupee is how a booking total ends up as ₹1,234.5600000001.
 */

export const listingStatus = pgEnum("listing_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "DELISTED",
]);

export const cancellationPolicy = pgEnum("cancellation_policy", [
  "FLEXIBLE",
  "MODERATE",
  "STRICT",
]);

/**
 * @deprecated RETIRED — no inventory is written here. Listings are partner
 * properties (partners.ts); units, availability, booking items, payouts and
 * reviews reference those. The table stays only because the build already
 * deployed on this database still counts it; drop it once that build is
 * replaced (docs/partner-inventory.md).
 */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id),
    type: vendorType("type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    amenities: text("amenities").array(),
    basePricePaise: bigint("base_price_paise", { mode: "bigint" }).notNull(),
    maxGuests: integer("max_guests").notNull().default(2),
    cancellationPolicy: cancellationPolicy("cancellation_policy")
      .notNull()
      .default("MODERATE"),
    status: listingStatus("status").notNull().default("DRAFT"),
    ratingAvg: numeric("rating_avg", { precision: 2, scale: 1 }),
    ratingCount: integer("rating_count").notNull().default(0),
  },
  (table) => [
    index("listings_destination_type_status_idx").on(
      table.destinationId,
      table.type,
      table.status,
    ),
    /* An ACTIVE listing whose vendor is not VERIFIED is the failure mode that
       gets a marketplace shut down. The constraint that actually prevents it
       needs a subquery, so it is a trigger in the migration; this check keeps
       the price sane in the meantime. */
    check("listings_price_non_negative", sql`${table.basePricePaise} >= 0`),
  ],
);

/**
 * The countable thing a listing sells: "Deluxe double", "Innova 6-seater",
 * "Morning batch". A listing is a shopfront; a unit is inventory.
 *
 * `listing_id` names a partner property — the verified listing a partner
 * owns (partners.ts). It once pointed at `listings`, which no code wrote;
 * both models described the same supply, so inventory now hangs off the one
 * that has verification, ownership and review behind it.
 */
export const listingUnits = pgTable(
  "listing_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => partnerProperties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull().default(2),
    totalQuantity: integer("total_quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("listing_units_listing_name_unique").on(table.listingId, table.name),
    check("listing_units_capacity_range", sql`${table.capacity} BETWEEN 1 AND 50`),
    check("listing_units_quantity_range", sql`${table.totalQuantity} BETWEEN 1 AND 500`),
  ],
);

/**
 * ★ THE BOOKING ENGINE.
 *
 * One row per (unit, date). Every "is this bookable" read and every "hold
 * this" write goes through here inside a transaction.
 *
 * WHY ONE ROW PER DAY AND NOT A DATE RANGE
 * ----------------------------------------
 * Range rows require overlap arithmetic on every read and every write, and
 * overlap arithmetic is where booking bugs live. A row per day makes the
 * lock trivial (`WHERE date BETWEEN … FOR UPDATE`), makes a per-night price
 * override a column rather than a special case, and makes the calendar a
 * direct select.
 *
 * The cost is row count: 90 days × 3 units × 30 listings is 8,100 rows, which
 * Postgres does not notice.
 *
 * THREE COUNTERS, NOT ONE
 * -----------------------
 * `unitsOpen` is what a traveller can take. `unitsHeld` is reserved but
 * unpaid. `unitsBooked` is paid. A hold moves open → held; a captured payment
 * moves held → booked; an expired hold moves held → open. Keeping them
 * separate is what lets the release cron be a simple, safe reversal.
 */
export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingUnitId: uuid("listing_unit_id")
      .notNull()
      .references(() => listingUnits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    unitsOpen: integer("units_open").notNull().default(0),
    unitsHeld: integer("units_held").notNull().default(0),
    unitsBooked: integer("units_booked").notNull().default(0),
    pricePaiseOverride: bigint("price_paise_override", { mode: "bigint" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("availability_unit_date_unique").on(table.listingUnitId, table.date),
    index("availability_open_idx").on(table.date),
    check("availability_open_non_negative", sql`${table.unitsOpen} >= 0`),
    check("availability_held_non_negative", sql`${table.unitsHeld} >= 0`),
    check("availability_booked_non_negative", sql`${table.unitsBooked} >= 0`),
  ],
);

export const bookingStatus = pgEnum("booking_status", [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "REFUNDED",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /* "DRS-7K4QX2" — short enough to read down a phone line, which is how a
       homestay owner will actually receive it. */
    code: text("code").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: bookingStatus("status").notNull().default("PENDING_PAYMENT"),
    totalPaise: bigint("total_paise", { mode: "bigint" }).notNull(),
    guestCount: integer("guest_count").notNull().default(1),
    contactPhone: text("contact_phone"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* The release cron's only query. Partial, because the vast majority of
       bookings are not pending and should not be in this index. */
    index("bookings_pending_hold_idx").on(table.status, table.holdExpiresAt),
  ],
);

export const bookingItemStatus = pgEnum("booking_item_status", [
  "HELD",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);

export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => partnerProperties.id),
    listingUnitId: uuid("listing_unit_id")
      .notNull()
      .references(() => listingUnits.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => partners.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    qty: integer("qty").notNull().default(1),
    unitPricePaise: bigint("unit_price_paise", { mode: "bigint" }).notNull(),
    subtotalPaise: bigint("subtotal_paise", { mode: "bigint" }).notNull(),
    /* FROZEN AT HOLD TIME. A later change to vendor.commissionBps must never
       rewrite what a past booking paid out — that is an accounting problem,
       not a display one. */
    platformFeePaise: bigint("platform_fee_paise", { mode: "bigint" }).notNull(),
    vendorPayoutPaise: bigint("vendor_payout_paise", { mode: "bigint" }).notNull(),
    status: bookingItemStatus("status").notNull().default("HELD"),
  },
  (table) => [index("booking_items_vendor_start_idx").on(table.vendorId, table.startDate)],
);

export const paymentStatus = pgEnum("payment_status", [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  gateway: text("gateway").notNull().default("razorpay"),
  gatewayOrderId: text("gateway_order_id").unique(),
  /* The idempotency key for the webhook. Razorpay retries; this is what makes
     a replay a no-op instead of a double confirmation. */
  gatewayPaymentId: text("gateway_payment_id").unique(),
  amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
  status: paymentStatus("status").notNull().default("CREATED"),
  method: text("method"),
  raw: jsonb("raw"),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
});

export const payoutStatus = pgEnum("payout_status", [
  "PENDING",
  "PROCESSING",
  "SETTLED",
  "FAILED",
]);

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => partners.id),
  bookingItemId: uuid("booking_item_id")
    .notNull()
    .references(() => bookingItems.id, { onDelete: "cascade" }),
  amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
  status: payoutStatus("status").notNull().default("PENDING"),
  transferId: text("transfer_id"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export const reviewStatus = pgEnum("review_status", ["PUBLISHED", "FLAGGED", "REMOVED"]);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /* Unique: no review without a stay, and one review per stay. This is the
       whole anti-fake-review mechanism and it is a constraint, not a policy. */
    bookingItemId: uuid("booking_item_id")
      .notNull()
      .unique()
      .references(() => bookingItems.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => partnerProperties.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    body: text("body"),
    status: reviewStatus("status").notNull().default("PUBLISHED"),
  },
  (table) => [check("reviews_rating_range", sql`${table.rating} BETWEEN 1 AND 5`)],
);
