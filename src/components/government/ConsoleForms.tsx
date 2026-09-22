"use client";

import { startTransition, useActionState } from "react";

import {
  addOfficerAction,
  advisoryStatusAction,
  decideAction,
  draftAdvisoryAction,
  removeOfficerAction,
} from "@/app/(v1)/government/actions";
import { IDLE_CONSOLE_STATE, type ConsoleState } from "@/app/(v1)/government/state";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Labels = Record<string, string>;
const say = (labels: Labels, key: string) => labels[key] ?? "";
const control = "w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none";

function Reply({ state }: { state: ConsoleState }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={cn("text-small", state.status === "error" ? "text-error" : "text-success")}>
      {state.message}
    </p>
  );
}

function useConsoleForm(action: (prev: ConsoleState, form: FormData) => Promise<ConsoleState>) {
  const [state, formAction, pending] = useActionState(action, IDLE_CONSOLE_STATE);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(form));
  };
  return { state, formAction, pending, onSubmit };
}

/**
 * The officer's decision controls for one application: the steps the
 * lifecycle allows from here, what was confirmed, a note, and a request for
 * clarification. Steps the machine forbids are not rendered.
 */
export function DecisionControls({
  propertyId,
  targets,
  checks,
  canVerify,
  labels,
}: {
  propertyId: string;
  targets: readonly string[];
  checks: { field: string; label: string }[];
  canVerify: boolean;
  labels: Labels;
}) {
  const { state, formAction, pending, onSubmit } = useConsoleForm(decideAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5" data-decision>
      <input type="hidden" name="propertyId" value={propertyId} />
      <h2 className="font-display text-h4">{say(labels, "decision")}</h2>
      {canVerify ? (
        <fieldset className="mt-3">
          <legend className="text-small font-medium">{say(labels, "checks")}</legend>
          <ul className="mt-2 space-y-1.5">
            {checks.map((check) => (
              <li key={check.field}>
                <label className="flex items-start gap-2 text-small">
                  <input type="checkbox" name="checks" value={check.field} className="mt-0.5 size-4 accent-primary" />
                  {check.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-small font-medium">{say(labels, "note")}</span>
        <textarea name="note" rows={3} maxLength={1000} placeholder={say(labels, "notePlaceholder")} className={control} />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {targets.map((to) => (
          <button
            key={to}
            type="submit"
            name="to"
            value={to}
            disabled={pending}
            className={buttonClasses({ variant: to === "REJECTED" || to === "UNPUBLISHED" ? "secondary" : "primary", size: "sm" })}
          >
            {say(labels, `verb.${to}`)}
          </button>
        ))}
        <button type="submit" name="intent" value="clarify" disabled={pending} className={buttonClasses({ variant: "outline", size: "sm" })}>
          {say(labels, "clarify")}
        </button>
      </div>
      <div className="mt-3">
        <Reply state={state} />
      </div>
    </form>
  );
}

export function AdvisoryForm({
  destinations,
  kinds,
  severities,
  labels,
}: {
  destinations: { value: string; label: string }[];
  kinds: { value: string; label: string }[];
  severities: { value: string; label: string }[];
  labels: Labels;
}) {
  const { state, formAction, pending, onSubmit } = useConsoleForm(draftAdvisoryAction);
  const generation = state.status === "ok" ? state.message : "fresh";
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="rounded-xl border border-border bg-surface p-5" aria-label={say(labels, "new")} data-advisory-form>
      <div key={generation} className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {say(labels, "destination")}
          <select name="destinationId" required className={control}>
            {destinations.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {say(labels, "kind")}
          <select name="kind" required className={control} defaultValue="PERMIT">
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {say(labels, "severity")}
          <select name="severity" required className={control} defaultValue="INFO">
            {severities.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {say(labels, "source")}
          <input type="text" name="source" maxLength={200} placeholder={say(labels, "sourceHint")} className={control} />
        </label>
        <div className="sm:col-span-2">
          <label className="flex flex-col gap-1.5 text-small font-medium">
            {say(labels, "title")}
            <input type="text" name="title" required maxLength={160} className={control} aria-invalid={state.errors?.title ? true : undefined} />
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="flex flex-col gap-1.5 text-small font-medium">
            {say(labels, "body")}
            <textarea name="body" rows={4} maxLength={2000} className={control} />
          </label>
        </div>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {say(labels, "from")}
          <input type="date" name="startsAt" className={control} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {say(labels, "until")}
          <input type="date" name="endsAt" className={control} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? say(labels, "saving") : say(labels, "save")}
        </button>
        <Reply state={state} />
      </div>
    </form>
  );
}

export function AdvisoryStatusForm({ advisoryId, to, label }: { advisoryId: string; to: "PUBLISHED" | "WITHDRAWN"; label: string }) {
  const { state, formAction, pending, onSubmit } = useConsoleForm(advisoryStatusAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="advisoryId" value={advisoryId} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: to === "PUBLISHED" ? "primary" : "outline", size: "sm" })}>
        {label}
      </button>
      <Reply state={state} />
    </form>
  );
}

export function AddOfficerForm({ roles, labels }: { roles: { value: string; label: string }[]; labels: Labels }) {
  const { state, formAction, pending, onSubmit } = useConsoleForm(addOfficerAction);
  const generation = state.status === "ok" ? state.message : "fresh";
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="rounded-xl border border-dashed border-border-strong p-4" aria-label={say(labels, "add")}>
      <div key={generation} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-small font-medium">
          {say(labels, "email")}
          <input id="officer-email" type="email" name="email" required maxLength={254} className={control} aria-invalid={state.errors?.email ? true : undefined} />
        </label>
        <label className="flex flex-col gap-1.5 text-small font-medium">
          {say(labels, "role")}
          <select name="role" className={control} defaultValue="REVIEWER">
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? say(labels, "adding") : say(labels, "add")}
        </button>
      </div>
      <div className="mt-3">
        <Reply state={state} />
      </div>
    </form>
  );
}

export function RemoveOfficerForm({ memberId, email, label }: { memberId: string; email: string; label: string }) {
  const { state, formAction, pending, onSubmit } = useConsoleForm(removeOfficerAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex items-center gap-3">
      <input type="hidden" name="memberId" value={memberId} />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "ghost", size: "sm" })}>
        {label}
        <span className="sr-only">: {email}</span>
      </button>
      <Reply state={state} />
    </form>
  );
}
