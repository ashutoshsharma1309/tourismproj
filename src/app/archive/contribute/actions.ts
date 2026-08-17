"use server";

import { revalidatePath } from "next/cache";

import { createSubmission, SubmissionError } from "@/lib/archive-submissions";
import type { ArchiveSubmission } from "@/lib/archive-submissions";

/**
 * The contribution Server Action.
 *
 * There is no authenticated user here on purpose — this is a public heritage
 * archive taking public contributions — which is exactly why the action can do
 * only one thing: write a record whose status is "pending-review". It cannot
 * publish, cannot verify, and cannot modify anything already in the archive.
 * The blast radius of an abusive POST is one row in a queue a curator reads.
 */

export interface ContributeState {
  status: "idle" | "success" | "error";
  message?: string;
  field?: string;
  submission?: ArchiveSubmission;
}

export const CONTRIBUTE_INITIAL: ContributeState = { status: "idle" };

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

export async function submitContribution(
  _previous: ContributeState,
  formData: FormData,
): Promise<ContributeState> {
  try {
    const media = formData.get("media");
    const submission = await createSubmission({
      title: text(formData, "title"),
      description: text(formData, "description"),
      category: text(formData, "category"),
      community: text(formData, "community"),
      location: text(formData, "location"),
      period: text(formData, "period"),
      sourceContext: text(formData, "sourceContext"),
      contributorName: text(formData, "contributorName"),
      contributorContact: text(formData, "contributorContact"),
      rightsDeclared: formData.get("rightsDeclared") === "on",
      media: media instanceof File ? media : null,
    });

    /* The curator queue shows the new row on its next visit. */
    revalidatePath("/preservation/review");
    revalidatePath("/archive");

    return {
      status: "success",
      submission,
      message: "Received. This contribution is now pending review.",
    };
  } catch (error) {
    if (error instanceof SubmissionError) {
      return { status: "error", message: error.message, field: error.field };
    }
    return {
      status: "error",
      message:
        "The contribution could not be saved. Nothing was published, and nothing was lost on your side — try again.",
    };
  }
}
