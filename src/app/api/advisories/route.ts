import { NextResponse } from "next/server";

import { publishedAdvisories } from "@/db/queries/government";
import { isKnownDestination } from "@/lib/destinations/registry";

/**
 * The official advisories in force for one destination.
 *
 * Read at request time for the same reason as partner stays: destination
 * pages are prerendered and cannot be regenerated on demand, while an
 * advisory is published by a tourism department at runtime — and an advisory
 * that appears a day late is worse than none.
 *
 * Only PUBLISHED rows inside their date window, each with the authority that
 * issued it. Nothing about the officer who wrote it.
 */
export const dynamic = "force-dynamic";

export interface PublicAdvisory {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  endsAt: string | null;
  authority: string | null;
}

export async function GET(request: Request) {
  const destinationId = new URL(request.url).searchParams.get("destination") ?? "";
  if (!isKnownDestination(destinationId)) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 400 });
  }

  let rows: Awaited<ReturnType<typeof publishedAdvisories>> = [];
  try {
    rows = await publishedAdvisories(destinationId);
  } catch (error) {
    /* A failed read must not break a destination page. */
    console.error("advisories: read failed", destinationId, error instanceof Error ? error.message : error);
  }

  const advisories: PublicAdvisory[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    severity: row.severity,
    title: row.title,
    body: row.body,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    authority: row.authority ?? row.source,
  }));

  return NextResponse.json(
    { destinationId, advisories },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
