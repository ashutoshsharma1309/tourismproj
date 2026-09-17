-- Partner inventory: one supply model instead of two.
--
-- The partner programme (partners, partner_properties) and the commerce
-- schema (vendors, listings) described the same hotels twice. Only the first
-- has ownership, verification, review and an audit trail, and only the first
-- can belong to a registry destination such as "jaipur". So units,
-- availability, booking items, payouts, reviews, trip stops and vendor
-- documents now reference it, and `vendors` / `listings` are retired.
--
-- ADDITIVE AGAINST WHAT IS READ. Every foreign key moved here sat on an empty
-- table that no deployed code reads. `vendors` and `listings` themselves are
-- NOT dropped: the build already deployed on this database still counts them.
--
-- Apply after `pnpm db:push` and 0001_constraints.sql. Idempotent.

-- ------------------------------------------------------------ new columns
ALTER TABLE partners ADD COLUMN IF NOT EXISTS vendor_type vendor_type NOT NULL DEFAULT 'STAY';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS registration_info text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS verification_note text;
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_verified_by_users_id_fk;
ALTER TABLE partners ADD CONSTRAINT partners_verified_by_users_id_fk
  FOREIGN KEY (verified_by) REFERENCES users(id);

ALTER TABLE partner_properties ADD COLUMN IF NOT EXISTS check_in_from text;
ALTER TABLE partner_properties ADD COLUMN IF NOT EXISTS check_out_by text;
ALTER TABLE partner_properties ADD COLUMN IF NOT EXISTS house_rules text;
ALTER TABLE partner_properties ADD COLUMN IF NOT EXISTS cancellation_terms text;

ALTER TABLE listing_units ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE listing_units ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE availability ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS size_bytes integer;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_uploaded_by_users_id_fk;
ALTER TABLE vendor_documents ADD CONSTRAINT vendor_documents_uploaded_by_users_id_fk
  FOREIGN KEY (uploaded_by) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS vendor_documents_vendor_idx ON vendor_documents (vendor_id);

-- --------------------------------------------------- foreign keys, moved
ALTER TABLE listing_units DROP CONSTRAINT IF EXISTS listing_units_listing_id_listings_id_fk;
ALTER TABLE listing_units DROP CONSTRAINT IF EXISTS listing_units_listing_id_partner_properties_id_fk;
ALTER TABLE listing_units ADD CONSTRAINT listing_units_listing_id_partner_properties_id_fk
  FOREIGN KEY (listing_id) REFERENCES partner_properties(id) ON DELETE CASCADE;

ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_listing_id_listings_id_fk;
ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_listing_id_partner_properties_id_fk;
ALTER TABLE booking_items ADD CONSTRAINT booking_items_listing_id_partner_properties_id_fk
  FOREIGN KEY (listing_id) REFERENCES partner_properties(id);
ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_vendor_id_vendors_id_fk;
ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_vendor_id_partners_id_fk;
ALTER TABLE booking_items ADD CONSTRAINT booking_items_vendor_id_partners_id_fk
  FOREIGN KEY (vendor_id) REFERENCES partners(id);

ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_vendor_id_vendors_id_fk;
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_vendor_id_partners_id_fk;
ALTER TABLE payouts ADD CONSTRAINT payouts_vendor_id_partners_id_fk
  FOREIGN KEY (vendor_id) REFERENCES partners(id);

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_listings_id_fk;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_partner_properties_id_fk;
ALTER TABLE reviews ADD CONSTRAINT reviews_listing_id_partner_properties_id_fk
  FOREIGN KEY (listing_id) REFERENCES partner_properties(id) ON DELETE CASCADE;

ALTER TABLE trip_stops DROP CONSTRAINT IF EXISTS trip_stops_listing_id_listings_id_fk;
ALTER TABLE trip_stops DROP CONSTRAINT IF EXISTS trip_stops_listing_id_partner_properties_id_fk;
ALTER TABLE trip_stops ADD CONSTRAINT trip_stops_listing_id_partner_properties_id_fk
  FOREIGN KEY (listing_id) REFERENCES partner_properties(id) ON DELETE SET NULL;

ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_vendor_id_vendors_id_fk;
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_vendor_id_partners_id_fk;
ALTER TABLE vendor_documents ADD CONSTRAINT vendor_documents_vendor_id_partners_id_fk
  FOREIGN KEY (vendor_id) REFERENCES partners(id) ON DELETE CASCADE;

-- --------------------------------------------------------- unit sanity
ALTER TABLE listing_units DROP CONSTRAINT IF EXISTS listing_units_listing_name_unique;
ALTER TABLE listing_units ADD CONSTRAINT listing_units_listing_name_unique UNIQUE (listing_id, name);
ALTER TABLE listing_units DROP CONSTRAINT IF EXISTS listing_units_capacity_range;
ALTER TABLE listing_units ADD CONSTRAINT listing_units_capacity_range CHECK (capacity BETWEEN 1 AND 50);
ALTER TABLE listing_units DROP CONSTRAINT IF EXISTS listing_units_quantity_range;
ALTER TABLE listing_units ADD CONSTRAINT listing_units_quantity_range CHECK (total_quantity BETWEEN 1 AND 500);

-- ------------------------------------- an unverified vendor cannot publish
-- CLAUDE.md §11: enforce in the database, not just in the UI. A CHECK cannot
-- read another table, so this is a trigger on the row where publication
-- happens. "Verified" is the vendor's own status — VERIFIED or APPROVED —
-- not the property's: a new listing from a suspended vendor stays dark.

CREATE OR REPLACE FUNCTION assert_partner_verified_for_published_property()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' THEN
    IF NOT EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = NEW.partner_id AND p.status IN ('VERIFIED', 'APPROVED')
    ) THEN
      RAISE EXCEPTION
        'partner property % cannot be PUBLISHED: its vendor is not verified', NEW.id
        USING ERRCODE = 'check_violation', CONSTRAINT = 'partner_properties_vendor_verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partner_properties_require_verified_vendor ON partner_properties;
CREATE TRIGGER partner_properties_require_verified_vendor
  BEFORE INSERT OR UPDATE OF status, partner_id ON partner_properties
  FOR EACH ROW EXECUTE FUNCTION assert_partner_verified_for_published_property();

-- A vendor losing verification must not leave published listings behind.
CREATE OR REPLACE FUNCTION unpublish_properties_on_deverification()
RETURNS trigger AS $$
BEGIN
  IF NEW.status NOT IN ('VERIFIED', 'APPROVED') AND OLD.status IN ('VERIFIED', 'APPROVED') THEN
    UPDATE partner_properties
      SET status = 'UNPUBLISHED', updated_at = now()
      WHERE partner_id = NEW.id AND status = 'PUBLISHED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partners_unpublish_on_deverification ON partners;
CREATE TRIGGER partners_unpublish_on_deverification
  AFTER UPDATE OF status ON partners
  FOR EACH ROW EXECUTE FUNCTION unpublish_properties_on_deverification();

-- ---------------------------------- inventory never exceeds the unit itself
-- 0001 keeps each counter non-negative; this keeps their sum within what the
-- unit physically has. Checked on the availability row, and again when a
-- unit's quantity is lowered beneath rooms already held or booked.

CREATE OR REPLACE FUNCTION assert_availability_within_quantity()
RETURNS trigger AS $$
DECLARE
  total integer;
BEGIN
  SELECT total_quantity INTO total FROM listing_units WHERE id = NEW.listing_unit_id;
  IF NEW.units_open + NEW.units_held + NEW.units_booked > total THEN
    RAISE EXCEPTION
      'availability for unit % on % exceeds its quantity of %', NEW.listing_unit_id, NEW.date, total
      USING ERRCODE = 'check_violation', CONSTRAINT = 'availability_within_quantity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS availability_within_quantity ON availability;
CREATE TRIGGER availability_within_quantity
  BEFORE INSERT OR UPDATE OF units_open, units_held, units_booked, listing_unit_id ON availability
  FOR EACH ROW EXECUTE FUNCTION assert_availability_within_quantity();

CREATE OR REPLACE FUNCTION assert_quantity_covers_commitments()
RETURNS trigger AS $$
BEGIN
  IF NEW.total_quantity < OLD.total_quantity AND EXISTS (
    SELECT 1 FROM availability a
    WHERE a.listing_unit_id = NEW.id
      AND a.units_held + a.units_booked > NEW.total_quantity
  ) THEN
    RAISE EXCEPTION
      'unit % cannot drop to % rooms: more are already held or booked on some date', NEW.id, NEW.total_quantity
      USING ERRCODE = 'check_violation', CONSTRAINT = 'listing_units_quantity_covers_commitments';
  END IF;
  /* Open rooms beyond the new quantity are trimmed rather than refused: they
     were offered, not sold. */
  IF NEW.total_quantity < OLD.total_quantity THEN
    UPDATE availability
      SET units_open = GREATEST(0, NEW.total_quantity - units_held - units_booked), updated_at = now()
      WHERE listing_unit_id = NEW.id
        AND units_open + units_held + units_booked > NEW.total_quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listing_units_quantity_covers_commitments ON listing_units;
CREATE TRIGGER listing_units_quantity_covers_commitments
  AFTER UPDATE OF total_quantity ON listing_units
  FOR EACH ROW EXECUTE FUNCTION assert_quantity_covers_commitments();
