/**
 * Repoint every media and audio row at Supabase Storage.
 *
 * The files are uploaded; this moves the POINTER. `credit`, `licence`,
 * `sourceUrl` and `alt` are never written — only `url` changes — so
 * attribution cannot be lost by this script even if it has a bug.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db";

type Manifest = Record<string, { url: string; bucket: string }>;

async function main() {
  const manifest: Manifest = JSON.parse(
    readFileSync("scripts/.media-manifest.json", "utf8"),
  );

  /* Rows store a site-root path ("/images/mon/rumtek.jpg"); the manifest is
     keyed on the file path ("public/images/mon/rumtek.jpg"). */
  const byWebPath = new Map<string, string>();
  for (const [file, entry] of Object.entries(manifest)) {
    byWebPath.set(file.replace(/^public/, ""), entry.url);
  }

  let mediaUpdated = 0, audioUpdated = 0;
  const unmatched: string[] = [];

  const mediaRows = await db.execute<{ id: string; url: string }>(
    sql`SELECT id, url FROM media WHERE url LIKE '/%'`,
  );
  for (const row of mediaRows) {
    const next = byWebPath.get(row.url);
    if (!next) { unmatched.push(row.url); continue; }
    await db.execute(sql`UPDATE media SET url = ${next} WHERE id = ${row.id}`);
    mediaUpdated += 1;
  }

  const audioRows = await db.execute<{ id: string; url: string }>(
    sql`SELECT id, url FROM audio_guides WHERE url LIKE '/%'`,
  );
  for (const row of audioRows) {
    const next = byWebPath.get(row.url);
    if (!next) { unmatched.push(row.url); continue; }
    await db.execute(sql`UPDATE audio_guides SET url = ${next} WHERE id = ${row.id}`);
    audioUpdated += 1;
  }

  console.log(`\n  media repointed  ${mediaUpdated}`);
  console.log(`  audio repointed  ${audioUpdated}`);
  console.log(`  unmatched        ${unmatched.length}`);
  for (const u of unmatched.slice(0, 5)) console.log(`    ${u}`);

  /* The check that matters: attribution survived. */
  const [check] = await db.execute<{ total: number; credited: number; licensed: number; alted: number }>(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE credit  IS NOT NULL)::int AS credited,
           count(*) FILTER (WHERE licence IS NOT NULL)::int AS licensed,
           count(*) FILTER (WHERE alt <> '')::int          AS alted
    FROM media
  `);
  console.log(`\n  attribution intact: ${check?.credited}/${check?.total} credited, ${check?.licensed}/${check?.total} licensed, ${check?.alted}/${check?.total} with alt`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
