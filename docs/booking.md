# Booking — Phase 2

Search → listing → rooms and rates → hold → checkout. No payment yet.

## What travellers can do

| Route | What |
|---|---|
| `/search` | Verified stays by destination, kind, guests, amenities (only those listings publish) and dates. With dates, only listings with a room type open, priced and large enough on every night appear, with the real total for the stay. Without dates nothing is priced. |
| `/destinations/[d]/partner-stays/[id]` | The existing listing page gains **Rooms and rates**: choose dates and guests, see each room type's real total or why it can't be booked, and reserve. House information (check-in, rules, cancellation terms) appears when the partner gave it. No photographs are shown because none exist. |
| `/checkout/[code]` | The hold: stay, nightly breakdown, total, countdown, contact telephone, release. Payment is a disabled button in a marked **Test state**. |
| `GET /api/cron/release-holds` | Housekeeping sweep, `Authorization: Bearer $CRON_SECRET`; 503 without the secret configured. |

Signed-out visitors who press Reserve are sent to sign in and back to the same stay with their dates. Checkout requires sign-in, and another traveller's code is a 404.

## Where prices come from

Only partners set them, in rupees typed into the workspace and parsed as a
string to integer paise:

- `listing_units.base_price_paise` is the room type's nightly rate. Without one the room type cannot be booked.
- `availability.price_paise_override` is a rate for specific dates, set from the calendar.

No taxes or fees are added: no partner configures one yet, and checkout says so. The platform's share on a booking item comes only from an ACTIVE signed commission agreement and is otherwise zero. It is internal and is never shown to the traveller.

## The hold engine (`src/lib/booking/engine.ts`)

One transaction per hold:

1. The same `(user, idempotency key)` returns the existing booking. The key is generated per reservation form render, and a parallel duplicate that loses on the unique index gets the winner's booking.
2. Expired holds on that room type are released first.
3. The listing, vendor and room type are read `FOR SHARE`. The listing must be PUBLISHED and the vendor VERIFIED or APPROVED.
4. The stay's availability rows are locked `FOR UPDATE`, ordered by date.
5. Every night is re-checked against the locked rows: a row exists, it is not closed, it has a price and there are enough open rooms. Anything missing refuses the hold with a reason.
6. `units_open -= rooms` and `units_held += rooms`. The booking is written as `PENDING_PAYMENT` with a 10-minute expiry, the item freezes each night's price, and an audit row is written.

Rules the engine enforces:

- **Validation:** stays are 1–30 nights, arriving today (India time) or later and within the calendar horizon; 1–10 rooms and 1–50 guests, with guests ≤ rooms × capacity.
- **Expiry:** runs `FOR UPDATE SKIP LOCKED`, restores held rooms, and never reopens a date the partner closed in the meantime.
- **When it runs:** before every hold, on search with dates, on the listing's rooms panel, on checkout, and from the cron route. An expired hold is never payable (`isHoldPayable`).
- **Cancelling:** only the owner can release, and releasing twice is a no-op.

Database constraints under the engine (`drizzle/sql/0003_booking_holds.sql`):

- Counters are never negative and never exceed the room count (from 0002).
- A closed date offers no rooms.
- A rate is never zero.
- A pending booking always has an expiry.
- Fee plus payout always equals the subtotal.
- End date is after start date.
- One booking per user and idempotency key.

## Tests (`pnpm qa:booking`)

- **A:** stay, quantity, rupee parsing, quotes and booking-code rules.
- **B:** code guarantees:
  - Ordered row locks and `SKIP LOCKED` sweeps.
  - Nothing in the booking path sets CONFIRMED.
  - No float arithmetic on money.
  - The sweep route requires its secret.
- **C:** the engine against Postgres:
  - A hold succeeds with exact paise.
  - The idempotency key holds, including three parallel submissions of one key.
  - Six parallel holds for the last room produce exactly one success; two parallel two-room holds produce one.
  - Closed, unpriced, unopened, sold-out and over-capacity stays are refused, as are stays at unpublished listings or suspended vendors.
  - Invalid dates and quantities are rejected.
  - Expiry and a repeated sweep behave correctly, and closed dates stay closed.
  - Only the owner can cancel, and cancelling is idempotent.
  - Expired holds are reclaimed without waiting for a sweep.
  - The database constraints hold.
- **D:** the browser flow:
  - Search filters and the listing panel work.
  - An anonymous Reserve goes to sign-in and back.
  - Checkout shows stored totals, the test state and the countdown, and a reload creates no second hold.
  - The contact telephone saves.
  - Another traveller gets 404.
  - Release and expiry show the right state.
  - The sweep route refuses without its secret and runs with it.
  - Pages fit 375, 390, 768 and 1440 px.

## Not in Phase 2

- **Payment and confirmation (Phase 3).** Nothing moves rooms to `units_booked`.
- **A traveller's list of their holds.** The checkout link is where the flow lands, but no account page lists holds.
- **Translation.** Search, booking and checkout copy is English, with a partial Hindi catalogue and English fallback.
- **Search scale.** Quotes are computed per listing per request, which suits the current handful of listings but not thousands.
- **Scheduled sweep.** No Vercel cron is configured. Correctness does not depend on it, because every read that matters sweeps first.
