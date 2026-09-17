"use client";

import { startTransition, useActionState } from "react";

import type { WorkspaceState } from "@/app/(v1)/partner/workspace-state";
import { IDLE_WORKSPACE_STATE } from "@/app/(v1)/partner/workspace-state";
import { cn } from "@/lib/cn";

/**
 * Form plumbing shared by the workspace's client forms.
 *
 * React 19 resets a form after an `action` returns, which wipes selects and
 * dates a partner just chose. Submitting through `onSubmit` + a transition
 * keeps the values (the apply form hit this first); `action` stays on the
 * form for a browser without JavaScript.
 */
export function useWorkspaceForm(action: (prev: WorkspaceState, form: FormData) => Promise<WorkspaceState>) {
  const [state, formAction, pending] = useActionState(action, IDLE_WORKSPACE_STATE);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(form));
  };
  return { state, formAction, pending, onSubmit };
}

const control = "w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none";

export function Field({
  name, label, hint, error, required, as, type = "text", rows, defaultValue, min, max, requiredLabel, id, inputMode,
}: {
  name: string; label: string; hint?: string; error?: string; required?: boolean; requiredLabel?: string;
  inputMode?: "decimal" | "numeric" | "text";
  as?: "textarea"; type?: string; rows?: number; defaultValue?: string; min?: number | string; max?: number | string; id?: string;
}) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const shared = {
    id: fieldId,
    name,
    required,
    defaultValue,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? (true as const) : undefined,
    className: cn(control, error && "border-error"),
  };
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-small font-medium">
        {label}
        {required ? <span className="text-error" aria-label={requiredLabel}> *</span> : null}
      </label>
      {as === "textarea" ? <textarea {...shared} rows={rows ?? 4} /> : <input {...shared} type={type} min={min} max={max} inputMode={inputMode} />}
      {hint ? <span id={hintId} className="text-caption leading-relaxed text-subtle">{hint}</span> : null}
      {error ? <span id={errorId} className="text-caption text-error">{error}</span> : null}
    </div>
  );
}

export function Select({
  name, label, options, hint, error, required, defaultValue, placeholder, id,
}: {
  name: string; label: string; options: { value: string; label: string }[]; hint?: string;
  error?: string; required?: boolean; defaultValue?: string; placeholder?: string; id?: string;
}) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-small font-medium">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <select
        id={fieldId}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-describedby={hintId}
        aria-invalid={error ? true : undefined}
        className={cn(control, error && "border-error")}
      >
        {placeholder ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint ? <span id={hintId} className="text-caption leading-relaxed text-subtle">{hint}</span> : null}
      {error ? <span className="text-caption text-error">{error}</span> : null}
    </div>
  );
}

export function FormMessage({ state, className }: { state: WorkspaceState; className?: string }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn("text-small", state.status === "error" ? "text-error" : "text-success", className)}
    >
      {state.message}
    </p>
  );
}
