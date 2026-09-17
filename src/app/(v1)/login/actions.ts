"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { HINT_COOKIE_OPTIONS, SIGNED_IN_HINT } from "@/lib/account/hint";
import { safeNextPath } from "@/lib/account/next";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { SITE_URL } from "@/lib/constants";
import { consumeSubmissionQuota } from "@/lib/rate-limit";

export interface LoginState {
  step: "email" | "code" | "error";
  email?: string;
  message?: string;
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const codeSchema = z.string().trim().regex(/^\d{6,8}$/, "Enter the code from the e-mail");
function safeNext(value: FormDataEntryValue | null): string {
  return safeNextPath(value, "/partner/dashboard");
}

/**
 * Step 1: send a one-time code to the address. Supabase creates the auth
 * user if none exists; a `users` row is created on first sight of a session
 * (lib/auth/session.ts). Rate limited like every other public form.
 */
export async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const { success: emailOk, data: address } = emailSchema.safeParse(formData.get("email"));
  if (!emailOk) return { step: "email", message: "Enter a valid e-mail address." };

  const quota = await consumeSubmissionQuota();
  if (!quota.ok) return { step: "email", message: "Too many attempts. Try again in a few minutes." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { step: "error", message: "Sign-in is not configured on this deployment." };

  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: {
      shouldCreateUser: true,
      /* The e-mail carries both a code (typed on this page) and a link. The
         link must land on this app's callback, not on whatever Site URL the
         Supabase project defaults to; the callback accepts only a same-site
         `next`. Add this URL to Supabase Auth → URL Configuration. */
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}`,
    },
  });
  if (error) {
    console.error("login: otp request failed", error.message);
    return { step: "email", message: "The code could not be sent. Check the address and try again." };
  }
  return { step: "code", email: address };
}

/** Step 2: exchange the code for a session cookie and continue. */
export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const { success: emailOk, data: address } = emailSchema.safeParse(formData.get("email"));
  const { success: codeOk, data: token } = codeSchema.safeParse(formData.get("code"));
  if (!emailOk || !codeOk) {
    return { step: "code", email: emailOk ? address : undefined, message: "Enter the code from the e-mail." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { step: "error", message: "Sign-in is not configured on this deployment." };

  const { error } = await supabase.auth.verifyOtp({ email: address, token, type: "email" });
  if (error) {
    return { step: "code", email: address, message: "That code was not accepted. Codes expire after a few minutes — request a new one." };
  }
  (await cookies()).set(SIGNED_IN_HINT, "1", HINT_COOKIE_OPTIONS);
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  (await cookies()).set(SIGNED_IN_HINT, "", { ...HINT_COOKIE_OPTIONS, maxAge: 0 });
  redirect("/");
}
