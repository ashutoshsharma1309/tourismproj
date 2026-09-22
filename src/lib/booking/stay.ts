import { addDays, HORIZON_DAYS, isIsoDay, spanDays } from "@/lib/partners/calendar";

/**
 * A stay, as the booking engine understands it — pure, so the same rules run
 * in the page, the action, the engine and the tests.
 *
 * Dates are calendar days ("YYYY-MM-DD"). A stay from the 10th to the 12th is
 * two NIGHTS, the 10th and the 11th, and it needs availability rows for those
 * two dates only: the departure day is not slept.
 *
 * Money is bigint paise (CLAUDE.md §2 R4). Rupees typed by a partner are
 * parsed as a string, digit by digit, and never pass through a float.
 */

export const HOLD_MINUTES = 10;
export const MAX_NIGHTS = 30;
export const MAX_ROOMS = 10;
export const MAX_GUESTS = 50;

export type StayProblem = "invalid-date" | "past" | "order" | "too-long" | "too-far";

export function stayProblem(checkIn: string, checkOut: string, today: string): StayProblem | null {
  if (!isIsoDay(checkIn) || !isIsoDay(checkOut)) return "invalid-date";
  if (checkIn < today) return "past";
  if (checkOut <= checkIn) return "order";
  if (spanDays(checkIn, checkOut) - 1 > MAX_NIGHTS) return "too-long";
  if (checkOut > addDays(today, HORIZON_DAYS)) return "too-far";
  return null;
}

/** The nights of a valid stay: every date from arrival up to, not including, departure. */
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const count = spanDays(checkIn, checkOut) - 1;
  return Array.from({ length: count }, (_, i) => addDays(checkIn, i));
}

export type QuantityProblem = "rooms" | "guests" | "capacity";

export function quantityProblem(rooms: number, guests: number, capacity?: number): QuantityProblem | null {
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > MAX_ROOMS) return "rooms";
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) return "guests";
  if (capacity !== undefined && guests > rooms * capacity) return "capacity";
  return null;
}

/** Rooms of a given capacity needed for a party, at least one. */
export function roomsFor(guests: number, capacity: number): number {
  return Math.max(1, Math.ceil(guests / Math.max(1, capacity)));
}

/**
 * "2500", "2,500" or "2500.50" rupees → paise. Null for anything else,
 * including zero, negatives, more than two decimals and absurd amounts.
 */
export function rupeesToPaise(input: string): bigint | null {
  const cleaned = input.trim().replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = BigInt(match[1] ?? "0");
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const paise = whole * 100n + fraction;
  return paise > 0n ? paise : null;
}

/** Paise → the rupee string a form shows back ("2500" or "2500.50"). */
export function paiseToRupeeInput(paise: bigint | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  const whole = paise / 100n;
  const fraction = paise % 100n;
  return fraction === 0n ? whole.toString() : `${whole}.${fraction.toString().padStart(2, "0")}`;
}

export interface NightRow {
  date: string;
  unitsOpen: number;
  closed: boolean;
  pricePaiseOverride: bigint | null;
}

export type NightlyQuote =
  | { ok: true; nights: { date: string; pricePaise: bigint }[]; perRoomPaise: bigint; roomsOpen: number }
  | { ok: false; reason: "not-open" | "closed" | "not-priced" | "sold-out" };

/**
 * Price and availability for one room type over a stay, from its rows.
 * Every night must have a row, be open, have at least `rooms` rooms and have a
 * price (the date's override, else the room type's rate). Anything missing is
 * a reason, never a default.
 */
export function quoteNights(nights: string[], rows: NightRow[], basePricePaise: bigint | null, rooms: number): NightlyQuote {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  let roomsOpen = Number.POSITIVE_INFINITY;
  const priced: { date: string; pricePaise: bigint }[] = [];
  for (const date of nights) {
    const row = byDate.get(date);
    if (!row) return { ok: false, reason: "not-open" };
    if (row.closed) return { ok: false, reason: "closed" };
    const price = row.pricePaiseOverride ?? basePricePaise;
    if (price === null || price <= 0n) return { ok: false, reason: "not-priced" };
    roomsOpen = Math.min(roomsOpen, row.unitsOpen);
    priced.push({ date, pricePaise: price });
  }
  if (priced.length === 0) return { ok: false, reason: "not-open" };
  if (roomsOpen < rooms) return { ok: false, reason: "sold-out" };
  const perRoomPaise = priced.reduce((sum, night) => sum + night.pricePaise, 0n);
  return { ok: true, nights: priced, perRoomPaise, roomsOpen };
}

/** "TS-7K4QX2": no 0/O or 1/I, so it survives being read down a phone line. */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function bookingCode(random: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 6; i += 1) out += CODE_ALPHABET[(random[i] ?? 0) % CODE_ALPHABET.length];
  return `TS-${out}`;
}

export function isBookingCode(value: string): boolean {
  return /^TS-[2-9A-HJ-NP-Z]{6}$/.test(value);
}

/** A hold can be paid for only while it is pending and its time has not run out. */
export function isHoldPayable(booking: { status: string; holdExpiresAt: Date | null }, now: Date): boolean {
  return booking.status === "PENDING_PAYMENT" && booking.holdExpiresAt !== null && booking.holdExpiresAt.getTime() > now.getTime();
}
