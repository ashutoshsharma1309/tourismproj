import "server-only";

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { cleanEnv, supabaseUrl } from "@/lib/supabase-env";

/**
 * The account layer's uses of the Supabase service-role key: creating a
 * traveller's sign-in, and removing it when its owner deletes the account.
 * Lives under src/db as CLAUDE.md §8 requires, never imported by a client
 * module.
 */
function adminAuth() {
  const url = supabaseUrl();
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return url && serviceKey ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }).auth.admin : null;
}

export type CreateTravellerResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "exists" | "invalid-email" | "weak-password" | "unavailable"; message?: string };

/**
 * A traveller account that can sign in at once, with no confirmation e-mail.
 *
 * Why this is safe: a password session never proves the inbox, and reviewer
 * rights and partner records are granted only to sessions that do
 * (provesInbox in lib/auth/session.ts). If someone registers another
 * person's address, its owner takes it back with "Forgot password", which
 * does prove the inbox — and so does the first code or link sign-in, which
 * retires the unproven password (secureInboxProof below). And the shared
 * Supabase mailer, limited to a few messages an hour, no longer decides
 * whether a traveller can join.
 */
export async function createTraveller(input: { email: string; password: string; name: string }): Promise<CreateTravellerResult> {
  const admin = adminAuth();
  if (!admin) return { ok: false, reason: "unavailable" };
  const { data: created, error } = await admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name },
    app_metadata: { password_unproven: true },
  });
  if (!error && created.user) return { ok: true, userId: created.user.id };
  if (error?.code === "email_exists" || /already (been )?registered|already exists/i.test(error?.message ?? "")) return { ok: false, reason: "exists" };
  if (error?.code === "email_address_invalid" || /invalid.*email|email.*invalid/i.test(error?.message ?? "")) return { ok: false, reason: "invalid-email" };
  if (error?.code === "weak_password") return { ok: false, reason: "weak-password" };
  console.error("account: traveller creation failed", error?.code ?? "", error?.message ?? "no user returned");
  return { ok: false, reason: "unavailable" };
}

/**
 * Called when a session has just proved the inbox (a one-time code or an
 * e-mail link). If the account's password was set at sign-up by whoever typed
 * the address — never proven to belong to the inbox's owner — it is replaced
 * with a random one. Supabase ends every session of the account when its
 * password changes, so someone who registered another person's address loses
 * all access the moment its owner signs in with a code; the owner can choose
 * a password with "Forgot password".
 *
 * That also ends the owner's brand-new session, so this returns a fresh
 * one-use sign-in token for the caller to verify at once — the owner stays
 * signed in, still by an inbox-proven method. Null when nothing changed.
 * Never blocks the sign-in: a failure is logged and the sign-in proceeds.
 */
export async function secureInboxProof(userId: string): Promise<string | null> {
  const admin = adminAuth();
  if (!admin) return null;
  try {
    const { data: found } = await admin.getUserById(userId);
    const user = found.user;
    if (!user?.email || user.app_metadata?.password_unproven !== true) return null;
    const { error } = await admin.updateUserById(userId, {
      password: randomBytes(32).toString("base64url"),
      app_metadata: { password_unproven: false },
    });
    if (error) throw error;
    const { data: link, error: linkError } = await admin.generateLink({ type: "magiclink", email: user.email });
    if (linkError) throw linkError;
    return link.properties?.hashed_token ?? null;
  } catch (error) {
    console.error("account: retiring an unproven password failed", (error as Error).message);
    return null;
  }
}

export async function deleteAuthUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = adminAuth();
  if (!admin) return { ok: false, error: "Account deletion is not configured on this deployment." };
  const { error } = await admin.deleteUser(userId);
  if (error) {
    console.error("account: auth user deletion failed", error.message);
    return { ok: false, error: "The sign-in could not be removed. Please try again." };
  }
  return { ok: true };
}
