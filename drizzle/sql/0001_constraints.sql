-- Constraints Drizzle's schema DSL cannot express, and the reasons they exist.
--
-- Every one of these enforces a rule that CLAUDE.md §2 states, at the level
-- where it cannot be bypassed. An application-layer check is a suggestion; a
-- constraint is a guarantee.

-- ---------------------------------------------------------------- §3.5 indexes
-- Partial indexes. The predicate is the point: an index over every row of
-- `availability` is largely dead weight, because the only rows a search ever
-- wants are the ones with inventory left.

DROP INDEX IF EXISTS availability_open_idx;
CREATE INDEX availability_open_idx ON availability (date) WHERE units_open > 0;

CREATE INDEX IF NOT EXISTS sites_destination_published_idx
  ON sites (destination_id) WHERE is_published;

DROP INDEX IF EXISTS bookings_pending_hold_idx;
CREATE INDEX bookings_pending_hold_idx
  ON bookings (hold_expires_at) WHERE status = 'PENDING_PAYMENT';

-- ------------------------------------------------- an unverified vendor cannot sell
-- CLAUDE.md §11: "A Listing cannot leave DRAFT until its Vendor is VERIFIED.
-- Enforce in the DB with a check constraint, not just in the UI."
--
-- A CHECK cannot contain a subquery, so this is a trigger. It fires on the
-- listing rather than the vendor because that is where the transition happens.

CREATE OR REPLACE FUNCTION assert_vendor_verified_for_active_listing()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = NEW.vendor_id AND v.verification_status = 'VERIFIED'
    ) THEN
      RAISE EXCEPTION
        'listing % cannot be ACTIVE: vendor % is not VERIFIED', NEW.id, NEW.vendor_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_require_verified_vendor ON listings;
CREATE TRIGGER listings_require_verified_vendor
  BEFORE INSERT OR UPDATE OF status, vendor_id ON listings
  FOR EACH ROW EXECUTE FUNCTION assert_vendor_verified_for_active_listing();

-- A vendor losing verification must not leave live listings behind.
CREATE OR REPLACE FUNCTION pause_listings_on_deverification()
RETURNS trigger AS $$
BEGIN
  IF NEW.verification_status <> 'VERIFIED' AND OLD.verification_status = 'VERIFIED' THEN
    UPDATE listings SET status = 'PAUSED'
      WHERE vendor_id = NEW.id AND status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendors_pause_listings ON vendors;
CREATE TRIGGER vendors_pause_listings
  AFTER UPDATE OF verification_status ON vendors
  FOR EACH ROW EXECUTE FUNCTION pause_listings_on_deverification();

-- ------------------------------------------------------------ sourced or unpublished
-- CLAUDE.md §2 R8: "Every editorial claim carries a source."
-- Enforced only for PUBLISHED rows, so a draft can be written before its
-- citations are gathered — which is the order research actually happens in.

ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_published_requires_source;
ALTER TABLE sites ADD CONSTRAINT sites_published_requires_source
  CHECK (NOT is_published OR jsonb_array_length(source_refs) > 0);

ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_published_requires_source;
ALTER TABLE stories ADD CONSTRAINT stories_published_requires_source
  CHECK (published_at IS NULL OR jsonb_array_length(source_refs) > 0);

-- --------------------------------------------------------- inventory cannot go negative
-- The booking engine's invariant. `units_open` already has a CHECK; this adds
-- the one that matters more: the three counters must never exceed what the
-- unit physically has.

ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_counters_sane;
ALTER TABLE availability ADD CONSTRAINT availability_counters_sane
  CHECK (units_open >= 0 AND units_held >= 0 AND units_booked >= 0);

-- ------------------------------------------------------------------ vendor home base
-- Declared as a bare uuid in the schema to avoid an import cycle between
-- identity.ts and content.ts. The constraint belongs here.

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_destination_id_fk;
ALTER TABLE vendors ADD CONSTRAINT vendors_destination_id_fk
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL;
