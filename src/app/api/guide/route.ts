import { NextResponse } from "next/server";

import { buildGuideIndex } from "@/lib/guide-index";

/**
 * The trip guide's knowledge base, served on demand.
 *
 * This exists because the obvious thing — building the index in the root
 * layout and passing it to the widget as a prop, the way the ⌘K palette gets
 * its search index — put roughly 313 KB of JSON into the HTML of every single
 * page. The register alone is 905 properties. Most visitors never open the
 * guide, and they were all paying for it on every navigation.
 *
 * The palette can afford its prop because it carries four short strings per
 * record. The guide carries blurbs, addresses and permit notes, and it is
 * behind a button. So it fetches once, on first open, and the answer is a
 * static file: the index is derived entirely from build-time data, so there is
 * nothing per-request about it.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildGuideIndex());
}
