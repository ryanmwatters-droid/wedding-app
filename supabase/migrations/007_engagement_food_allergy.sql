-- Food-allergy field for the engagement-party RSVP list.
-- NULL = "No" (no allergy); any non-NULL value = "Yes" (the allergy text).
-- The app shows the text in italics under the guest's name only when present.

ALTER TABLE engagement_guests ADD COLUMN IF NOT EXISTS food_allergy TEXT;
