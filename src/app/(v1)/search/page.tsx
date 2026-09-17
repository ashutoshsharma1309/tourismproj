import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { stayFromParams } from "@/components/booking/BookingPanel";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { amenityOptions, listingsWithRates, quoteForListing, validListings } from "@/db/queries/booking";
import { sweepExpiredHolds } from "@/lib/booking/holds";
import { MAX_GUESTS, stayProblem } from "@/lib/booking/stay";
import { getDestination, isKnownDestination, listDestinations } from "@/lib/destinations/registry";
import { bookingTranslator } from "@/lib/i18n/booking-messages";
import { requestLanguage } from "@/lib/i18n/request";
import { formatINR } from "@/lib/money";
import { addDays, HORIZON_DAYS, todayInKolkata } from "@/lib/partners/calendar";
import { ACCOMMODATION_LABEL, ACCOMMODATION_TYPES } from "@/lib/partners/schema";

export const metadata: Metadata = {
  title: "Find a verified stay",
  description: "Search stays run by verified TerraStory partners, with rooms and rates set by the properties themselves.",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const control = "w-full rounded-lg border bg-surface px-3 py-2.5 text-small focus:border-primary focus:outline-none";

/**
 * Search across verified partner stays.
 *
 * URL-as-state, no client JavaScript. Results are VALID listings only —
 * published, vendor still verified — filtered by destination, kind and the
 * amenities listings actually publish. With dates, a listing appears only if
 * at least one room type is open, priced and large enough for the party on
 * every night, and its figure is the real total for that stay. Without dates
 * nothing is priced: a rate without dates would be a promise nobody checked.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = bookingTranslator(await requestLanguage());
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
  const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).map((a) => a.trim().toLowerCase()).filter(Boolean).slice(0, 8);

  const today = todayInKolkata(new Date());
  const destinationId = isKnownDestination(one(params.destination)) ? one(params.destination) : "";
  const type = (ACCOMMODATION_TYPES as readonly string[]).includes(one(params.type)) ? one(params.type) : "";
  const stay = stayFromParams(params);
  const hasDates = stay.checkIn !== "" || stay.checkOut !== "";
  const problem = hasDates ? stayProblem(stay.checkIn, stay.checkOut, today) : null;
  const dated = hasDates && problem === null;

  const options = await amenityOptions(destinationId || undefined);
  const amenities = many(params.amenity).filter((a) => options.includes(a));
  const listings = await validListings({ destinationId: destinationId || undefined, type: type || undefined, amenities });
  const withRates = await listingsWithRates(listings.map((l) => l.id));

  if (dated && listings.length > 0) await sweepExpiredHolds();
  const results = await Promise.all(
    listings.map(async (listing) => {
      if (!dated || !withRates.has(listing.id)) return { listing, lowest: null as bigint | null };
      const quotes = await quoteForListing(listing.id, stay);
      const totals = quotes.flatMap((q) => (q.quote.ok ? [q.quote.perRoomPaise * BigInt(q.roomsNeeded)] : []));
      const lowest = totals.length ? totals.reduce((min, v) => (v < min ? v : min)) : null;
      return { listing, lowest };
    }),
  );
  const shown = dated ? results.filter((r) => r.lowest !== null) : results;
  const hidden = results.length - shown.length;
  const query = dated ? `?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=${stay.guests}` : "";

  return (
    <>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <h1 className="font-display text-h1 text-balance-heading">{t("search.title")}</h1>
        <p className="mt-3 max-w-2xl text-body leading-relaxed text-muted">{t("search.lede")}</p>

        <form method="get" action="/search" className="mt-8 rounded-xl border border-border bg-surface p-4 sm:p-5" role="search">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_6rem_1.2fr]">
            <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
              {t("search.destination")}
              <select name="destination" defaultValue={destinationId} className={control}>
                <option value="">{t("search.anyDestination")}</option>
                {listDestinations().map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
              {t("search.checkIn")}
              <input type="date" name="checkIn" min={today} max={addDays(today, HORIZON_DAYS)} defaultValue={stay.checkIn} className={control} />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
              {t("search.checkOut")}
              <input type="date" name="checkOut" min={addDays(today, 1)} max={addDays(today, HORIZON_DAYS)} defaultValue={stay.checkOut} className={control} />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
              {t("search.guests")}
              <input type="number" name="guests" min={1} max={MAX_GUESTS} defaultValue={stay.guests} className={control} />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-small font-medium">
              {t("search.type")}
              <select name="type" defaultValue={type} className={control}>
                <option value="">{t("search.anyType")}</option>
                {ACCOMMODATION_TYPES.map((k) => (
                  <option key={k} value={k}>{ACCOMMODATION_LABEL[k]}</option>
                ))}
              </select>
            </label>
          </div>
          {options.length > 0 ? (
            <fieldset className="mt-4">
              <legend className="text-small font-medium">{t("search.amenities")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.map((option) => (
                  <label key={option} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-small">
                    <input type="checkbox" name="amenity" value={option} defaultChecked={amenities.includes(option)} className="size-4 accent-primary" />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className={buttonClasses({ variant: "primary", size: "md" })}>{t("search.submit")}</button>
            <Link href="/search" className="text-small font-medium text-primary hover:underline">{t("search.clear")}</Link>
          </div>
        </form>

        {problem ? <p role="alert" className="mt-4 text-small text-error">{t(`stay.${problem}`)}</p> : null}

        <section className="mt-8" aria-labelledby="results" aria-live="polite">
          <h2 id="results" className="font-display text-h3">
            {shown.length === 1 ? t("search.resultsOne") : t("search.results", { count: shown.length })}
          </h2>
          {!dated ? <p className="mt-1 text-small text-muted">{t("search.chooseDates")}</p> : null}
          {shown.length === 0 ? (
            <p className="mt-4 max-w-prose text-body text-muted" data-testid="search-empty">{dated ? t("search.emptyDates") : t("search.empty")}</p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {shown.map(({ listing, lowest }) => {
                const destination = getDestination(listing.destinationId);
                const href = `/destinations/${listing.destinationId}/partner-stays/${listing.id}${query}${dated ? "#book" : ""}`;
                return (
                  <li key={listing.id} className="flex flex-col rounded-xl border border-border bg-surface p-5" data-listing={listing.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="success">
                        <ShieldCheck className="size-3" aria-hidden />
                        {t("search.verified")}
                      </Badge>
                      <span className="text-caption text-subtle">{ACCOMMODATION_LABEL[listing.type]}</span>
                    </div>
                    <h3 className="mt-2 font-display text-h4">{listing.name}</h3>
                    <p className="text-small text-muted">
                      {[listing.area, destination?.name ?? listing.destinationId].filter(Boolean).join(", ")}
                    </p>
                    {listing.amenities && listing.amenities.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-caption text-subtle">{listing.amenities.join(", ")}</p>
                    ) : null}
                    <p className="mt-3 text-small" data-numeric>
                      {lowest !== null
                        ? t("search.availableFrom", { amount: formatINR(lowest) })
                        : withRates.has(listing.id)
                          ? t("search.bookable")
                          : t("search.notBookable")}
                    </p>
                    <div className="mt-auto pt-4">
                      <Link href={href} className={buttonClasses({ variant: "outline", size: "sm" })}>
                        {t("search.view")}
                        <span className="sr-only">: {listing.name}</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {dated && hidden > 0 ? <p className="mt-4 text-small text-muted">{t("search.hiddenUnavailable", { count: hidden })}</p> : null}
        </section>
      </main>
      <Footer />
    </>
  );
}
