-- Guide phase: places a traveller chose to remember inside their journey.
--
-- A journey was an ordered list of destinations. The TerraStory Guide can now
-- suggest "add Pemayangtse to my journey"; the traveller confirms with a click
-- and the place joins the journey that already exists — no second journey
-- system. Each id names its destination ("sikkim/monastery:pemayangtse") and
-- must belong to one of the journey's destinations (checked in the store).
-- Idempotent; apply after 0005.

ALTER TABLE user_journeys ADD COLUMN IF NOT EXISTS place_ids text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE user_journeys DROP CONSTRAINT IF EXISTS user_journeys_place_ids_bounded;
ALTER TABLE user_journeys ADD CONSTRAINT user_journeys_place_ids_bounded
  CHECK (coalesce(array_length(place_ids, 1), 0) <= 60);
