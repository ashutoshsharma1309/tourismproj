/**
 * Licence currency, read off the state registers.
 *
 * WHAT THIS MAY SAY, AND WHAT IT MAY NOT
 * --------------------------------------
 * Both departmental registers print a "Valid Upto" date against every
 * establishment. Comparing that date to a known date is arithmetic, and this
 * module does only that.
 *
 * It may say: *the register's printed validity date for this entry has
 * passed.* That is a statement about the register, and anyone can check it
 * against the same public page.
 *
 * It may NOT say: *this business is unlicensed*, *this business has closed*,
 * or *avoid this operator*. None of those follow. A register is not
 * necessarily rewritten when a licence is renewed, and the likeliest single
 * explanation for 91% of hotel entries and 94% of agency entries showing a
 * past date is that renewals are recorded elsewhere and this table is not
 * refreshed. Every string this module produces is therefore phrased about the
 * *entry*, never about the *business*, and `LICENCE_CAVEAT` travels with any
 * aggregate built from it.
 *
 * WHY IT IS ASSESSED AGAINST THE RETRIEVAL DATE, NOT TODAY
 * -------------------------------------------------------
 * What is actually known is the register's contents on the day it was read.
 * Comparing a printed date against `new Date()` would silently assume the
 * register has not changed since — and would also make a prerendered page's
 * content depend on when the build ran, so two builds of the same commit could
 * disagree. Assessment is pinned to `retrievedAt` and the UI states that date,
 * which is both reproducible and true.
 */

export type LicenceState = "current" | "lapsed" | "undated";

export interface LicenceStatus {
  state: LicenceState;
  /** The date exactly as the register prints it. Null when it prints none. */
  printed: string | null;
  /** ISO date the register was read — what `state` is assessed against. */
  assessedOn: string;
  /**
   * Phrased about the register entry, never about the business. Rendered
   * verbatim; do not shorten it into a verdict.
   */
  label: string;
}

/**
 * Attaches to every aggregate built from licence states.
 *
 * A count of lapsed entries is a much easier thing to misread than a single
 * one, so nothing in the UI is allowed to publish such a count without this.
 */
export const LICENCE_CAVEAT =
  "These are dates printed in the department's own register, not verdicts on any business. A register is not necessarily rewritten when a licence is renewed, so an entry past its printed date may simply not have been refreshed here.";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses the register's "Nov 25, 2024" into a UTC timestamp.
 *
 * Explicit rather than `new Date(string)`, whose handling of this format is
 * implementation-defined — and which cheerfully returns a date for input that
 * is not one. Anything this cannot read becomes `undated`, which is a truthful
 * answer; guessing at a malformed date would not be.
 */
function parsePrintedDate(printed: string): number | null {
  const match = /^([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4})$/.exec(printed.trim());
  if (!match) return null;

  const month = MONTHS[match[1]!.slice(0, 3).toLowerCase()];
  if (month === undefined) return null;

  const day = Number(match[2]);
  const year = Number(match[3]);
  if (day < 1 || day > 31) return null;

  const ts = Date.UTC(year, month, day);
  /* Rejects the impossible — "Feb 31, 2024" would otherwise roll into March. */
  const rolled = new Date(ts);
  if (rolled.getUTCMonth() !== month || rolled.getUTCDate() !== day) return null;
  return ts;
}

export function licenceStatus(printed: string | null, assessedOn: string): LicenceStatus {
  const base = { printed, assessedOn };

  if (!printed) {
    return {
      ...base,
      state: "undated",
      label: "The register prints no validity date for this entry.",
    };
  }

  const validUpto = parsePrintedDate(printed);
  if (validUpto === null) {
    return {
      ...base,
      state: "undated",
      label: `The register prints “${printed}”, which could not be read as a date.`,
    };
  }

  const assessed = Date.parse(`${assessedOn}T00:00:00Z`);
  if (Number.isNaN(assessed)) {
    throw new Error(`licenceStatus: assessedOn must be an ISO date, got "${assessedOn}"`);
  }

  if (validUpto >= assessed) {
    return {
      ...base,
      state: "current",
      label: `Registered until ${printed}.`,
    };
  }

  return {
    ...base,
    state: "lapsed",
    label: `The register's printed validity for this entry ended ${printed}.`,
  };
}

export interface LicenceTally {
  total: number;
  current: number;
  lapsed: number;
  undated: number;
  /** Share of *datable* entries past their printed date, 0–1. Null if none are datable. */
  lapsedShareOfDatable: number | null;
  caveat: string;
}

export function tallyLicences(statuses: LicenceStatus[]): LicenceTally {
  const current = statuses.filter((s) => s.state === "current").length;
  const lapsed = statuses.filter((s) => s.state === "lapsed").length;
  const undated = statuses.filter((s) => s.state === "undated").length;
  const datable = current + lapsed;

  return {
    total: statuses.length,
    current,
    lapsed,
    undated,
    lapsedShareOfDatable: datable === 0 ? null : lapsed / datable,
    caveat: LICENCE_CAVEAT,
  };
}

/** Short badge text. Deliberately not a colour or a verdict — the caller styles it. */
export const LICENCE_BADGE: Record<LicenceState, string> = {
  current: "Registration current",
  lapsed: "Registration date passed",
  undated: "No date printed",
};
