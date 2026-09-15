import { NextResponse } from "next/server";

import { HINT_COOKIE_OPTIONS, SIGNED_IN_HINT } from "@/lib/account/hint";
import { safeNextPath } from "@/lib/account/next";
import { isSameOrigin } from "@/lib/account/origin";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * Where an e-mail link lands.
 *
 *   GET ?code=…        The PKCE code of a link whose sign-in began in THIS
 *                      browser (the code verifier is in its cookies), so it
 *                      is exchanged at once. It cannot be replayed elsewhere.
 *   GET ?token_hash=…  A hashed token, usable from ANY browser. Exchanging it
 *                      on GET would let a hidden image or a redirect sign a
 *                      visitor into someone else's account (login CSRF) and
 *                      pour their exploration into it. So GET only shows a
 *                      "Continue" page (/auth/continue), and:
 *   POST token_hash    …completes it, from a same-origin form only.
 *
 * `next` is accepted only as a same-site path (lib/account/next.ts).
 */
const OTP_TYPES = new Set(["magiclink", "email", "signup", "recovery", "invite", "email_change"] as const);
type OtpType = typeof OTP_TYPES extends Set<infer T> ? T : never;

function signedIn(target: URL) {
  const response = NextResponse.redirect(target, 303);
  response.cookies.set(SIGNED_IN_HINT, "1", HINT_COOKIE_OPTIONS);
  return response;
}

function backToLogin(origin: string, next: string) {
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, origin), 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));

  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return signedIn(new URL(next, url.origin));
    }
    return backToLogin(url.origin, next);
  }

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && type && OTP_TYPES.has(type as OtpType)) {
    const target = new URL("/auth/continue", url.origin);
    target.searchParams.set("token_hash", tokenHash);
    target.searchParams.set("type", type);
    target.searchParams.set("next", next);
    return NextResponse.redirect(target);
  }
  return backToLogin(url.origin, next);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isSameOrigin(request)) return new NextResponse("Cross-site request refused.", { status: 403 });
  const form = await request.formData();
  const next = safeNextPath(form.get("next"));
  const tokenHash = form.get("token_hash");
  const type = form.get("type");
  if (typeof tokenHash !== "string" || typeof type !== "string" || !OTP_TYPES.has(type as OtpType)) {
    return backToLogin(url.origin, next);
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as OtpType });
    if (!error) return signedIn(new URL(next, url.origin));
  }
  return backToLogin(url.origin, next);
}
