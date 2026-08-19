"use client";

import { useActionState } from "react";

import { signIn } from "@/app/curator/login/actions";
import { LOGIN_INITIAL } from "@/app/curator/login/state";
import { buttonClasses } from "@/components/ui/Button";

export function CuratorLoginForm() {
  const [state, action, pending] = useActionState(signIn, LOGIN_INITIAL);

  return (
    <form action={action} className="mt-7 flex flex-col gap-3">
      <label htmlFor="passphrase" className="text-label font-medium">
        Curator passphrase
      </label>
      <input
        id="passphrase"
        name="passphrase"
        type="password"
        autoComplete="current-password"
        required
        aria-describedby={state.status === "error" ? "passphrase-error" : undefined}
        aria-invalid={state.status === "error"}
        className="h-11 rounded-lg border bg-surface px-3 text-body focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
      />
      {state.status === "error" ? (
        <p id="passphrase-error" role="alert" className="text-small text-error">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={buttonClasses({ variant: "primary", size: "lg" })}
      >
        {pending ? "Checking…" : "Open the queue"}
      </button>
    </form>
  );
}
