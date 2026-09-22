import { timingSafeEqual } from "node:crypto";

import { sweepExpiredHolds } from "@/lib/booking/holds";

/**
 * Release expired holds on a schedule. Holds are also released on every
 * read that depends on them (search, the listing's rooms, checkout, a new
 * hold), so this sweep is housekeeping, not correctness.
 *
 * Requires `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET the
 * route answers 503 rather than run for anyone who finds it.
 */
export const dynamic = "force-dynamic";

function authorised(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const headers = { "cache-control": "private, no-store" };
  if (!secret) return Response.json({ error: "not configured" }, { status: 503, headers });
  if (!authorised(request, secret)) return Response.json({ error: "unauthorised" }, { status: 401, headers });
  const released = await sweepExpiredHolds();
  return Response.json({ released }, { headers });
}
