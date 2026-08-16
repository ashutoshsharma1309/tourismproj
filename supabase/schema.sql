-- =========================================================================
-- Ney Heritage — schema
-- Run once in the Supabase SQL editor (or psql) before seed.sql.
--
-- Public, read-only reference data. RLS is enabled on every table in the
-- exposed schema and the only policy grants SELECT; writes happen through the
-- service role from trusted tooling.
--
-- Deliberately absent: bookings, tsd_transactions and tourism_stats. Those
-- tables existed to hold synthetic bookings, an invented remittance ledger and
-- an unsourced arrivals figure. Verified statistics now live in
-- src/lib/stats.ts with their sources attached.
-- =========================================================================

create table if not exists public.monasteries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  district text not null check (
    district in ('Gangtok', 'Mangan', 'Namchi', 'Gyalshing', 'Pakyong', 'Soreng')
  ),
  tradition text not null check (
    tradition in ('Nyingma', 'Kagyu', 'Karma Kagyu', 'Zurmang Kagyu')
  ),
  established_year integer not null,
  description text not null,
  -- Nullable: a site without an authoritative coordinate is not plotted.
  lat double precision,
  lng double precision,
  image text not null,
  -- Provenance (§15) travels with the row.
  source_id text not null,
  source_url text,
  verified_at date not null,
  confidence text not null check (confidence in ('high', 'medium', 'unverified')),
  created_at timestamptz not null default now()
);

-- Stay directory: name and district only. No tariff, rating or review column
-- exists, because no licensed feed supplies them.
create table if not exists public.stays (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  district text not null check (
    district in ('Gangtok', 'Mangan', 'Namchi', 'Gyalshing', 'Pakyong', 'Soreng')
  ),
  tier text not null check (tier in ('budget', '3-star', '4-star', '5-star')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------
-- Row Level Security: public read, no anonymous writes.
-- ------------------------------------------------------------------------

alter table public.monasteries enable row level security;
alter table public.stays enable row level security;

drop policy if exists "Public read access" on public.monasteries;
create policy "Public read access" on public.monasteries
  for select to anon, authenticated using (true);

drop policy if exists "Public read access" on public.stays;
create policy "Public read access" on public.stays
  for select to anon, authenticated using (true);

-- Depending on the project's Data API settings, tables created via SQL may
-- need explicit grants before anon/authenticated can reach them at all.
grant select on public.monasteries to anon, authenticated;
grant select on public.stays to anon, authenticated;
