"use client";

import { createListingAction, moveListingAction, saveListingDetailsAction } from "@/app/(v1)/partner/listings/actions";
import { buttonClasses } from "@/components/ui/Button";

import { say, type Copy } from "./copy";
import { Field, FormMessage, Select, useWorkspaceForm } from "./fields";

type Values = Record<string, string | undefined>;

function DetailFields({ copy, values, errors }: { copy: Copy; values: Values; errors: Record<string, string> }) {
  return (
    <>
      <Field name="description" label={say(copy, "field.description")} as="textarea" rows={4} defaultValue={values.description} error={errors.description} />
      <Field name="localCharacter" label={say(copy, "field.localCharacter")} as="textarea" rows={3} defaultValue={values.localCharacter} error={errors.localCharacter} />
      <Field name="amenities" label={say(copy, "field.amenities")} hint={say(copy, "field.amenitiesHint")} defaultValue={values.amenities} error={errors.amenities} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="checkInFrom" type="time" label={say(copy, "field.checkInFrom")} defaultValue={values.checkInFrom} error={errors.checkInFrom} />
        <Field name="checkOutBy" type="time" label={say(copy, "field.checkOutBy")} defaultValue={values.checkOutBy} error={errors.checkOutBy} />
      </div>
      <Field name="houseRules" label={say(copy, "field.houseRules")} as="textarea" rows={3} defaultValue={values.houseRules} error={errors.houseRules} />
      <Field name="cancellationTerms" label={say(copy, "field.cancellationTerms")} hint={say(copy, "field.cancellationHint")} as="textarea" rows={3} defaultValue={values.cancellationTerms} error={errors.cancellationTerms} />
    </>
  );
}

export function NewListingForm({
  copy,
  destinations,
  types,
}: {
  copy: Copy;
  destinations: { value: string; label: string }[];
  types: { value: string; label: string }[];
}) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(createListingAction);
  const values: Values = state.values ?? {};
  const errors = state.errors ?? {};
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <FormMessage state={state} className="rounded-lg border border-error/40 bg-error-soft/40 p-4" />
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 font-display text-h3">{say(copy, "detail.facts")}</legend>
        <Field name="name" label={say(copy, "field.name")} required defaultValue={values.name} error={errors.name} />
        <Select name="type" label={say(copy, "field.type")} required placeholder={say(copy, "field.choose")} options={types} defaultValue={values.type} error={errors.type} />
        <Select name="destinationId" label={say(copy, "field.destination")} required placeholder={say(copy, "field.choose")} options={destinations} defaultValue={values.destinationId} error={errors.destinationId} />
        <Field name="area" label={say(copy, "field.area")} defaultValue={values.area} error={errors.area} />
        <div className="sm:col-span-2">
          <Field name="address" label={say(copy, "field.address")} as="textarea" rows={2} required defaultValue={values.address} error={errors.address} />
        </div>
        <Field name="mapsUrl" type="url" label={say(copy, "field.mapsUrl")} defaultValue={values.mapsUrl} error={errors.mapsUrl} />
        <Field name="officialWebsite" type="url" label={say(copy, "field.officialWebsite")} defaultValue={values.officialWebsite} error={errors.officialWebsite} />
        <div className="sm:col-span-2">
          <Field name="bookingUrl" type="url" label={say(copy, "field.bookingUrl")} defaultValue={values.bookingUrl} error={errors.bookingUrl} />
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 font-display text-h3">{say(copy, "detail.about")}</legend>
        <DetailFields copy={copy} values={values} errors={errors} />
      </fieldset>
      <div>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? say(copy, "listings.creating") : say(copy, "listings.create")}
        </button>
      </div>
    </form>
  );
}

export function ListingDetailsForm({ copy, listingId, initial }: { copy: Copy; listingId: string; initial: Values }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(saveListingDetailsAction);
  const values: Values = state.values ?? initial;
  const errors = state.errors ?? {};
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="listingId" value={listingId} />
      <DetailFields copy={copy} values={values} errors={errors} />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? say(copy, "detail.saving") : say(copy, "detail.save")}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function MoveListingForm({ copy, listingId, to }: { copy: Copy; listingId: string; to: "PUBLISHED" | "UNPUBLISHED" }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(moveListingAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        name="to"
        value={to}
        disabled={pending}
        className={buttonClasses({ variant: to === "PUBLISHED" ? "primary" : "outline", size: "md" })}
      >
        {to === "PUBLISHED" ? say(copy, "detail.publish") : say(copy, "detail.unpublish")}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
