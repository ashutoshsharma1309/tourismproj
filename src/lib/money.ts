/**
 * Money is paise. Always.
 *
 * WHY NOT RUPEES-AS-FLOAT
 * -----------------------
 * `0.1 + 0.2 !== 0.3` in every language with IEEE-754 floats, and a booking
 * total is a sum of many such additions. In paise every amount is an integer,
 * so a total is exact and a fee split is a division with a defined remainder
 * rather than a rounding surprise.
 *
 * `bigint`, not `number`: a year of GMV for a mid-size operator exceeds
 * `Number.MAX_SAFE_INTEGER` in paise sooner than people expect, and the point
 * of choosing a type is that it does not need to be revisited.
 */

/** One rupee. */
export const RUPEE = 100n;

/** Rupees → paise. Accepts a number for form input; rejects fractional paise. */
export function toPaise(rupees: number): bigint {
  const paise = Math.round(rupees * 100);
  if (!Number.isFinite(paise)) throw new Error(`Not a monetary amount: ${rupees}`);
  return BigInt(paise);
}

/** Paise → rupees, for display maths only. Never for arithmetic on money. */
export function toRupees(paise: bigint): number {
  return Number(paise) / 100;
}

/**
 * The platform's cut, in basis points.
 *
 * Floor, so the rounding remainder always goes to the VENDOR. Over a year of
 * bookings that is a few rupees; the direction of the bias is a decision, and
 * it should favour the person doing the work.
 */
export function platformFeePaise(subtotalPaise: bigint, commissionBps: number): bigint {
  if (commissionBps < 0 || commissionBps > 10_000) {
    throw new Error(`commissionBps out of range: ${commissionBps}`);
  }
  return (subtotalPaise * BigInt(commissionBps)) / 10_000n;
}

/** What the vendor receives. Always `subtotal - fee`, never recomputed. */
export function vendorPayoutPaise(subtotalPaise: bigint, commissionBps: number): bigint {
  return subtotalPaise - platformFeePaise(subtotalPaise, commissionBps);
}

/**
 * For display. The ONLY place a rupee string is produced.
 *
 * `en-IN` gives the lakh/crore grouping — ₹1,20,000 rather than ₹120,000 —
 * which is what an Indian vendor expects to read on their own dashboard.
 */
export function formatINR(paise: bigint, options: { decimals?: boolean } = {}): string {
  const { decimals = false } = options;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(toRupees(paise));
}

/** Nights between two calendar days. A one-night stay is check-in to next day. */
export function nightsBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const nights = Math.round((end - start) / 86_400_000);
  if (nights < 1) throw new Error(`endDate must be after startDate: ${startDate} → ${endDate}`);
  return nights;
}
