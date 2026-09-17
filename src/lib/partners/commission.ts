/**
 * Commercial arithmetic for the partner programme.
 *
 * THREE NUMBERS THAT MUST NEVER BE CONFUSED
 * -----------------------------------------
 *   GMV        — the gross value of transactions that happened at partners,
 *                in paise. Not TerraStory's money. Never reported as revenue.
 *   Commission — what TerraStory is owed on ONE qualifying transaction under
 *                ONE active agreement. Zero when there is no agreement.
 *   Revenue    — the sum of commissions and fees actually earned.
 *
 * Every function here takes the agreement as an argument and returns nothing
 * when there is none, or when it is not active on the date in question. There
 * is no default rate. A page visit and an outbound click carry no amount and
 * therefore produce no commission; only a confirmed transaction does, and no
 * mechanism confirms one yet — see docs/business-model.md.
 *
 * Money is `bigint` paise throughout (CLAUDE.md §2 R4).
 */

export type AgreementType =
  | "PERCENTAGE_COMMISSION"
  | "FIXED_REFERRAL_FEE"
  | "QUALIFIED_LEAD_FEE"
  | "EXPERIENCE_PARTNERSHIP_FEE";

export interface Agreement {
  type: AgreementType;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";
  commissionBps: number | null;
  feePaise: bigint | null;
  validFrom: Date | null;
  validUntil: Date | null;
}

/** A confirmed transaction at a partner. Nothing in the product creates one yet. */
export interface QualifyingTransaction {
  amountPaise: bigint;
  confirmedAt: Date;
}

export function isAgreementActive(agreement: Agreement | null | undefined, on: Date): boolean {
  if (!agreement || agreement.status !== "ACTIVE") return false;
  if (agreement.validFrom && on < agreement.validFrom) return false;
  if (agreement.validUntil && on > agreement.validUntil) return false;
  return true;
}

/**
 * TerraStory's commission on one qualifying transaction, or null.
 *
 * Null is the honest answer whenever the terms do not cover the case: no
 * agreement, an inactive one, a percentage agreement with no rate, or a lead
 * agreement asked about a transaction amount. Rounding is toward zero, in the
 * partner's favour, and never produces a fraction of a paisa.
 */
export function commissionForTransaction(
  agreement: Agreement | null | undefined,
  transaction: QualifyingTransaction,
): bigint | null {
  if (!isAgreementActive(agreement, transaction.confirmedAt)) return null;
  const terms = agreement as Agreement;
  switch (terms.type) {
    case "PERCENTAGE_COMMISSION":
      if (terms.commissionBps === null || terms.commissionBps < 0 || terms.commissionBps > 10000) return null;
      return (transaction.amountPaise * BigInt(terms.commissionBps)) / 10000n;
    case "FIXED_REFERRAL_FEE":
      return terms.feePaise ?? null;
    case "QUALIFIED_LEAD_FEE":
    case "EXPERIENCE_PARTNERSHIP_FEE":
      /* Paid per lead or per partnership, not per transaction. */
      return null;
  }
}

/** The fee a qualified lead earns under a lead agreement, or null. */
export function feeForQualifiedLead(agreement: Agreement | null | undefined, on: Date): bigint | null {
  if (!isAgreementActive(agreement, on)) return null;
  const terms = agreement as Agreement;
  return terms.type === "QUALIFIED_LEAD_FEE" ? (terms.feePaise ?? null) : null;
}

export interface Ledger {
  gmvPaise: bigint;
  revenuePaise: bigint;
  transactions: number;
}

/**
 * Sums a set of confirmed transactions into GMV and revenue, separately.
 * GMV counts every transaction; revenue counts only the commission the
 * agreement in force actually yields.
 */
export function ledgerFor(
  agreement: Agreement | null | undefined,
  transactions: readonly QualifyingTransaction[],
): Ledger {
  let gmvPaise = 0n;
  let revenuePaise = 0n;
  for (const transaction of transactions) {
    gmvPaise += transaction.amountPaise;
    revenuePaise += commissionForTransaction(agreement, transaction) ?? 0n;
  }
  return { gmvPaise, revenuePaise, transactions: transactions.length };
}
