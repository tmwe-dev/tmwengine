-- Tabella per tracking errori generazione miniature
CREATE TABLE IF NOT EXISTS thumbnail_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES design_lab_extracted_components(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  error_stack TEXT,
  attempt_number INTEGER DEFAULT 1,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_thumbnail_logs_component ON thumbnail_generation_logs(component_id);
CREATE INDEX idx_thumbnail_logs_status ON thumbnail_generation_logs(status);
CREATE INDEX idx_thumbnail_logs_created ON thumbnail_generation_logs(created_at DESC);

-- RLS policies
ALTER TABLE thumbnail_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on thumbnail logs"
ON thumbnail_generation_logs
FOR ALL
USING (true)
WITH CHECK (true);