/**
 * Session cookies are HttpOnly: TerraStory never uses a browser Supabase
 * client, so no page script needs the tokens, and an injected script cannot
 * read them. Secure outside local development; SameSite=Lax so a cross-site
 * POST carries no session. A session lasts at most 30 days without use —
 * Supabase rotates the refresh token on every refresh inside that window.
 */
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60,
};
