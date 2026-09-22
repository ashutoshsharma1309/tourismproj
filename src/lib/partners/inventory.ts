import "server-only";

import { and, count, eq, gt, ne, or, sql } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { availability, bookingItems, listingUnits, partnerProperties, partners, vendorDocuments } from "@/db/schema";
import { auditLogs } from "@/db/schema/ops";
import type { PartnerMessageKey } from "@/lib/i18n/partner-messages";
import { rangeProblem, spanDays } from "@/lib/partners/calendar";
import type { AvailabilityInput, ListingDetails, NewListing, UnitInput } from "@/lib/partners/inventory-schema";
import { canVendorTransition, isVerifiedVendor, type VendorStatus } from "@/lib/partners/vendor";
import { entitlementsFor } from "@/lib/subscriptions/access";
import { can, withinLimit } from "@/lib/subscriptions/entitlements";

/**
 * Every write the partner workspace makes: listings, room types, the
 * calendar, vendor decisions and documents. Audited, all of it (CLAUDE.md §2
 * R7), in the same transaction as the change it records.
 *
 * SCOPE IS AN ARGUMENT THE CALLER CANNOT FORGE
 * --------------------------------------------
 * Every partner write takes a `Scope` built from the session's partner
 * (lib/partners/access.ts), and matches the record it touches against that
 * partner INSIDE the query — `WHERE listing.partner_id = scope.partnerId` —
 * so a listing or room-type id from another partner resolves to nothing,
 * exactly as an id that does not exist.
 *
 * Errors are catalogue keys, translated by the action.
 */

export type InventoryResult<T> = { ok: true; data: T } | { ok: false; error: PartnerMessageKey };

export interface Scope {
  partnerId: string;
  actorId: string;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function pgConstraint(error: unknown): string {
  const e = error as { constraint_name?: string; code?: string; message?: string; cause?: { constraint_name?: string; message?: string } };
  return e?.constraint_name ?? e?.cause?.constraint_name ?? `${e?.message ?? ""} ${e?.cause?.message ?? ""}`;
}

async function audit(
  tx: Tx,
  scope: { actorId: string },
  action: string,
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  await tx.insert(auditLogs).values({ actorId: scope.actorId, action, entityType, entityId, before, after });
}

/** The partner's current vendor status, locked for the rest of the transaction. */
async function vendorStatus(tx: Tx, partnerId: string): Promise<VendorStatus | null> {
  const [row] = await tx.select({ status: partners.status }).from(partners).where(eq(partners.id, partnerId)).limit(1).for("update");
  return (row?.status as VendorStatus | undefined) ?? null;
}

/** Listings that count against a plan: everything but a rejected request. */
export async function listingCount(tx: Tx, partnerId: string): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(partnerProperties)
    .where(and(eq(partnerProperties.partnerId, partnerId), ne(partnerProperties.status, "REJECTED")));
  return Number(row?.n ?? 0);
}

/** A listing this partner owns, locked; null for anyone else's. */
async function ownedListing(tx: Tx, scope: Scope, listingId: string) {
  const [row] = await tx
    .select()
    .from(partnerProperties)
    .where(and(eq(partnerProperties.id, listingId), eq(partnerProperties.partnerId, scope.partnerId)))
    .limit(1)
    .for("update");
  return row ?? null;
}

/** A room type on one of this partner's listings, locked; null for anyone else's. */
async function ownedUnit(tx: Tx, scope: Scope, unitId: string) {
  const [row] = await tx
    .select({ unit: listingUnits })
    .from(listingUnits)
    .innerJoin(partnerProperties, eq(listingUnits.listingId, partnerProperties.id))
    .where(and(eq(listingUnits.id, unitId), eq(partnerProperties.partnerId, scope.partnerId)))
    .limit(1)
    .for("update", { of: listingUnits });
  return row?.unit ?? null;
}

/* ---------------------------------------------------------------- listings */

/** A verified vendor adds a listing. It enters review; saving publishes nothing. */
export async function createListing(scope: Scope, input: NewListing): Promise<InventoryResult<{ listingId: string }>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  return db.transaction(async (tx) => {
    const status = await vendorStatus(tx, scope.partnerId);
    if (!status || !isVerifiedVendor(status)) return { ok: false, error: "error.notVerified" };
    const plan = await entitlementsFor(scope.partnerId, tx);
    if (!can(plan, "createListing")) return { ok: false, error: "error.planFeature" };
    if (!withinLimit(plan, "listings", await listingCount(tx, scope.partnerId))) return { ok: false, error: "error.planLimit" };

    const [existing] = await tx
      .select({ id: partnerProperties.id })
      .from(partnerProperties)
      .where(
        and(
          eq(partnerProperties.partnerId, scope.partnerId),
          eq(partnerProperties.destinationId, input.destinationId),
          eq(partnerProperties.name, input.name),
        ),
      )
      .limit(1);
    if (existing) return { ok: false, error: "error.duplicateListing" };

    const [listing] = await tx
      .insert(partnerProperties)
      .values({
        partnerId: scope.partnerId,
        destinationId: input.destinationId,
        name: input.name,
        type: input.type,
        address: input.address,
        area: input.area,
        mapsUrl: input.mapsUrl,
        officialWebsite: input.officialWebsite,
        bookingUrl: input.bookingUrl,
        description: input.description,
        localCharacter: input.localCharacter,
        amenities: input.amenities,
        checkInFrom: input.checkInFrom,
        checkOutBy: input.checkOutBy,
        houseRules: input.houseRules,
        cancellationTerms: input.cancellationTerms,
        status: "PENDING",
        source: "partner-workspace",
        provenance: { submittedAt: new Date().toISOString(), checks: [] },
      })
      .returning({ id: partnerProperties.id });
    if (!listing) return { ok: false, error: "error.generic" };

    await audit(tx, scope, "partner_property.submitted", "partner_property", listing.id, null, {
      status: "PENDING",
      partnerId: scope.partnerId,
      destinationId: input.destinationId,
      via: "partner-workspace",
    });
    return { ok: true, data: { listingId: listing.id } };
  });
}

/** The descriptive fields a partner keeps current. Verified facts stay with reviewers. */
export async function editListingDetails(scope: Scope, listingId: string, patch: ListingDetails): Promise<InventoryResult<null>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  return db.transaction(async (tx) => {
    const row = await ownedListing(tx, scope, listingId);
    if (!row) return { ok: false, error: "error.notFound" };
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, (row as Record<string, unknown>)[k]]));
    const changed = Object.entries(patch).filter(([k, v]) => JSON.stringify(before[k] ?? null) !== JSON.stringify(v ?? null));
    if (changed.length === 0) return { ok: true, data: null };
    await tx.update(partnerProperties).set({ ...patch, updatedAt: new Date() }).where(eq(partnerProperties.id, listingId));
    await audit(
      tx,
      scope,
      "partner_property.details_edited",
      "partner_property",
      listingId,
      Object.fromEntries(changed.map(([k]) => [k, before[k] ?? null])),
      Object.fromEntries(changed),
    );
    return { ok: true, data: null };
  });
}

/* -------------------------------------------------------------- room types */

/** Audit rows are JSON: paise travel as strings. */
function unitAudit(input: UnitInput) {
  return { name: input.name, capacity: input.capacity, totalQuantity: input.totalQuantity, basePricePaise: input.basePrice?.toString() ?? null };
}

export async function createUnit(scope: Scope, listingId: string, input: UnitInput): Promise<InventoryResult<{ unitId: string }>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  try {
    return await db.transaction(async (tx) => {
      const listing = await ownedListing(tx, scope, listingId);
      if (!listing) return { ok: false, error: "error.notFound" };
      const plan = await entitlementsFor(scope.partnerId, tx);
      if (!can(plan, "manageInventory")) return { ok: false, error: "error.planFeature" };
      const [existingUnits] = await tx.select({ n: count() }).from(listingUnits).where(eq(listingUnits.listingId, listingId));
      if (!withinLimit(plan, "roomTypesPerListing", Number(existingUnits?.n ?? 0))) return { ok: false, error: "error.planLimit" };
      const [unit] = await tx
        .insert(listingUnits)
        .values({ listingId, name: input.name, capacity: input.capacity, totalQuantity: input.totalQuantity, basePricePaise: input.basePrice })
        .returning({ id: listingUnits.id });
      if (!unit) return { ok: false, error: "error.generic" };
      await audit(tx, scope, "listing_unit.created", "listing_unit", unit.id, null, unitAudit(input));
      return { ok: true, data: { unitId: unit.id } };
    });
  } catch (error) {
    if (pgConstraint(error).includes("listing_units_listing_name_unique")) return { ok: false, error: "error.duplicateUnit" };
    throw error;
  }
}

export async function updateUnit(scope: Scope, unitId: string, input: UnitInput): Promise<InventoryResult<null>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  try {
    return await db.transaction(async (tx) => {
      const unit = await ownedUnit(tx, scope, unitId);
      if (!unit) return { ok: false, error: "error.notFound" };
      if (!can(await entitlementsFor(scope.partnerId, tx), "manageInventory")) return { ok: false, error: "error.planFeature" };
      const before = unitAudit({ name: unit.name, capacity: unit.capacity, totalQuantity: unit.totalQuantity, basePrice: unit.basePricePaise });
      const after = unitAudit(input);
      if (JSON.stringify(before) === JSON.stringify(after)) return { ok: true, data: null };
      await tx
        .update(listingUnits)
        .set({ name: input.name, capacity: input.capacity, totalQuantity: input.totalQuantity, basePricePaise: input.basePrice, updatedAt: new Date() })
        .where(eq(listingUnits.id, unitId));
      await audit(tx, scope, "listing_unit.updated", "listing_unit", unitId, before, after);
      return { ok: true, data: null };
    });
  } catch (error) {
    const constraint = pgConstraint(error);
    if (constraint.includes("listing_units_listing_name_unique")) return { ok: false, error: "error.duplicateUnit" };
    if (constraint.includes("listing_units_quantity_covers_commitments")) return { ok: false, error: "error.quantityBelowCommitted" };
    throw error;
  }
}

export async function deleteUnit(scope: Scope, unitId: string): Promise<InventoryResult<null>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  return db.transaction(async (tx) => {
    const unit = await ownedUnit(tx, scope, unitId);
    if (!unit) return { ok: false, error: "error.notFound" };
    if (!can(await entitlementsFor(scope.partnerId, tx), "manageInventory")) return { ok: false, error: "error.planFeature" };
    const [committed] = await tx
      .select({ id: availability.id })
      .from(availability)
      .where(and(eq(availability.listingUnitId, unitId), or(gt(availability.unitsHeld, 0), gt(availability.unitsBooked, 0))))
      .limit(1);
    const [sold] = await tx.select({ id: bookingItems.id }).from(bookingItems).where(eq(bookingItems.listingUnitId, unitId)).limit(1);
    if (committed || sold) return { ok: false, error: "error.unitInUse" };
    await tx.delete(listingUnits).where(eq(listingUnits.id, unitId));
    await audit(tx, scope, "listing_unit.deleted", "listing_unit", unitId, { listingId: unit.listingId, name: unit.name, totalQuantity: unit.totalQuantity }, null);
    return { ok: true, data: null };
  });
}

/* ---------------------------------------------------------------- calendar */

/**
 * Open or close a room type across a range of dates.
 *
 * One row per (unit, date), upserted in one statement inside a transaction
 * that holds the unit's row lock, so two saves of the same calendar serialise
 * rather than interleave. Only `units_open` is written: held and booked rooms
 * belong to the booking engine and a partner's calendar never rewrites them.
 * Opening more rooms than the unit has, counting those already held or
 * booked, is refused by the database (`availability_within_quantity`).
 */
export async function setAvailability(scope: Scope, input: AvailabilityInput, today: string): Promise<InventoryResult<{ days: number }>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  if (rangeProblem(input.from, input.to, today)) return { ok: false, error: "error.range" };
  const rooms = input.mode === "close" ? 0 : input.rooms;
  if (input.mode === "open" && rooms < 1) return { ok: false, error: "error.rooms" };

  try {
    return await db.transaction(async (tx) => {
      const unit = await ownedUnit(tx, scope, input.unitId);
      if (!unit) return { ok: false, error: "error.notFound" };
      if (!can(await entitlementsFor(scope.partnerId, tx), "manageInventory")) return { ok: false, error: "error.planFeature" };
      if (rooms > unit.totalQuantity) return { ok: false, error: "error.exceedsQuantity" };

      const closed = input.mode === "close";
      const price = closed ? null : input.price;
      await tx.execute(sql`
        INSERT INTO availability (listing_unit_id, date, units_open, closed, price_paise_override)
        SELECT ${input.unitId}::uuid, day::date, ${rooms}, ${closed}, ${price === null ? null : price.toString()}::bigint
        FROM generate_series(${input.from}::date, ${input.to}::date, interval '1 day') AS day
        ON CONFLICT (listing_unit_id, date)
        DO UPDATE SET units_open = EXCLUDED.units_open, closed = EXCLUDED.closed,
          price_paise_override = CASE WHEN EXCLUDED.closed THEN availability.price_paise_override ELSE EXCLUDED.price_paise_override END,
          updated_at = now()
      `);
      const days = spanDays(input.from, input.to);
      await audit(tx, scope, input.mode === "close" ? "availability.closed" : "availability.opened", "listing_unit", input.unitId, null, {
        from: input.from,
        to: input.to,
        unitsOpen: rooms,
        closed,
        pricePaiseOverride: price === null ? null : price.toString(),
        days,
      });
      return { ok: true, data: { days } };
    });
  } catch (error) {
    if (pgConstraint(error).includes("availability_within_quantity")) return { ok: false, error: "error.exceedsQuantity" };
    throw error;
  }
}

/* ----------------------------------------------------------------- vendors */

/**
 * A reviewer's decision about the ORGANISATION: verify, approve, reject,
 * suspend, reinstate. Idempotent — the same decision twice records once.
 * A rejection or suspension must say why, because the partner reads it.
 * Suspending unpublishes every listing, in the database trigger.
 */
export async function decideVendor(
  reviewer: { actorId: string },
  partnerId: string,
  to: VendorStatus,
  note: string | null,
): Promise<{ ok: true; data: { status: VendorStatus; changed: boolean } } | { ok: false; error: string }> {
  if (!hasDatabase) return { ok: false, error: "No database on this deployment." };
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(partners).where(eq(partners.id, partnerId)).limit(1).for("update");
    if (!row) return { ok: false, error: "No such partner." };
    const from = row.status as VendorStatus;
    if (from === to) return { ok: true, data: { status: from, changed: false } };
    if (!canVendorTransition(from, to)) return { ok: false, error: `An organisation that is ${from} cannot become ${to}.` };
    if ((to === "REJECTED" || to === "SUSPENDED") && !note) {
      return { ok: false, error: "Say why in the note: the partner reads it." };
    }
    const now = new Date();
    await tx
      .update(partners)
      .set({ status: to, verifiedBy: reviewer.actorId, verifiedAt: now, verificationNote: note ?? row.verificationNote, updatedAt: now })
      .where(eq(partners.id, partnerId));
    await tx.insert(auditLogs).values({
      actorId: reviewer.actorId,
      action: `partner.${to.toLowerCase()}`,
      entityType: "partner",
      entityId: partnerId,
      before: { status: from },
      after: { status: to, note, via: "vendor_decision" },
    });
    return { ok: true, data: { status: to, changed: true } };
  });
}

export async function recordVendorDocument(
  scope: Scope,
  input: { kind: "GOVT_REG" | "PROPERTY_PROOF" | "GST"; path: string; fileName: string; contentType: string; sizeBytes: number },
): Promise<InventoryResult<{ documentId: string }>> {
  if (!hasDatabase) return { ok: false, error: "error.generic" };
  return db.transaction(async (tx) => {
    const [document] = await tx
      .insert(vendorDocuments)
      .values({
        vendorId: scope.partnerId,
        kind: input.kind,
        fileUrl: input.path,
        fileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        uploadedBy: scope.actorId,
      })
      .returning({ id: vendorDocuments.id });
    if (!document) return { ok: false, error: "error.storage" };
    await audit(tx, scope, "vendor_document.uploaded", "vendor_document", document.id, null, {
      partnerId: scope.partnerId,
      kind: input.kind,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
    return { ok: true, data: { documentId: document.id } };
  });
}
