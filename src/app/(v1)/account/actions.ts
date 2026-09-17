"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteAuthUser } from "@/db/auth-admin";
import { HINT_COOKIE_OPTIONS, SIGNED_IN_HINT } from "@/lib/account/hint";
import { clearHistory, deleteAccountData, saveProfile, setHistoryEnabled, setInterests } from "@/lib/account/store";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { currentUser, ensureUserRow, forgetEnsuredUser } from "@/lib/auth/session";
import { consumeQuota } from "@/lib/rate-limit";

/**
 * Account settings. Every action resolves the traveller from the session —
 * no action accepts a user id — and Next's server-action Origin check guards
 * each one against cross-site submission.
 */

export interface SettingsState {
  status: "idle" | "ok" | "error";
  message?: string;
}

async function traveller() {
  const session = await currentUser();
  if (!session) redirect("/login?next=/account/profile");
  await ensureUserRow(session);
  return session;
}

async function limited(userId: string): Promise<boolean> {
  return !(await consumeQuota("account-settings", 30, 10 * 60 * 1000, userId)).ok;
}

export async function saveInterestsAction(form: FormData): Promise<void> {
  const session = await traveller();
  if (await limited(session.id)) redirect("/account/interests?error=rate");
  const values = form.getAll("interests").filter((value): value is string => typeof value === "string");
  await setInterests(session.id, values);
  revalidatePath("/account");
  const welcome = form.get("welcome") === "1";
  redirect(welcome ? "/account?interests=saved" : "/account/profile?saved=interests");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(80, "Use at most 80 characters."),
  locale: z.string().max(5),
});

export async function saveProfileAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const session = await traveller();
  if (await limited(session.id)) return { status: "error", message: "Too many changes. Please wait a few minutes." };
  const parsed = profileSchema.safeParse({ fullName: form.get("fullName"), locale: form.get("locale") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  const { data: input } = parsed;
  const result = await saveProfile(session.id, input);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath("/account");
  return { status: "ok", message: "Saved." };
}

export async function setHistoryRecordingAction(form: FormData): Promise<void> {
  const session = await traveller();
  if (await limited(session.id)) redirect("/account/profile?error=rate");
  await setHistoryEnabled(session.id, form.get("enabled") === "on");
  revalidatePath("/account/profile");
  redirect("/account/profile?saved=recording");
}

export async function clearHistoryAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const session = await traveller();
  if (form.get("confirm") !== "on") return { status: "error", message: "Tick the box to confirm." };
  if (await limited(session.id)) return { status: "error", message: "Too many changes. Please wait a few minutes." };
  const removed = await clearHistory(session.id);
  revalidatePath("/account");
  revalidatePath("/account/history");
  return {
    status: "ok",
    message: `Cleared: ${removed.destinations} destinations, ${removed.events} recorded explorations, ${removed.journeys} past journeys and ${removed.comparisons} comparisons. Recommendations now use only your chosen interests.`,
  };
}

export async function deleteAccountAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const session = await traveller();
  if (String(form.get("confirmation") ?? "").trim() !== "DELETE") {
    return { status: "error", message: "Type DELETE to confirm." };
  }
  if (await limited(session.id)) return { status: "error", message: "Too many attempts. Please wait a few minutes." };
  try {
    const outcome = await deleteAccountData(session.id);
    if (!outcome.ok) return { status: "error", message: outcome.error };
    forgetEnsuredUser(session.id);
  } catch (error) {
    console.error("account: data deletion failed", error instanceof Error ? error.message : error);
    return { status: "error", message: "Your account could not be deleted automatically. Please contact TerraStory from the About page." };
  }
  const removed = await deleteAuthUser(session.id);
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  (await cookies()).set(SIGNED_IN_HINT, "", { ...HINT_COOKIE_OPTIONS, maxAge: 0 });
  if (!removed.ok) {
    return { status: "error", message: `Your travel data was deleted. ${removed.error ?? ""}`.trim() };
  }
  redirect("/?account-deleted=1");
}
