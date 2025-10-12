-- ============================================
-- FASE 1: TOKEN TRACKING & MEMORIA AVANZATA
-- ============================================

-- 1.1 Token tracking per chat_conversations
ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS token_count_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_count_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_token_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_compaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 1.2 Token tracking per chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN IF NOT EXISTS token_count_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_count_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_token_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_compaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 1.3 Token tracking per intranet_rooms (già ha membri, non serve user_id)
ALTER TABLE intranet_rooms 
ADD COLUMN IF NOT EXISTS token_count_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_count_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_token_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_compaction_at TIMESTAMP WITH TIME ZONE;

-- 1.4 Controlli memoria avanzati in config_generale
ALTER TABLE config_generale
ADD COLUMN IF NOT EXISTS compaction_trigger_messages INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS compaction_trigger_tokens INTEGER DEFAULT 3000,
ADD COLUMN IF NOT EXISTS token_alert_threshold INTEGER DEFAULT 15000;

-- ============================================
-- FASE 2: RAG - INDICIZZAZIONE DOCUMENTI
-- ============================================

-- 2.1 Abilita estensione pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2.2 Tabella per chunks di documenti con embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  room_id UUID,
  lab_conversation_id UUID,
  
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  
  embedding VECTOR(768),
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Indice HNSW per ricerca vettoriale
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 2.4 Indici per lookup
CREATE INDEX IF NOT EXISTS document_chunks_conversation_idx ON document_chunks(conversation_id);
CREATE INDEX IF NOT EXISTS document_chunks_room_idx ON document_chunks(room_id);
CREATE INDEX IF NOT EXISTS document_chunks_lab_conv_idx ON document_chunks(lab_conversation_id);

-- 2.5 RLS per document_chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation chunks"
ON document_chunks FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations WHERE user_id = auth.uid()
  )
  OR room_id IN (
    SELECT room_id FROM intranet_room_members WHERE user_id = auth.uid()
  )
  OR lab_conversation_id IN (
    SELECT id FROM chat_laboratory_conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage chunks"
ON document_chunks FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- FASE 3: TRACKING COSTI AI
-- ============================================

-- 3.1 Tabella per tracking costi
CREATE TABLE IF NOT EXISTS ai_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  room_id UUID,
  lab_conversation_id UUID,
  
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  
  cost_input_eur NUMERIC(10, 6) DEFAULT 0,
  cost_output_eur NUMERIC(10, 6) DEFAULT 0,
  cost_total_eur NUMERIC(10, 6) GENERATED ALWAYS AS (cost_input_eur + cost_output_eur) STORED,
  
  operation_type TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 Indici per ai_cost_tracking
CREATE INDEX IF NOT EXISTS ai_cost_tracking_conversation_idx ON ai_cost_tracking(conversation_id);
CREATE INDEX IF NOT EXISTS ai_cost_tracking_room_idx ON ai_cost_tracking(room_id);
CREATE INDEX IF NOT EXISTS ai_cost_tracking_lab_conv_idx ON ai_cost_tracking(lab_conversation_id);
CREATE INDEX IF NOT EXISTS ai_cost_tracking_created_idx ON ai_cost_tracking(created_at DESC);

-- 3.3 RLS per ai_cost_tracking
ALTER TABLE ai_cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own costs"
ON ai_cost_tracking FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations WHERE user_id = auth.uid()
  )
  OR room_id IN (
    SELECT room_id FROM intranet_room_members WHERE user_id = auth.uid()
  )
  OR lab_conversation_id IN (
    SELECT id FROM chat_laboratory_conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can track costs"
ON ai_cost_tracking FOR INSERT
WITH CHECK (true);

-- ============================================
-- FASE 4: DATABASE FUNCTIONS
-- ============================================

-- 4.1 Function per incremento atomico token counter
CREATE OR REPLACE FUNCTION increment_token_count(
  p_table TEXT,
  p_id UUID,
  p_tokens_to_add INTEGER
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
  query_text TEXT;
BEGIN
  query_text := format(
    'UPDATE %I SET 
      token_count_current = COALESCE(token_count_current, 0) + $1,
      token_count_total = COALESCE(token_count_total, 0) + $1,
      last_token_update = NOW()
     WHERE id = $2
     RETURNING token_count_current',
    p_table
  );
  
  EXECUTE query_text USING p_tokens_to_add, p_id INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Function per reset token counter
CREATE OR REPLACE FUNCTION reset_token_count(
  p_table TEXT,
  p_id UUID
) RETURNS VOID AS $$
DECLARE
  query_text TEXT;
BEGIN
  query_text := format(
    'UPDATE %I SET 
      token_count_current = 0,
      last_compaction_at = NOW()
     WHERE id = $1',
    p_table
  );
  
  EXECUTE query_text USING p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Function per ricerca semantica documenti
CREATE OR REPLACE FUNCTION search_document_chunks(
  p_query_embedding VECTOR(768),
  p_conversation_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  p_lab_conversation_id UUID DEFAULT NULL,
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  file_name TEXT,
  chunk_text TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.file_name,
    dc.chunk_text,
    1 - (dc.embedding <=> p_query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 
    (p_conversation_id IS NULL OR dc.conversation_id = p_conversation_id)
    AND (p_room_id IS NULL OR dc.room_id = p_room_id)
    AND (p_lab_conversation_id IS NULL OR dc.lab_conversation_id = p_lab_conversation_id)
    AND (1 - (dc.embedding <=> p_query_embedding)) > p_match_threshold
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;