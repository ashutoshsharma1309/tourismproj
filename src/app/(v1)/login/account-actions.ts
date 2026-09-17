"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { HINT_COOKIE_OPTIONS, SIGNED_IN_HINT } from "@/lib/account/hint";
import { safeNextPath } from "@/lib/account/next";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { ensureUserRow, currentUser, recentInboxProof } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/constants";
import { consumeQuota } from "@/lib/rate-limit";

/**
 * Traveller authentication: e-mail and password on Supabase Auth.
 *
 * Supabase stores passwords as bcrypt hashes and issues short-lived access
 * tokens with rotating refresh tokens; this file never sees a hash. The
 * session lives in HttpOnly cookies (lib/auth/cookies.ts).
 *
 * NO ACCOUNT ENUMERATION
 * ----------------------
 * Sign-in failure, sign-up and password reset each answer with ONE message
 * whether or not the address has an account, and sign-up for an address that
 * already exists looks exactly like a fresh one (Supabase confirms by e-mail
 * either way). Every action is rate limited per client.
 */

export interface AuthState {
  status: "idle" | "error" | "sent" | "done";
  message?: string;
  email?: string;
  name?: string;
}

const email = z.string().trim().toLowerCase().email("Enter a valid e-mail address.").max(254);
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.");
const name = z.string().trim().min(1, "Enter your name.").max(80, "Use at most 80 characters.");

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

async function setHint(on: boolean) {
  const store = await cookies();
  if (on) store.set(SIGNED_IN_HINT, "1", HINT_COOKIE_OPTIONS);
  else store.set(SIGNED_IN_HINT, "", { ...HINT_COOKIE_OPTIONS, maxAge: 0 });
}

const SIGN_IN_FAILED =
  "That e-mail and password did not work. Check both, or confirm your e-mail address from the message we sent when you signed up.";

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const address = email.safeParse(text(form, "email"));
  const secret = z.string().min(1).max(72).safeParse(text(form, "password"));
  if (!address.success || !secret.success) {
    return { status: "error", message: "Enter your e-mail address and password.", email: text(form, "email") };
  }
  const { data: emailValue } = address;
  const { data: passwordValue } = secret;

  /* Per client AND per address: many clients cannot grind one account, and one
     client cannot spray many. */
  const quota = await consumeQuota("sign-in", 10, 10 * 60 * 1000);
  const perAddress = await consumeQuota("sign-in-address", 10, 10 * 60 * 1000, emailValue);
  if (!quota.ok || !perAddress.ok) return { status: "error", message: "Too many attempts. Please wait a few minutes and try again.", email: emailValue };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Accounts are not available on this deployment." };

  const { error } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue });
  if (error) return { status: "error", message: SIGN_IN_FAILED, email: emailValue };

  const session = await currentUser();
  if (session) await ensureUserRow(session);
  await setHint(true);
  redirect(safeNextPath(text(form, "next")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = { email: text(form, "email"), name: text(form, "name") };
  const parsed = z
    .object({ name, email, password })
    .safeParse({ name: values.name, email: values.email, password: text(form, "password") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form.", ...values };
  }
  const { data: input } = parsed;
  if (input.password.toLowerCase() === input.email) {
    return { status: "error", message: "Choose a password that is not your e-mail address.", ...values };
  }

  const quota = await consumeQuota("sign-up", 5, 60 * 60 * 1000);
  const perAddress = await consumeQuota("sign-up-address", 3, 60 * 60 * 1000, input.email);
  if (!quota.ok || !perAddress.ok) return { status: "error", message: "Too many sign-ups from here. Please try again later.", ...values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Accounts are not available on this deployment.", ...values };

  const { data: result, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.name },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/account/interests?welcome=1")}`,
    },
  });
  if (error) {
    /* Weak-password and similar policy errors are safe to show; anything else
       gets the same answer a new address would. */
    if (/password/i.test(error.message)) return { status: "error", message: error.message, ...values };
    /* An address Supabase will never accept says nothing about who has an
       account, and "a link is on its way" would be untrue. */
    if (error.code === "email_address_invalid" || /email address .* is invalid/i.test(error.message)) {
      return { status: "error", message: "That e-mail address can't be used. Check it and try again.", ...values };
    }
    /* The project's e-mail sending limit is shared by every address, so saying
       so reveals nothing about any one of them. */
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { status: "error", message: "We couldn't send the confirmation e-mail just now. Please try again in a little while.", ...values };
    }
    console.error("account: sign-up failed", error.message);
  }

  if (result?.session) {
    /* A project without e-mail confirmation signs the traveller straight in. */
    const session = await currentUser();
    if (session) await ensureUserRow(session);
    await setHint(true);
    redirect("/account/interests?welcome=1");
  }
  return {
    status: "sent",
    email: input.email,
    message: `If ${input.email} can be used for a TerraStory account, a confirmation link is on its way. Open it on this device to finish creating your account.`,
  };
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const address = email.safeParse(text(form, "email"));
  if (!address.success) return { status: "error", message: "Enter a valid e-mail address.", email: text(form, "email") };
  const { data: emailValue } = address;

  const quota = await consumeQuota("password-reset", 5, 60 * 60 * 1000);
  /* Same answer as success when an address is over its limit, so the limit
     cannot be used to learn anything; it only stops e-mail bombing. */
  const perAddress = await consumeQuota("password-reset-address", 3, 60 * 60 * 1000, emailValue);
  if (!perAddress.ok) {
    return { status: "sent", email: emailValue, message: `If ${emailValue} has a TerraStory account, a link to choose a new password is on its way. Open it on this device.` };
  }
  if (!quota.ok) return { status: "error", message: "Too many requests. Please try again later.", email: emailValue };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Accounts are not available on this deployment." };

  const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
    redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  /* Always the same answer, even when sending failed: Supabase only sends to
     addresses that have an account, so a "could not send" here would reveal
     which addresses do. The failure is logged for the operator instead. */
  if (error) console.error("account: reset request failed", error.code ?? "", error.message);
  return {
    status: "sent",
    email: emailValue,
    message: `If ${emailValue} has a TerraStory account, a link to choose a new password is on its way. Open it on this device.`,
  };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const session = await currentUser();
  if (!session) return { status: "error", message: "That reset link has expired. Request a new one." };
  /* Only a session that proved the inbox in the last 15 minutes (the reset
     link, or a sign-in code) may set a password without the old one; a
     merely signed-in browser, perhaps someone else's left open, may not. */
  if (!recentInboxProof(session)) {
    return { status: "error", message: "To change your password, use Forgot password and open the link we e-mail you." };
  }
  const parsed = password.safeParse(text(form, "password"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the password." };
  const { data: next } = parsed;
  if (next !== text(form, "confirm")) return { status: "error", message: "The two passwords do not match." };

  const quota = await consumeQuota("password-update", 10, 10 * 60 * 1000, session.id);
  if (!quota.ok) return { status: "error", message: "Too many attempts. Please wait a few minutes." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Accounts are not available on this deployment." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { status: "error", message: /password/i.test(error.message) ? error.message : "The password could not be changed." };
  /* Whoever else held a session — the reason for a reset, often — is signed out. */
  await supabase.auth.signOut({ scope: "others" });
  await setHint(true);
  return { status: "done", message: "Your password has been changed." };
}

/** Sign out everywhere this browser holds the session, and drop the hint. */
export async function signOutTraveller(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  await setHint(false);
  redirect("/?signed-out=1");
}
