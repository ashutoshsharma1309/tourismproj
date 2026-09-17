import type { PropertyStatus } from "@/lib/partners/lifecycle";

/**
 * The VENDOR lifecycle — the organisation, not one of its listings.
 *
 *   PENDING → UNDER_REVIEW → VERIFIED → APPROVED
 *   PENDING / UNDER_REVIEW → REJECTED → UNDER_REVIEW
 *   VERIFIED / APPROVED → SUSPENDED → VERIFIED (reinstated) or REJECTED
 *
 * A listing goes live only while its vendor is VERIFIED or APPROVED. The
 * database holds the same rule (`partner_properties_require_verified_vendor`
 * in drizzle/sql/0002) and unpublishes every listing of a vendor that loses
 * it, so a bug here cannot put an unverified operator in front of travellers.
 *
 * WHY A PROPERTY REVIEW STILL MOVES THE VENDOR
 * --------------------------------------------
 * A first-time partner arrives with one property, and reviewing that property
 * is how the organisation gets checked. So a property's review promotes its
 * vendor — but only forward, and never out of SUSPENDED. A second listing
 * entering review must not drag a verified vendor back to "pending", which
 * the earlier mirror-the-property rule did.
 */

export const VENDOR_STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

const TRANSITIONS: Record<VendorStatus, readonly VendorStatus[]> = {
  PENDING: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED"],
  VERIFIED: ["APPROVED", "SUSPENDED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: ["UNDER_REVIEW"],
  SUSPENDED: ["VERIFIED", "REJECTED"],
};

export function canVendorTransition(from: VendorStatus, to: VendorStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextVendorStatuses(from: VendorStatus): readonly VendorStatus[] {
  return TRANSITIONS[from];
}

/** May this vendor's listings be published, and may it add listings? */
export function isVerifiedVendor(status: VendorStatus): boolean {
  return status === "VERIFIED" || status === "APPROVED";
}

/** Forward progress through review. REJECTED and SUSPENDED sit outside it. */
const RANK: Partial<Record<VendorStatus, number>> = { PENDING: 0, UNDER_REVIEW: 1, VERIFIED: 2, APPROVED: 3 };

/**
 * What a property's review does to its vendor: a new status, or null for
 * "leave it alone". Promotion only; a verified vendor is never demoted by a
 * listing, and a suspended one is never reinstated by one.
 */
export function vendorStatusAfterPropertyReview(current: VendorStatus, propertyTo: PropertyStatus): VendorStatus | null {
  if (current === "SUSPENDED") return null;
  const target: VendorStatus | null =
    propertyTo === "UNDER_REVIEW" ? "UNDER_REVIEW"
    : propertyTo === "VERIFIED" ? "VERIFIED"
    : propertyTo === "APPROVED" || propertyTo === "PUBLISHED" ? "APPROVED"
    : propertyTo === "REJECTED" ? "REJECTED"
    : null;
  if (!target) return null;
  if (target === "REJECTED") {
    /* Rejecting one listing rejects the vendor only while the vendor itself
       has not yet been verified. */
    return current === "PENDING" || current === "UNDER_REVIEW" ? "REJECTED" : null;
  }
  const from = current === "REJECTED" ? -1 : (RANK[current] ?? -1);
  return (RANK[target] ?? -1) > from ? target : null;
}

/** Which listing moves a partner may make on their own listing. Everything else is a reviewer's. */
export const PARTNER_PROPERTY_MOVES: readonly { from: PropertyStatus; to: PropertyStatus }[] = [
  { from: "APPROVED", to: "PUBLISHED" },
  { from: "UNPUBLISHED", to: "PUBLISHED" },
  { from: "PUBLISHED", to: "UNPUBLISHED" },
];

export function partnerMayMove(from: PropertyStatus, to: PropertyStatus): boolean {
  return PARTNER_PROPERTY_MOVES.some((move) => move.from === from && move.to === to);
}

export const VENDOR_STATUS_TONE: Record<VendorStatus, "neutral" | "info" | "jade" | "success" | "warning" | "error"> = {
  PENDING: "neutral",
  UNDER_REVIEW: "info",
  VERIFIED: "success",
  APPROVED: "success",
  REJECTED: "error",
  SUSPENDED: "warning",
};
