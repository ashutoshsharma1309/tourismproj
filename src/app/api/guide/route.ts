import { NextResponse } from "next/server";

import { buildGuideIndex } from "@/lib/guide-index";
import { buildGuideRecords } from "@/lib/guide-records";

/**
 * The guide's knowledge base, served once and cached by the browser.
 *
 * It is built at BUILD TIME (`force-static`), so answering a question costs no
 * server work and no model call — the guide is deterministic retrieval over an
 * index, not a language model behind an API.
 *
 * The two halves are built separately because Sikkim's corpus is synchronous
 * and statically imported, while the other fourteen destinations live in
 * capsules that are loaded and validated asynchronously. See
 * `lib/guide-records.ts`.
 */
export const dynamic = "force-static";

export async function GET() {
  const [index, records] = await Promise.all([
    Promise.resolve(buildGuideIndex()),
    buildGuideRecords(),
  ]);
  return NextResponse.json({ ...index, records });
}
