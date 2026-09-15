import "server-only";

import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/account/origin";
import { travellerForApi, type SessionUser } from "@/lib/auth/session";
import { hasDatabase } from "@/db";

/** Personal responses are never stored by a shared cache. */
export const PRIVATE = { "Cache-Control": "private, no-store" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE });
}

/**
 * The gate every /api/account route passes: a database, a real session (not
 * the hint), and for writes a same-origin request. Returns the traveller or
 * the response to send instead.
 */
export async function gate(request: Request, write: boolean): Promise<SessionUser | Response> {
  if (!hasDatabase) return json({ error: "Accounts are not available on this deployment." }, 503);
  if (write && !isSameOrigin(request)) return json({ error: "Cross-site request refused." }, 403);
  const traveller = await travellerForApi();
  if (!traveller) return json({ error: "Not signed in." }, 401);
  return traveller;
}
