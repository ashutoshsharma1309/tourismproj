import { NextResponse } from "next/server";

import { hasDatabase } from "@/db";
import { hasDocumentStorage } from "@/db/storage";
import { accountsAvailable } from "@/lib/auth/server";
import { SITE_URL } from "@/lib/constants";
import { supabasePublicKey, supabaseUrl } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

/**
 * Whether accounts can work on this deployment, as yes/no only — never a
 * value, a prefix or a length. It lets someone without dashboard access see
 * which setting a deployment is missing.
 */
export async function GET() {
  const url = supabaseUrl();
  const key = supabasePublicKey();
  /* Set-but-wrong is the failure a presence check cannot see: a typo in the
     project URL passes it and then every sign-in fails to connect. Ask
     Supabase whether it answers, and report the host (public) and the
     status — never the key. */
  let auth: { host: string | null; status: number | string } = { host: null, status: "not-configured" };
  if (url && key) {
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return "unparseable";
      }
    })();
    try {
      const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(5_000), cache: "no-store" });
      auth = { host, status: response.status };
    } catch (error) {
      auth = { host, status: `unreachable: ${(error as Error).name}` };
    }
  }
  return NextResponse.json(
    {
      accounts: accountsAvailable(),
      supabaseUrl: Boolean(url),
      supabasePublicKey: Boolean(key),
      database: hasDatabase,
      serviceKey: hasDocumentStorage,
      emailLinksGoTo: new URL(SITE_URL).host,
      auth,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
