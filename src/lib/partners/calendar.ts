/**
 * Calendar days, as the partner calendar needs them.
 *
 * A calendar day is a string, "YYYY-MM-DD", from the form to the `date`
 * column and back. It is never turned into a `Date` at local midnight, which
 * is how a room opened for the 1st ends up opened for the 31st on a server
 * running in UTC. "Today" is today in Asia/Kolkata, and the clock is passed in
 * so a page computes it once, outside render (CLAUDE.md §5).
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export const MAX_RANGE_DAYS = 366;
/** How far ahead a partner may open rooms. */
export const HORIZON_DAYS = 540;

export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function todayInKolkata(now: Date): string {
  /* en-CA formats as YYYY-MM-DD. */
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const toUtc = (day: string) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(day: string, days: number): string {
  return fromUtc(toUtc(day) + days * DAY_MS);
}

/** Inclusive count of days from `from` to `to`; 1 when they are the same day. */
export function spanDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const probe = new Date(Date.UTC(y, m - 1 + by, 1));
  return probe.toISOString().slice(0, 7);
}

/**
 * The weeks of a month, Monday first. Cells outside the month are null so the
 * grid keeps its shape without inventing dates the partner did not ask for.
 */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;
  const length = spanDays(first, next) - 1;
  /* getUTCDay: Sunday 0. Shift so Monday is 0. */
  const lead = (new Date(toUtc(first)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length }, (_, i) => addDays(first, i))];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Is a requested range something a partner may set, judged against today? */
export function rangeProblem(from: string, to: string, today: string): "invalid" | "past" | "reversed" | "too-long" | "too-far" | null {
  if (!isIsoDay(from) || !isIsoDay(to)) return "invalid";
  if (from < today) return "past";
  if (to < from) return "reversed";
  if (spanDays(from, to) > MAX_RANGE_DAYS) return "too-long";
  if (to > addDays(today, HORIZON_DAYS)) return "too-far";
  return null;
}

export type DayState = "past" | "not-set" | "closed" | "open";

export function dayState(day: string, today: string, row: { unitsOpen: number } | undefined): DayState {
  if (day < today) return "past";
  if (!row) return "not-set";
  return row.unitsOpen > 0 ? "open" : "closed";
}
