import { NextResponse } from "next/server";

import { publishedPropertiesFor } from "@/db/queries/partners";
import { isKnownDestination } from "@/lib/destinations/registry";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";

/**
 * The published partner stays of one destination, for the destination page.
 *
 * WHY AN ENDPOINT AND NOT A SERVER COMPONENT IN THE PAGE
 * ------------------------------------------------------
 * Destination pages are prerendered with `dynamicParams = false`. In this
 * Next.js version an on-demand revalidation of such a page expires the cache
 * entry, and the regeneration then throws NoFallbackError and keeps serving
 * the old file — measured on the production build: a property published from
 * the review console never appeared. A partner is published at runtime by a
 * reviewer, so the list is read at request time here, and the static page
 * stays static.
 *
 * WHAT IT RETURNS
 * ---------------
 * Only what a traveller sees: the property, its public channels and the
 * business telephone the application form says is shown. Never the partner's
 * e-mail, contact name, status history, reviewer or notes. Only PUBLISHED rows
 * (the query enforces it). Without a database, an empty list.
 */
export const dynamic = "force-dynamic";

export interface PublicPartnerStay {
  id: string;
  name: string;
  typeLabel: string;
  area: string | null;
  summary: string | null;
  officialWebsite: string | null;
  mapsUrl: string | null;
  phone: string | null;
}

export async function GET(request: Request) {
  const destinationId = new URL(request.url).searchParams.get("destination") ?? "";
  if (!isKnownDestination(destinationId)) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 400 });
  }

  let rows: Awaited<ReturnType<typeof publishedPropertiesFor>> = [];
  try {
    rows = await publishedPropertiesFor(destinationId);
  } catch (error) {
    /* A failed read must not break a destination page: log it, show nothing. */
    console.error("partner-stays: read failed", destinationId, error instanceof Error ? error.message : error);
  }

  const stays: PublicPartnerStay[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    typeLabel: ACCOMMODATION_LABEL[row.type],
    area: row.area,
    summary: row.localCharacter ?? row.description,
    officialWebsite: row.officialWebsite,
    mapsUrl: row.mapsUrl,
    phone: row.contactPhone,
  }));

  return NextResponse.json(
    { destinationId, stays },
    /* A shared cache may hold the list for a minute: a publish shows within
       about a minute on a CDN, immediately without one. */
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
