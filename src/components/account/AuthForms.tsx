"use client";

import Link from "next/link";
import { startTransition, useActionState, useId, type FormEvent, type ReactNode } from "react";

import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "@/app/(v1)/login/account-actions";
import { buttonClasses } from "@/components/ui/Button";
import { allowMergeOnLogin } from "@/lib/account/client";
import { cn } from "@/lib/cn";

/**
 * The traveller's sign-in, sign-up and password forms.
 *
 * Each field has a visible label (never a placeholder standing in for one),
 * errors are announced with role="alert" and tied to the form, and the submit
 * handler calls the action directly so React does not reset what was typed
 * when the server answers with an error.
 */

const IDLE: AuthState = { status: "idle" };
const INPUT =
  "w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-body focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function useKeptAction(action: (prev: AuthState, form: FormData) => Promise<AuthState>) {
  const [state, dispatch, pending] = useActionState(action, IDLE);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, dispatch, pending, onSubmit };
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  hint,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-describedby={hintId}
        className={INPUT}
      />
      {hint ? (
        <span id={hintId} className="text-caption text-subtle">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Alert({ state }: { state: AuthState }) {
  if (state.status !== "error" || !state.message) return null;
  return (
    <p role="alert" className="rounded-lg border border-error/40 bg-error-soft/40 p-3 text-small leading-relaxed">
      {state.message}
    </p>
  );
}

function Submit({ pending, children, busy }: { pending: boolean; children: ReactNode; busy: string }) {
  return (
    <button type="submit" disabled={pending} className={cn(buttonClasses({ variant: "primary", size: "md" }), "w-full justify-center")}>
      {pending ? busy : children}
    </button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useKeptAction(signIn);
  return (
    <form
      onSubmit={(event) => {
        /* This tab's anonymous exploration belongs to whoever logs in here. */
        allowMergeOnLogin();
        onSubmit(event);
      }} className="flex flex-col gap-4" aria-label="Log in" noValidate>
      <input type="hidden" name="next" value={next} />
      <Alert state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <div className="-mt-1 text-right">
        <Link href="/forgot-password" className="text-small font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Submit pending={pending} busy="Logging in…">Log in</Submit>
    </form>
  );
}

export function SignUpForm() {
  const { state, pending, onSubmit } = useKeptAction(signUp);
  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-5">
        <p className="font-display text-h4">Check your inbox</p>
        <p className="mt-2 text-body leading-relaxed text-muted">{state.message}</p>
        <p className="mt-3 text-small text-muted">
          Nothing arrived after a few minutes? Check spam, or{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            try again
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Create account" noValidate>
      <Alert state={state} />
      <Field label="Name" name="name" autoComplete="name" defaultValue={state.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." />
      <Submit pending={pending} busy="Creating account…">Create account</Submit>
      <p className="text-caption leading-relaxed text-subtle">
        TerraStory stores your name, e-mail, the interests you choose and what you explore here, to
        personalise your recommendations. You can clear it or delete your account at any time.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useKeptAction(requestPasswordReset);
  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-5">
        <p className="font-display text-h4">Check your inbox</p>
        <p className="mt-2 text-body leading-relaxed text-muted">{state.message}</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Reset password" noValidate>
      <Alert state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} />
      <Submit pending={pending} busy="Sending…">Send reset link</Submit>
    </form>
  );
}

export function ResetPasswordForm() {
  const { state, pending, onSubmit } = useKeptAction(updatePassword);
  if (state.status === "done") {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-5">
        <p className="font-display text-h4">{state.message}</p>
        <Link href="/account" className={cn(buttonClasses({ variant: "primary", size: "md" }), "mt-4")}>
          Go to your TerraStory
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Choose a new password" noValidate>
      <Alert state={state} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
      <Submit pending={pending} busy="Saving…">Save new password</Submit>
    </form>
  );
}
