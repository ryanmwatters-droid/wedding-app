-- Fold the engagement-party countdown into the countdowns table so it sits
-- alongside the custom countdowns (side-by-side, colorable, draggable) rather
-- than being a separate hardcoded banner. Idempotent: guarded by title, so
-- running it more than once won't create duplicates.

INSERT INTO countdowns (title, target_date, color, sort_order)
SELECT 'Engagement Party', '2026-08-29T18:00:00-05:00'::timestamptz, '#B08585', -1000
WHERE NOT EXISTS (SELECT 1 FROM countdowns WHERE title = 'Engagement Party');
