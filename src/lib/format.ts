/**
 * Display formatting. Kept out of components so every price, duration and date
 * in the product reads the same way.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Indian short scale, computed rather than delegated to Intl.
 *
 * `notation: "compact"` is NOT portable: Node's ICU emits "₹5.0K" where
 * Chrome's emits "₹5K" for the same input and locale. Rendering that on a
 * server component and hydrating it in the browser produced a React #418
 * text mismatch on /planner, which threw away the client tree on every visit.
 * Doing the arithmetic here makes the string identical in both runtimes.
 */
const CompactUnits = [
  { limit: 10_000_000, suffix: "Cr" },
  { limit: 100_000, suffix: "L" },
  { limit: 1_000, suffix: "K" },
] as const;

/** ₹27,500 */
export function formatPrice(amount: number): string {
  return inr.format(amount);
}

/** ₹27.5K — for dense surfaces such as map pins and compact cards. */
export function formatPriceCompact(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const value = Math.abs(amount);
  for (const { limit, suffix } of CompactUnits) {
    if (value >= limit) {
      const scaled = value / limit;
      // One decimal, but never a trailing ".0" — ₹5K, not ₹5.0K.
      const text = scaled.toFixed(1).replace(/\.0$/, "");
      return `${sign}₹${text}${suffix}`;
    }
  }
  return `${sign}₹${value}`;
}

/** 90 -> "1h 30m", 45 -> "45m", 120 -> "2h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "2026-03-14" -> "14 Mar 2026" */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "14 – 18 Mar 2026", collapsing the month and year when they match. */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} – ${endIso}`;
  }
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startPart = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
  }).format(start);
  return `${startPart} – ${formatDate(endIso)}`;
}

/** Adds days to an ISO date and returns an ISO date. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 4.75 -> "4.8" — ratings always show one decimal so cards stay aligned. */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** 1240 -> "1.2k" for review counts. */
export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** 28.6129, 77.2295 -> "28.6129° N, 77.2295° E" */
export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

/** 2147892 -> "21,47,892" — Indian grouping for headline counters. */
export function formatStatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

/**
 * 125000000 -> "₹12.5 Cr", 350000 -> "₹3.5 L".
 * Hand-rolled rather than Intl compact notation so lakh/crore labels are
 * identical across ICU versions.
 */
export function formatCurrencyCompact(amount: number): string {
  const scaled = (value: number) => value.toFixed(1).replace(/\.0$/, "");
  if (amount >= 1_00_00_000) return `₹${scaled(amount / 1_00_00_000)} Cr`;
  if (amount >= 1_00_000) return `₹${scaled(amount / 1_00_000)} L`;
  return formatPrice(amount);
}

/** "09:30" -> "9:30 AM" */
export function formatTime(time24: string): string {
  const [hourPart, minutePart] = time24.split(":");
  const hour = Number(hourPart);
  if (Number.isNaN(hour)) return time24;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minutePart ?? "00"} ${suffix}`;
}
