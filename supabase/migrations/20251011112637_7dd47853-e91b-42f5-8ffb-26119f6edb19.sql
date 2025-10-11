-- PHASE 1: Foundation Tables for Bar Chat System
-- Versione corretta senza riferimenti a colonna 'role' inesistente

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. ElevenLabs Agents Table
CREATE TABLE elevenlabs_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  elevenlabs_agent_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  personality_prompt TEXT NOT NULL,
  response_style TEXT NOT NULL DEFAULT 'bar_chat' CHECK (response_style IN ('bar_chat', 'formal', 'technical')),
  speaking_pace TEXT NOT NULL DEFAULT 'normal' CHECK (speaking_pace IN ('slow', 'normal', 'fast')),
  interruption_style TEXT NOT NULL DEFAULT 'polite' CHECK (interruption_style IN ('polite', 'assertive', 'passive')),
  max_words_per_response INTEGER NOT NULL DEFAULT 50 CHECK (max_words_per_response BETWEEN 20 AND 150),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_elevenlabs_agents_user ON elevenlabs_agents(user_id);
CREATE INDEX idx_elevenlabs_agents_active ON elevenlabs_agents(is_active, order_index);

-- 2. Knowledge Bases Table (Hierarchical)
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  prompt_template TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  icon TEXT,
  color TEXT DEFAULT '#3b82f6',
  transition_triggers TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_parent ON knowledge_bases(parent_id);
CREATE INDEX idx_kb_slug ON knowledge_bases(slug);
CREATE INDEX idx_kb_tags ON knowledge_bases USING GIN(tags);
CREATE INDEX idx_kb_active ON knowledge_bases(is_active);

-- 3. Knowledge Base Documents Table (with embeddings)
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 100000),
  content_hash TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'html')),
  chunk_index INTEGER,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  file_path TEXT,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_docs_kb ON knowledge_base_documents(kb_id);
CREATE INDEX idx_kb_docs_tags ON knowledge_base_documents USING GIN(tags);
CREATE INDEX idx_kb_docs_content_fts ON knowledge_base_documents USING GIN(to_tsvector('english', content));
CREATE INDEX idx_kb_docs_embedding_hnsw ON knowledge_base_documents USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 4. Chat Laboratory Bar Mode Settings
CREATE TABLE chat_laboratory_bar_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_laboratory_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'laboratory' CHECK (mode IN ('laboratory', 'bar_chat')),
  active_kb_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
  kb_navigation_history JSONB DEFAULT '[]'::jsonb,
  active_elevenlabs_agents UUID[] DEFAULT '{}',
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_play_audio BOOLEAN NOT NULL DEFAULT true,
  conversation_pace TEXT NOT NULL DEFAULT 'normal' CHECK (conversation_pace IN ('slow', 'normal', 'fast')),
  enable_interruptions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id)
);

CREATE INDEX idx_bar_mode_conversation ON chat_laboratory_bar_mode(conversation_id);
CREATE INDEX idx_bar_mode_kb ON chat_laboratory_bar_mode(active_kb_id);
CREATE INDEX idx_bar_mode_user ON chat_laboratory_bar_mode(user_id);

-- 5. Audio Responses Cache
CREATE TABLE chat_laboratory_audio_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_laboratory_messages(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES elevenlabs_agents(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds FLOAT,
  text_length INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, agent_id)
);

CREATE INDEX idx_audio_message ON chat_laboratory_audio_responses(message_id);

-- 6. ElevenLabs Usage Tracking (Rate Limiting)
CREATE TABLE elevenlabs_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  characters_used INTEGER NOT NULL DEFAULT 0,
  requests_count INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_usage_user_date ON elevenlabs_usage_tracking(user_id, date);

-- 7. Usage Limits Tiers
CREATE TABLE elevenlabs_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'basic', 'pro')),
  daily_character_limit INTEGER NOT NULL,
  daily_request_limit INTEGER NOT NULL,
  cost_per_1000_chars DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO elevenlabs_usage_limits (tier, daily_character_limit, daily_request_limit, cost_per_1000_chars) VALUES
('free', 2500, 50, 0),
('basic', 30000, 500, 0.30),
('pro', 100000, 2000, 0.22);

-- 8. Materialized View for Hot Documents (Performance)
CREATE MATERIALIZED VIEW kb_hot_documents AS
SELECT * FROM knowledge_base_documents 
WHERE access_count > 10
ORDER BY access_count DESC
LIMIT 1000;

CREATE INDEX idx_kb_hot_docs_embedding ON kb_hot_documents USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Triggers for updated_at
CREATE TRIGGER elevenlabs_agents_updated_at 
  BEFORE UPDATE ON elevenlabs_agents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER knowledge_bases_updated_at 
  BEFORE UPDATE ON knowledge_bases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER kb_documents_updated_at 
  BEFORE UPDATE ON knowledge_base_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bar_mode_updated_at 
  BEFORE UPDATE ON chat_laboratory_bar_mode 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER usage_tracking_updated_at 
  BEFORE UPDATE ON elevenlabs_usage_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sanitization function for KB content
CREATE OR REPLACE FUNCTION sanitize_kb_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove dangerous HTML tags
  NEW.content := regexp_replace(NEW.content, '<script[^>]*>.*?</script>', '', 'gi');
  NEW.content := regexp_replace(NEW.content, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  
  -- Limit length (already checked by constraint, but enforce)
  IF length(NEW.content) > 100000 THEN
    NEW.content := substring(NEW.content, 1, 100000);
  END IF;
  
  -- Generate hash for deduplication
  NEW.content_hash := md5(NEW.content);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sanitize_kb_content_trigger
BEFORE INSERT OR UPDATE ON knowledge_base_documents
FOR EACH ROW EXECUTE FUNCTION sanitize_kb_content();

-- RLS Policies

ALTER TABLE elevenlabs_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_laboratory_bar_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_laboratory_audio_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevenlabs_usage_tracking ENABLE ROW LEVEL SECURITY;

-- ElevenLabs Agents: Users can only manage their own
CREATE POLICY "Users can view their own agents"
  ON elevenlabs_agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents"
  ON elevenlabs_agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON elevenlabs_agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON elevenlabs_agents FOR DELETE
  USING (auth.uid() = user_id);

-- Knowledge Bases: Public read (for all authenticated users)
CREATE POLICY "Authenticated users can view active knowledge bases"
  ON knowledge_bases FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- KB Documents: Public read (for all authenticated users)
CREATE POLICY "Authenticated users can view kb documents"
  ON knowledge_base_documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- Bar Mode: Users can only access their own conversation settings
CREATE POLICY "Users can view their own bar mode settings"
  ON chat_laboratory_bar_mode FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bar mode settings"
  ON chat_laboratory_bar_mode FOR ALL
  USING (auth.uid() = user_id);

-- Audio Responses: Access through conversations
CREATE POLICY "Users can view audio responses for their conversations"
  ON chat_laboratory_audio_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_laboratory_messages m
    JOIN chat_laboratory_bar_mode bm ON m.conversation_id = bm.conversation_id
    WHERE m.id = message_id AND bm.user_id = auth.uid()
  ));

CREATE POLICY "System can insert audio responses"
  ON chat_laboratory_audio_responses FOR INSERT
  WITH CHECK (true);

-- Usage Tracking: Users can only view their own
CREATE POLICY "Users can view their own usage"
  ON elevenlabs_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage tracking"
  ON elevenlabs_usage_tracking FOR ALL
  USING (true);

-- Helper Functions for Rate Limiting

CREATE OR REPLACE FUNCTION check_elevenlabs_quota(
  p_user_id UUID,
  p_characters INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_limit RECORD;
  v_user_tier TEXT;
  v_result JSONB;
BEGIN
  -- Default to free tier
  v_user_tier := 'free';
  
  -- Get tier limits
  SELECT * INTO v_limit
  FROM elevenlabs_usage_limits
  WHERE tier = v_user_tier;
  
  -- Get today's usage
  SELECT * INTO v_usage
  FROM elevenlabs_usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  IF v_usage IS NULL THEN
    v_usage.characters_used := 0;
    v_usage.requests_count := 0;
  END IF;
  
  -- Check limits
  IF (v_usage.characters_used + p_characters) > v_limit.daily_character_limit THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'daily_character_limit_exceeded',
      'current_usage', v_usage.characters_used,
      'limit', v_limit.daily_character_limit,
      'tier', v_user_tier
    );
  ELSIF (v_usage.requests_count + 1) > v_limit.daily_request_limit THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'daily_request_limit_exceeded',
      'current_requests', v_usage.requests_count,
      'limit', v_limit.daily_request_limit,
      'tier', v_user_tier
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'remaining_characters', v_limit.daily_character_limit - v_usage.characters_used,
      'remaining_requests', v_limit.daily_request_limit - v_usage.requests_count,
      'tier', v_user_tier
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_elevenlabs_usage(
  p_user_id UUID,
  p_characters INTEGER,
  p_cost DECIMAL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO elevenlabs_usage_tracking (user_id, date, characters_used, requests_count, cost_usd)
  VALUES (p_user_id, CURRENT_DATE, p_characters, 1, p_cost)
  ON CONFLICT (user_id, date) DO UPDATE SET
    characters_used = elevenlabs_usage_tracking.characters_used + p_characters,
    requests_count = elevenlabs_usage_tracking.requests_count + 1,
    cost_usd = elevenlabs_usage_tracking.cost_usd + p_cost,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RAG Search Functions

CREATE OR REPLACE FUNCTION search_kb_documents(
  p_kb_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT,
  p_match_count INT
)
RETURNS TABLE (
  id UUID,
  kb_id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.kb_id,
    d.title,
    d.content,
    1 - (d.embedding <=> p_query_embedding) AS similarity
  FROM knowledge_base_documents d
  WHERE 
    d.kb_id = p_kb_id
    AND 1 - (d.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY similarity DESC
  LIMIT p_match_count;
  
  -- Increment access count
  UPDATE knowledge_base_documents
  SET access_count = access_count + 1
  WHERE id IN (SELECT id FROM knowledge_base_documents WHERE kb_id = p_kb_id LIMIT p_match_count);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_hot_documents(
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT,
  p_match_count INT
)
RETURNS TABLE (
  id UUID,
  kb_id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.kb_id,
    d.title,
    d.content,
    1 - (d.embedding <=> p_query_embedding) AS similarity
  FROM kb_hot_documents d
  WHERE 1 - (d.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;