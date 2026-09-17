import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * The one use of the Supabase service-role key in the account layer:
 * removing a sign-in identity when its owner deletes their account. Lives
 * under src/db as CLAUDE.md §8 requires, never imported by a client module.
 */
export async function deleteAuthUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, error: "Account deletion is not configured on this deployment." };
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("account: auth user deletion failed", error.message);
    return { ok: false, error: "The sign-in could not be removed. Please try again." };
  }
  return { ok: true };
}
