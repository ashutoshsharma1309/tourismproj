"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { submitContribution } from "@/app/(v1)/destinations/[destinationId]/archive/contribute/actions";
import { CONTRIBUTE_INITIAL } from "@/app/(v1)/destinations/[destinationId]/archive/contribute/state";
import { PendingReviewChip } from "@/components/ui/VerificationChip";
import { ARCHIVE_CATEGORY_ORDER } from "@/data/archive";
import { cn } from "@/lib/cn";

/**
 * The contribution form.
 *
 * The design job here is expectation-setting. A contributor who believes they
 * are publishing to a heritage archive and then finds their photograph sitting
 * in a queue has been misled, so the pending-review outcome is stated before
 * the form, beside the submit button, and on the confirmation screen.
 */

const MAX_MB = 8;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function ContributeForm() {
  const [state, formAction, pending] = useActionState(submitContribution, CONTRIBUTE_INITIAL);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------ confirmation */
  if (state.status === "success" && state.submission) {
    const submission = state.submission;
    return (
      <div className="rounded-xl border bg-surface p-6 md:p-8">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h2 className="mt-4 font-display text-h2 text-balance-heading">
          Thank you — this is now pending review
        </h2>
        <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
          Your contribution has been recorded and is waiting for a curator. It is
          <strong className="text-foreground"> not published</strong>, and it is
          not marked verified. It will not appear in the public archive until a
          person has checked it against a source.
        </p>

        <dl className="mt-6 divide-y rounded-xl border bg-background/60">
          {[
            { term: "Reference", value: submission.id },
            { term: "Title", value: submission.title },
            { term: "Category", value: submission.category },
            { term: "Contributor", value: submission.contributorName },
            {
              term: "Media",
              value: submission.mediaFilename
                ? `${submission.mediaType} · ${Math.round((submission.mediaBytes ?? 0) / 1024)} KB`
                : "No file attached",
            },
          ].map((row) => (
            <div key={row.term} className="flex gap-4 px-4 py-3">
              <dt className="w-28 shrink-0 text-caption text-subtle">{row.term}</dt>
              <dd className="min-w-0 flex-1 text-small break-words">{row.value}</dd>
            </div>
          ))}
          <div className="flex items-center gap-4 px-4 py-3">
            <dt className="w-28 shrink-0 text-caption text-subtle">Status</dt>
            <dd data-testid="submission-status" className="flex-1">
              <PendingReviewChip />
            </dd>
          </div>
        </dl>

        {/* The screening result, shown to the contributor rather than hidden. */}
        <section className="mt-6" aria-label="Automated pre-screening">
          <h3 className="text-h4 font-semibold">Automated pre-screening</h3>
          <p className="mt-1.5 text-small leading-relaxed text-muted">
            Run automatically to help the curator, not to judge the contribution.
            It cannot approve anything and it cannot mark anything verified.
          </p>
          {submission.screening.length === 0 ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg border bg-background/60 p-3 text-small text-muted">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              No issues flagged. It still waits for a curator.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {submission.screening.map((flag) => (
                <li
                  key={flag.code}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 text-small leading-relaxed",
                    flag.severity === "warning"
                      ? "border-warning/40 bg-warning-soft text-foreground"
                      : "bg-background/60 text-muted",
                  )}
                >
                  {flag.severity === "warning" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                  )}
                  {flag.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/destinations/sikkim/archive"
            className="flex h-11 items-center rounded-full bg-primary px-6 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Back to the archive
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------- form */
  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      {state.status === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error/40 bg-error-soft p-4 text-small leading-relaxed"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />
          {state.message}
        </p>
      ) : null}

      {/* -------------------------------------------------------- the object */}
      <fieldset className="flex flex-col gap-5">
        <legend className="font-display text-h3">What are you contributing?</legend>

        <Field
          name="title"
          label="Title"
          required
          error={state.field === "title" ? state.message : undefined}
          hint="Name the object or practice, not the file. “My grandmother's Pang Lhabsol mask”, not “IMG_4032”."
        />

        <Field
          name="description"
          label="Description"
          as="textarea"
          required
          rows={5}
          error={state.field === "description" ? state.message : undefined}
          hint="What it is, what is happening in it, and anything you know about when and where. The more you can say, the more of it can be verified."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium">
              Category <span className="text-error">*</span>
            </span>
            <select
              name="category"
              required
              defaultValue=""
              aria-invalid={state.field === "category" || undefined}
              className="h-11 rounded-lg border bg-surface px-3 text-small focus:border-primary focus:outline-none"
            >
              <option value="" disabled>
                Choose a category…
              </option>
              {ARCHIVE_CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {state.field === "category" ? (
              <span className="text-caption text-error">{state.message}</span>
            ) : null}
          </label>

          <Field
            name="community"
            label="Community"
            hint="Lepcha, Bhutia, Limbu, Rai, Newar, Tamang… if it belongs to one."
          />
          <Field name="location" label="Location" hint="Village, town or district in Sikkim." />
          <Field
            name="period"
            label="Date or period"
            hint="A year, a decade, or “still practised”. An honest guess is better than a blank."
          />
        </div>

        <Field
          name="sourceContext"
          label="Source or context"
          as="textarea"
          rows={3}
          hint="Where this came from — a family album, a monastery, a publication, a person who told you. This is what a curator checks against."
        />
      </fieldset>

      {/* ------------------------------------------------------------ upload */}
      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-h3">Attach an image</legend>
        <p className="text-small leading-relaxed text-muted">
          JPEG, PNG, WebP or AVIF, up to {MAX_MB} MB. Uploads are stored privately
          and are not served publicly while a submission is pending.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(
              "flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-5 text-small font-medium transition-colors hover:border-primary hover:text-primary",
              state.field === "media" && "border-error text-error",
            )}
          >
            <Upload className="size-4" aria-hidden />
            Choose a file
            <input
              ref={fileRef}
              type="file"
              name="media"
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
            />
          </label>
          {fileName ? (
            <span className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-caption">
              {fileName}
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  setFileName(null);
                }}
                className="text-subtle hover:text-error"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ) : (
            <span className="text-caption text-subtle">No file chosen</span>
          )}
        </div>
        {state.field === "media" ? (
          <span className="text-caption text-error">{state.message}</span>
        ) : null}
      </fieldset>

      {/* -------------------------------------------------------------- you */}
      <fieldset className="flex flex-col gap-5">
        <legend className="font-display text-h3">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="contributorName"
            label="Your name"
            required
            error={state.field === "contributorName" ? state.message : undefined}
            hint="How the archive should credit this contribution."
          />
          <Field
            name="contributorContact"
            label="Email"
            type="email"
            error={state.field === "contributorContact" ? state.message : undefined}
            hint="Optional. Only used if a curator needs to ask you something."
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border bg-surface p-4">
          <input
            type="checkbox"
            name="rightsDeclared"
            required
            aria-invalid={state.field === "rightsDeclared" || undefined}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
          />
          <span className="text-small leading-relaxed">
            <strong>Rights declaration.</strong> I confirm that I hold the rights
            to this material, or that it is free to share, and that I am willing
            for it to be published in the Sikkim Darshan Digital Heritage Archive with
            attribution. Where the material concerns a community&apos;s sacred or
            restricted practice, I confirm it is appropriate to share publicly.
            <span className="text-error"> *</span>
          </span>
        </label>
        {state.field === "rightsDeclared" ? (
          <span className="-mt-3 text-caption text-error">{state.message}</span>
        ) : null}
      </fieldset>

      {/* -------------------------------------------------------------- submit */}
      <div className="flex flex-col gap-3 border-t pt-6">
        <p className="flex items-start gap-2 text-small leading-relaxed text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          On submission this becomes a <strong className="text-foreground">pending review</strong>{" "}
          record. It is screened automatically for duplicates and missing metadata,
          and then waits for a curator. It is not published, and it is never marked
          verified by software.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-small font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto sm:self-start"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            "Submit for review"
          )}
        </button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------------- field */

function Field({
  name,
  label,
  hint,
  error,
  required = false,
  as = "input",
  type = "text",
  rows,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  as?: "input" | "textarea";
  type?: string;
  rows?: number;
}) {
  const describedBy = hint ? `${name}-hint` : undefined;
  const shared = {
    id: name,
    name,
    required,
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
      {as === "textarea" ? (
        <textarea {...shared} rows={rows ?? 4} />
      ) : (
        <input {...shared} type={type} />
      )}
      {hint ? (
        <span id={describedBy} className="text-caption leading-relaxed text-subtle">
          {hint}
        </span>
      ) : null}
      {error ? <span className="text-caption text-error">{error}</span> : null}
    </div>
  );
}
