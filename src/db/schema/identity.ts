import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Identity — who is acting, and on whose behalf.
 *
 * PHONE IS THE PRIMARY IDENTIFIER, not email.
 * A homestay owner in Pelling has a phone and no inbox habit. Email is
 * nullable and secondary throughout; every auth path assumes a number.
 */

export const userRole = pgEnum("user_role", [
  "TRAVELLER",
  "VENDOR_OWNER",
  "VENDOR_STAFF",
  "GOV_OFFICER",
  "ADMIN",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /* Nullable since the partner programme: a hotel's contact signs in with an
     e-mail one-time code (CLAUDE.md §3 names Google as the secondary sign-in,
     which has no phone either). Still unique where present. */
  phone: text("phone").unique(),
  email: text("email"),
  fullName: text("full_name"),
  locale: text("locale").notNull().default("en"),
  role: userRole("role").notNull().default("TRAVELLER"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorType = pgEnum("vendor_type", [
  "STAY",
  "TRANSPORT",
  "GUIDE",
  "EXPERIENCE",
]);

export const verificationStatus = pgEnum("verification_status", [
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
]);

export const planTier = pgEnum("plan_tier", ["FREE", "GROWTH", "PRO"]);

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  type: vendorType("type").notNull(),
  businessName: text("business_name").notNull(),
  slug: text("slug").notNull().unique(),
  /* Home base. Declared as a plain uuid rather than a FK to break an import
     cycle with content.ts; the constraint is added in the SQL migration. */
  destinationId: uuid("destination_id"),
  about: text("about"),
  contactPhone: text("contact_phone"),
  verificationStatus: verificationStatus("verification_status")
    .notNull()
    .default("DRAFT"),
  govtRegNo: text("govt_reg_no"),
  gstin: text("gstin"),
  /* NEVER the full PAN. Last four is enough to match a document to a record,
     and storing the rest is a liability with no product benefit. */
  panLast4: text("pan_last4"),
  razorpayAccountId: text("razorpay_account_id"),
  /* Basis points, so 500 = 5.00%. Integers avoid the rounding drift a float
     percentage introduces once it meets a paise total. */
  commissionBps: integer("commission_bps").notNull().default(500),
  planTier: planTier("plan_tier").notNull().default("FREE"),
  ratingAvg: numeric("rating_avg", { precision: 2, scale: 1 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentKind = pgEnum("document_kind", [
  "GOVT_REG",
  "GST",
  "PAN",
  "PROPERTY_PROOF",
  "ID_PROOF",
  "PHOTO",
]);

export const documentStatus = pgEnum("document_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const vendorDocuments = pgTable("vendor_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  kind: documentKind("kind").notNull(),
  /* A path in a PRIVATE bucket. Never a public URL — these are identity
     documents, served through short-lived signed links only. */
  fileUrl: text("file_url").notNull(),
  status: documentStatus("status").notNull().default("PENDING"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const isPublishedDefault = boolean("is_published").notNull().default(false);
