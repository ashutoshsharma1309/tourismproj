"use client";

import { createUnitAction, updateUnitAction } from "@/app/(v1)/partner/listings/actions";
import { buttonClasses } from "@/components/ui/Button";

import { say, type Copy } from "./copy";
import { Field, FormMessage, useWorkspaceForm } from "./fields";

export function AddUnitForm({ copy, listingId }: { copy: Copy; listingId: string }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(createUnitAction);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.errors ?? {};
  /* A successful add remounts the fields empty, ready for the next room type. */
  const generation = state.status === "ok" ? state.message : "fresh";
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="rounded-xl border border-dashed border-border-strong p-4" aria-label={say(copy, "detail.addUnit")}>
      <input type="hidden" name="listingId" value={listingId} />
      <div key={generation} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field id="new-unit-name" name="name" label={say(copy, "field.unitName")} hint={say(copy, "field.unitNameHint")} required defaultValue={values.name} error={errors.name} />
        <Field id="new-unit-capacity" name="capacity" type="number" min={1} max={50} label={say(copy, "field.capacity")} required defaultValue={values.capacity ?? "2"} error={errors.capacity} />
        <Field id="new-unit-quantity" name="totalQuantity" type="number" min={1} max={500} label={say(copy, "field.quantity")} required defaultValue={values.totalQuantity ?? "1"} error={errors.totalQuantity} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "sm" })}>
          {pending ? say(copy, "detail.adding") : say(copy, "detail.addUnit")}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function EditUnitForm({
  copy,
  unit,
}: {
  copy: Copy;
  unit: { id: string; name: string; capacity: number; totalQuantity: number };
}) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(updateUnitAction);
  const values = state.values ?? { name: unit.name, capacity: String(unit.capacity), totalQuantity: String(unit.totalQuantity) };
  const errors = state.errors ?? {};
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="rounded-xl border border-border bg-surface p-4" data-unit={unit.id}>
      <input type="hidden" name="unitId" value={unit.id} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field id={`unit-${unit.id}-name`} name="name" label={say(copy, "field.unitName")} required defaultValue={values.name} error={errors.name} />
        <Field id={`unit-${unit.id}-capacity`} name="capacity" type="number" min={1} max={50} label={say(copy, "field.capacity")} required defaultValue={values.capacity} error={errors.capacity} />
        <Field id={`unit-${unit.id}-quantity`} name="totalQuantity" type="number" min={1} max={500} label={say(copy, "field.quantity")} required defaultValue={values.totalQuantity} error={errors.totalQuantity} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" name="intent" value="save" disabled={pending} className={buttonClasses({ variant: "outline", size: "sm" })}>
          {say(copy, "detail.saveUnit")}
        </button>
        <button type="submit" name="intent" value="delete" disabled={pending} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          {say(copy, "detail.deleteUnit")}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
