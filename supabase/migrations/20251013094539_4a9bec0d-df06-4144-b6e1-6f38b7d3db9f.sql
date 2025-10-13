-- Add conversation style, VAD settings, and pause flag to chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations
ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'colleagues'
  CHECK (conversation_style IN ('boss_talk', 'colleagues', 'bar_chat')),
ADD COLUMN IF NOT EXISTS vad_silence_duration INTEGER DEFAULT 3000
  CHECK (vad_silence_duration >= 1000 AND vad_silence_duration <= 10000),
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_conversations_style 
  ON chat_laboratory_conversations(conversation_style);

CREATE INDEX IF NOT EXISTS idx_lab_conversations_paused 
  ON chat_laboratory_conversations(is_paused);

-- Add comments
COMMENT ON COLUMN chat_laboratory_conversations.conversation_style IS 
  'Tipo di conversazione: boss_talk (pragmatico), colleagues (bilanciato), bar_chat (informale)';
COMMENT ON COLUMN chat_laboratory_conversations.vad_silence_duration IS 
  'Durata silenzio VAD in millisecondi (1000-10000ms)';
COMMENT ON COLUMN chat_laboratory_conversations.is_paused IS 
  'Flag di pausa conversazione - blocca orchestrator';