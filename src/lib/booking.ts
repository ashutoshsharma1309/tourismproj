/**
 * Booking arithmetic.
 *
 * The Tourism Sustainability Development (TSD) Fund is a REAL Government of
 * Sikkim mechanism, so it is modelled exactly as the rules define it — not as
 * a convenient percentage.
 *
 * Under the Sikkim Registration of Tourist Trade Rules, 2025, a flat ₹50 per
 * person is collected by hotels at check-in and deposited into the TSD Fund.
 * It is valid for one month; a tourist who leaves and re-enters within the
 * same month pays again. Children under five and government-work visitors are
 * exempt. See SOURCES["sikkim-tourist-trade-rules-2025"].
 *
 * An earlier revision of this file charged 2–4% of room tariff. That was
 * invented and has been removed — it misstated a live public policy.
 */

/** ₹ per person, one-time, valid one month. */
export const TSD_FEE_PER_PERSON = 50;

/** Age below which the entry fee does not apply. */
export const TSD_EXEMPT_UNDER_AGE = 5;

export const GST_RATE = 0.12;

export interface TariffBreakdown {
  /** Room tariff for the whole stay. */
  base: number;
  /** Guests the ₹50 fee applies to. */
  chargeableGuests: number;
  tsd: number;
  gst: number;
  total: number;
}

/**
 * Splits a stay into tariff + GST + the flat TSD entry fee.
 *
 * GST on accommodation is slab-based in reality; 12% is applied here as a
 * clearly-labelled estimate, not a quoted rate.
 */
export function computeTariff(base: number, chargeableGuests: number): TariffBreakdown {
  const tsd = TSD_FEE_PER_PERSON * Math.max(0, chargeableGuests);
  const gst = Math.round(base * GST_RATE);
  return { base, chargeableGuests, tsd, gst, total: base + tsd + gst };
}

/** Nights between two ISO dates; 0 when the range is invalid. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.round(ms / 86_400_000);
}

/** "SD-HTL-2847" — deterministic per booking payload. */
export function makeBookingId(seedText: string): string {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 9000;
  }
  return `SD-HTL-${1000 + hash}`;
}
