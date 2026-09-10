import { NextResponse } from "next/server";

import { buildOperatorIndex } from "@/lib/operator-index";

/**
 * The licensed-operator directory's index, served on demand.
 *
 * Exactly the reasoning behind `/api/guide`, one order of magnitude worse: the
 * two state registers hold 2,763 establishments, and passing them to the
 * directory as a prop would put a few hundred kilobytes of licensing data into
 * the HTML of any page that mounts it. The directory is one route, most
 * visitors never open it, and everyone would have paid.
 *
 * There is nothing per-request about the answer — the registers are build-time
 * data promoted from a reviewed ingest — so this is a static file that happens
 * to be spelled as a route.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildOperatorIndex());
}
