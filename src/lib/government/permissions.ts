/**
 * What a government role may do, and how far its authority reaches. Pure, so
 * the console, the stores and the tests all read the same table.
 *
 * LEAST PRIVILEGE
 * ---------------
 * A REVIEWER decides verifications and reads supply analytics. A MANAGER also
 * publishes advisories and manages the team. Neither can reach a traveller:
 * no capability here names one, and no query in the console joins to
 * bookings, history or interests.
 */

export const GOV_CAPABILITIES = [
  "viewQueue",
  "decideVerification",
  "requestClarification",
  "viewAnalytics",
  "viewAdvisories",
  "manageAdvisories",
  "manageTeam",
] as const;
export type GovCapability = (typeof GOV_CAPABILITIES)[number];
export type GovRole = "REVIEWER" | "MANAGER";

const BY_ROLE: Record<GovRole, readonly GovCapability[]> = {
  REVIEWER: ["viewQueue", "decideVerification", "requestClarification", "viewAnalytics", "viewAdvisories"],
  MANAGER: ["viewQueue", "decideVerification", "requestClarification", "viewAnalytics", "viewAdvisories", "manageAdvisories", "manageTeam"],
};

export function canGov(role: GovRole, capability: GovCapability): boolean {
  return BY_ROLE[role].includes(capability);
}

export interface GovOrgScope {
  scopeKind: "NATIONAL" | "DESTINATIONS";
  destinationIds: string[];
  isActive: boolean;
}

/**
 * The destinations an organisation may act in. A national body covers every
 * destination the registry knows; anyone else covers exactly the ids on its
 * row, and an inactive organisation covers nothing.
 */
export function permittedDestinations(org: GovOrgScope, allDestinationIds: readonly string[]): string[] {
  if (!org.isActive) return [];
  if (org.scopeKind === "NATIONAL") return [...allDestinationIds];
  return org.destinationIds.filter((id) => allDestinationIds.includes(id));
}

export function inScope(permitted: readonly string[], destinationId: string): boolean {
  return permitted.includes(destinationId);
}
