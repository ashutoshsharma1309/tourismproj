import { z } from "zod";

import { isKnownDestination } from "@/lib/destinations/registry";

/**
 * What a partnership request may contain — the boundary, in Zod.
 *
 * Only what verification needs. No payment details, no identity documents,
 * no room counts, no rates: none of that is used at this stage and storing
 * it would be a liability with no product benefit (privacy by design).
 */

export const ACCOMMODATION_TYPES = [
  "HOTEL",
  "HERITAGE",
  "HOMESTAY",
  "GUEST_HOUSE",
  "RESORT",
  "HOSTEL",
  "OTHER",
] as const;

export const ACCOMMODATION_LABEL: Record<(typeof ACCOMMODATION_TYPES)[number], string> = {
  HOTEL: "Hotel",
  HERITAGE: "Heritage property",
  HOMESTAY: "Homestay",
  GUEST_HOUSE: "Guest house",
  RESORT: "Resort",
  HOSTEL: "Hostel",
  OTHER: "Other accommodation",
};

const trimmed = (max: number, min = 1) =>
  z.string().trim().min(min).max(max);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Must be a full web address starting with http:// or https://")
  .transform((v) => (v === "" ? null : v));

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v));

export const partnershipRequestSchema = z.object({
  /* Organisation and contact */
  organizationName: trimmed(160, 2),
  contactName: trimmed(120, 2),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .max(32)
    .refine((v) => v === "" || /^\+?[\d][\d\s().-]{5,}$/.test(v), "Enter a telephone number with country code, e.g. +91 98765 43210")
    .transform((v) => (v === "" ? null : v)),

  /* Property */
  propertyName: trimmed(160, 2),
  type: z.enum(ACCOMMODATION_TYPES),
  destinationId: z
    .string()
    .trim()
    .refine((id) => isKnownDestination(id), "Choose one of TerraStory's destinations"),
  address: trimmed(400, 8),
  area: optionalText(120),
  mapsUrl: optionalUrl,
  officialWebsite: optionalUrl,
  bookingUrl: optionalUrl,
  description: optionalText(1200),
  localCharacter: optionalText(600),
  amenities: z
    .string()
    .trim()
    .max(600)
    .transform((v) =>
      v
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),

  /* The applicant confirms they may act for the property. */
  authorised: z.literal(true, { message: "Confirm that you are authorised to represent this property" }),
  /* Honeypot: real people never see this field, so anything in it is a bot. */
  website_confirm: z.string().max(0).optional(),
});

export type PartnershipRequest = z.infer<typeof partnershipRequestSchema>;

/** Flatten a Zod error into field → first message, for the form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/* ---------------------------------------------------------------- referral */

export const REFERRAL_EVENT_TYPES = ["OFFICIAL_WEBSITE", "BOOKING_LINK", "CALL", "MAPS"] as const;

export const referralEventSchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    stayRef: z
      .string()
      .trim()
      .regex(/^[a-z-]+\/[a-z0-9-]+$/, "destination/slug")
      .max(200)
      .optional(),
    destinationId: z.string().trim().refine((id) => isKnownDestination(id)),
    eventType: z.enum(REFERRAL_EVENT_TYPES),
    /* Path only — never a full URL with someone else's query string. */
    source: z.string().trim().max(300).regex(/^\/[^\s?#]*$/, "a path"),
  })
  .refine((v) => v.propertyId || v.stayRef, { message: "A referral names a property or a stay" });

export type ReferralEventInput = z.infer<typeof referralEventSchema>;
