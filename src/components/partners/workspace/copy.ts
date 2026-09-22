import type { PartnerMessageKey, PartnerT } from "@/lib/i18n/partner-messages";

/**
 * Translated strings handed to a client component. The catalogue stays on the
 * server; a form receives only the sentences it renders.
 */
export type Copy = Partial<Record<PartnerMessageKey, string>>;

export function copyFor(t: PartnerT, keys: readonly PartnerMessageKey[]): Copy {
  return Object.fromEntries(keys.map((key) => [key, t(key)]));
}

export function say(copy: Copy, key: PartnerMessageKey): string {
  return copy[key] ?? "";
}
