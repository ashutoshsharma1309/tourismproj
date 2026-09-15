import { createHash, randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { recordReferral } from "@/lib/partners/store";
import { referralEventSchema } from "@/lib/partners/schema";

/**
 * POST /api/referrals — one outbound click, recorded.
 *
 * Sent by `ReferralLink` with `navigator.sendBeacon` as the traveller leaves
 * for the property's own website, booking page, map or telephone. The body
 * is validated with Zod; anything else is a 400 and nothing is stored.
 *
 * PRIVACY
 * -------
 * The only identifier is a first-party cookie holding a random id, set here
 * on the first click and hashed with SHA-256 before it is stored. It lets
 * one visitor's repeated clicks be counted as one visitor. No IP address, no
 * user agent, no referrer beyond the page path the body names, and no link
 * to a sign-in session even when one exists.
 *
 * It never claims anything happened after the click.
 */
const SESSION_COOKIE = "ts_ref";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = referralEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid referral" }, { status: 400 });
  }

  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const response = NextResponse.json({ ok: true }, { status: 202 });
  if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) {
    sessionId = randomUUID();
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  const sessionHash = createHash("sha256").update(sessionId).digest("hex");

  try {
    const { data: event } = parsed;
    await recordReferral(event, sessionHash);
  } catch (error) {
    /* The click still goes through; the count is the thing that failed. */
    console.error("referral: not recorded", error);
  }
  return response;
}
