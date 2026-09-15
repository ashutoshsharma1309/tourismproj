import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/cookies";

export { SESSION_COOKIE_OPTIONS };

/**
 * Supabase Auth on the server, sessions in cookies.
 *
 * WHY THIS EXISTS BESIDE lib/supabase.ts
 * --------------------------------------
 * `getSupabase()` is the anonymous data client the archive has used since
 * Phase 1. Signing a partner or a reviewer in needs a client that reads and
 * writes the session cookies of the current request, which is what
 * `@supabase/ssr` provides. Kept separate so nothing that only reads content
 * starts depending on request cookies.
 *
 * Returns null when the deployment has no Supabase configured — sign-in is
 * then reported as unavailable rather than failing at request time.
 *
 * Travellers use the same client since the account layer: e-mail and
 * password sign-in, sessions refreshed by src/proxy.ts on account routes.
 *
 * Only the publishable key is used here. The service-role key never leaves
 * src/db and src/lib/payments (CLAUDE.md §8).
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* A Server Component cannot set cookies; a server action or route
             handler can. Reads still work, and the session is refreshed the
             next time an action or handler runs. */
        }
      },
    },
  });
}

export function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
