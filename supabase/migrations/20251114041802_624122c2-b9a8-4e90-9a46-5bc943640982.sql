-- =====================================================
-- FASE 1: AI Communication Hub - Database Migration
-- =====================================================

-- 1. Alter chat_laboratory_composed_prompts per unificare gestione prompt
ALTER TABLE chat_laboratory_composed_prompts
ADD COLUMN IF NOT EXISTS page_route TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'composed';

-- Add check constraint for category
ALTER TABLE chat_laboratory_composed_prompts
ADD CONSTRAINT check_category_valid 
CHECK (category IN ('simple', 'composed'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_composed_prompts_page_route 
ON chat_laboratory_composed_prompts(page_route);

CREATE INDEX IF NOT EXISTS idx_composed_prompts_category 
ON chat_laboratory_composed_prompts(category);

CREATE INDEX IF NOT EXISTS idx_composed_prompts_page_category 
ON chat_laboratory_composed_prompts(page_route, category);

-- 2. Create ai_communication_preferences table
CREATE TABLE IF NOT EXISTS public.ai_communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_route TEXT, -- NULL = global preferences
  
  -- AI Agent preferences
  selected_ai_agent TEXT, -- 'gpt-4', 'claude-3', 'gemini-pro'
  ai_model TEXT,
  
  -- Voice preferences
  voice_agent_id UUID REFERENCES public.elevenlabs_agents(id) ON DELETE SET NULL,
  default_tts_voice_id TEXT,
  
  -- Audio input preferences
  default_mic_recorder TEXT, -- 'bar', 'hybrid', 'interactive'
  audio_quality_settings JSONB DEFAULT '{
    "sample_rate": 48000,
    "noise_suppression": true,
    "echo_cancellation": true,
    "auto_gain_control": true
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint: one preference per user per page
  CONSTRAINT unique_user_page_preference UNIQUE(user_id, page_route)
);

-- Enable RLS
ALTER TABLE public.ai_communication_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_communication_preferences
CREATE POLICY "Users can view own communication preferences"
ON public.ai_communication_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communication preferences"
ON public.ai_communication_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communication preferences"
ON public.ai_communication_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own communication preferences"
ON public.ai_communication_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for ai_communication_preferences
CREATE INDEX IF NOT EXISTS idx_ai_comm_prefs_user_id 
ON public.ai_communication_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_comm_prefs_page_route 
ON public.ai_communication_preferences(page_route);

CREATE INDEX IF NOT EXISTS idx_ai_comm_prefs_user_page 
ON public.ai_communication_preferences(user_id, page_route);

-- Trigger for updated_at on ai_communication_preferences
CREATE TRIGGER update_ai_communication_preferences_updated_at
BEFORE UPDATE ON public.ai_communication_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Log in project_history
INSERT INTO public.project_history (operation, tables_modified, metadata)
VALUES (
  'alter_table', 
  ARRAY['chat_laboratory_composed_prompts', 'ai_communication_preferences'],
  '{
    "phase": "FASE 1 - AI Communication Hub",
    "changes": [
      "Added page_route and category columns to chat_laboratory_composed_prompts",
      "Created ai_communication_preferences table for unified AI/Voice/Audio settings",
      "Added RLS policies for user-specific preferences",
      "Created performance indexes"
    ],
    "backup": "docs/DATABASE_BACKUPS/2025-01-XX_pre-ai-communication-hub.md"
  }'::jsonb
);