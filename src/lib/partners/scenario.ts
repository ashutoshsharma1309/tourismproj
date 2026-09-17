import { commissionForTransaction, type Agreement } from "@/lib/partners/commission";

/**
 * ILLUSTRATIVE BUSINESS SCENARIO — not TerraStory's numbers.
 *
 * The SIH presentation needs one worked example of how referral revenue would
 * arise. These inputs are assumptions, labelled as such wherever they render,
 * and they live in this one file so the example is configurable rather than
 * typed into a page. Nothing in production business logic reads them: the
 * commission arithmetic takes a real agreement, and there is no real
 * agreement behind these figures.
 */
export const ILLUSTRATIVE_SCENARIO = {
  label: "Illustrative business scenario",
  disclaimer:
    "Assumptions for illustration only. TerraStory has no confirmed bookings, no signed commission agreements and no earned revenue to report; these figures show how referral revenue would arise once partnerships exist.",
  monthlyQualifiedBookings: 100,
  averageBookingValuePaise: 400_000n, // ₹4,000
  commissionBps: 1000, // 10%
} as const;

export interface ScenarioResult {
  monthlyQualifiedBookings: number;
  averageBookingValuePaise: bigint;
  commissionBps: number;
  gmvPaise: bigint;
  revenuePaise: bigint;
}

/** The example, computed through the same arithmetic a real agreement would use. */
export function illustrativeScenario(
  input: {
    monthlyQualifiedBookings?: number;
    averageBookingValuePaise?: bigint;
    commissionBps?: number;
  } = {},
): ScenarioResult {
  const bookings = input.monthlyQualifiedBookings ?? ILLUSTRATIVE_SCENARIO.monthlyQualifiedBookings;
  const value = input.averageBookingValuePaise ?? ILLUSTRATIVE_SCENARIO.averageBookingValuePaise;
  const bps = input.commissionBps ?? ILLUSTRATIVE_SCENARIO.commissionBps;
  const agreement: Agreement = {
    type: "PERCENTAGE_COMMISSION",
    status: "ACTIVE",
    commissionBps: bps,
    feePaise: null,
    validFrom: null,
    validUntil: null,
  };
  const now = new Date();
  let gmvPaise = 0n;
  let revenuePaise = 0n;
  for (let i = 0; i < bookings; i += 1) {
    gmvPaise += value;
    revenuePaise += commissionForTransaction(agreement, { amountPaise: value, confirmedAt: now }) ?? 0n;
  }
  return {
    monthlyQualifiedBookings: bookings,
    averageBookingValuePaise: value,
    commissionBps: bps,
    gmvPaise,
    revenuePaise,
  };
}
