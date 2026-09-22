"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { releaseHoldAction, reserveAction, saveContactAction } from "@/app/(v1)/checkout/actions";
import { IDLE_BOOKING_STATE, type BookingFormState } from "@/app/(v1)/checkout/state";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

function Message({ state }: { state: BookingFormState }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={cn("text-small", state.status === "error" ? "text-error" : "text-success")}>
      {state.message}
    </p>
  );
}

function useBookingForm(action: (prev: BookingFormState, form: FormData) => Promise<BookingFormState>) {
  const [state, formAction, pending] = useActionState(action, IDLE_BOOKING_STATE);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => formAction(form));
  };
  return { state, formAction, pending, onSubmit };
}

export function ReserveForm({
  unitId,
  unitName,
  checkIn,
  checkOut,
  guests,
  roomOptions,
  idempotencyKey,
  returnTo,
  labels,
}: {
  unitId: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomOptions: number[];
  idempotencyKey: string;
  returnTo: string;
  labels: { rooms: string; reserve: string; reserving: string; note: string };
}) {
  const { state, formAction, pending, onSubmit } = useBookingForm(reserveAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-2" data-reserve={unitId}>
      <input type="hidden" name="unitId" value={unitId} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="guests" value={guests} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-small font-medium">
          {labels.rooms}
          <select name="rooms" defaultValue={roomOptions[0]} className="rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none">
            {roomOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? labels.reserving : labels.reserve}
          <span className="sr-only">: {unitName}</span>
        </button>
      </div>
      <p className="text-caption text-subtle">{labels.note}</p>
      <Message state={state} />
    </form>
  );
}

export function ReleaseHoldForm({ code, labels }: { code: string; labels: { release: string; releasing: string } }) {
  const { state, formAction, pending, onSubmit } = useBookingForm(releaseHoldAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "outline", size: "md" })}>
        {pending ? labels.releasing : labels.release}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ContactForm({ code, phone, labels }: { code: string; phone: string; labels: { contact: string; hint: string; save: string } }) {
  const { state, formAction, pending, onSubmit } = useBookingForm(saveContactAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} />
      <label htmlFor="contact-phone" className="text-small font-medium">{labels.contact}</label>
      <div className="flex flex-wrap gap-3">
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={phone}
          aria-describedby="contact-phone-hint"
          className="min-w-0 flex-1 rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none"
        />
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "secondary", size: "md" })}>{labels.save}</button>
      </div>
      <span id="contact-phone-hint" className="text-caption text-subtle">{labels.hint}</span>
      <Message state={state} />
    </form>
  );
}

/**
 * Minutes and seconds left on a hold. Display only: the server decides
 * expiry, and when the clock reaches zero the page is re-rendered so the
 * server's answer replaces this one.
 */
export function HoldCountdown({ expiresAt, label }: { expiresAt: string; label: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);
  const refreshed = useRef(false);
  useEffect(() => {
    const end = Date.parse(expiresAt);
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      if (ms === 0 && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, router]);
  const text = left === null ? "--:--" : `${String(Math.floor(left / 60_000)).padStart(2, "0")}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
  return (
    <p className="text-small text-muted">
      {label}: <span className="font-mono text-body font-medium text-foreground" data-numeric role="timer" aria-live="off">{text}</span>
    </p>
  );
}
