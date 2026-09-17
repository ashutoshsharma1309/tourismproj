import { z } from "zod";

import { isKnownDestination } from "@/lib/destinations/registry";
import type { PartnerMessageKey } from "@/lib/i18n/partner-messages";
import { ACCOMMODATION_TYPES } from "@/lib/partners/schema";

/**
 * The partner workspace's boundary, in Zod. Messages are catalogue keys
 * (lib/i18n/partner-messages.ts), translated by the action that returns them.
 *
 * Still no price, card or bank field: rooms and dates are inventory, and
 * money arrives with checkout, not before it.
 */

const key = (k: PartnerMessageKey) => k;

const optionalText = (max: number) =>
  z.string().trim().max(max, key("error.long")).transform((v) => (v === "" ? null : v));

const optionalUrl = z
  .string()
  .trim()
  .max(500, key("error.long"))
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), key("error.url"))
  .transform((v) => (v === "" ? null : v));

const optionalTime = z
  .string()
  .trim()
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), key("error.time"))
  .transform((v) => (v === "" ? null : v));

const amenities = z
  .string()
  .trim()
  .max(600, key("error.long"))
  .transform((v) =>
    v
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20),
  );

/** What a partner may change on their own listing without a reviewer. */
export const listingDetailsSchema = z.object({
  description: optionalText(1200),
  localCharacter: optionalText(600),
  amenities,
  checkInFrom: optionalTime,
  checkOutBy: optionalTime,
  houseRules: optionalText(1200),
  cancellationTerms: optionalText(1200),
});
export type ListingDetails = z.infer<typeof listingDetailsSchema>;

/** A new listing from a verified vendor: the verified facts plus the details. */
export const newListingSchema = listingDetailsSchema.extend({
  name: z.string().trim().min(2, key("error.name")).max(160, key("error.name")),
  type: z.enum(ACCOMMODATION_TYPES, { message: key("error.type") }),
  destinationId: z.string().trim().refine((id) => isKnownDestination(id), key("error.destination")),
  address: z.string().trim().min(8, key("error.address")).max(400, key("error.long")),
  area: optionalText(120),
  mapsUrl: optionalUrl,
  officialWebsite: optionalUrl,
  bookingUrl: optionalUrl,
});
export type NewListing = z.infer<typeof newListingSchema>;

const int = (min: number, max: number, message: PartnerMessageKey) =>
  z.coerce.number({ message }).int(message).min(min, message).max(max, message);

export const unitSchema = z.object({
  name: z.string().trim().min(2, key("error.unitName")).max(80, key("error.unitName")),
  capacity: int(1, 50, "error.capacity"),
  totalQuantity: int(1, 500, "error.quantity"),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const availabilitySchema = z.object({
  unitId: z.string().uuid(key("error.notFound")),
  from: z.string().trim(),
  to: z.string().trim(),
  mode: z.enum(["open", "close"]),
  rooms: int(0, 500, "error.rooms"),
});
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

/** Business documents only. A person's identity or tax card is never asked for. */
export const UPLOADABLE_DOCUMENT_KINDS = ["GOVT_REG", "PROPERTY_PROOF", "GST"] as const;
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const documentKindSchema = z.enum(UPLOADABLE_DOCUMENT_KINDS);

/** Flatten a Zod error into field → first message key. */
export function fieldKeys(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in out)) out[field] = issue.message;
  }
  return out;
}
