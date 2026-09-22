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

/**
 * The Supabase project's id, read from the database connection string: the
 * pooler signs in as `postgres.<id>`, a direct connection reaches
 * `db.<id>.supabase.co`. Only the id is used — never the password.
 */
function projectRefFromDatabase(): string | null {
  const connection = cleanEnv(process.env.DATABASE_URL);
  if (!connection) return null;
  try {
    const parsed = new URL(connection);
    const ref = decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]{20})$/)?.[1] ?? parsed.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)?.[1];
    return ref ?? null;
  } catch {
    return null;
  }
}

/**
 * The project URL. A deployment that set the key and the database but not
 * NEXT_PUBLIC_SUPABASE_URL (production did exactly that) still gets it: it is
 * the public address of the project the database already belongs to.
 */
export function supabaseUrl(): string | null {
  const configured = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? cleanEnv(process.env.SUPABASE_URL);
  if (configured) return configured.replace(/\/+$/, "");
  const ref = projectRefFromDatabase();
  return ref ? `https://${ref}.supabase.co` : null;
}

/** The publishable (anon) key: public by design, safe in the browser. */
export function supabasePublicKey(): string | null {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
