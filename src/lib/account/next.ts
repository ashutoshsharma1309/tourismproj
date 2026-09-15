/**
 * A same-site path to continue to after sign-in, or the fallback. Never a URL.
 *
 * Rejects protocol-relative ("//evil"), backslash ("/\evil", which browsers
 * and WHATWG URL parsing treat as "//evil"), whitespace and control
 * characters, and anything that resolves to another origin.
 */
const SAME_SITE_PATH = /^\/(?![/\\])[^\s\\]*$/;
const CONTROL = /[\x00-\x1f\x7f]/;

export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return fallback;
  if (!SAME_SITE_PATH.test(value) || CONTROL.test(value)) return fallback;
  try {
    const base = "http://terrastory.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
