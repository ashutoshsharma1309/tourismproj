"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState } from "react";

import { submitPartnership } from "@/app/(v1)/partner/apply/actions";
import { INITIAL_APPLY_STATE } from "@/app/(v1)/partner/apply/state";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ACCOMMODATION_LABEL, ACCOMMODATION_TYPES } from "@/lib/partners/schema";

/**
 * The partnership request form.
 *
 * Only what verification needs. No payment details and no room counts;
 * supporting documents are uploaded after sign-in, on /partner/verification. The destination is a fixed list — the eighteen TerraStory covers —
 * because a property outside them has no page to appear on.
 */
export function PartnerApplyForm({
  destinations,
}: {
  destinations: { id: string; name: string; region: string }[];
}) {
  const [state, formAction, pending] = useActionState(submitPartnership, INITIAL_APPLY_STATE);
  const values = state.values ?? {};
  const errors = state.errors ?? {};

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-6">
        <p className="flex items-center gap-2 font-display text-h3">
          <CheckCircle2 className="size-6 text-success" aria-hidden />
          Request submitted
        </p>
        <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">{state.message}</p>
        <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
          A reviewer will check the property against public records and your official channels and
          write to the e-mail you gave. Nothing is shown to travellers until that review is complete.
          You can follow the status by signing in with the same e-mail.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/partner/dashboard" className={buttonClasses({ variant: "primary", size: "md" })}>
            Follow the status
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/destinations" className={buttonClasses({ variant: "secondary", size: "md" })}>
            Back to destinations
          </Link>
        </div>
      </div>
    );
  }

  /*
   * React 19 resets a form after an `action` returns, and a reset select
   * forgets the option the person chose — so a rejected submission came back
   * with the destination and type blank and failed again. Calling the action
   * from the submit handler (React documents this as the way to keep field
   * values) sidesteps the reset; `action` stays on the form for a browser
   * without JavaScript.
   */
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-8"
      noValidate
    >
      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-lg border border-error/40 bg-error-soft/40 p-4 text-small leading-relaxed">
          {state.message}
        </p>
      ) : null}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 font-display text-h3">Who you are</legend>
        <Field name="organizationName" label="Organisation or property owner" required defaultValue={values.organizationName} error={errors.organizationName} />
        <Field name="contactName" label="Contact person" required defaultValue={values.contactName} error={errors.contactName} />
        <Field name="email" label="Business e-mail" type="email" required defaultValue={values.email} error={errors.email} hint="The reviewer replies here, and you sign in with it." />
        <Field name="phone" label="Telephone" type="tel" defaultValue={values.phone} error={errors.phone} hint="The number guests call. Shown to travellers once the property is published." />
        <div className="sm:col-span-2">
          <Field name="registrationInfo" label="Tourism registration or trade licence reference" defaultValue={values.registrationInfo} error={errors.registrationInfo}
            hint="Optional. The reference as it appears on your certificate; you can upload the document after signing in." />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 font-display text-h3">The property</legend>
        <Field name="propertyName" label="Property name" required defaultValue={values.propertyName} error={errors.propertyName} />
        <Select name="type" label="Accommodation type" required defaultValue={values.type} error={errors.type}
          options={ACCOMMODATION_TYPES.map((t) => ({ value: t, label: ACCOMMODATION_LABEL[t] }))} />
        <Select name="destinationId" label="Destination" required defaultValue={values.destinationId} error={errors.destinationId}
          options={destinations.map((d) => ({ value: d.id, label: `${d.name} — ${d.region}` }))}
          hint="The TerraStory destination the property appears under." />
        <Field name="area" label="Area or neighbourhood" defaultValue={values.area} error={errors.area} />
        <div className="sm:col-span-2">
          <Field name="address" label="Full address" as="textarea" rows={2} required defaultValue={values.address} error={errors.address} />
        </div>
        <Field name="mapsUrl" label="Google Maps link" type="url" defaultValue={values.mapsUrl} error={errors.mapsUrl} />
        <Field name="officialWebsite" label="Official website" type="url" defaultValue={values.officialWebsite} error={errors.officialWebsite} />
        <div className="sm:col-span-2">
          <Field name="bookingUrl" label="Official booking page" type="url" defaultValue={values.bookingUrl} error={errors.bookingUrl}
            hint="Where guests book directly with you. TerraStory links to it and never stands in for it." />
        </div>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-3 font-display text-h3">What travellers should know</legend>
        <Field name="description" label="Description" as="textarea" rows={4} defaultValue={values.description} error={errors.description}
          hint="What the property is, in your words. A reviewer checks it; nothing is generated." />
        <Field name="localCharacter" label="Local or cultural character" as="textarea" rows={3} defaultValue={values.localCharacter} error={errors.localCharacter}
          hint="A haveli, a heritage conversion, a homestay in a craft village — what connects the property to its destination." />
        <Field name="amenities" label="Amenities" defaultValue={values.amenities} error={errors.amenities}
          hint="Comma-separated, e.g. breakfast, parking, rooftop." />
      </fieldset>

      {/* Honeypot: hidden from people, filled by bots, rejected by the schema. */}
      <div className="hidden" aria-hidden>
        <label>
          Leave this empty
          <input type="text" name="website_confirm" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
        <input type="checkbox" name="authorised" className="mt-1 size-4 accent-primary" />
        <span className="text-small leading-relaxed">
          I am authorised to represent this property, and the details above are accurate.
          {errors.authorised ? <span className="mt-1 block text-caption text-error">{errors.authorised}</span> : null}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? "Sending…" : "Submit for verification"}
        </button>
        <p className="text-caption text-subtle">
          No payment details are collected. Submitting does not create a listing.
        </p>
      </div>
    </form>
  );
}

function Field({
  name, label, hint, error, required, as, type = "text", rows, defaultValue,
}: {
  name: string; label: string; hint?: string; error?: string; required?: boolean;
  as?: "textarea"; type?: string; rows?: number; defaultValue?: string;
}) {
  const describedBy = hint ? `${name}-hint` : undefined;
  const shared = {
    id: name,
    name,
    required,
    defaultValue,
    "aria-describedby": describedBy,
    "aria-invalid": error ? (true as const) : undefined,
    className: cn(
      "w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none",
      error && "border-error",
    ),
  };
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={name} className="text-small font-medium">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      {as === "textarea" ? <textarea {...shared} rows={rows ?? 4} /> : <input {...shared} type={type} />}
      {hint ? <span id={describedBy} className="text-caption leading-relaxed text-subtle">{hint}</span> : null}
      {error ? <span className="text-caption text-error">{error}</span> : null}
    </div>
  );
}

function Select({
  name, label, options, hint, error, required, defaultValue,
}: {
  name: string; label: string; options: { value: string; label: string }[]; hint?: string;
  error?: string; required?: boolean; defaultValue?: string;
}) {
  const describedBy = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={name} className="text-small font-medium">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn("w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none", error && "border-error")}
      >
        <option value="" disabled>Choose…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint ? <span id={describedBy} className="text-caption leading-relaxed text-subtle">{hint}</span> : null}
      {error ? <span className="text-caption text-error">{error}</span> : null}
    </div>
  );
}
