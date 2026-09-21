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
export function GET() {
  return NextResponse.json(
    {
      accounts: accountsAvailable(),
      supabaseUrl: Boolean(supabaseUrl()),
      supabasePublicKey: Boolean(supabasePublicKey()),
      database: hasDatabase,
      serviceKey: hasDocumentStorage,
      emailLinksGoTo: new URL(SITE_URL).host,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
