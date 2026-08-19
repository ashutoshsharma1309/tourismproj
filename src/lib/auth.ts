import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Curator access.
 *
 * WHAT THIS IS
 * ------------
 * A shared passphrase, exchanged for an HMAC-signed session cookie, gating the
 * one route that shows unreviewed contributions and the names of the people who
 * sent them. Until now that route was linked from the navbar on every page and
 * open to anyone who clicked it.
 *
 * WHAT THIS IS NOT — read before relying on it
 * --------------------------------------------
 * A shared secret authenticates a *team*, not a *person*. Everyone holding the
 * passphrase is indistinguishable in the logs, so this cannot support the audit
 * trail a government deployment would need — "who approved this record" has no
 * answer here. That requires per-user identity, and the honest thing is to say
 * so rather than to imply accountability the design cannot deliver.
 *
 * It is, however, real: the cookie is signed with HMAC-SHA256 over a
 * server-only secret, carries its own expiry, is httpOnly and SameSite=Lax, and
 * both the passphrase and the signature are compared in constant time. It
 * cannot be forged from the browser, which is the bar the previous state of
 * this route failed entirely.
 *
 * FAILS CLOSED
 * ------------
 * With no CURATOR_PASSPHRASE or AUTH_SECRET configured, nobody can sign in and
 * the route stays shut. An unconfigured deployment is a locked one, never an
 * open one — the opposite default is how staging environments end up serving
 * contributor emails to search engines.
 */

export type Role = "visitor" | "curator";

const COOKIE = "sd_curator";
const TTL_MS = 1000 * 60 * 60 * 8; // one working session

function secret(): string | null {
  const value = process.env.AUTH_SECRET;
  return value && value.length >= 16 ? value : null;
}

function passphrase(): string | null {
  const value = process.env.CURATOR_PASSPHRASE;
  return value && value.length >= 8 ? value : null;
}

/** Whether curator sign-in is possible at all in this deployment. */
export function authConfigured(): boolean {
  return secret() !== null && passphrase() !== null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Constant-time compare that also tolerates unequal lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    /* Still do the work so the failure takes the same time as a mismatch. */
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Verify a submitted passphrase. Always false when auth is unconfigured. */
export function passphraseMatches(candidate: string): boolean {
  const expected = passphrase();
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/**
 * Mint a session value: `<role>.<expiry>.<nonce>.<signature>`.
 *
 * The nonce is not a session id — nothing is stored server-side — it only stops
 * two sessions minted in the same millisecond from being byte-identical.
 */
export function mintSession(role: Role): string | null {
  const key = secret();
  if (!key) return null;
  const expires = Date.now() + TTL_MS;
  const nonce = randomBytes(9).toString("base64url");
  const payload = `${role}.${expires}.${nonce}`;
  return `${payload}.${sign(payload, key)}`;
}

/** The role carried by a session value, or "visitor" if it does not verify. */
export function verifySession(value: string | undefined): Role {
  const key = secret();
  if (!key || !value) return "visitor";

  const parts = value.split(".");
  if (parts.length !== 4) return "visitor";
  const [role, expires, nonce, signature] = parts as [string, string, string, string];

  const payload = `${role}.${expires}.${nonce}`;
  if (!safeEqual(signature, sign(payload, key))) return "visitor";

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return "visitor";

  return role === "curator" ? "curator" : "visitor";
}

/** The current request's role. Server components and actions only. */
export async function currentRole(): Promise<Role> {
  const store = await cookies();
  return verifySession(store.get(COOKIE)?.value);
}

export async function startSession(role: Role): Promise<boolean> {
  const value = mintSession(role);
  if (!value) return false;
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
  return true;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
