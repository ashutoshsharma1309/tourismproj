"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fieldKeys, listingDetailsSchema, newListingSchema, unitSchema } from "@/lib/partners/inventory-schema";
import { createListing, createUnit, deleteUnit, editListingDetails, updateUnit } from "@/lib/partners/inventory";
import { transitionProperty } from "@/lib/partners/store";

import { text, translateKeys, workspaceAction } from "../workspace-action";
import type { WorkspaceState } from "../workspace-state";

const DETAIL_FIELDS = ["description", "localCharacter", "amenities", "checkInFrom", "checkOutBy", "houseRules", "cancellationTerms"] as const;
const LISTING_FIELDS = ["name", "type", "destinationId", "address", "area", "mapsUrl", "officialWebsite", "bookingUrl", ...DETAIL_FIELDS] as const;

const uuid = z.string().uuid();

/** A verified vendor submits a new listing for review, then lands on it. */
export async function createListingAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const values = Object.fromEntries(LISTING_FIELDS.map((k) => [k, text(formData, k)]));
  const parsed = newListingSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", values, errors: translateKeys(t, fieldKeys(parsed.error)), message: t("error.invalid") };
  }
  const { data: input } = parsed;
  const result = await createListing(scope, input);
  if (!result.ok) return { status: "error", values, message: t(result.error) };
  const { data: created } = result;
  revalidatePath("/partner/dashboard");
  revalidatePath("/partner/listings");
  redirect(`/partner/listings/${created.listingId}`);
}

export async function saveListingDetailsAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsedId = uuid.safeParse(text(formData, "listingId"));
  if (!parsedId.success) return { status: "error", message: t("error.notFound") };
  const { data: listingId } = parsedId;
  const values = Object.fromEntries(DETAIL_FIELDS.map((k) => [k, text(formData, k)]));
  const parsed = listingDetailsSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", values, errors: translateKeys(t, fieldKeys(parsed.error)), message: t("error.invalid") };
  }
  const { data: patch } = parsed;
  const result = await editListingDetails(scope, listingId, patch);
  if (!result.ok) return { status: "error", values, message: t(result.error) };
  revalidatePath(`/partner/listings/${listingId}`);
  return { status: "ok", values, message: t("detail.saved") };
}

const moveSchema = z.object({ listingId: z.string().uuid(), to: z.enum(["PUBLISHED", "UNPUBLISHED"]) });

/** Publish or unpublish one's own approved listing. The store and the database both refuse an unverified vendor. */
export async function moveListingAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsed = moveSchema.safeParse({ listingId: text(formData, "listingId"), to: text(formData, "to") });
  if (!parsed.success) return { status: "error", message: t("error.moveRefused") };
  const { data: move } = parsed;
  const result = await transitionProperty({
    propertyId: move.listingId,
    to: move.to,
    actorId: scope.actorId,
    by: { role: "partner", partnerId: scope.partnerId },
  });
  if (!result.ok) {
    return { status: "error", message: /verified/.test(result.error) ? t("error.notVerified") : t("error.moveRefused") };
  }
  revalidatePath(`/partner/listings/${move.listingId}`);
  revalidatePath("/partner/dashboard");
  return { status: "ok", message: move.to === "PUBLISHED" ? t("detail.published") : t("detail.unpublished") };
}

function unitValues(formData: FormData) {
  return { name: text(formData, "name"), capacity: text(formData, "capacity"), totalQuantity: text(formData, "totalQuantity") };
}

export async function createUnitAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsedId = uuid.safeParse(text(formData, "listingId"));
  if (!parsedId.success) return { status: "error", message: t("error.notFound") };
  const { data: listingId } = parsedId;
  const values = unitValues(formData);
  const parsed = unitSchema.safeParse(values);
  if (!parsed.success) return { status: "error", values, errors: translateKeys(t, fieldKeys(parsed.error)), message: t("error.invalid") };
  const { data: unit } = parsed;
  const result = await createUnit(scope, listingId, unit);
  if (!result.ok) return { status: "error", values, message: t(result.error) };
  revalidatePath(`/partner/listings/${listingId}`);
  return { status: "ok", message: t("detail.unitAdded") };
}

export async function updateUnitAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsedId = uuid.safeParse(text(formData, "unitId"));
  if (!parsedId.success) return { status: "error", message: t("error.notFound") };
  const { data: unitId } = parsedId;
  const intent = text(formData, "intent");
  if (intent === "delete") {
    const removed = await deleteUnit(scope, unitId);
    if (!removed.ok) return { status: "error", message: t(removed.error) };
    revalidatePath("/partner/listings", "layout");
    return { status: "ok", message: t("detail.unitDeleted") };
  }
  const values = unitValues(formData);
  const parsed = unitSchema.safeParse(values);
  if (!parsed.success) return { status: "error", values, errors: translateKeys(t, fieldKeys(parsed.error)), message: t("error.invalid") };
  const { data: unit } = parsed;
  const result = await updateUnit(scope, unitId, unit);
  if (!result.ok) return { status: "error", values, message: t(result.error) };
  revalidatePath("/partner/listings", "layout");
  return { status: "ok", values, message: t("detail.unitSaved") };
}
