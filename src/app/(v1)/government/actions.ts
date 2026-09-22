"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { govForAction, govLanguage } from "@/lib/government/access";
import { addGovMember, createAdvisory, govDecide, govRequestClarification, removeGovMember, setAdvisoryStatus } from "@/lib/government/store";
import { govTranslator } from "@/lib/i18n/government-messages";
import { PROPERTY_STATUSES } from "@/lib/partners/lifecycle";
import { consumeQuota } from "@/lib/rate-limit";

import type { ConsoleState } from "./state";

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** The preamble every console action shares: the officer from the session, and a write quota. */
async function consoleAction() {
  const t = govTranslator(await govLanguage());
  const context = await govForAction();
  if (!context) return { ok: false as const, state: { status: "error" as const, message: t("gate.notPermitted") }, t };
  const quota = await consumeQuota("gov-console", 60, 60_000, context.session.id);
  if (!quota.ok) return { ok: false as const, state: { status: "error" as const, message: t("error.rateLimited") }, t };
  return { ok: true as const, context, t };
}

const decisionSchema = z.object({
  propertyId: z.string().uuid(),
  to: z.enum(PROPERTY_STATUSES),
  note: z.string().trim().max(1000).optional(),
  checks: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
});

/** A verification decision, or a request for clarification, within the officer's jurisdiction. */
export async function decideAction(_prev: ConsoleState, formData: FormData): Promise<ConsoleState> {
  const ctx = await consoleAction();
  if (!ctx.ok) return ctx.state;
  const { context, t } = ctx;
  const intent = text(formData, "intent");
  const propertyId = z.string().uuid().safeParse(text(formData, "propertyId"));
  if (!propertyId.success) return { status: "error", message: t("error.invalid") };
  const { data: id } = propertyId;
  const note = text(formData, "note").trim();

  if (intent === "clarify") {
    const result = await govRequestClarification(context, id, note);
    if (!result.ok) return { status: "error", message: result.error };
    revalidatePath(`/government/queue/${id}`);
    revalidatePath("/government/queue");
    return { status: "ok", message: t("review.clarified") };
  }

  const parsed = decisionSchema.safeParse({
    propertyId: id,
    to: text(formData, "to"),
    note: note || undefined,
    checks: formData.getAll("checks").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) return { status: "error", message: t("error.invalid") };
  const { data: decision } = parsed;
  if (decision.to === "PENDING") return { status: "error", message: t("error.invalid") };
  const result = await govDecide(context, { propertyId: id, to: decision.to, note: decision.note ?? null, checks: decision.checks ?? [] });
  if (!result.ok) return { status: "error", message: result.error };
  const { data: moved } = result;
  revalidatePath(`/government/queue/${id}`);
  revalidatePath("/government/queue");
  revalidatePath("/government");
  const status = moved.status.toLowerCase().replace(/_/g, " ");
  return { status: "ok", message: moved.changed ? t("review.moved", { status }) : t("review.nothingChanged", { status }) };
}

const advisorySchema = z.object({
  destinationId: z.string().trim().min(2).max(40),
  kind: z.enum(["PERMIT", "WEATHER", "CLOSURE", "RESTRICTION", "OTHER"]),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  title: z.string().trim().min(4).max(160),
  body: z.string().trim().max(2000).transform((v) => (v === "" ? null : v)),
  startsAt: z.string().trim().transform((v) => (v === "" ? null : new Date(`${v}T00:00:00+05:30`))),
  endsAt: z.string().trim().transform((v) => (v === "" ? null : new Date(`${v}T23:59:59+05:30`))),
  source: z.string().trim().max(200).transform((v) => (v === "" ? null : v)),
});

export async function draftAdvisoryAction(_prev: ConsoleState, formData: FormData): Promise<ConsoleState> {
  const ctx = await consoleAction();
  if (!ctx.ok) return ctx.state;
  const { context, t } = ctx;
  const parsed = advisorySchema.safeParse({
    destinationId: text(formData, "destinationId"),
    kind: text(formData, "kind"),
    severity: text(formData, "severity"),
    title: text(formData, "title"),
    body: text(formData, "body"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    source: text(formData, "source"),
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { status: "error", errors: { [field]: t("error.invalid") }, message: t("error.invalid") };
  }
  const { data: input } = parsed;
  const result = await createAdvisory(context, input);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath("/government/advisories");
  return { status: "ok", message: t("advisories.saved") };
}

export async function advisoryStatusAction(_prev: ConsoleState, formData: FormData): Promise<ConsoleState> {
  const ctx = await consoleAction();
  if (!ctx.ok) return ctx.state;
  const { context, t } = ctx;
  const parsed = z
    .object({ advisoryId: z.string().uuid(), to: z.enum(["PUBLISHED", "WITHDRAWN"]) })
    .safeParse({ advisoryId: text(formData, "advisoryId"), to: text(formData, "to") });
  if (!parsed.success) return { status: "error", message: t("error.invalid") };
  const { data: move } = parsed;
  const result = await setAdvisoryStatus(context, move.advisoryId, move.to);
  if (!result.ok) return { status: "error", message: result.error };
  const { data: changed } = result;
  revalidatePath("/government/advisories");
  revalidatePath("/government");
  return {
    status: "ok",
    message: !changed.changed ? t("advisories.unchanged") : move.to === "PUBLISHED" ? t("advisories.published") : t("advisories.withdrawn"),
  };
}

export async function addOfficerAction(_prev: ConsoleState, formData: FormData): Promise<ConsoleState> {
  const ctx = await consoleAction();
  if (!ctx.ok) return ctx.state;
  const { context, t } = ctx;
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(254), role: z.enum(["REVIEWER", "MANAGER"]) })
    .safeParse({ email: text(formData, "email"), role: text(formData, "role") });
  if (!parsed.success) return { status: "error", errors: { email: t("error.invalid") }, message: t("error.invalid") };
  const { data: officer } = parsed;
  const result = await addGovMember(context, officer.email, officer.role);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath("/government/team");
  return { status: "ok", message: t("team.added") };
}

export async function removeOfficerAction(_prev: ConsoleState, formData: FormData): Promise<ConsoleState> {
  const ctx = await consoleAction();
  if (!ctx.ok) return ctx.state;
  const { context, t } = ctx;
  const parsed = z.string().uuid().safeParse(text(formData, "memberId"));
  if (!parsed.success) return { status: "error", message: t("error.invalid") };
  const { data: memberId } = parsed;
  const result = await removeGovMember(context, memberId);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath("/government/team");
  return { status: "ok", message: t("team.removed") };
}
