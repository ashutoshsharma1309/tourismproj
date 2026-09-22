import { randomUUID } from "node:crypto";

import { buttonClasses } from "@/components/ui/Button";
import { listingsWithRates, quoteForListing } from "@/db/queries/booking";
import { sweepExpiredHolds } from "@/lib/booking/holds";
import { MAX_GUESTS, MAX_ROOMS, stayProblem } from "@/lib/booking/stay";
import type { BookingT } from "@/lib/i18n/booking-messages";
import { formatINR } from "@/lib/money";
import { addDays, HORIZON_DAYS } from "@/lib/partners/calendar";

import { ReserveForm } from "./BookingForms";

export interface StayQuery {
  checkIn: string;
  checkOut: string;
  guests: number;
}

/** Read the stay from a URL: dates as given (validated later), guests clamped to 1–50. */
export function stayFromParams(params: Record<string, string | string[] | undefined>): StayQuery {
  const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim().slice(0, 10);
  const guests = Number.parseInt(one(params.guests), 10);
  return {
    checkIn: one(params.checkIn),
    checkOut: one(params.checkOut),
    guests: Number.isInteger(guests) ? Math.min(MAX_GUESTS, Math.max(1, guests)) : 2,
  };
}

/**
 * Rooms and rates on a verified listing, from its availability rows only.
 *
 * Nothing is shown that the partner has not configured: a listing without a
 * rate says booking is not set up; a room type that is closed, unpriced or
 * short of rooms on any night says which, and offers no Reserve button.
 * Expired holds are released before quoting, so an abandoned checkout never
 * makes rooms look taken.
 */
export async function BookingPanel({
  listingId,
  pagePath,
  stay,
  today,
  t,
}: {
  listingId: string;
  pagePath: string;
  stay: StayQuery;
  today: string;
  t: BookingT;
}) {
  const configured = (await listingsWithRates([listingId])).has(listingId);
  if (!configured) {
    return (
      <section id="book" aria-labelledby="book-title" className="mt-10 rounded-xl border border-border p-5">
        <h2 id="book-title" className="font-display text-h3">{t("book.title")}</h2>
        <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">{t("book.notConfigured")}</p>
      </section>
    );
  }

  const hasDates = stay.checkIn !== "" || stay.checkOut !== "";
  const problem = hasDates ? stayProblem(stay.checkIn, stay.checkOut, today) : null;
  const ready = hasDates && problem === null;
  if (ready) await sweepExpiredHolds({ listingId });
  const quotes = ready ? await quoteForListing(listingId, stay) : [];
  const nights = ready ? Math.round((Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86_400_000) : 0;
  const nightsLabel = nights === 1 ? t("search.night") : t("search.nights", { count: nights });
  const returnTo = `${pagePath}?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=${stay.guests}#book`;
  const anyOpen = quotes.some((q) => q.quote.ok);

  return (
    <section id="book" aria-labelledby="book-title" className="mt-10 rounded-xl border border-border p-5">
      <h2 id="book-title" className="font-display text-h3">{t("book.title")}</h2>
      <p className="mt-2 max-w-prose text-small leading-relaxed text-muted">{t("book.lede")}</p>

      <form method="get" action={`${pagePath}#book`} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {t("search.checkIn")}
          <input type="date" name="checkIn" required min={today} max={addDays(today, HORIZON_DAYS)} defaultValue={stay.checkIn} className="w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {t("search.checkOut")}
          <input type="date" name="checkOut" required min={addDays(today, 1)} max={addDays(today, HORIZON_DAYS)} defaultValue={stay.checkOut} className="w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
          {t("search.guests")}
          <input type="number" name="guests" min={1} max={MAX_GUESTS} defaultValue={stay.guests} className="w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none" />
        </label>
        <button type="submit" className={buttonClasses({ variant: "secondary", size: "md" })}>{t("book.update")}</button>
      </form>

      {problem ? (
        <p role="alert" className="mt-4 text-small text-error">{t(`stay.${problem}`)}</p>
      ) : !ready ? (
        <p className="mt-4 text-small text-muted">{t("book.chooseDates")}</p>
      ) : (
        <>
          {!anyOpen ? <p className="mt-4 text-small text-muted" data-testid="no-rooms">{t("book.noneOpen")}</p> : null}
          <ul className="mt-4 divide-y divide-border">
            {quotes.map((unit) => (
              <li key={unit.unitId} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between" data-unit-quote={unit.quote.ok ? "open" : unit.quote.reason}>
                <div className="min-w-0">
                  <p className="font-medium">{unit.name}</p>
                  <p className="text-caption text-subtle">{t("book.sleeps", { count: unit.capacity })}</p>
                  {unit.quote.ok ? (
                    <>
                      <p className="mt-1 text-body" data-numeric>
                        {t("book.perRoom", { amount: formatINR(unit.quote.perRoomPaise), nights: nightsLabel })}
                      </p>
                      <p className="text-caption text-muted">
                        {unit.quote.roomsOpen === 1 ? t("book.roomOpen") : t("book.roomsOpen", { count: unit.quote.roomsOpen })}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-small text-muted">{t(`book.reason.${unit.quote.reason}`)}</p>
                  )}
                </div>
                {unit.quote.ok ? (
                  <ReserveForm
                    unitId={unit.unitId}
                    unitName={unit.name}
                    checkIn={stay.checkIn}
                    checkOut={stay.checkOut}
                    guests={stay.guests}
                    roomOptions={Array.from(
                      { length: Math.max(0, Math.min(unit.quote.roomsOpen, MAX_ROOMS) - unit.roomsNeeded + 1) },
                      (_, i) => unit.roomsNeeded + i,
                    )}
                    idempotencyKey={randomUUID()}
                    returnTo={returnTo}
                    labels={{ rooms: t("book.rooms"), reserve: t("book.reserve"), reserving: t("book.reserving"), note: t("book.holdNote") }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
