import type { ArchiveSubmission } from "@/lib/archive-submissions";

/**
 * The contribution form's action state.
 *
 * This lives beside actions.ts rather than inside it because a `"use server"`
 * module may export *only* async functions. Exporting the initial-state object
 * from there compiled and type-checked cleanly and then failed at runtime the
 * first time the action was invoked — the form threw
 * "A 'use server' file can only export async functions, found object" and the
 * page fell through to the error boundary. Nothing on the site could be
 * contributed. A type-only export would have been fine, since types are erased;
 * the value is what breaks it.
 */
export interface ContributeState {
  status: "idle" | "success" | "error";
  message?: string;
  field?: string;
  submission?: ArchiveSubmission;
}

export const CONTRIBUTE_INITIAL: ContributeState = { status: "idle" };
