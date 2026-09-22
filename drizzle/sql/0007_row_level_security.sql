-- Row-level security on every table in the public schema.
--
-- WHY
-- Supabase exposes the public schema over its REST API to the `anon` and
-- `authenticated` roles, and both held table grants. With RLS off, anyone
-- holding the project's publishable (anon) key — which is public by design
-- and ships to browsers — could read and write users, partners, bookings and
-- payments directly.
--
-- The application never reads tables through that API: every query goes
-- through Drizzle over DATABASE_URL as `postgres`, which owns these tables
-- and has BYPASSRLS. So enabling RLS with no policies denies the REST roles
-- everything and changes nothing for the app. A table added later must be
-- enabled too; qa:accounts fails while any public table is left without it.
--
-- Only tables this role owns (an extension's table would abort the block).
-- Idempotent.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
