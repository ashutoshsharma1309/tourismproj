"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { PROPERTY_STATUSES } from "@/lib/partners/lifecycle";
import { decideVendor } from "@/lib/partners/inventory";
import { assignSubscription, endSubscription } from "@/lib/subscriptions/manage";
import { editProperty, transitionProperty } from "@/lib/partners/store";
import { VENDOR_STATUSES } from "@/lib/partners/vendor";

export interface ReviewState {
  status: "idle" | "ok" | "error";
  message?: string;
}

const transitionSchema = z.object({
  propertyId: z.string().uuid(),
  to: z.enum(PROPERTY_STATUSES),
  note: z.string().trim().max(1000).optional(),
  checks: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
});

const VERIFICATION_METHOD = "reviewer confirmed against public records and the property's official channels";

/**
 * Move a property along its lifecycle. Admin only — resolved from the
 * session, never from the form — and refused when the machine does not
 * allow the step. Every call is audited by the store.
 */
export async function reviewTransition(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (!admin) return { status: "error", message: "Not permitted." };

  const parsed = transitionSchema.safeParse({
    propertyId: formData.get("propertyId"),
    to: formData.get("to"),
    note: typeof formData.get("note") === "string" ? formData.get("note") : undefined,
    checks: formData.getAll("checks").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) return { status: "error", message: "Invalid request." };
  const { data: input } = parsed;

  const result = await transitionProperty({
    propertyId: input.propertyId,
    to: input.to,
    actorId: admin.id,
    note: input.note || null,
    checks: (input.checks ?? []).map((field) => ({ field, method: VERIFICATION_METHOD })),
  });
  if (!result.ok) return { status: "error", message: result.error };
  const { data: moved } = result;
  if (!moved.changed) return { status: "ok", message: `Already ${moved.status.toLowerCase().replace(/_/g, " ")}; nothing changed.` };

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${input.propertyId}`);
  revalidatePath("/partner/dashboard");
  /* No revalidatePath for the destination page: it is prerendered and cannot
     be regenerated on demand (app/api/partner-stays/route.ts), so its partner
     section reads the published list at request time instead. */
  return { status: "ok", message: `Now ${moved.status.toLowerCase().replace(/_/g, " ")}.` };
}

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Must be a full web address")
  .transform((v) => (v === "" ? null : v));

const editSchema = z.object({
  propertyId: z.string().uuid(),
  address: z.string().trim().min(8).max(400),
  area: z.string().trim().max(120).transform((v) => (v === "" ? null : v)),
  mapsUrl: optionalUrl,
  officialWebsite: optionalUrl,
  bookingUrl: optionalUrl,
  description: z.string().trim().max(1200).transform((v) => (v === "" ? null : v)),
  localCharacter: z.string().trim().max(600).transform((v) => (v === "" ? null : v)),
});

/** Correct a verified field. Admin only; audited with before and after. */
export async function reviewEdit(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (!admin) return { status: "error", message: "Not permitted." };
  const text = (k: string) => (typeof formData.get(k) === "string" ? (formData.get(k) as string) : "");
  const parsed = editSchema.safeParse({
    propertyId: formData.get("propertyId"),
    address: text("address"),
    area: text("area"),
    mapsUrl: text("mapsUrl"),
    officialWebsite: text("officialWebsite"),
    bookingUrl: text("bookingUrl"),
    description: text("description"),
    localCharacter: text("localCharacter"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  const { data: fields } = parsed;
  const { propertyId, ...patch } = fields;
  const result = await editProperty(propertyId, admin.id, patch);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/admin/partners/${propertyId}`);
  return { status: "ok", message: "Saved." };
}

const vendorDecisionSchema = z.object({
  partnerId: z.string().uuid(),
  propertyId: z.string().uuid(),
  to: z.enum(VENDOR_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

/**
 * A decision about the ORGANISATION — verify, suspend, reinstate, reject.
 * Admin only, idempotent, audited by the store. Suspension unpublishes every
 * listing the vendor has, in the database.
 */
export async function vendorDecision(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (!admin) return { status: "error", message: "Not permitted." };
  const parsed = vendorDecisionSchema.safeParse({
    partnerId: formData.get("partnerId"),
    propertyId: formData.get("propertyId"),
    to: String(formData.get("decision") ?? "").replace(/^vendor:/, ""),
    note: typeof formData.get("note") === "string" ? formData.get("note") : undefined,
  });
  if (!parsed.success) return { status: "error", message: "Invalid request." };
  const { data: input } = parsed;
  const result = await decideVendor({ actorId: admin.id }, input.partnerId, input.to, input.note || null);
  if (!result.ok) return { status: "error", message: result.error };
  const { data: decided } = result;
  revalidatePath(`/admin/partners/${input.propertyId}`);
  revalidatePath("/admin/partners");
  return {
    status: "ok",
    message: decided.changed
      ? `Organisation now ${decided.status.toLowerCase().replace(/_/g, " ")}.`
      : `Organisation already ${decided.status.toLowerCase().replace(/_/g, " ")}; nothing changed.`,
  };
}

const assignSchema = z.object({
  partnerId: z.string().uuid(),
  propertyId: z.string().uuid(),
  planCode: z.string().regex(/^[A-Z_]{2,32}$/),
  mode: z.enum(["TRIAL", "ACTIVE"]),
  periodEnd: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a date")
    .transform((v) => (v === "" ? null : new Date(`${v}T23:59:59+05:30`))),
  note: z.string().trim().max(500).optional(),
});

/** Put a partner on a plan. Reviewer only; audited and idempotent in the store. Touches nothing but the subscription. */
export async function assignPlanAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (!admin) return { status: "error", message: "Not permitted." };
  const read = (k: string) => (typeof formData.get(k) === "string" ? (formData.get(k) as string) : "");
  const parsed = assignSchema.safeParse({
    partnerId: read("partnerId"),
    propertyId: read("propertyId"),
    planCode: read("planCode"),
    mode: read("mode"),
    periodEnd: read("periodEnd"),
    note: read("note") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  const { data: input } = parsed;
  const result = await assignSubscription(admin.id, { partnerId: input.partnerId, planCode: input.planCode, mode: input.mode, periodEnd: input.periodEnd, note: input.note ?? null });
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/admin/partners/${input.propertyId}`);
  return { status: "ok", message: result.changed ? `Plan set: ${input.planCode.toLowerCase()} (${input.mode.toLowerCase()}).` : "That plan is already in place; nothing changed." };
}

export async function endPlanAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (!admin) return { status: "error", message: "Not permitted." };
  const parsed = z
    .object({ partnerId: z.string().uuid(), propertyId: z.string().uuid(), when: z.enum(["now", "period-end"]) })
    .safeParse({ partnerId: formData.get("partnerId"), propertyId: formData.get("propertyId"), when: formData.get("when") });
  if (!parsed.success) return { status: "error", message: "Invalid request." };
  const { data: input } = parsed;
  const result = await endSubscription(admin.id, input.partnerId, input.when);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/admin/partners/${input.propertyId}`);
  return { status: "ok", message: result.changed ? (input.when === "now" ? "Subscription ended." : "Subscription will end at its period end.") : "Already so; nothing changed." };
}
