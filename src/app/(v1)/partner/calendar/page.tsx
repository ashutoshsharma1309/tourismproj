import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AvailabilityForm } from "@/components/partners/workspace/AvailabilityForm";
import { copyFor } from "@/components/partners/workspace/copy";
import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { buttonClasses } from "@/components/ui/Button";
import { availabilityForPartnerUnit, unitsForPartner } from "@/db/queries/partner-inventory";
import { cn } from "@/lib/cn";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { addDays, dayState, HORIZON_DAYS, isMonth, monthGrid, monthOf, shiftMonth, todayInKolkata } from "@/lib/partners/calendar";

export const metadata: Metadata = { title: "Calendar", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATE_CLASS = {
  past: "bg-surface-muted/40 text-subtle",
  "not-set": "border border-dashed border-border text-muted",
  closed: "bg-error-soft/60 text-error",
  full: "bg-warning-soft text-warning",
  open: "bg-success-soft text-success",
} as const;

/**
 * The availability calendar for one room type, one month at a time.
 *
 * URL-as-state (`?unit=…&month=YYYY-MM`) so the month and room type survive a
 * reload and the back button, with no client state. The unit id in the URL is
 * only a choice among the partner's OWN room types: an id that is not one of
 * them falls back to the first, and reads are scoped to the partner in SQL.
 */
export default async function PartnerCalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/calendar");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/calendar" />;
  const { partner } = access;
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const today = todayInKolkata(new Date());
  const units = await unitsForPartner(partner.id);
  const chosen = units.find((u) => u.unit.id === one(query.unit)) ?? units.find((u) => u.listingId === one(query.listing)) ?? units[0];
  const requestedMonth = one(query.month);
  const month = isMonth(requestedMonth) ? requestedMonth : monthOf(today);
  const weeks = monthGrid(month);
  const monthStart = `${month}-01`;
  const monthEnd = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const rows = chosen ? await availabilityForPartnerUnit(partner.id, chosen.unit.id, monthStart, monthEnd) : [];
  const byDay = new Map(rows.map((row) => [row.date, row]));
  const weekdays = t("calendar.weekdays").split(",");
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T00:00:00Z`));
  const hrefFor = (m: string) => `/partner/calendar?unit=${chosen?.unit.id ?? ""}&month=${m}`;

  return (
    <WorkspaceShell partner={partner} current="/partner/calendar" t={t} title={t("calendar.title")} lede={t("calendar.lede")}>
      {!chosen ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-body text-muted">{t("calendar.noListings")}</p>
          <Link href="/partner/listings" className={cn(buttonClasses({ variant: "primary", size: "sm" }), "mt-4")}>
            {t("calendar.addUnits")}
          </Link>
        </div>
      ) : (
        <>
          <form method="get" action="/partner/calendar" className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="unit" className="text-small font-medium">{t("calendar.unit")}</label>
              <select id="unit" name="unit" defaultValue={chosen.unit.id} className="max-w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none">
                {units.map(({ unit, listingName }) => (
                  <option key={unit.id} value={unit.id}>{`${listingName}: ${unit.name}`}</option>
                ))}
              </select>
            </div>
            <input type="hidden" name="month" value={month} />
            <button type="submit" className={buttonClasses({ variant: "outline", size: "md" })}>{t("calendar.show")}</button>
          </form>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section aria-labelledby="month-title" className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <Link href={hrefFor(shiftMonth(month, -1))} className={buttonClasses({ variant: "ghost", size: "icon" })} aria-label={t("calendar.prev")}>
                  <ChevronLeft className="size-5" aria-hidden />
                </Link>
                <h2 id="month-title" className="font-display text-h4" aria-live="polite">{monthLabel}</h2>
                <Link href={hrefFor(shiftMonth(month, 1))} className={buttonClasses({ variant: "ghost", size: "icon" })} aria-label={t("calendar.next")}>
                  <ChevronRight className="size-5" aria-hidden />
                </Link>
              </div>
              <table className="mt-3 w-full table-fixed border-separate border-spacing-1">
                <caption className="sr-only">{`${chosen.listingName}: ${chosen.unit.name}, ${monthLabel}`}</caption>
                <thead>
                  <tr>
                    {weekdays.map((day) => (
                      <th key={day} scope="col" className="text-caption font-medium text-subtle">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, i) => (
                    <tr key={i}>
                      {week.map((day, j) => {
                        if (!day) return <td key={j} />;
                        const row = byDay.get(day);
                        const state = dayState(day, today, row);
                        const label =
                          state === "open" ? t("calendar.openOf", { open: row?.unitsOpen ?? 0, total: chosen.unit.totalQuantity })
                          : state === "closed" ? t("calendar.closed")
                          : state === "full" ? t("calendar.full")
                          : state === "past" ? t("calendar.legendPast")
                          : t("calendar.notSet");
                        return (
                          <td key={j} className={cn("h-14 rounded-md p-1 align-top sm:h-16", STATE_CLASS[state])} data-day={day} data-state={state}>
                            <span className="sr-only">{t("calendar.dayLabel", { date: day, state: label })}</span>
                            <span aria-hidden className="block text-caption font-medium">{Number(day.slice(8))}</span>
                            {state === "open" ? (
                              <span aria-hidden className="block font-mono text-caption" data-numeric>{row?.unitsOpen}/{chosen.unit.totalQuantity}</span>
                            ) : state === "closed" ? (
                              <span aria-hidden className="block text-[0.625rem] leading-tight">{t("calendar.closed")}</span>
                            ) : null}
                            {row && (row.unitsHeld > 0 || row.unitsBooked > 0) ? (
                              <span className="block truncate text-[0.625rem] leading-tight">{t("calendar.heldBooked", { held: row.unitsHeld, booked: row.unitsBooked })}</span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted" aria-label={t("calendar.legend")}>
                <li className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", STATE_CLASS.open)} aria-hidden />{t("calendar.legendOpen")}</li>
                <li className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", STATE_CLASS.closed)} aria-hidden />{t("calendar.legendClosed")}</li>
                <li className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", STATE_CLASS.full)} aria-hidden />{t("calendar.legendFull")}</li>
                <li className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", STATE_CLASS["not-set"])} aria-hidden />{t("calendar.legendNotSet")}</li>
                <li className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", STATE_CLASS.past)} aria-hidden />{t("calendar.legendPast")}</li>
              </ul>
            </section>

            <aside>
              <AvailabilityForm
                copy={copyFor(t, ["calendar.update", "calendar.from", "calendar.to", "calendar.action", "calendar.actionOpen", "calendar.actionClose", "calendar.rooms", "calendar.price", "calendar.priceHint", "calendar.apply", "calendar.applying"])}
                unitId={chosen.unit.id}
                today={today}
                maxDay={addDays(today, HORIZON_DAYS)}
                totalQuantity={chosen.unit.totalQuantity}
              />
              <p className="mt-3 text-caption leading-relaxed text-subtle">{t("detail.notVisible")}</p>
            </aside>
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
