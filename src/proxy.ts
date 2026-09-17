import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/cookies";
import { HINT_COOKIE_OPTIONS, SIGNED_IN_HINT } from "@/lib/account/hint";

/**
 * Keeps the Supabase session fresh on the routes that read it.
 *
 * A Server Component cannot write cookies, so an access token that expired
 * while the traveller was away could not be refreshed by the account page
 * itself; this proxy refreshes it first and hands the new cookies to both the
 * page (request) and the browser (response). It also keeps the signed-in
 * hint in step with the real session.
 *
 * It runs ONLY on account, sign-in, partner and review routes. Destination,
 * story and home pages stay prerendered and never pay for an auth round trip.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  /* getUser() validates the token with Supabase and refreshes it if needed. */
  const { data } = await supabase.auth.getUser();
  const hinted = request.cookies.get(SIGNED_IN_HINT)?.value === "1";
  if (data.user && !hinted) response.cookies.set(SIGNED_IN_HINT, "1", HINT_COOKIE_OPTIONS);
  if (!data.user && hinted) response.cookies.set(SIGNED_IN_HINT, "", { ...HINT_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

export const config = {
  matcher: [
    "/account/:path*",
    "/login/:path*",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/partner/dashboard",
    "/partner/verification",
    "/partner/listings/:path*",
    "/partner/calendar",
    "/admin/:path*",
    /* Not /api/account: those route handlers validate the session themselves
       and can write refreshed cookies, so a proxy pass would only repeat the
       round trip to Supabase on every call. */
  ],
};
