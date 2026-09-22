import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactForm, HoldCountdown, ReleaseHoldForm } from "@/components/booking/BookingForms";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { checkoutFor } from "@/db/queries/booking";
import { requireTraveller } from "@/lib/auth/session";
import { sweepExpiredHolds } from "@/lib/booking/holds";
import { isBookingCode, isHoldPayable } from "@/lib/booking/stay";
import { getDestination } from "@/lib/destinations/registry";
import { bookingTranslator } from "@/lib/i18n/booking-messages";
import { requestLanguage } from "@/lib/i18n/request";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const timeInIndia = (at: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${day}T00:00:00Z`));

/**
 * Checkout preparation for one hold.
 *
 * Only the traveller who made the hold sees it; any other code answers 404.
 * The figures are the ones frozen into the booking when the rooms were held
 * — nightly prices as the partner set them, times rooms — with no tax or fee
 * line, because no partner configures one yet. A hold whose time is up is
 * released here before anything is shown, and is never offered for payment.
 *
 * Payment is not connected (Phase 3). The page says so plainly, in a marked
 * test state, and the pay button is disabled: nothing on this page can
 * produce a confirmed booking.
 */
export default async function CheckoutPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await requireTraveller(`/checkout/${code}`);
  if (!isBookingCode(code)) notFound();
  const t = bookingTranslator(await requestLanguage());

  let view = await checkoutFor(code, session.id);
  if (!view) notFound();
  const now = new Date();
  if (view.booking.status === "PENDING_PAYMENT" && !isHoldPayable(view.booking, now)) {
    await sweepExpiredHolds({ listingId: view.listing.id });
    view = await checkoutFor(code, session.id);
    if (!view) notFound();
  }
  const { booking, item, listing, unitName } = view;
  const destination = getDestination(listing.destinationId);
  const stayHref = `/destinations/${listing.destinationId}/partner-stays/${listing.id}?checkIn=${item.startDate}&checkOut=${item.endDate}&guests=${booking.guestCount}#book`;
  const payable = isHoldPayable(booking, now);
  const nightly = item.nightlyPrices ?? [];
  const nights = nightly.length;
  const nightsLabel = nights === 1 ? t("search.night") : t("search.nights", { count: nights });

  return (
    <>
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pt-28 pb-20 md:px-6">
        <p className="text-small text-muted">{t("checkout.code", { code: booking.code })}</p>
        <h1 className="mt-1 font-display text-h1 text-balance-heading">{t("checkout.title")}</h1>

        {payable ? (
          <section className="mt-6 rounded-xl border border-border bg-surface p-5" aria-labelledby="hold">
            <h2 id="hold" className="font-display text-h4">{t("checkout.held")}</h2>
            <p className="mt-1 text-small text-muted">{t("checkout.heldUntil", { time: timeInIndia(booking.holdExpiresAt ?? now) })}</p>
            <div className="mt-2">
              <HoldCountdown expiresAt={(booking.holdExpiresAt ?? now).toISOString()} label={t("checkout.remaining")} />
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-border bg-surface-muted/40 p-5" aria-labelledby="hold" data-hold-state={booking.status}>
            <h2 id="hold" className="font-display text-h4">
              {booking.status === "CANCELLED" ? t("checkout.cancelledTitle") : t("checkout.expiredTitle")}
            </h2>
            <p className="mt-1 max-w-prose text-small leading-relaxed text-muted">
              {booking.status === "CANCELLED" ? t("checkout.cancelledBody") : t("checkout.expiredBody")}
            </p>
            <Link href={stayHref} className={`${buttonClasses({ variant: "primary", size: "sm" })} mt-4`}>{t("checkout.backToStay")}</Link>
          </section>
        )}

        <section className="mt-8" aria-labelledby="stay">
          <h2 id="stay" className="font-display text-h3">{t("checkout.stay")}</h2>
          <dl className="mt-3 grid gap-4 rounded-xl border border-border p-5 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-caption text-subtle">{t("checkout.property")}</dt>
              <dd className="mt-0.5 text-small">
                <Link href={stayHref} className="font-medium text-primary hover:underline">{listing.name}</Link>
                {destination ? `, ${destination.name}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">{t("checkout.roomType")}</dt>
              <dd className="mt-0.5 text-small">{unitName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-caption text-subtle">{t("checkout.dates")}</dt>
              <dd className="mt-0.5 text-small">{t("checkout.datesValue", { checkIn: dayLabel(item.startDate), checkOut: dayLabel(item.endDate), nights: nightsLabel })}</dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">{t("checkout.guests")}</dt>
              <dd className="mt-0.5 font-mono text-small" data-numeric>{booking.guestCount}</dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">{t("checkout.rooms")}</dt>
              <dd className="mt-0.5 font-mono text-small" data-numeric>{item.qty}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8" aria-labelledby="breakdown">
          <h2 id="breakdown" className="font-display text-h3">{t("checkout.breakdown")}</h2>
          <table className="mt-3 w-full text-small">
            <caption className="sr-only">{t("checkout.breakdown")}</caption>
            <tbody>
              {nightly.map((night) => (
                <tr key={night.date} className="border-b border-border">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">{t("checkout.night", { date: dayLabel(night.date) })}</th>
                  <td className="py-2 text-right font-mono" data-numeric>
                    {t("checkout.nightLine", { rooms: item.qty, price: formatINR(BigInt(night.pricePaise)) })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-3 text-left font-display text-h4">{t("checkout.total")}</th>
                <td className="pt-3 text-right font-mono text-h4" data-numeric data-total-paise={booking.totalPaise.toString()}>
                  {formatINR(booking.totalPaise)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-caption text-subtle">{t("checkout.noExtras")}</p>
        </section>

        {payable ? (
          <>
            <section className="mt-8" aria-labelledby="contact">
              <ContactForm code={booking.code} phone={booking.contactPhone ?? ""} labels={{ contact: t("checkout.contact"), hint: t("checkout.contactHint"), save: t("checkout.saveContact") }} />
            </section>

            <section className="mt-8 rounded-xl border-2 border-dashed border-warning p-5" aria-labelledby="payment" data-payment-state="not-connected">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="payment" className="font-display text-h4">{t("checkout.payment")}</h2>
                <Badge tone="warning">{t("checkout.testState")}</Badge>
              </div>
              <p className="mt-2 max-w-prose text-small leading-relaxed text-muted">{t("checkout.paymentNotConnected")}</p>
              <div className="mt-4 flex flex-wrap items-start gap-3">
                <button type="button" disabled aria-disabled="true" className={buttonClasses({ variant: "primary", size: "md" })}>
                  {t("checkout.payDisabled", { amount: formatINR(booking.totalPaise) })}
                </button>
                <ReleaseHoldForm code={booking.code} labels={{ release: t("checkout.release"), releasing: t("checkout.releasing") }} />
              </div>
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
