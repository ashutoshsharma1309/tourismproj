-- Phase 4: plans, partner subscriptions and team members.
--
-- Plans are data. The three rows below come from the business analysis
-- (docs/sih-ppt-content.md, "Viability / business model"): Free for a single
-- operator getting online, Growth adding analytics, Pro adding multiple
-- properties and staff. Their monthly prices are the PROPOSED ones there and
-- are not billed — no payment gateway is connected. Limits are this
-- product's reading of that table; change them here, not in code.
-- Idempotent; apply after 0003.

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE partner_member_role AS ENUM ('STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  summary text NOT NULL,
  monthly_price_paise bigint,
  price_status text NOT NULL DEFAULT 'PROPOSED',
  price_source text,
  trial_days integer NOT NULL DEFAULT 0,
  entitlements jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_price_non_negative CHECK (monthly_price_paise IS NULL OR monthly_price_paise >= 0),
  CONSTRAINT plans_trial_range CHECK (trial_days BETWEEN 0 AND 90)
);
-- Exactly one default plan: the one a partner without a subscription is on.
CREATE UNIQUE INDEX IF NOT EXISTS plans_single_default ON plans (is_default) WHERE is_default;

CREATE TABLE IF NOT EXISTS partner_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES partners(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES plans(code),
  status subscription_status NOT NULL,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_subscriptions_trial_has_end CHECK (status <> 'TRIALING' OR trial_ends_at IS NOT NULL),
  CONSTRAINT partner_subscriptions_period_ordered CHECK (current_period_start IS NULL OR current_period_end IS NULL OR current_period_end > current_period_start)
);

CREATE TABLE IF NOT EXISTS partner_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  role partner_member_role NOT NULL DEFAULT 'STAFF',
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_members_email_unique UNIQUE (email),
  CONSTRAINT partner_members_email_lower CHECK (email = lower(email))
);
CREATE INDEX IF NOT EXISTS partner_members_partner_idx ON partner_members (partner_id);

-- An organisation's owner is never also a staff member somewhere.
CREATE OR REPLACE FUNCTION assert_member_is_not_an_owner()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM partners p WHERE lower(p.email) = NEW.email) THEN
    RAISE EXCEPTION 'e-mail % already owns a partner organisation', NEW.email
      USING ERRCODE = 'check_violation', CONSTRAINT = 'partner_members_not_owner';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS partner_members_not_owner ON partner_members;
CREATE TRIGGER partner_members_not_owner
  BEFORE INSERT OR UPDATE OF email ON partner_members
  FOR EACH ROW EXECUTE FUNCTION assert_member_is_not_an_owner();

INSERT INTO plans (code, name, summary, monthly_price_paise, price_status, price_source, trial_days, entitlements, sort_order, is_default)
VALUES
  ('FREE', 'Free', 'One property getting online: a verified listing, its rooms and its calendar.',
   0, 'PROPOSED', 'docs/sih-ppt-content.md — Viability / business model', 0,
   '{"features":["createListing","manageInventory"],"limits":{"listings":1,"roomTypesPerListing":3,"teamMembers":0}}', 1, true),
  ('GROWTH', 'Growth', 'More properties and room types, and analytics on how travellers reach you.',
   99900, 'PROPOSED', 'docs/sih-ppt-content.md — Viability / business model', 14,
   '{"features":["createListing","manageInventory","viewAnalytics"],"limits":{"listings":5,"roomTypesPerListing":20,"teamMembers":0}}', 2, false),
  ('PRO', 'Pro', 'Many properties, staff accounts and exportable reports.',
   249900, 'PROPOSED', 'docs/sih-ppt-content.md — Viability / business model', 14,
   '{"features":["createListing","manageInventory","viewAnalytics","addTeamMembers","advancedReports"],"limits":{"listings":50,"roomTypesPerListing":50,"teamMembers":10}}', 3, false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, summary = EXCLUDED.summary, monthly_price_paise = EXCLUDED.monthly_price_paise,
  price_status = EXCLUDED.price_status, price_source = EXCLUDED.price_source, trial_days = EXCLUDED.trial_days,
  entitlements = EXCLUDED.entitlements, sort_order = EXCLUDED.sort_order, is_default = EXCLUDED.is_default;
