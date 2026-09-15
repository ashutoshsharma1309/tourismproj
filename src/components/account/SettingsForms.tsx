"use client";

import { startTransition, useActionState, useId, type FormEvent } from "react";

import {
  clearHistoryAction,
  deleteAccountAction,
  saveProfileAction,
  type SettingsState,
} from "@/app/(v1)/account/actions";
import { buttonClasses } from "@/components/ui/Button";
import { clearLocalAccountData, clearSessionBuffer } from "@/lib/account/client";
import { cn } from "@/lib/cn";

const IDLE: SettingsState = { status: "idle" };
const INPUT = "w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-body focus:border-primary focus:outline-none";

function useSettings(action: (prev: SettingsState, form: FormData) => Promise<SettingsState>) {
  const [state, dispatch, pending] = useActionState(action, IDLE);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, pending, onSubmit };
}

function Message({ state }: { state: SettingsState }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={cn("text-small", state.status === "error" ? "text-error" : "text-success")}>
      {state.message}
    </p>
  );
}

export function ProfileForm({
  fullName,
  locale,
  languages,
}: {
  fullName: string;
  locale: string;
  languages: { code: string; label: string }[];
}) {
  const { state, pending, onSubmit } = useSettings(saveProfileAction);
  const nameId = useId();
  const languageId = useId();
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-small font-medium">Name</label>
        <input id={nameId} name="fullName" defaultValue={fullName} autoComplete="name" required maxLength={80} className={INPUT} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={languageId} className="text-small font-medium">Preferred language</label>
        <select id={languageId} name="locale" defaultValue={locale} className={INPUT} aria-describedby={`${languageId}-hint`}>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>{language.label}</option>
          ))}
        </select>
        <span id={`${languageId}-hint`} className="text-caption leading-relaxed text-subtle">
          Destination pages you open from your account use this language. Their interface is translated; place
          descriptions, stories and account pages stay in English where no translation exists.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ClearHistoryForm() {
  const { state, pending, onSubmit } = useSettings(clearHistoryAction);
  const id = useId();
  return (
    <form
      onSubmit={(event) => {
        /* Clearing history also forgets this tab's not-yet-merged activity. */
        if (new FormData(event.currentTarget).get("confirm") === "on") clearSessionBuffer();
        onSubmit(event);
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor={id} className="flex items-start gap-3 text-small">
        <input id={id} type="checkbox" name="confirm" className="mt-0.5 size-4 accent-primary" />
        I understand this removes my explored destinations, places, past journeys and comparisons. It cannot be undone.
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "secondary", size: "md" })}>
          {pending ? "Clearing…" : "Clear travel history"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function DeleteAccountForm() {
  const { state, pending, onSubmit } = useSettings(deleteAccountAction);
  const id = useId();
  return (
    <form
      onSubmit={(event) => {
        /* Only a confirmed deletion forgets this device's journey and visits. */
        const typed = new FormData(event.currentTarget).get("confirmation");
        if (typeof typed === "string" && typed.trim() === "DELETE") clearLocalAccountData();
        onSubmit(event);
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-small font-medium">Type DELETE to confirm</label>
        <input id={id} name="confirmation" autoComplete="off" className={cn(INPUT, "max-w-xs")} />
      </div>
      <div>
        <button type="submit" disabled={pending} className={cn(buttonClasses({ variant: "secondary", size: "md" }), "border-error text-error")}>
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}
