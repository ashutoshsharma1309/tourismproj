import "server-only";

import { isPartnerMessageKey, partnerTranslator, type PartnerT } from "@/lib/i18n/partner-messages";
import { partnerForAction, partnerLanguage } from "@/lib/partners/access";
import type { Scope } from "@/lib/partners/inventory";
import { consumeQuota } from "@/lib/rate-limit";

import type { WorkspaceState } from "./workspace-state";

/**
 * The preamble every partner-workspace action shares: resolve the partner
 * from the session (never from the form), apply the per-partner write quota,
 * and bind the translator. Returns either a ready scope or the state to
 * return to the form.
 */
export async function workspaceAction(): Promise<
  | { ok: true; scope: Scope; t: PartnerT; vendorStatus: string }
  | { ok: false; state: WorkspaceState }
> {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerForAction();
  if (!access) return { ok: false, state: { status: "error", message: t("error.notFound") } };
  const quota = await consumeQuota("partner-workspace", 60, 60_000, access.partner.id);
  if (!quota.ok) return { ok: false, state: { status: "error", message: t("error.rateLimited") } };
  return {
    ok: true,
    scope: { partnerId: access.partner.id, actorId: access.session.id },
    t,
    vendorStatus: access.partner.status,
  };
}

export function translateKeys(t: PartnerT, errors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, isPartnerMessageKey(key) ? t(key) : t("error.invalid")]));
}

export function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
