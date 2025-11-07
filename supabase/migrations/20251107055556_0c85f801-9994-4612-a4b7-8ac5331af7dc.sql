-- FASE 2: Knowledge Base Generator (Top 3 Groups Validation)
-- Tabella per storage context AI generati dai gruppi esistenti

CREATE TABLE IF NOT EXISTS public.email_sender_groups_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.email_sender_groups(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Context generato dall'AI
  context_summary TEXT NOT NULL CHECK (length(context_summary) >= 150 AND length(context_summary) <= 300),
  sender_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Quality indicators (simplified: 2 metrics only)
  quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  data_sufficiency NUMERIC(3,2) CHECK (data_sufficiency >= 0 AND data_sufficiency <= 1),
  pattern_clarity NUMERIC(3,2) CHECK (pattern_clarity >= 0 AND pattern_clarity <= 1),
  
  -- Metadata
  sender_count INTEGER NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  
  -- Refresh tracking
  needs_refresh BOOLEAN DEFAULT FALSE,
  refresh_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(group_id, user_email)
);

-- Indici per performance
CREATE INDEX idx_email_sender_groups_context_user_email 
ON public.email_sender_groups_context(user_email);

CREATE INDEX idx_email_sender_groups_context_group_id 
ON public.email_sender_groups_context(group_id);

CREATE INDEX idx_email_sender_groups_context_quality 
ON public.email_sender_groups_context(quality_score) 
WHERE quality_score IS NOT NULL;

CREATE INDEX idx_email_sender_groups_context_needs_refresh 
ON public.email_sender_groups_context(needs_refresh) 
WHERE needs_refresh = TRUE;

-- Trigger per updated_at
CREATE TRIGGER update_email_sender_groups_context_updated_at
BEFORE UPDATE ON public.email_sender_groups_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.email_sender_groups_context ENABLE ROW LEVEL SECURITY;

-- Users can view their own contexts
CREATE POLICY "Users view own group contexts"
ON public.email_sender_groups_context
FOR SELECT
USING (user_email = (auth.jwt() ->> 'email'));

-- Users can insert their own contexts
CREATE POLICY "Users create own group contexts"
ON public.email_sender_groups_context
FOR INSERT
WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- Users can update their own contexts
CREATE POLICY "Users update own group contexts"
ON public.email_sender_groups_context
FOR UPDATE
USING (user_email = (auth.jwt() ->> 'email'));

-- Users can delete their own contexts
CREATE POLICY "Users delete own group contexts"
ON public.email_sender_groups_context
FOR DELETE
USING (user_email = (auth.jwt() ->> 'email'));

-- Log operation
COMMENT ON TABLE public.email_sender_groups_context IS 'AI-generated knowledge base contexts for email sender groups. Used to enhance suggestion accuracy and reduce API costs via caching. Plan 2.1 LEAN - Top 3 validation phase.';