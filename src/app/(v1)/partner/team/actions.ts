"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { addTeamMember, removeTeamMember } from "@/lib/subscriptions/manage";

import { text, workspaceAction } from "../workspace-action";
import type { WorkspaceState } from "../workspace-state";

export async function addMemberAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(text(formData, "email"));
  if (!parsed.success) return { status: "error", errors: { email: t("error.memberEmail") }, message: t("error.memberEmail") };
  const { data: email } = parsed;
  const result = await addTeamMember(scope, email);
  if (!result.ok) return { status: "error", message: t(result.error) };
  revalidatePath("/partner/team");
  return { status: "ok", message: t("team.added") };
}

export async function removeMemberAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsed = z.string().uuid().safeParse(text(formData, "memberId"));
  if (!parsed.success) return { status: "error", message: t("error.notFound") };
  const { data: memberId } = parsed;
  const result = await removeTeamMember(scope, memberId);
  if (!result.ok) return { status: "error", message: t(result.error) };
  revalidatePath("/partner/team");
  return { status: "ok", message: t("team.removed") };
}
