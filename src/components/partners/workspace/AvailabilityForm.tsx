"use client";

import { useState } from "react";

import { setAvailabilityAction } from "@/app/(v1)/partner/calendar/actions";
import { buttonClasses } from "@/components/ui/Button";

import { say, type Copy } from "./copy";
import { Field, FormMessage, useWorkspaceForm } from "./fields";

/**
 * Set a range of dates for one room type. The dates are plain calendar days
 * (`<input type="date">`), sent as "YYYY-MM-DD" and never converted to a
 * local-midnight Date on the way (lib/partners/calendar.ts).
 */
export function AvailabilityForm({
  copy,
  unitId,
  today,
  maxDay,
  totalQuantity,
}: {
  copy: Copy;
  unitId: string;
  today: string;
  maxDay: string;
  totalQuantity: number;
}) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(setAvailabilityAction);
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  const [mode, setMode] = useState(values.mode === "close" ? "close" : "open");

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="rounded-xl border border-border bg-surface p-5" aria-labelledby="availability-form-title">
      <h2 id="availability-form-title" className="font-display text-h4">{say(copy, "calendar.update")}</h2>
      <input type="hidden" name="unitId" value={unitId} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field name="from" type="date" min={today} max={maxDay} label={say(copy, "calendar.from")} required defaultValue={values.from ?? today} error={errors.from} />
        <Field name="to" type="date" min={today} max={maxDay} label={say(copy, "calendar.to")} required defaultValue={values.to ?? today} error={errors.to} />
      </div>
      <fieldset className="mt-4">
        <legend className="text-small font-medium">{say(copy, "calendar.action")}</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {(["open", "close"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-small">
              <input type="radio" name="mode" value={option} checked={mode === option} onChange={() => setMode(option)} className="size-4 accent-primary" />
              {option === "open" ? say(copy, "calendar.actionOpen") : say(copy, "calendar.actionClose")}
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "open" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="rooms" type="number" min={1} max={totalQuantity} label={say(copy, "calendar.rooms")} required defaultValue={values.rooms ?? String(totalQuantity)} error={errors.rooms} />
          <Field name="price" inputMode="decimal" label={say(copy, "calendar.price")} hint={say(copy, "calendar.priceHint")} defaultValue={values.price} error={errors.price} />
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? say(copy, "calendar.applying") : say(copy, "calendar.apply")}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
