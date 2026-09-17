"use server";

import { consumeSubmissionQuota, SUBMISSION_LIMIT } from "@/lib/rate-limit";
import { fieldErrors, partnershipRequestSchema } from "@/lib/partners/schema";
import { createPartnershipRequest } from "@/lib/partners/store";
import type { ApplyState } from "./state";

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const FIELDS = [
  "organizationName", "contactName", "email", "phone", "registrationInfo", "propertyName", "type", "destinationId",
  "address", "area", "mapsUrl", "officialWebsite", "bookingUrl", "description", "localCharacter", "amenities",
] as const;

/**
 * Submit a partnership request.
 *
 * Zod parses first (CLAUDE.md §5); the rate limit is the same one the archive
 * contribution form uses; the honeypot field is rejected by the schema. On
 * success the visitor is told the request is in the queue for verification —
 * never that a listing exists.
 */
export async function submitPartnership(_previous: ApplyState, formData: FormData): Promise<ApplyState> {
  const values = Object.fromEntries(FIELDS.map((key) => [key, text(formData, key)]));

  const quota = await consumeSubmissionQuota();
  if (!quota.ok) {
    const minutes = Math.ceil(quota.retryAfterSeconds / 60);
    return {
      status: "error",
      values,
      message: `That is ${SUBMISSION_LIMIT} requests in a short span. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const parsed = partnershipRequestSchema.safeParse({
    ...values,
    authorised: formData.get("authorised") === "on" ? true : false,
    website_confirm: text(formData, "website_confirm"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      values,
      errors: fieldErrors(parsed.error),
      message: "Some details need attention before the request can be sent.",
    };
  }

  const { data: request } = parsed;
  const result = await createPartnershipRequest(request);
  if (!result.ok) {
    return { status: "error", values, message: result.error };
  }
  return {
    status: "success",
    message: "Your partnership request has been submitted for verification.",
  };
}
