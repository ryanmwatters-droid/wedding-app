-- Three-state food-allergy status for the engagement-party RSVP list.
--   has_allergy: NULL = unverified (not asked yet, the default), TRUE = Yes, FALSE = No
--   food_allergy: the allergy detail text (used only when has_allergy = TRUE)
-- Both are added IF NOT EXISTS, so this is safe whether or not the earlier
-- food_allergy migration was already run.

ALTER TABLE engagement_guests ADD COLUMN IF NOT EXISTS has_allergy BOOLEAN;
ALTER TABLE engagement_guests ADD COLUMN IF NOT EXISTS food_allergy TEXT;
