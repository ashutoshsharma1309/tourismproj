"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createTraveller } from "@/db/auth-admin";
import { HINT_COOKIE_OPTIONS, SIGNED_IN_HINT } from "@/lib/account/hint";
import { safeNextPath } from "@/lib/account/next";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { ensureUserRow, currentUser, recentInboxProof } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/constants";
import { recordSignUp } from "@/lib/account/store";
import { consumeQuota } from "@/lib/rate-limit";

/**
 * Traveller authentication: e-mail and password on Supabase Auth.
 *
 * Supabase stores passwords as bcrypt hashes and issues short-lived access
 * tokens with rotating refresh tokens; this file never sees a hash. The
 * session lives in HttpOnly cookies (lib/auth/cookies.ts).
 *
 * WHAT EACH ANSWER REVEALS
 * ------------------------
 * Sign-in failure and password reset answer with ONE message whether or not
 * the address has an account. Sign-up signs a new traveller straight in
 * (db/auth-admin.ts explains why that is safe), so it must say when an
 * address is already taken — the same as any conventional sign-up. Every
 * action is rate limited per client and per address.
 */

export interface AuthState {
  status: "idle" | "error" | "sent" | "done";
  message?: string;
  email?: string;
  name?: string;
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Enter a valid email address.");
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

const SIGN_IN_FAILED = "Email or password is incorrect.";
const UNREACHABLE = "We couldn't connect right now. Please try again.";
const UNAVAILABLE = "Sign-in is temporarily unavailable. Please try again later.";

/** Supabase's own network and outage failures, told apart from a wrong password. */
const isOutage = (error: { status?: number; name?: string }) =>
  error.name === "AuthRetryableFetchError" || error.status === 0 || (error.status ?? 0) >= 500;

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const typed = text(form, "email");
  if (!typed.trim()) return { status: "error", message: "Enter your email address.", email: typed };
  const address = email.safeParse(typed);
  if (!address.success) return { status: "error", message: "Enter a valid email address.", email: typed };
  const passwordValue = text(form, "password");
  if (!passwordValue) return { status: "error", message: "Enter your password.", email: typed };
  /* No TerraStory password is longer than 72 characters (bcrypt's limit). */
  if (passwordValue.length > 72) return { status: "error", message: SIGN_IN_FAILED, email: typed };
  const { data: emailValue } = address;

  /* Per client AND per address: many clients cannot grind one account, and one
     client cannot spray many. */
  const quota = await consumeQuota("sign-in", 10, 10 * 60 * 1000);
  const perAddress = await consumeQuota("sign-in-address", 10, 10 * 60 * 1000, emailValue);
  if (!quota.ok || !perAddress.ok) return { status: "error", message: "Too many attempts. Please wait a few minutes and try again.", email: emailValue };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: UNAVAILABLE, email: emailValue };

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue });
    if (error) {
      if (error.code === "email_not_confirmed") {
        return { status: "error", message: "Confirm your email address using the link we sent you, then log in.", email: emailValue };
      }
      if (error.status === 429 || error.code === "over_request_rate_limit") {
        return { status: "error", message: "Too many attempts. Please wait a few minutes and try again.", email: emailValue };
      }
      if (isOutage(error)) {
        console.error("account: sign-in unavailable", error.status ?? "", error.code ?? "");
        return { status: "error", message: error.status === 0 || error.name === "AuthRetryableFetchError" ? UNREACHABLE : UNAVAILABLE, email: emailValue };
      }
      return { status: "error", message: SIGN_IN_FAILED, email: emailValue };
    }
  } catch (error) {
    console.error("account: sign-in request failed", (error as Error).message);
    return { status: "error", message: UNREACHABLE, email: emailValue };
  }

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
  if (form.has("confirm") && text(form, "confirm") !== input.password) {
    return { status: "error", message: "The two passwords do not match.", ...values };
  }
  if (input.password.toLowerCase() === input.email) {
    return { status: "error", message: "Choose a password that is not your email address.", ...values };
  }

  const quota = await consumeQuota("sign-up", 5, 60 * 60 * 1000);
  const perAddress = await consumeQuota("sign-up-address", 3, 60 * 60 * 1000, input.email);
  if (!quota.ok || !perAddress.ok) return { status: "error", message: "Too many sign-ups from here. Please try again later.", ...values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: UNAVAILABLE, ...values };

  /* The conventional path: create the account and sign in, no e-mail round trip. */
  const created = await createTraveller({ email: input.email, password: input.password, name: input.name });
  if (created.ok) {
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) {
      console.error("account: sign-in after sign-up failed", error.code ?? "", error.message);
      return { status: "error", message: "Your account was created. Log in to continue.", ...values };
    }
    const session = await currentUser();
    if (session) {
      await ensureUserRow(session);
      await recordSignUp(session.id);
    }
    await setHint(true);
    redirect("/account/interests?welcome=1");
  }
  if (created.reason === "exists") {
    return { status: "error", message: "An account with this email already exists. Log in, or use Forgot password if you don't remember it.", ...values };
  }
  if (created.reason === "invalid-email") return { status: "error", message: "That email address can't be used. Check it and try again.", ...values };
  if (created.reason === "weak-password") {
    return { status: "error", message: "Choose a stronger password: at least 8 characters that aren't easy to guess.", ...values };
  }

  /* Without the service key: Supabase's own sign-up, confirmed by e-mail. */
  const { data: result, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.name },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/account/interests?welcome=1")}`,
    },
  });
  if (error) {
    if (/password/i.test(error.message)) return { status: "error", message: error.message, ...values };
    if (error.code === "email_address_invalid" || /email address .* is invalid/i.test(error.message)) {
      return { status: "error", message: "That email address can't be used. Check it and try again.", ...values };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { status: "error", message: "We couldn't send the confirmation email just now. Please try again in a little while.", ...values };
    }
    console.error("account: sign-up failed", error.message);
    return { status: "error", message: isOutage(error) ? UNAVAILABLE : "The account could not be created. Please try again.", ...values };
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
  if (!address.success) return { status: "error", message: "Enter a valid email address.", email: text(form, "email") };
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
  if (!supabase) return { status: "error", message: UNAVAILABLE };

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
  if (!supabase) return { status: "error", message: UNAVAILABLE };
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
