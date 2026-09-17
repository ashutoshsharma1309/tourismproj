/** Dates on account pages, always in India time (CLAUDE.md §5). */
const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function formatDate(value: Date | string): string {
  return DATE.format(typeof value === "string" ? new Date(value) : value);
}

/** "today", "yesterday", "3 days ago", else the date. `now` is passed in, never read during a client render. */
export function whenExplored(value: Date, now: Date): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  const days = Math.round((Date.parse(day(now)) - Date.parse(day(value))) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}
