/**
 * The signed-in HINT: a cookie that says only "a session exists in this
 * browser", readable by page scripts.
 *
 * Destination and home pages are prerendered, so they cannot read the
 * HttpOnly session on the server without becoming per-request pages. A small
 * client component reads this hint instead, and only then asks
 * /api/account/* for anything personal. The hint carries no identity and
 * grants nothing — every personal endpoint checks the real session, and a
 * stale hint is cleared the first time one answers 401.
 */
export const SIGNED_IN_HINT = "ts_signed_in";

export const HINT_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60,
};

/** Browser-side: is there a hint? Safe during render on the server (false). */
export function hasSignedInHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${SIGNED_IN_HINT}=1`));
}

/** Browser-side: drop a stale hint after the server said there is no session. */
export function clearSignedInHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNED_IN_HINT}=; Max-Age=0; Path=/; SameSite=Lax`;
}
