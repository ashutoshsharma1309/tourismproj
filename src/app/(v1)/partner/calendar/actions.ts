"use server";

import { revalidatePath } from "next/cache";

import { todayInKolkata } from "@/lib/partners/calendar";
import { availabilitySchema, fieldKeys } from "@/lib/partners/inventory-schema";
import { setAvailability } from "@/lib/partners/inventory";

import { text, translateKeys, workspaceAction } from "../workspace-action";
import type { WorkspaceState } from "../workspace-state";

/** Open or close a room type across a range. The store holds the unit's lock and the database holds the ceiling. */
export async function setAvailabilityAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const values = {
    unitId: text(formData, "unitId"),
    from: text(formData, "from"),
    to: text(formData, "to"),
    mode: text(formData, "mode"),
    rooms: text(formData, "mode") === "close" ? "0" : text(formData, "rooms"),
  };
  const parsed = availabilitySchema.safeParse(values);
  if (!parsed.success) return { status: "error", values, errors: translateKeys(t, fieldKeys(parsed.error)), message: t("error.invalid") };
  const { data: input } = parsed;
  const result = await setAvailability(scope, input, todayInKolkata(new Date()));
  if (!result.ok) return { status: "error", values, message: t(result.error) };
  const { data: saved } = result;
  revalidatePath("/partner/calendar");
  revalidatePath("/partner/dashboard");
  return { status: "ok", values, message: saved.days === 1 ? t("calendar.appliedOne") : t("calendar.applied", { days: saved.days }) };
}
