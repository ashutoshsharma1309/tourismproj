"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/account/next";
import { currentUser, ensureUserRow } from "@/lib/auth/session";
import { placeHold, releaseHold, saveHoldContact } from "@/lib/booking/holds";
import { isBookingCode, MAX_GUESTS, MAX_ROOMS } from "@/lib/booking/stay";
import { bookingTranslator } from "@/lib/i18n/booking-messages";
import { requestLanguage } from "@/lib/i18n/request";
import { consumeQuota } from "@/lib/rate-limit";

import type { BookingFormState } from "./state";

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const reserveSchema = z.object({
  unitId: z.string().uuid(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.coerce.number().int().min(1).max(MAX_GUESTS),
  rooms: z.coerce.number().int().min(1).max(MAX_ROOMS),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  returnTo: z.string(),
});

/**
 * Hold rooms. A visitor who is not signed in is sent to sign in and brought
 * back to the same stay with their dates, never silently dropped. The hold
 * itself — locks, re-checks, expiry, idempotency — is the engine's
 * (lib/booking/engine.ts); on success the traveller lands on checkout.
 */
export async function reserveAction(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const t = bookingTranslator(await requestLanguage());
  const returnTo = safeNextPath(text(formData, "returnTo"), "/search");
  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(returnTo)}`);

  const parsed = reserveSchema.safeParse({
    unitId: text(formData, "unitId"),
    checkIn: text(formData, "checkIn"),
    checkOut: text(formData, "checkOut"),
    guests: text(formData, "guests"),
    rooms: text(formData, "rooms"),
    idempotencyKey: text(formData, "idempotencyKey"),
    returnTo,
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { status: "error", message: field === "rooms" ? t("hold.error.rooms") : field === "guests" ? t("hold.error.guests") : t("hold.error.invalid-date") };
  }
  const { data: input } = parsed;
  await ensureUserRow(session);
  const quota = await consumeQuota("booking-hold", 12, 10 * 60_000, session.id);
  if (!quota.ok) return { status: "error", message: t("hold.error.rateLimited") };

  const result = await placeHold({
    userId: session.id,
    unitId: input.unitId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms: input.rooms,
    guests: input.guests,
    idempotencyKey: input.idempotencyKey,
  });
  if (!result.ok) return { status: "error", message: t(`hold.error.${result.error}`) };
  const { code } = result;
  redirect(`/checkout/${code}`);
}

/** Let the rooms go. Idempotent; only the traveller who holds them can. */
export async function releaseHoldAction(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const t = bookingTranslator(await requestLanguage());
  const code = text(formData, "code");
  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/checkout/${code}`)}`);
  if (!isBookingCode(code)) return { status: "error", message: t("checkout.notYours") };
  const result = await releaseHold(code, session.id);
  if (!result.ok) return { status: "error", message: t("checkout.notYours") };
  revalidatePath(`/checkout/${code}`);
  return { status: "ok" };
}

const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^\+?\d[\d\s().-]{5,}$/);

export async function saveContactAction(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const t = bookingTranslator(await requestLanguage());
  const code = text(formData, "code");
  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/checkout/${code}`)}`);
  const phone = phoneSchema.safeParse(text(formData, "phone"));
  if (!phone.success || !isBookingCode(code)) return { status: "error", message: t("checkout.contactInvalid") };
  const { data: number } = phone;
  const saved = await saveHoldContact(code, session.id, number);
  if (!saved) return { status: "error", message: t("checkout.notYours") };
  revalidatePath(`/checkout/${code}`);
  return { status: "ok", message: t("checkout.contactSaved") };
}
