import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";

/**
 * Content — v1's archive, expressed as data.
 *
 * WHY THIS IS SEPARATE FROM COMMERCE
 * ----------------------------------
 * An essay and a room rate have nothing in common but a place. Putting a
 * price on a Site, or editorial prose on a Listing, is how a schema starts
 * needing `if (type === …)` branches everywhere. They meet at `destinationId`
 * and nowhere else.
 *
 * `sourceRefs` IS NOT OPTIONAL DECORATION. It is the reason v1's archive was
 * credible, and the one thing that distinguishes this from a travel blog. A
 * site or story published without one is a bug, not a shortcut.
 */

/**
 * How much of a destination is actually documented.
 *
 * WHY THIS IS ON THE RECORD AND NOT INFERRED IN THE UI
 * ---------------------------------------------------
 * Fifteen destinations at the flagship's depth is weeks of work, not a day.
 * The alternative to admitting that is fifteen shallow destinations that all
 * look equally thin, which reads as fake. So the tier is declared, the
 * coverage is computed from the content that actually exists, and BOTH are
 * shown on the card before anyone clicks.
 *
 * This is the same discipline the archive already applies to sources: publish
 * the gap rather than papering over it.
 */
export const destinationTier = pgEnum("destination_tier", [
  "FLAGSHIP",
  "ESTABLISHED",
  "GROWING",
]);

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /* The name in its own script. The hero of the page, not decoration —
     see CLAUDE.md §6. */
  nameLocal: text("name_local"),
  state: text("state"),
  region: text("region"),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  altitudeM: integer("altitude_m"),
  blurb: text("blurb"),
  /* Months 1..12. An array rather than a season string, because "best in
     spring" means different months in Sikkim and in Goa. */
  bestMonths: integer("best_months").array(),
  permitRequired: boolean("permit_required").notNull().default(false),
  heroMediaId: uuid("hero_media_id"),
  tier: destinationTier("tier").notNull().default("GROWING"),
  /* Computed by lib/coverage.ts, never typed by hand. */
  coverage: jsonb("coverage").notNull().default({}),
  isPublished: boolean("is_published").notNull().default(false),
});

export const siteCategory = pgEnum("site_category", [
  "MONASTERY",
  "LAKE",
  "VIEWPOINT",
  "TREK",
  "MUSEUM",
  "MARKET",
  "SACRED_SITE",
]);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: siteCategory("category").notNull(),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    summary: text("summary"),
    body: text("body"),
    foundedYear: integer("founded_year"),
    lineage: text("lineage"),
    /* What the planner budgets for this stop. Without it the planner has to
       guess, and a guessed duration is how an itinerary becomes fiction. */
    visitMinutes: integer("visit_minutes"),
    entryFeePaise: bigint("entry_fee_paise", { mode: "bigint" }),
    openingHours: jsonb("opening_hours"),
    /* [{ label, url, accessedAt }] — required, non-empty. Enforced in the
       migration with a CHECK, not left to the application layer. */
    sourceRefs: jsonb("source_refs").notNull().default([]),
    isPublished: boolean("is_published").notNull().default(false),
  },
  (table) => [unique("sites_destination_slug_unique").on(table.destinationId, table.slug)],
);

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinationId: uuid("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  dek: text("dek"),
  body: text("body"),
  readMinutes: integer("read_minutes"),
  communities: text("communities").array(),
  sourceRefs: jsonb("source_refs").notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const mediaOwnerType = pgEnum("media_owner_type", [
  "DESTINATION",
  "SITE",
  "STORY",
  "LISTING",
  "VENDOR",
]);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerType: mediaOwnerType("owner_type").notNull(),
  /* Polymorphic by design: a FK per owner type would mean five nullable
     columns and a CHECK to keep four of them null. */
  ownerId: uuid("owner_id").notNull(),
  url: text("url").notNull(),
  width: integer("width"),
  height: integer("height"),
  /* Required. An image without alt text is not shippable. */
  alt: text("alt").notNull(),
  /* Required for archive images. Losing attribution is a legal problem AND
     the loss of the thing that makes the archive credible. */
  credit: text("credit"),
  licence: text("licence"),
  sourceUrl: text("source_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const audioGuides = pgTable("audio_guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  locale: text("locale").notNull(),
  url: text("url").notNull(),
  durationS: integer("duration_s"),
  transcript: text("transcript"),
});

export const translationEntityType = pgEnum("translation_entity_type", [
  "DESTINATION",
  "SITE",
  "STORY",
]);

/**
 * Content translations, one row per translated field.
 *
 * A row per field rather than a row per record: most translations arrive a
 * field at a time, and a per-record row would force a translator to hold a
 * whole document to change a name. Resolution is `requested → en → source`.
 */
export const translations = pgTable(
  "translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: translationEntityType("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    locale: text("locale").notNull(),
    field: text("field").notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    unique("translations_unique").on(
      table.entityType,
      table.entityId,
      table.locale,
      table.field,
    ),
  ],
);
