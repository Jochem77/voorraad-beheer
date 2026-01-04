-- Repairs table voor klant reparaties
-- Voer deze SQL uit in Supabase SQL Editor

CREATE TABLE repairs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL,
  kleur TEXT NOT NULL,
  kleur_hex TEXT,
  serienummer TEXT NOT NULL,
  repair_date TIMESTAMP WITH TIME ZONE,
  repair_price NUMERIC(10,2),
  repair_invoice TEXT,
  customer_name TEXT,
  defect_notes TEXT,
  notes TEXT,
  photo_urls TEXT[],
  date_added TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (pas dit aan voor productie!)
CREATE POLICY "Allow all operations on repairs" ON repairs
  FOR ALL USING (true);

-- Index voor snelle zoekacties
CREATE INDEX idx_repairs_serienummer ON repairs(serienummer);
CREATE INDEX idx_repairs_customer_name ON repairs(customer_name);
CREATE INDEX idx_repairs_date_added ON repairs(date_added DESC);

-- Actions table voor repairs
CREATE TABLE repair_actions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  repair_id BIGINT NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  other_action TEXT,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE repair_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on repair_actions" ON repair_actions
  FOR ALL USING (true);

CREATE INDEX idx_repair_actions_repair_id ON repair_actions(repair_id);
