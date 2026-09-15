/**
 * Same-origin check for JSON write endpoints.
 *
 * Server actions carry Next's own Origin/Host check. Route handlers do not,
 * so every POST/PUT/DELETE under /api/account calls this first. A browser
 * always sends Origin on a cross-origin (and same-origin) fetch POST; a
 * request whose Origin names another host is refused. With SameSite=Lax
 * session cookies this closes cross-site request forgery for the JSON API.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) {
    /* No Origin: not a browser fetch. `sec-fetch-site` settles the rest. */
    const site = request.headers.get("sec-fetch-site");
    return site === null ? false : site === "same-origin";
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
