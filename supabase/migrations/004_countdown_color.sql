-- Per-countdown widget color (chosen in-app from a preset palette).
-- Safe to run whether or not you already ran 003: if the column already
-- exists this is a no-op. Default matches the original dusty-blue look.

ALTER TABLE countdowns ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#7B8AA8';
