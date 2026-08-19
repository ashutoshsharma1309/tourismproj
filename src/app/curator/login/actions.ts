"use server";

import { redirect } from "next/navigation";

import { authConfigured, endSession, passphraseMatches, startSession } from "@/lib/auth";
import type { LoginState } from "./state";

/**
 * Exchange the curator passphrase for a signed session.
 *
 * Deliberately gives one message for every failure. Distinguishing "no
 * passphrase is configured" from "that passphrase is wrong" tells an
 * unauthenticated caller about the deployment's configuration, which is not
 * theirs to learn.
 */
export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const submitted = formData.get("passphrase");
  const candidate = typeof submitted === "string" ? submitted : "";

  if (!authConfigured() || !passphraseMatches(candidate)) {
    return { status: "error", message: "That passphrase was not accepted." };
  }

  const started = await startSession("curator");
  if (!started) {
    return { status: "error", message: "That passphrase was not accepted." };
  }

  redirect("/preservation/review");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}
