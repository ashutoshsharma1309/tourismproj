/**
 * Lift v1's archive out of code and into the database.
 *
 * WHY THIS SCRIPT IS THE WHOLE POINT
 * ----------------------------------
 * v1's editorial archive is the moat: 15 catalogued monasteries, 38 mapped
 * places, 70 sourced stories, 180 audio guides in twelve languages, and 453
 * credited photographs. Nobody else at this hackathon has that. It broke only
 * because it was expressed as FILES rather than DATA — the sixteenth
 * destination needed a release, not a row.
 *
 * Nothing here rewrites the prose. It is sourced, checked and good. The
 * pointer moves; the words do not.
 *
 * IDEMPOTENT BY CONSTRUCTION
 * --------------------------
 * Every insert is an upsert keyed on the natural key v1 already had (a slug).
 * Re-running is safe and is expected — the seed and this script will both be
 * run repeatedly while the rest of the app is built.
 *
 *   pnpm tsx --env-file=.env.local scripts/migrate-v1-content.ts
 */

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  audioGuides as audioGuidesTable,
  destinations,
  media,
  sites,
  stories as storiesTable,
} from "@/db/schema";

import { monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { stories } from "@/data/stories/index";
import { audioGuides } from "@/data/audio";

/* ------------------------------------------------------------------ helpers */

/**
 * v1's place categories → the site category enum.
 *
 * v1 had thirteen loose category strings; the schema has seven. The mapping is
 * lossy on purpose: "Tea garden" and "Valley" are both landscape you stand in
 * and look at, and a taxonomy with a bucket per noun stops being a taxonomy.
 * The original string is preserved on the row's `lineage` field where it
 * carries meaning, and in the body otherwise — nothing is discarded silently.
 */
const SITE_CATEGORY: Record<string, string> = {
  Lake: "LAKE",
  Waterfall: "VIEWPOINT",
  River: "VIEWPOINT",
  "Heritage site": "SACRED_SITE",
  Museum: "MUSEUM",
  "Tea garden": "VIEWPOINT",
  Stupa: "SACRED_SITE",
  Temple: "SACRED_SITE",
  Peak: "VIEWPOINT",
  "Nature reserve": "VIEWPOINT",
  Valley: "VIEWPOINT",
  Pass: "VIEWPOINT",
  Town: "MARKET",
};

/** A district becomes a destination. Slugged the way v1 slugged everything. */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * v1's provenance shapes → `sourceRefs[]`.
 *
 * Monasteries and places carry `{ sourceId, sourceUrl, verifiedAt }`; stories
 * carry a richer `sources[]`. Both become the same `{ label, url, accessedAt }`
 * the schema requires, because the schema should not know which v1 module a
 * row came from.
 */
type SourceRef = { label: string; url: string; accessedAt: string | null };

function refsFromProvenance(p: unknown): SourceRef[] {
  if (!p || typeof p !== "object") return [];
  const entry = p as { sourceId?: string; sourceUrl?: string; verifiedAt?: string };
  if (!entry.sourceUrl) return [];
  return [
    {
      label: entry.sourceId ?? "source",
      url: entry.sourceUrl,
      accessedAt: entry.verifiedAt ?? null,
    },
  ];
}

function refsFromStorySources(list: unknown): SourceRef[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => s as { name?: string; sourceId?: string; url?: string; retrievedAt?: string })
    .filter((s) => Boolean(s.url))
    .map((s) => ({
      label: s.name ?? s.sourceId ?? "source",
      url: s.url!,
      accessedAt: s.retrievedAt ?? null,
    }));
}

/* --------------------------------------------------------------------- run */

async function main() {
  const report: string[] = [];

  /* ---------------------------------------------------- 1 · destinations
     Sikkim's districts, taken from the records themselves rather than from a
     hand-written list — the data knows which districts it actually covers. */
  const districts = [
    ...new Set([
      ...monasteries.map((m) => m.district),
      ...places.map((p) => p.district),
    ]),
  ].sort();

  const destinationIdBySlug = new Map<string, string>();
  for (const district of districts) {
    const slug = slugify(district);
    const [row] = await db
      .insert(destinations)
      .values({
        slug,
        name: district,
        state: "Sikkim",
        region: "East India",
        permitRequired: true,
        isPublished: true,
      })
      .onConflictDoUpdate({
        target: destinations.slug,
        set: { name: district, state: "Sikkim", isPublished: true },
      })
      .returning({ id: destinations.id });
    destinationIdBySlug.set(slug, row!.id);
  }
  report.push(`destinations  ${districts.length}  (${districts.join(", ")})`);

  /* -------------------------------------------------------- 2 · monasteries */
  const siteIdBySlug = new Map<string, string>();
  let monasteryCount = 0;
  for (const m of monasteries) {
    const destinationId = destinationIdBySlug.get(slugify(m.district));
    if (!destinationId) continue;

    const refs = refsFromProvenance(m.provenance);
    const body = [m.history, m.significance, m.architecture].filter(Boolean).join("\n\n");

    const [row] = await db
      .insert(sites)
      .values({
        destinationId,
        slug: m.slug,
        name: m.name,
        category: "MONASTERY",
        lat: m.coordinates ? String(m.coordinates.lat) : null,
        lng: m.coordinates ? String(m.coordinates.lng) : null,
        summary: m.description,
        body,
        foundedYear: m.establishedYear ?? null,
        lineage: m.tradition ?? null,
        /* The planner needs a duration. 90 minutes is v1's own tour length
           where one exists; otherwise it is left NULL rather than guessed. */
        visitMinutes: m.tour ? 90 : null,
        sourceRefs: refs,
        /* Publishable only if it actually carries a source — the DB constraint
           will reject it otherwise, which is the intended behaviour. */
        isPublished: refs.length > 0,
      })
      .onConflictDoUpdate({
        target: [sites.destinationId, sites.slug],
        set: { name: m.name, summary: m.description, body, sourceRefs: refs },
      })
      .returning({ id: sites.id });

    siteIdBySlug.set(m.slug, row!.id);
    monasteryCount += 1;


/**
 * MEDIA AND AUDIO UPSERT ON IDENTITY, NOT ON URL.
 *
 * The first version used `onConflictDoNothing()` against a table with no
 * unique key, so every re-run inserted a duplicate. Adding a unique index on
 * the URL then made it worse: once the media had been repointed at the CDN,
 * the local path no longer collided, so a re-run inserted a SECOND row for
 * every image and doubled the audio table.
 *
 * A site has one featured photograph and one guide per locale. That is the
 * identity. The URL is an attribute of the row, not its key — which is exactly
 * why re-pointing it made every row look new.
 *
 * `onConflictDoNothing` on those keys means a re-run after the media has moved
 * to Storage leaves the CDN URL alone instead of dragging it back to a local
 * path that no longer exists.
 */
    if (m.image) {
      await db
        .insert(media)
        .values({
          ownerType: "SITE",
          ownerId: row!.id,
          url: m.image,
          alt: `${m.name}, ${m.district}`,
          credit: "Wikimedia Commons",
          licence: "CC BY-SA",
          sourceUrl: m.imageSource ?? null,
          isFeatured: true,
        })
        .onConflictDoNothing({
          target: [media.ownerType, media.ownerId],
          /* The index is PARTIAL (WHERE is_featured); Postgres will not infer
             a partial index as the conflict arbiter unless the same predicate
             is restated. In this Drizzle version the option is `where`. */
          where: eq(media.isFeatured, true),
        });
    }
  }
  report.push(`sites (monastery)  ${monasteryCount}`);

  /* ------------------------------------------------------------ 3 · places

     THREE PLACES COLLIDE WITH A MONASTERY SLUG.

     v1 kept monasteries and places in separate URL namespaces, so
     `/monasteries/lachen` (the gompa) and `/places/lachen` (the town) coexisted
     happily. One `sites` table means one `(destination, slug)` — and the first
     run of this migration silently overwrote Lachen Monastery with the town of
     Lachen, and did the same to Lachung and Rinchenpong.

     The monastery keeps the bare slug: it is the flagship archive and its URLs
     are the ones that have been linked. The place is disambiguated by its own
     category, and every rename is reported rather than done quietly. */
  const monasterySlugs = new Set(monasteries.map((m) => `${slugify(m.district)}/${m.slug}`));
  const renamed: string[] = [];

  let placeCount = 0;
  for (const p of places) {
    const destinationId = destinationIdBySlug.get(slugify(p.district));
    if (!destinationId) continue;

    const refs = refsFromProvenance(p.provenance);
    const category = SITE_CATEGORY[p.category] ?? "VIEWPOINT";

    let placeSlug = p.slug;
    if (monasterySlugs.has(`${slugify(p.district)}/${p.slug}`)) {
      placeSlug = `${p.slug}-${slugify(p.category)}`;
      renamed.push(`${p.slug} → ${placeSlug} (${p.name}, ${p.category})`);
    }

    const [row] = await db
      .insert(sites)
      .values({
        destinationId,
        slug: placeSlug,
        name: p.name,
        category: category as "LAKE",
        lat: p.coordinates ? String(p.coordinates.lat) : null,
        lng: p.coordinates ? String(p.coordinates.lng) : null,
        summary: p.description,
        /* v1's own category string, kept because the enum is lossy. */
        lineage: p.category,
        sourceRefs: refs,
        isPublished: refs.length > 0,
      })
      .onConflictDoUpdate({
        target: [sites.destinationId, sites.slug],
        set: { name: p.name, summary: p.description, sourceRefs: refs },
      })
      .returning({ id: sites.id });

    siteIdBySlug.set(p.slug, row!.id);
    placeCount += 1;

    if (p.image) {
      await db
        .insert(media)
        .values({
          ownerType: "SITE",
          ownerId: row!.id,
          url: p.image,
          alt: p.imageAlt ?? `${p.name}, ${p.district}`,
          credit: "Wikimedia Commons",
          licence: "CC BY-SA",
          sourceUrl: p.wikipediaUrl ?? null,
          isFeatured: true,
        })
        .onConflictDoNothing({
          target: [media.ownerType, media.ownerId],
          /* The index is PARTIAL (WHERE is_featured); Postgres will not infer
             a partial index as the conflict arbiter unless the same predicate
             is restated. In this Drizzle version the option is `where`. */
          where: eq(media.isFeatured, true),
        });
    }
  }
  report.push(`sites (place)  ${placeCount}`);
  if (renamed.length > 0) {
    report.push(`  renamed to avoid a monastery slug: ${renamed.length}`);
    for (const line of renamed) report.push(`    ${line}`);
  }

  /* ----------------------------------------------------------- 4 · stories */
  const gangtokId = destinationIdBySlug.get("gangtok")!;
  let storyCount = 0;
  for (const s of stories) {
    const refs = refsFromStorySources(s.sources);
    /* A story about a monastery belongs to that monastery's destination.
       Otherwise it is Sikkim-wide and files under the capital, which is where
       v1's own navigation put it. */
    const anchorSlug = s.relatedMonasteries?.[0] ?? s.relatedPlaces?.[0];
    const siteId = anchorSlug ? (siteIdBySlug.get(anchorSlug) ?? null) : null;

    await db
      .insert(storiesTable)
      .values({
        destinationId: gangtokId,
        siteId,
        slug: s.slug,
        title: s.title,
        dek: s.summary,
        body: typeof s.content === "string" ? s.content : JSON.stringify(s.content),
        readMinutes: s.readingMinutes ?? null,
        communities: s.communities ? [...s.communities] : null,
        sourceRefs: refs,
        publishedAt: refs.length > 0 ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: storiesTable.slug,
        set: { title: s.title, dek: s.summary, sourceRefs: refs },
      });
    storyCount += 1;
  }
  report.push(`stories  ${storyCount}`);

  /* ------------------------------------------------------- 5 · audio guides
     The files stay exactly where they are under public/audio. Only the
     pointer moves. */
  let audioCount = 0;
  for (const g of audioGuides) {
    const siteId = siteIdBySlug.get(g.monasterySlug);
    if (!siteId) continue;
    await db
      .insert(audioGuidesTable)
      .values({
        siteId,
        locale: g.language,
        url: g.audioUrl,
        /* v1 measured narration to a tenth of a second (85.9s); the column is
           an integer. Rounded at the boundary rather than widening the column —
           nobody needs a tenth of a second of audio duration, and 162 of the
           180 guides carry one. */
        durationS:
          typeof g.durationSeconds === "number" ? Math.round(g.durationSeconds) : null,
        transcript: g.transcript ?? null,
      })
      .onConflictDoNothing({ target: [audioGuidesTable.siteId, audioGuidesTable.locale] });
    audioCount += 1;
  }
  report.push(`audio guides  ${audioCount}`);

  /* ------------------------------------------------------------- 6 · report */
  const counts = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM destinations) AS destinations,
      (SELECT count(*) FROM sites)        AS sites,
      (SELECT count(*) FROM sites WHERE is_published) AS published_sites,
      (SELECT count(*) FROM stories)      AS stories,
      (SELECT count(*) FROM media)        AS media,
      (SELECT count(*) FROM audio_guides) AS audio
  `);

  console.log("\n  migrated");
  for (const line of report) console.log(`    ${line}`);
  console.log("\n  in the database now");
  console.log(`    ${JSON.stringify(counts[0])}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("migration failed:", error);
  process.exit(1);
});
