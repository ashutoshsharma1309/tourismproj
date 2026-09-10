import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-safe Supabase client, or null when the project is not configured.
 * Callers must handle null and fall back to local constants — the app renders
 * fully without a database.
 *
 * Only the publishable (or legacy anon) key ever appears here; both are safe
 * to expose. The service-role key must never enter frontend source.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key ? createClient(url, key) : null;
  return cached;
}
