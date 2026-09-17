"use client";

import { uploadDocumentAction } from "@/app/(v1)/partner/verification/actions";
import { buttonClasses } from "@/components/ui/Button";

import { say, type Copy } from "./copy";
import { FormMessage, Select, useWorkspaceForm } from "./fields";

export function DocumentUploadForm({ copy, kinds }: { copy: Copy; kinds: { value: string; label: string }[] }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(uploadDocumentAction);
  const errors = state.errors ?? {};
  const generation = state.status === "ok" ? state.message : "fresh";
  return (
    <form action={formAction} onSubmit={onSubmit} encType="multipart/form-data" noValidate className="rounded-xl border border-border bg-surface p-5">
      <div key={generation} className="grid gap-4 sm:grid-cols-2">
        <Select name="kind" label={say(copy, "upload.kind")} required placeholder={say(copy, "field.choose")} options={kinds} error={errors.kind} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="document-file" className="text-small font-medium">
            {say(copy, "upload.file")}
            <span className="text-error"> *</span>
          </label>
          <input
            id="document-file"
            name="file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png"
            aria-describedby="document-file-hint"
            aria-invalid={errors.file ? true : undefined}
            className="w-full min-w-0 text-small file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-small"
          />
          <span id="document-file-hint" className="text-caption text-subtle">{say(copy, "upload.hint")}</span>
          {errors.file ? <span className="text-caption text-error">{errors.file}</span> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "sm" })}>
          {pending ? say(copy, "upload.pending") : say(copy, "upload.submit")}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
