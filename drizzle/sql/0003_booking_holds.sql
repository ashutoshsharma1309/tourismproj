-- Phase 2: prices, closed dates and holds.
--
-- Rates are what a partner enters, in paise; a room type without one cannot
-- be booked. A hold moves rooms from `units_open` to `units_held` inside a
-- transaction that locks the availability rows (lib/booking/engine.ts); these
-- constraints are the floor under that code. Idempotent; apply after 0002.

ALTER TABLE listing_units ADD COLUMN IF NOT EXISTS base_price_paise bigint;
ALTER TABLE listing_units DROP CONSTRAINT IF EXISTS listing_units_price_positive;
ALTER TABLE listing_units ADD CONSTRAINT listing_units_price_positive
  CHECK (base_price_paise IS NULL OR base_price_paise > 0);

ALTER TABLE availability ADD COLUMN IF NOT EXISTS closed boolean NOT NULL DEFAULT false;
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_price_positive;
ALTER TABLE availability ADD CONSTRAINT availability_price_positive
  CHECK (price_paise_override IS NULL OR price_paise_override > 0);
-- A closed date offers nothing, whatever else is written to it.
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_closed_offers_nothing;
ALTER TABLE availability ADD CONSTRAINT availability_closed_offers_nothing
  CHECK (NOT closed OR units_open = 0);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_idempotency_unique;
ALTER TABLE bookings ADD CONSTRAINT bookings_user_idempotency_unique UNIQUE (user_id, idempotency_key);
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_total_non_negative;
ALTER TABLE bookings ADD CONSTRAINT bookings_total_non_negative CHECK (total_paise >= 0);
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_guests_positive;
ALTER TABLE bookings ADD CONSTRAINT bookings_guests_positive CHECK (guest_count >= 1);
-- A pending booking always says when its hold ends.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_pending_has_expiry;
ALTER TABLE bookings ADD CONSTRAINT bookings_pending_has_expiry
  CHECK (status <> 'PENDING_PAYMENT' OR hold_expires_at IS NOT NULL);

ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS nightly_prices jsonb;
ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_dates_ordered;
ALTER TABLE booking_items ADD CONSTRAINT booking_items_dates_ordered CHECK (end_date > start_date);
ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_qty_positive;
ALTER TABLE booking_items ADD CONSTRAINT booking_items_qty_positive CHECK (qty >= 1);
ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_money_consistent;
ALTER TABLE booking_items ADD CONSTRAINT booking_items_money_consistent
  CHECK (subtotal_paise >= 0 AND platform_fee_paise >= 0 AND vendor_payout_paise >= 0
         AND platform_fee_paise + vendor_payout_paise = subtotal_paise);

CREATE INDEX IF NOT EXISTS booking_items_unit_dates_idx ON booking_items (listing_unit_id, start_date, end_date);
