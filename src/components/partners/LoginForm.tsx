"use client";

import { useActionState } from "react";

import { requestCode, verifyCode, type LoginState } from "@/app/(v1)/login/actions";
import { buttonClasses } from "@/components/ui/Button";

/**
 * E-mail one-time code sign-in, in two steps and no password.
 *
 * The same address a partnership request was made from links the session
 * to that partner; a reviewer's address is on the operator's allowlist.
 * Nothing else about the person is asked for.
 */
export function LoginForm({ next }: { next: string }) {
  const [emailState, requestAction, requesting] = useActionState(requestCode, { step: "email" } as LoginState);
  const [codeState, verifyAction, verifying] = useActionState(verifyCode, { step: "code" } as LoginState);

  const step = codeState.message ? "code" : emailState.step;
  const email = codeState.email ?? emailState.email ?? "";
  const message = codeState.message ?? emailState.message;

  if (step === "error") {
    return <p role="alert" className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">{message}</p>;
  }

  if (step === "code") {
    return (
      <form action={verifyAction} className="flex flex-col gap-4">
        <p className="text-body text-muted">
          We sent a code to <strong className="font-medium text-foreground">{email}</strong>. Enter it below.
        </p>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium">One-time code</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required
            className="w-full max-w-xs rounded-lg border bg-surface px-3 py-2.5 font-mono text-body focus:border-primary focus:outline-none" />
        </label>
        {message ? <p role="alert" className="text-small text-error">{message}</p> : null}
        <div>
          <button type="submit" disabled={verifying} className={buttonClasses({ variant: "primary", size: "md" })}>
            {verifying ? "Checking…" : "Sign in"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={requestAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="text-small font-medium">E-mail address</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={email}
          className="w-full max-w-md rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none" />
        <span className="text-caption text-subtle">Use the address your partnership request was made from.</span>
      </label>
      {message ? <p role="alert" className="text-small text-error">{message}</p> : null}
      <div>
        <button type="submit" disabled={requesting} className={buttonClasses({ variant: "primary", size: "md" })}>
          {requesting ? "Sending…" : "Send me a code"}
        </button>
      </div>
    </form>
  );
}
