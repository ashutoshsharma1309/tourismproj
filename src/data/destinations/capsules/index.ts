import { validateCapsule } from "@/lib/destinations/capsule";
import { CAPSULE_IDS } from "@/data/destinations/capsules/ids";
import type { DestinationCapsule } from "@/types/capsule";

/**
 * The capsule registry — one lazy importer per destination.
 *
 * WHY A MAP OF IMPORT FUNCTIONS RATHER THAN A BARREL
 * --------------------------------------------------
 * A barrel (`export * from "./jaipur"`) would pull every capsule into every
 * bundle that touches any capsule, which is exactly the storage problem this
 * phase exists to avoid. A map of `() => import(...)` thunks means a
 * destination's content is fetched only when that destination is rendered:
 * Rome's capsule is never in Kyoto's page, and a hundred registered capsules
 * cost a hundred entries in this table and nothing else.
 *
 * It is the same mechanism `content.ts` already uses for Sikkim's heavy
 * modules — reused, not reinvented.
 *
 * ADDING A DESTINATION
 * --------------------
 *   1. Copy `_template.ts` to `<destination-id>.ts` and fill it in.
 *   2. Add the id to `ids.ts` AND one line to CAPSULES below.
 *   3. Set the destination's `depth` to "capsule" in its registry record.
 *   4. `npm run qa:content-framework`.
 *
 * There is no step 5. Discovery, the planner, search, comparison and the
 * global layer pick it up from the capability model without changes.
 */
type CapsuleImporter = () => Promise<{ capsule: DestinationCapsule }>;

/**
 * Registered capsules, by destination id.
 *
 * PHASE 18 registered eight Indian destinations, PHASE 19 four global ones,
 * PHASE B the two that held research and no records.
 * Each entry is a lazy importer, so a capsule's bytes reach only the pages of
 * the destination it belongs to — Rome's capsule is not in Delhi's page, and
 * the four cities added in Phase 19 cost every other destination nothing.
 */
const CAPSULES: Record<string, CapsuleImporter> = {
  agra: () => import("./agra"),
  delhi: () => import("./delhi"),
  goa: () => import("./goa"),
  hyderabad: () => import("./hyderabad"),
  istanbul: () => import("./istanbul"),
  jaipur: () => import("./jaipur"),
  kochi: () => import("./kochi"),
  kolkata: () => import("./kolkata"),
  kyoto: () => import("./kyoto"),
  mumbai: () => import("./mumbai"),
  "new-york-city": () => import("./new-york-city"),
  paris: () => import("./paris"),
  rome: () => import("./rome"),
  varanasi: () => import("./varanasi"),
};

/**
 * Destination ids that have a capsule registered.
 *
 * `ids.ts` holds the same list without importing anything, so a caller that
 * only needs membership never pulls this module in. The two must agree, and
 * `qa:content-framework` asserts they do.
 */
export function capsuleDestinationIds(): string[] {
  return Object.keys(CAPSULES).sort();
}

export function hasCapsule(destinationId: string): boolean {
  return destinationId in CAPSULES;
}

/** True when the cheap id list and the importer table have drifted apart. */
export function capsuleRegistryDrift(): string[] {
  const declared = new Set(CAPSULE_IDS);
  const registered = new Set(Object.keys(CAPSULES));
  return [
    ...[...declared].filter((id) => !registered.has(id)).map((id) => `${id}: in ids.ts, no importer`),
    ...[...registered].filter((id) => !declared.has(id)).map((id) => `${id}: has an importer, missing from ids.ts`),
  ];
}

/**
 * Load and validate a destination's capsule.
 *
 * Fails CLOSED: an invalid capsule is not partially rendered and not
 * repaired. It is logged at build time and treated as absent, so the
 * destination shows "not yet available" — which is true, because content that
 * cannot be trusted is not content.
 */
export async function loadCapsule(destinationId: string): Promise<DestinationCapsule | null> {
  const importer = CAPSULES[destinationId];
  if (!importer) return null;

  const { capsule } = await importer();
  if (capsule.destinationId !== destinationId) {
    console.error(
      `[capsule] ${destinationId}: file declares destinationId "${capsule.destinationId}" — not loaded`,
    );
    return null;
  }

  const validation = validateCapsule(capsule);
  if (!validation.ok) {
    console.error(
      `[capsule] ${destinationId}: ${validation.errors.length} validation error(s), not loaded\n` +
        validation.errors.map((error) => `  - ${error}`).join("\n"),
    );
    return null;
  }
  return capsule;
}
