-- Add columns to chat_laboratory_conversations for memory and system prompts
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN IF NOT EXISTS memoria_completa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS riassunto_contesto TEXT,
ADD COLUMN IF NOT EXISTS system_prompt_id UUID REFERENCES chat_laboratory_system_prompts(id);

-- Create chat_laboratory_usage_stats table
CREATE TABLE IF NOT EXISTS chat_laboratory_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_laboratory_conversations(id) ON DELETE CASCADE NOT NULL,
  data_utilizzo DATE NOT NULL DEFAULT CURRENT_DATE,
  token_totali_input INTEGER NOT NULL DEFAULT 0,
  token_totali_output INTEGER NOT NULL DEFAULT 0,
  numero_messaggi INTEGER NOT NULL DEFAULT 0,
  tempo_totale_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on chat_laboratory_usage_stats
ALTER TABLE chat_laboratory_usage_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for chat_laboratory_usage_stats
CREATE POLICY "Allow all operations on chat_laboratory_usage_stats" 
ON chat_laboratory_usage_stats 
FOR ALL 
USING (true);