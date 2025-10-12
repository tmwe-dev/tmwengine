-- Tabella per salvare versioni edge functions
CREATE TABLE IF NOT EXISTS edge_function_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT false,
  UNIQUE(function_name, version_number)
);

-- Indice per ricerche veloci
CREATE INDEX idx_edge_function_versions_name ON edge_function_versions(function_name);
CREATE INDEX idx_edge_function_versions_active ON edge_function_versions(function_name, is_active);

-- RLS policies
ALTER TABLE edge_function_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage edge function versions"
  ON edge_function_versions
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view edge function versions"
  ON edge_function_versions
  FOR SELECT
  USING (true);

-- Aggiungere colonna audio_url a chat_laboratory_messages
ALTER TABLE chat_laboratory_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Indice per audio_url
CREATE INDEX IF NOT EXISTS idx_chat_lab_messages_audio_url 
ON chat_laboratory_messages(audio_url) 
WHERE audio_url IS NOT NULL;

COMMENT ON COLUMN chat_laboratory_messages.audio_url IS 'URL audio generato da ElevenLabs TTS per Bar Chat mode';
COMMENT ON TABLE edge_function_versions IS 'Storico versioni delle Edge Functions con backup automatico';