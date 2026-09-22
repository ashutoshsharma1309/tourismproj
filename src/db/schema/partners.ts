import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { documentKind, documentStatus, users, vendorType } from "@/db/schema/identity";

/**
 * The hotel partner programme — a partnership and referral layer, not an OTA.
 *
 * ONE SUPPLY MODEL
 * ----------------
 * A `partners` row is the vendor: the organisation that is verified, owns
 * listings and (later) gets paid. A `partner_properties` row is a listing: a
 * verified record of a real place to stay. The commerce tables hang off
 * these — `listing_units` and `availability` (commerce.ts) are a listing's
 * rooms and calendar, and booking items, payouts and reviews reference the
 * same two rows. The older `vendors` and `listings` tables described the same
 * supply a second time with nothing behind them, and are retired
 * (drizzle/sql/0002_partner_inventory.sql, docs/partner-inventory.md).
 *
 * Still no price column here: rooms and dates are inventory, and a rate
 * arrives with checkout, on the availability row, not on the listing.
 *
 * WHY `destination_id` IS A TEXT SLUG, NOT A FOREIGN KEY
 * ------------------------------------------------------
 * The traveller-facing destinations are the eighteen ids in
 * `src/lib/destinations/registry.ts` (jaipur, amritsar…). The `destinations`
 * table in content.ts holds Sikkim's districts for the (explore) surface —
 * a different vocabulary. A partner property belongs to a registry
 * destination, so the id is validated against the registry at the boundary
 * (Zod, `src/lib/partners/schema.ts`) and stored as text.
 *
 * NOTHING HERE RECORDS A BOOKING, A PAYMENT OR A COMMISSION EARNED.
 * A referral event is an outbound click, recorded as exactly that. An
 * agreement records the commercial terms a partner has actually signed; the
 * amount TerraStory has earned under it is zero until a qualifying
 * transaction is confirmed by a mechanism that does not exist yet.
 */

/* ---------------------------------------------------------------- enums */

export const partnerStatus = pgEnum("partner_status", [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export const accommodationType = pgEnum("accommodation_type", [
  "HOTEL",
  "HERITAGE",
  "HOMESTAY",
  "GUEST_HOUSE",
  "RESORT",
  "HOSTEL",
  "OTHER",
]);

/** The property lifecycle. Transitions are enforced in lib/partners/lifecycle.ts. */
export const propertyStatus = pgEnum("property_status", [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "APPROVED",
  "PUBLISHED",
  "UNPUBLISHED",
  "REJECTED",
]);

export const agreementType = pgEnum("agreement_type", [
  "PERCENTAGE_COMMISSION",
  "FIXED_REFERRAL_FEE",
  "QUALIFIED_LEAD_FEE",
  "EXPERIENCE_PARTNERSHIP_FEE",
]);

export const agreementStatus = pgEnum("agreement_status", [
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
]);

export const referralEventType = pgEnum("referral_event_type", [
  "OFFICIAL_WEBSITE",
  "BOOKING_LINK",
  "CALL",
  "MAPS",
]);

/* --------------------------------------------------------------- tables */

export const partners = pgTable(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationName: text("organization_name").notNull(),
    contactName: text("contact_name").notNull(),
    /* The address a partnership request is made from, and the one the
       contact signs in with. One partner record per e-mail. */
    email: text("email").notNull().unique(),
    phone: text("phone"),
    status: partnerStatus("status").notNull().default("PENDING"),
    /* Linked when the contact first signs in; null until then. Ownership of
       a property is resolved through this, never through the e-mail alone. */
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    /* What the organisation operates. Stays today; transport, guides and
       experiences use the same verification, units and calendar. */
    vendorType: vendorType("vendor_type").notNull().default("STAY"),
    /* A tourism-department registration or trade licence reference, in the
       partner's own words. A reviewer checks it; nothing here validates it
       against a register. */
    registrationInfo: text("registration_info"),
    /* The latest vendor-level decision: who made it, when, and why. The full
       history is the audit log. */
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationNote: text("verification_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("partners_status_idx").on(table.status)],
);

export const partnerProperties = pgTable(
  "partner_properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    destinationId: text("destination_id").notNull(),
    name: text("name").notNull(),
    type: accommodationType("type").notNull(),
    address: text("address").notNull(),
    area: text("area"),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    mapsUrl: text("maps_url"),
    officialWebsite: text("official_website"),
    /* The property's own booking route. TerraStory links to it; it never
       stands in for it. */
    bookingUrl: text("booking_url"),
    description: text("description"),
    /* What makes the property part of the destination's story — a haveli, a
       heritage conversion, a homestay in a craft village. Written by the
       partner, verified by a reviewer, never generated. */
    localCharacter: text("local_character"),
    amenities: text("amenities").array(),
    /* House policies, as the partner states them. Times are "HH:MM". */
    checkInFrom: text("check_in_from"),
    checkOutBy: text("check_out_by"),
    houseRules: text("house_rules"),
    cancellationTerms: text("cancellation_terms"),
    status: propertyStatus("status").notNull().default("PENDING"),
    /* Where the record came from. Partner submissions say so; a reviewer's
       verification adds what was checked and when. */
    source: text("source").notNull().default("partner-submission"),
    provenance: jsonb("provenance").$type<PropertyProvenance>(),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    /* When a reviewer last asked the partner for more information. A fact
       about the record, not a lifecycle state. */
    clarificationRequestedAt: timestamp("clarification_requested_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("partner_properties_destination_status_idx").on(table.destinationId, table.status),
    index("partner_properties_partner_idx").on(table.partnerId),
    /* A published property must have been reviewed by someone. The status
       machine enforces the path; this makes the invariant hold in the row. */
    check(
      "partner_properties_published_is_reviewed",
      sql`${table.status} <> 'PUBLISHED' OR ${table.reviewedAt} IS NOT NULL`,
    ),
  ],
);

export interface PropertyProvenance {
  submittedAt: string;
  /** Which fields a reviewer confirmed, and how. Empty until review. */
  checks?: { field: string; method: string; at: string }[];
}

export const partnerAgreements = pgTable(
  "partner_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    type: agreementType("type").notNull(),
    /* Basis points, for a percentage commission. 1000 = 10%. Integer so it
       never carries the floating-point error a percentage introduces once it
       meets a paise total (CLAUDE.md §2 R4). Null for the other types. */
    commissionBps: integer("commission_bps"),
    /* A fixed fee in paise, for the referral and lead types. Null otherwise. */
    feePaise: bigint("fee_paise", { mode: "bigint" }),
    status: agreementStatus("status").notNull().default("DRAFT"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("partner_agreements_partner_status_idx").on(table.partnerId, table.status),
    check("partner_agreements_bps_range", sql`${table.commissionBps} IS NULL OR (${table.commissionBps} >= 0 AND ${table.commissionBps} <= 10000)`),
    check("partner_agreements_fee_non_negative", sql`${table.feePaise} IS NULL OR ${table.feePaise} >= 0`),
  ],
);

/**
 * Supporting documents for a vendor's verification: a registration
 * certificate, proof of the right to operate the property.
 *
 * `vendor_id` names the partner organisation — "vendor" is the commerce
 * vocabulary for the same row. `file_url` is a path in the PRIVATE
 * `vendor-docs` bucket, never a public URL; a reviewer opens it through a
 * signed link that expires in minutes. No personal identity document is
 * requested: the business is verified, not the person.
 */
export const vendorDocuments = pgTable(
  "vendor_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    kind: documentKind("kind").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name"),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    status: documentStatus("status").notNull().default("PENDING"),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vendor_documents_vendor_idx").on(table.vendorId)],
);

/**
 * An outbound click, and only that.
 *
 * `property_id` for a partner property, or `stay_ref` for a curated stay
 * (`<destinationId>/<slug>`) — a referral on a register hotel is still a
 * qualified visitor sent to that hotel, and counting it is how a partnership
 * conversation starts. `session_hash` is a SHA-256 of a random, first-party
 * session token: it lets one visitor's clicks be counted once without
 * storing who they are. No IP address, no user agent, no page history.
 */
export const referralEvents = pgTable(
  "referral_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").references(() => partnerProperties.id, { onDelete: "set null" }),
    stayRef: text("stay_ref"),
    destinationId: text("destination_id").notNull(),
    eventType: referralEventType("event_type").notNull(),
    /** The page the click came from, path only. */
    source: text("source").notNull(),
    sessionHash: text("session_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("referral_events_property_idx").on(table.propertyId, table.occurredAt),
    index("referral_events_destination_idx").on(table.destinationId, table.occurredAt),
    check(
      "referral_events_has_target",
      sql`${table.propertyId} IS NOT NULL OR ${table.stayRef} IS NOT NULL`,
    ),
  ],
);
