-- Phase 5: the government console — authorities, their people, and advisories.
--
-- An authority is scoped to the destinations it governs; every console query
-- intersects the request with that scope, resolved from the session. Nothing
-- here touches traveller data: there is no path from these tables to
-- bookings, history or interests.
--
-- `advisories` already existed and was never written to. It is reused rather
-- than replaced: its destination column moves from the Sikkim-district uuid
-- table to the registry ids travellers and partners use (as in 0002), and it
-- gains an issuing organisation, a kind and a publication state.
-- Idempotent; apply after 0004.

DO $$ BEGIN CREATE TYPE gov_scope_kind AS ENUM ('NATIONAL', 'DESTINATIONS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gov_role AS ENUM ('REVIEWER', 'MANAGER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE advisory_kind AS ENUM ('PERMIT', 'WEATHER', 'CLOSURE', 'RESTRICTION', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE advisory_status AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS gov_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  authority text NOT NULL,
  scope_kind gov_scope_kind NOT NULL DEFAULT 'DESTINATIONS',
  destination_ids text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- coalesce: array_length of an empty array is NULL, and a NULL check passes.
  CONSTRAINT gov_organisations_scope_has_destinations
    CHECK (scope_kind <> 'DESTINATIONS' OR coalesce(array_length(destination_ids, 1), 0) >= 1)
);

CREATE TABLE IF NOT EXISTS gov_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES gov_organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role gov_role NOT NULL DEFAULT 'REVIEWER',
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gov_members_email_unique UNIQUE (email),
  CONSTRAINT gov_members_email_lower CHECK (email = lower(email))
);
CREATE INDEX IF NOT EXISTS gov_members_org_idx ON gov_members (org_id);

-- Re-assert on an existing table (the first version let an empty array pass).
ALTER TABLE gov_organisations DROP CONSTRAINT IF EXISTS gov_organisations_scope_has_destinations;
ALTER TABLE gov_organisations ADD CONSTRAINT gov_organisations_scope_has_destinations
  CHECK (scope_kind <> 'DESTINATIONS' OR coalesce(array_length(destination_ids, 1), 0) >= 1);

-- One person, one seat: a government officer is never also a partner.
CREATE OR REPLACE FUNCTION assert_gov_member_is_not_a_partner()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM partners p WHERE lower(p.email) = NEW.email)
     OR EXISTS (SELECT 1 FROM partner_members m WHERE m.email = NEW.email) THEN
    RAISE EXCEPTION 'e-mail % already belongs to a partner organisation', NEW.email
      USING ERRCODE = 'check_violation', CONSTRAINT = 'gov_members_not_partner';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS gov_members_not_partner ON gov_members;
CREATE TRIGGER gov_members_not_partner
  BEFORE INSERT OR UPDATE OF email ON gov_members
  FOR EACH ROW EXECUTE FUNCTION assert_gov_member_is_not_a_partner();

-- ...and the reverse, so a partner cannot be added to a government team's e-mail.
CREATE OR REPLACE FUNCTION assert_partner_member_is_not_gov()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM gov_members g WHERE g.email = NEW.email) THEN
    RAISE EXCEPTION 'e-mail % belongs to a government organisation', NEW.email
      USING ERRCODE = 'check_violation', CONSTRAINT = 'partner_members_not_gov';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS partner_members_not_gov ON partner_members;
CREATE TRIGGER partner_members_not_gov
  BEFORE INSERT OR UPDATE OF email ON partner_members
  FOR EACH ROW EXECUTE FUNCTION assert_partner_member_is_not_gov();

-- ------------------------------------------------------------- advisories
ALTER TABLE advisories DROP CONSTRAINT IF EXISTS advisories_destination_id_destinations_id_fk;
DO $$ BEGIN
  ALTER TABLE advisories ALTER COLUMN destination_id TYPE text USING destination_id::text;
EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS kind advisory_kind NOT NULL DEFAULT 'OTHER';
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS status advisory_status NOT NULL DEFAULT 'DRAFT';
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE advisories DROP CONSTRAINT IF EXISTS advisories_org_id_gov_organisations_id_fk;
ALTER TABLE advisories ADD CONSTRAINT advisories_org_id_gov_organisations_id_fk
  FOREIGN KEY (org_id) REFERENCES gov_organisations(id) ON DELETE SET NULL;
ALTER TABLE advisories DROP CONSTRAINT IF EXISTS advisories_created_by_users_id_fk;
ALTER TABLE advisories ADD CONSTRAINT advisories_created_by_users_id_fk
  FOREIGN KEY (created_by) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS advisories_destination_status_idx ON advisories (destination_id, status);
-- A published advisory names its authority and the window it applies to.
ALTER TABLE advisories DROP CONSTRAINT IF EXISTS advisories_published_is_attributed;
ALTER TABLE advisories ADD CONSTRAINT advisories_published_is_attributed
  CHECK (status <> 'PUBLISHED' OR (org_id IS NOT NULL AND published_at IS NOT NULL));
ALTER TABLE advisories DROP CONSTRAINT IF EXISTS advisories_window_ordered;
ALTER TABLE advisories ADD CONSTRAINT advisories_window_ordered
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);

-- A verification decision by a government reviewer is recorded on the row it
-- decided, like a platform reviewer's: this column says when clarification
-- was last asked for, which is a fact about the record, not a new lifecycle
-- state (the state machine in lib/partners/lifecycle.ts is unchanged).
ALTER TABLE partner_properties ADD COLUMN IF NOT EXISTS clarification_requested_at timestamptz;
