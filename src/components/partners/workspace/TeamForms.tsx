"use client";

import { addMemberAction, removeMemberAction } from "@/app/(v1)/partner/team/actions";
import { buttonClasses } from "@/components/ui/Button";

import { say, type Copy } from "./copy";
import { Field, FormMessage, useWorkspaceForm } from "./fields";

export function AddMemberForm({ copy }: { copy: Copy }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(addMemberAction);
  const generation = state.status === "ok" ? state.message : "fresh";
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="rounded-xl border border-dashed border-border-strong p-4" aria-label={say(copy, "team.add")}>
      <div key={generation} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Field id="member-email" name="email" type="email" label={say(copy, "team.email")} required error={state.errors?.email} />
        </div>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md" })}>
          {pending ? say(copy, "team.adding") : say(copy, "team.add")}
        </button>
      </div>
      <FormMessage state={state} className="mt-3" />
    </form>
  );
}

export function RemoveMemberForm({ copy, memberId, email }: { copy: Copy; memberId: string; email: string }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceForm(removeMemberAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="flex items-center gap-3">
      <input type="hidden" name="memberId" value={memberId} />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "ghost", size: "sm" })}>
        {say(copy, "team.remove")}
        <span className="sr-only">: {email}</span>
      </button>
      <FormMessage state={state} />
    </form>
  );
}
