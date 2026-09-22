/**
 * Supabase settings, read the way a hosting dashboard actually delivers them.
 *
 * WHY NOT `A ?? B`
 * ----------------
 * Vercel passes a variable that is declared but left empty as the EMPTY
 * STRING, and `??` only falls back on null or undefined. So an empty
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY hid a correct ANON_KEY and every
 * account page reported "not available" on a deployment that had the key.
 * Values pasted into a dashboard also arrive with stray spaces or the quotes
 * from a .env line. Each value is trimmed, unquoted, and empty means absent.
 *
 * NEXT_PUBLIC_* names are written out literally so Next can still inline them.
 */
export function cleanEnv(value: string | undefined): string | null {
  if (value === undefined) return null;
  let v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1).trim();
  return v.length > 0 ? v : null;
}

export function supabaseUrl(): string | null {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/+$/, "") ?? null;
}

/** The publishable (anon) key: public by design, safe in the browser. */
export function supabasePublicKey(): string | null {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
