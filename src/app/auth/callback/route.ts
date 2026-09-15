import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * Where an e-mail link lands. Two shapes arrive here:
 *
 *   ?code=…                       the PKCE code a magic link carries when the
 *                                 sign-in began in this browser;
 *   ?token_hash=…&type=magiclink  the hashed token an e-mail template (or an
 *                                 operator-generated link) carries, usable
 *                                 from any browser.
 *
 * Either becomes a session cookie and the visitor continues to `next`,
 * accepted only as a same-site path. Anything else returns to sign-in.
 */
const SAME_SITE_PATH = /^\/(?!\/)[^\s]*$/;
const OTP_TYPES = new Set(["magiclink", "email", "signup", "recovery", "invite", "email_change"] as const);
type OtpType = typeof OTP_TYPES extends Set<infer T> ? T : never;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/partner/dashboard";
  const safeNext = SAME_SITE_PATH.test(next) ? next : "/partner/dashboard";

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as OtpType | null;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    } else if (tokenHash && type && OTP_TYPES.has(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeNext)}`, url.origin));
}
