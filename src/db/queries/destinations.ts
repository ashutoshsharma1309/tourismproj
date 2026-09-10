import { and, asc, eq, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { audioGuides, destinations, media, sites, stories } from "@/db/schema";

/**
 * Every read of destination content. Components never touch `src/db` directly
 * (CLAUDE.md §4) — this is the whole query surface, so it can be audited and
 * cached in one place.
 *
 * Each function opens by checking `hasDatabase`. With no DATABASE_URL set the
 * (explore) surface reports that it holds nothing — no destinations, no sites
 * — and the rest of the site, which reads typed data in src/data rather than
 * Postgres, is untouched. That is the same shape absence takes everywhere
 * else here: published as missing, never faked and never fatal.
 */

export type DestinationRow = typeof destinations.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;

/** Counts for the six doors on a destination hub. One query, not six. */
export async function getHubCounts(destinationId: string) {
  if (!hasDatabase) {
    return { sites: 0, stories: 0, stays: 0, itineraries: 0, culture: 0, audioLocales: 0 };
  }
  const [row] = await db.execute<{
    sites: number; stories: number; stays: number; itineraries: number;
    culture: number; audio_locales: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM sites WHERE destination_id = ${destinationId} AND is_published) AS sites,
      (SELECT count(*)::int FROM stories WHERE destination_id = ${destinationId}) AS stories,
      (SELECT count(*)::int FROM listings WHERE destination_id = ${destinationId} AND status = 'ACTIVE') AS stays,
      0::int AS itineraries,
      0::int AS culture,
      (SELECT count(DISTINCT a.locale)::int FROM audio_guides a
         JOIN sites s ON s.id = a.site_id WHERE s.destination_id = ${destinationId}) AS audio_locales
  `);
  return {
    sites: Number(row?.sites ?? 0),
    stories: Number(row?.stories ?? 0),
    stays: Number(row?.stays ?? 0),
    itineraries: Number(row?.itineraries ?? 0),
    culture: Number(row?.culture ?? 0),
    audioLocales: Number(row?.audio_locales ?? 0),
  };
}

/** Slugs for `generateStaticParams`. Published only. */
export async function publishedDestinationSlugs() {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ slug: destinations.slug })
    .from(destinations)
    .where(eq(destinations.isPublished, true))
    .orderBy(asc(destinations.slug));
  return rows.map((r) => r.slug);
}

export async function listDestinations() {
  if (!hasDatabase) return [];
  return db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      nameLocal: destinations.nameLocal,
      state: destinations.state,
      blurb: destinations.blurb,
      permitRequired: destinations.permitRequired,
      altitudeM: destinations.altitudeM,
      tier: destinations.tier,
      coverage: destinations.coverage,
      siteCount: sql<number>`(
        SELECT count(*)::int FROM ${sites}
        WHERE ${sites.destinationId} = ${destinations.id} AND ${sites.isPublished}
      )`,
    })
    .from(destinations)
    .where(eq(destinations.isPublished, true))
    .orderBy(asc(destinations.name));
}

export async function getDestinationBySlug(slug: string) {
  if (!hasDatabase) return null;
  const [row] = await db
    .select()
    .from(destinations)
    .where(and(eq(destinations.slug, slug), eq(destinations.isPublished, true)))
    .limit(1);
  return row ?? null;
}

/**
 * A destination's sites, with each one's featured photograph.
 *
 * The image is joined rather than fetched per card: fifty-three sites would
 * otherwise be fifty-three round trips, which is the N+1 that makes a
 * database-driven page slower than the hardcoded one it replaced.
 */
export async function getSitesForDestination(destinationId: string) {
  if (!hasDatabase) return [];
  return db
    .select({
      id: sites.id,
      slug: sites.slug,
      name: sites.name,
      category: sites.category,
      summary: sites.summary,
      lat: sites.lat,
      lng: sites.lng,
      foundedYear: sites.foundedYear,
      lineage: sites.lineage,
      sourceRefs: sites.sourceRefs,
      /*
         A LATERAL join, not two correlated subqueries.

         The first version ran one subquery for the URL and another for the
         alt text, and returned null for both — Drizzle renders `${media}`
         inside a `sql` template in a way that did not correlate against the
         outer `sites` row. A lateral is clearer, runs once per site instead
         of twice, and is what the planner wants anyway.
      */
      imageUrl: sql<string | null>`hero.url`,
      imageAlt: sql<string | null>`hero.alt`,
    })
    .from(sites)
    .leftJoin(
      sql`LATERAL (
        SELECT m.url, m.alt FROM media m
        WHERE m.owner_type = 'SITE' AND m.owner_id = sites.id
        ORDER BY m.is_featured DESC, m.sort_order ASC
        LIMIT 1
      ) hero`,
      sql`true`,
    )
    .where(and(eq(sites.destinationId, destinationId), eq(sites.isPublished, true)))
    .orderBy(asc(sites.category), asc(sites.name));
}

export async function getSite(destinationSlug: string, siteSlug: string) {
  if (!hasDatabase) return null;
  const [row] = await db
    .select({ site: sites, destination: destinations })
    .from(sites)
    .innerJoin(destinations, eq(sites.destinationId, destinations.id))
    .where(
      and(
        eq(destinations.slug, destinationSlug),
        eq(sites.slug, siteSlug),
        eq(sites.isPublished, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getSiteMedia(siteId: string) {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(media)
    .where(and(eq(media.ownerType, "SITE"), eq(media.ownerId, siteId)))
    .orderBy(sql`${media.isFeatured} DESC`, asc(media.sortOrder));
}

/** Audio guides for a site, in the locale order the v1 selector used. */
export async function getSiteAudio(siteId: string) {
  if (!hasDatabase) return [];
  return db
    .select()
    .from(audioGuides)
    .where(eq(audioGuides.siteId, siteId))
    .orderBy(asc(audioGuides.locale));
}

export async function getStoriesForSite(siteId: string) {
  if (!hasDatabase) return [];
  return db
    .select({
      slug: stories.slug,
      title: stories.title,
      dek: stories.dek,
      readMinutes: stories.readMinutes,
    })
    .from(stories)
    .where(eq(stories.siteId, siteId))
    .orderBy(asc(stories.title));
}

/** Every site pair for `generateStaticParams` on the site route. */
export async function publishedSitePaths() {
  if (!hasDatabase) return [];
  const rows = await db
    .select({ destination: destinations.slug, site: sites.slug })
    .from(sites)
    .innerJoin(destinations, eq(sites.destinationId, destinations.id))
    .where(and(eq(sites.isPublished, true), eq(destinations.isPublished, true)));
  return rows;
}
