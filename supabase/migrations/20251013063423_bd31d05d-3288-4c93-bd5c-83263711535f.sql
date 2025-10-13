-- Fase 2: Schema deliverable strutturati
CREATE TABLE IF NOT EXISTS chat_laboratory_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_laboratory_messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('report', 'canvas', 'table', 'diagram')),
  format TEXT NOT NULL CHECK (format IN ('md', 'pdf', 'csv', 'json', 'mermaid', 'excalidraw')),
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  parent_deliverable_id UUID REFERENCES chat_laboratory_deliverables(id),
  generation_status TEXT DEFAULT 'completed' CHECK (generation_status IN ('pending', 'generating_content', 'rendering_file', 'uploading', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index per performance
CREATE INDEX IF NOT EXISTS idx_deliverables_message_id ON chat_laboratory_deliverables(message_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON chat_laboratory_deliverables(generation_status);
CREATE INDEX IF NOT EXISTS idx_deliverables_type ON chat_laboratory_deliverables(type);

-- RLS Policies
ALTER TABLE chat_laboratory_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliverables"
  ON chat_laboratory_deliverables FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM chat_laboratory_messages m
      JOIN chat_laboratory_conversations c ON m.conversation_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage deliverables"
  ON chat_laboratory_deliverables FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deliverables_timestamp
  BEFORE UPDATE ON chat_laboratory_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverables_updated_at();

-- Storage bucket per deliverables
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-deliverables', 'chat-deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view own deliverable files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-deliverables' AND
    (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM chat_laboratory_conversations c WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage deliverable files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'chat-deliverables')
  WITH CHECK (bucket_id = 'chat-deliverables');

COMMENT ON TABLE chat_laboratory_deliverables IS 'Structured deliverables (reports, diagrams, tables) generated from chat messages';
COMMENT ON COLUMN chat_laboratory_deliverables.type IS 'Type of deliverable: report, canvas, table, diagram';
COMMENT ON COLUMN chat_laboratory_deliverables.format IS 'File format: md, pdf, csv, json, mermaid, excalidraw';
COMMENT ON COLUMN chat_laboratory_deliverables.generation_status IS 'Status of deliverable generation pipeline';
COMMENT ON COLUMN chat_laboratory_deliverables.parent_deliverable_id IS 'Reference to parent deliverable for versioning/iterations';
