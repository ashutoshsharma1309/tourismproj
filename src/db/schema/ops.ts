import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { govOrganisations } from "@/db/schema/government";
import { users } from "@/db/schema/identity";

/**
 * Ops — the things a tourism department publishes, and the record of who did
 * what.
 */

export const advisorySeverity = pgEnum("advisory_severity", [
  "INFO",
  "WARNING",
  "CRITICAL",
]);

/**
 * Road closed, festival crowd, weather.
 *
 * Time-bounded rather than a boolean flag: an advisory that nobody remembers
 * to switch off is worse than none, because it teaches readers to ignore the
 * banner. `startsAt`/`endsAt` make expiry automatic.
 */
export const advisoryKind = pgEnum("advisory_kind", ["PERMIT", "WEATHER", "CLOSURE", "RESTRICTION", "OTHER"]);

export const advisoryStatus = pgEnum("advisory_status", ["DRAFT", "PUBLISHED", "WITHDRAWN"]);

export const advisories = pgTable(
  "advisories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /* A registry destination id ("jaipur"), the vocabulary travellers and
       partners use — not the district uuid this column once held. */
    destinationId: text("destination_id").notNull(),
    kind: advisoryKind("kind").notNull().default("OTHER"),
    severity: advisorySeverity("severity").notNull().default("INFO"),
    title: text("title").notNull(),
    body: text("body"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /* Who said so. An advisory without an attributable source is a rumour:
       the issuing authority is a row, and its name is shown with the text. */
    source: text("source"),
    orgId: uuid("org_id").references(() => govOrganisations.id, { onDelete: "set null" }),
    status: advisoryStatus("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("advisories_destination_status_idx").on(table.destinationId, table.status)],
);

/**
 * Every verification decision, refund and role change.
 *
 * `before`/`after` rather than a message string: a note saying "approved
 * vendor" cannot answer "what exactly changed", and that is the question an
 * audit is for.
 */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
