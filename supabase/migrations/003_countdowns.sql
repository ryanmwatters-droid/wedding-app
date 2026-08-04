-- Custom countdowns, editable from within the app (Home page).
-- The engagement-party countdown stays hardcoded; these render beneath it.

CREATE TABLE countdowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  target_date TIMESTAMPTZ NOT NULL,
  color TEXT NOT NULL DEFAULT '#7B8AA8',
  sort_order INT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read and write countdowns"
  ON countdowns FOR ALL USING (auth.role() = 'authenticated');

-- Enable cross-device realtime sync. If your publication is already
-- FOR ALL TABLES, this line will error harmlessly — just ignore it.
ALTER PUBLICATION supabase_realtime ADD TABLE countdowns;
