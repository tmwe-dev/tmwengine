-- ============================================
-- AI SENDER CATEGORIZATION - COST TRACKING
-- TMWENGINE: No rate limits, only cost transparency
-- ============================================

-- 1. Estendi ai_cost_tracking per batch operations
ALTER TABLE ai_cost_tracking 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS batch_id TEXT,
ADD COLUMN IF NOT EXISTS operation_type TEXT,
ADD COLUMN IF NOT EXISTS operation_metadata JSONB;

CREATE INDEX IF NOT EXISTS ai_cost_tracking_user_id_idx ON ai_cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS ai_cost_tracking_batch_id_idx ON ai_cost_tracking(batch_id);
CREATE INDEX IF NOT EXISTS ai_cost_tracking_operation_idx ON ai_cost_tracking(operation_type);

-- 2. Tabella suggestions per log suggerimenti AI
CREATE TABLE IF NOT EXISTS ai_categorization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  batch_id TEXT NOT NULL,
  
  sender_email TEXT NOT NULL,
  suggested_group_id UUID REFERENCES email_sender_groups(id),
  suggested_group_name TEXT NOT NULL,
  suggested_group_type TEXT NOT NULL,
  suggested_group_color TEXT,
  suggested_group_icon TEXT,
  is_new_group BOOLEAN DEFAULT false,
  
  confidence NUMERIC(3, 2),
  reasoning TEXT,
  
  status TEXT DEFAULT 'pending',
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  
  model_used TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_eur NUMERIC(10, 6) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ai_categorization_suggestions_user_id_idx ON ai_categorization_suggestions(user_id);
CREATE INDEX ai_categorization_suggestions_batch_id_idx ON ai_categorization_suggestions(batch_id);
CREATE INDEX ai_categorization_suggestions_status_idx ON ai_categorization_suggestions(status);
CREATE INDEX ai_categorization_suggestions_sender_idx ON ai_categorization_suggestions(sender_email);

-- RLS Policies
ALTER TABLE ai_categorization_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own suggestions" 
ON ai_categorization_suggestions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users manage suggestions" 
ON ai_categorization_suggestions FOR ALL 
USING (user_id = auth.uid());