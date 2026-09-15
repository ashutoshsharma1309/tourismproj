/**
 * The partner property lifecycle, as a state machine.
 *
 *   PENDING → UNDER_REVIEW → VERIFIED → APPROVED → PUBLISHED ⇄ UNPUBLISHED
 *   any pre-publication state → REJECTED
 *
 * Nothing skips a step. A submission cannot be published without having been
 * verified and approved by a reviewer, which is the whole guarantee the
 * partner programme rests on: "verified partner stay" on a traveller's page
 * means a person checked it. The database check constraint
 * (`partner_properties_published_is_reviewed`) holds the same invariant at
 * the row, so a bug in this file cannot publish an unreviewed property.
 */

export const PROPERTY_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "APPROVED",
  "PUBLISHED",
  "UNPUBLISHED",
  "REJECTED",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

const TRANSITIONS: Record<PropertyStatus, readonly PropertyStatus[]> = {
  PENDING: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED"],
  VERIFIED: ["APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED", "REJECTED"],
  PUBLISHED: ["UNPUBLISHED"],
  UNPUBLISHED: ["PUBLISHED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
};

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: PropertyStatus): readonly PropertyStatus[] {
  return TRANSITIONS[from];
}

/** Only a published property is shown to travellers. */
export function isPublic(status: PropertyStatus): boolean {
  return status === "PUBLISHED";
}

/** What a partner sees on their dashboard, in plain words. */
export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, { label: string; detail: string }> = {
  PENDING: {
    label: "Submitted",
    detail: "Your request is in the queue. A reviewer will open it in order.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    detail: "A reviewer is checking the property against public records and your official channels.",
  },
  VERIFIED: {
    label: "Verified",
    detail: "The property, its address and its official channels have been confirmed. Approval is the next step.",
  },
  APPROVED: {
    label: "Approved",
    detail: "The partnership is approved. The property will be published on its destination's page.",
  },
  PUBLISHED: {
    label: "Published",
    detail: "Travellers exploring your destination can see the property and reach your official channels from it.",
  },
  UNPUBLISHED: {
    label: "Unpublished",
    detail: "The property is verified but not currently shown. Contact us to publish it again.",
  },
  REJECTED: {
    label: "Not accepted",
    detail: "The property could not be verified. The reviewer's note says why, and you can write to us.",
  },
};

/** Badge tone per status — one vocabulary on the dashboard and the console. */
export const PROPERTY_STATUS_TONE: Record<PropertyStatus, "neutral" | "info" | "jade" | "success" | "warning" | "error"> = {
  PENDING: "neutral",
  UNDER_REVIEW: "info",
  VERIFIED: "jade",
  APPROVED: "jade",
  PUBLISHED: "success",
  UNPUBLISHED: "warning",
  REJECTED: "error",
};

/** What a reviewer does at each step. Shown in the admin console. */
export const REVIEW_STEP: Record<PropertyStatus, string> = {
  PENDING: "Open the request and start the review.",
  UNDER_REVIEW: "Confirm the property exists, sits in the stated destination, and that the name, address, website, contact and map location match public records.",
  VERIFIED: "Approve the partnership, or reject it with a note.",
  APPROVED: "Publish the property on its destination's page.",
  PUBLISHED: "Unpublish if the property no longer meets the standard.",
  UNPUBLISHED: "Publish again, or reject.",
  REJECTED: "Reopen for review if the partner has supplied what was missing.",
};
