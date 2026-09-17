import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasDatabase } from "@/db";
import { partnerById, type PartnerRow } from "@/db/queries/partners";
import { currentUser, partnerFor, provesInbox, type SessionUser } from "@/lib/auth/session";
import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from "@/lib/i18n";

/**
 * Who may use the partner workspace, resolved once per request.
 *
 * The partner is ALWAYS the one the session resolves to (`partnerFor`), never
 * an id from a URL or a form, so no page or action can be pointed at another
 * partner's records. A record id that does arrive from a URL — a listing, a
 * room type — is then matched against this partner in the query itself.
 */
export type PartnerAccess =
  | { kind: "no-database" }
  | { kind: "needs-code"; session: SessionUser }
  | { kind: "no-partner"; session: SessionUser }
  | { kind: "ok"; session: SessionUser; partner: PartnerRow };

/** For a PAGE: signed-out visitors are sent to sign in and brought back. */
export async function partnerAccess(next: string): Promise<PartnerAccess> {
  if (!hasDatabase) return { kind: "no-database" };
  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  /* Partner records open only to a session that proved the inbox: a
     confirmed address signed in with a one-time code or e-mail link. */
  if (!provesInbox(session)) return { kind: "needs-code", session };
  const partnerSession = await partnerFor(session);
  if (!partnerSession) return { kind: "no-partner", session };
  const partner = await partnerById(partnerSession.partnerId);
  if (!partner) return { kind: "no-partner", session };
  return { kind: "ok", session, partner };
}

/** For an ACTION: the same resolution, or null (the action refuses). */
export async function partnerForAction(): Promise<{ session: SessionUser; partner: PartnerRow } | null> {
  if (!hasDatabase) return null;
  const session = await currentUser();
  if (!session || !provesInbox(session)) return null;
  const partnerSession = await partnerFor(session);
  if (!partnerSession) return null;
  const partner = await partnerById(partnerSession.partnerId);
  return partner ? { session, partner } : null;
}

/**
 * The workspace language. The partner surface is rendered per request and is
 * never shared as a link, so the browser's own preference decides; English
 * when it names nothing this product speaks.
 */
export async function partnerLanguage(): Promise<LanguageCode> {
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (code && isLanguageCode(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}
