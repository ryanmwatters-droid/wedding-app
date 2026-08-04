-- Manual ordering for custom countdowns (drag-to-rearrange on the Home page).
-- Lower sort_order sorts higher on the page. New countdowns default to the top;
-- rows left NULL fall back to newest-created-first in the app.
-- Safe to run whether or not you already ran 003.

ALTER TABLE countdowns ADD COLUMN IF NOT EXISTS sort_order INT;
