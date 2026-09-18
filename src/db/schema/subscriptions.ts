import { bigint, boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "@/db/schema/identity";
import { partners } from "@/db/schema/partners";

/**
 * The Partner SaaS: plans, a partner's subscription, and its team.
 *
 * PLANS ARE DATA
 * --------------
 * A plan is a row: which features it includes and which limits it sets.
 * Code never asks "is this PRO?"; it asks the entitlement module
 * (lib/subscriptions/entitlements.ts) "may this partner do X?", and the
 * answer comes from the plan row. Adding or reshaping a plan is an insert or
 * an update, not a code change.
 *
 * NO BILLING
 * ----------
 * No payment gateway is connected. `monthly_price_paise` records the price
 * proposed in the business analysis, with `price_status` saying exactly
 * that; nothing reads it to charge anyone. A subscription is assigned by a
 * reviewer and its dates are real dates — a trial ends, a period ends — so
 * restriction on expiry is real even without a card on file.
 */

export const subscriptionStatus = pgEnum("subscription_status", ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]);

export interface PlanEntitlements {
  features: string[];
  /** null = no plan limit (the product's own hard caps still apply). */
  limits: { listings: number | null; roomTypesPerListing: number | null; teamMembers: number | null };
}

export const plans = pgTable(
  "plans",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    monthlyPricePaise: bigint("monthly_price_paise", { mode: "bigint" }),
    /* 'PROPOSED' — from the business analysis, not billed. */
    priceStatus: text("price_status").notNull().default("PROPOSED"),
    priceSource: text("price_source"),
    trialDays: integer("trial_days").notNull().default(0),
    entitlements: jsonb("entitlements").$type<PlanEntitlements>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("plans_price_non_negative", sql`${table.monthlyPricePaise} IS NULL OR ${table.monthlyPricePaise} >= 0`),
    check("plans_trial_range", sql`${table.trialDays} BETWEEN 0 AND 90`),
  ],
);

/** One current subscription per partner. Its history is the audit log. */
export const partnerSubscriptions = pgTable(
  "partner_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .unique()
      .references(() => partners.id, { onDelete: "cascade" }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    status: subscriptionStatus("status").notNull(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /* The partner or reviewer asked for it to end at the period's end. */
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    assignedBy: uuid("assigned_by").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("partner_subscriptions_trial_has_end", sql`${table.status} <> 'TRIALING' OR ${table.trialEndsAt} IS NOT NULL`),
    check(
      "partner_subscriptions_period_ordered",
      sql`${table.currentPeriodStart} IS NULL OR ${table.currentPeriodEnd} IS NULL OR ${table.currentPeriodEnd} > ${table.currentPeriodStart}`,
    ),
  ],
);

export const memberRole = pgEnum("partner_member_role", ["STAFF"]);

/**
 * People who work in a partner's workspace besides its owner. A member signs
 * in with the same Supabase account system as everyone else; membership is
 * matched on their proven e-mail. A person belongs to at most one partner.
 */
export const partnerMembers = pgTable(
  "partner_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("STAFF"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("partner_members_email_unique").on(table.email),
    index("partner_members_partner_idx").on(table.partnerId),
    check("partner_members_email_lower", sql`${table.email} = lower(${table.email})`),
  ],
);
