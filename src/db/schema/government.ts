import { boolean, check, index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "@/db/schema/identity";

/**
 * The government surface: which authority a person acts for, and how far
 * that authority reaches.
 *
 * LEAST PRIVILEGE BY JURISDICTION
 * -------------------------------
 * An organisation is scoped to the destinations it governs (a state tourism
 * department covers its own destinations; a national body covers all). Every
 * console query intersects the URL with that scope, so an officer of one
 * state cannot read or decide anything in another — the scope is resolved
 * from the session, never from a parameter.
 *
 * WHAT A GOVERNMENT USER CANNOT REACH
 * -----------------------------------
 * Travellers. There is no join from this schema to bookings, history,
 * interests or any traveller identity; the console's analytics are counts of
 * supply, and its queue is vendors and their business documents.
 */

export const govScope = pgEnum("gov_scope_kind", ["NATIONAL", "DESTINATIONS"]);
export const govRole = pgEnum("gov_role", ["REVIEWER", "MANAGER"]);

export const govOrganisations = pgTable(
  "gov_organisations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** The authority this body is, in its own words ("Department of Tourism, Government of Rajasthan"). */
    authority: text("authority").notNull(),
    scopeKind: govScope("scope_kind").notNull().default("DESTINATIONS"),
    /** Registry destination ids (lib/destinations/registry.ts). Empty for a national body. */
    destinationIds: text("destination_ids").array().notNull().default(sql`'{}'`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "gov_organisations_scope_has_destinations",
      /* coalesce: array_length of an empty array is NULL, and a NULL check passes. */
      sql`${table.scopeKind} <> 'DESTINATIONS' OR coalesce(array_length(${table.destinationIds}, 1), 0) >= 1`,
    ),
  ],
);

/**
 * A person acting for an authority, matched on their proven e-mail and
 * linked on first sign-in — the same sign-in everyone else uses, never a
 * second auth system. A REVIEWER decides verifications; a MANAGER also
 * publishes advisories and manages the team.
 */
export const govMembers = pgTable(
  "gov_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => govOrganisations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: govRole("role").notNull().default("REVIEWER"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("gov_members_email_unique").on(table.email),
    index("gov_members_org_idx").on(table.orgId),
    check("gov_members_email_lower", sql`${table.email} = lower(${table.email})`),
  ],
);
