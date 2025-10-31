-- Migration: Create email_sender_ai_prompts table
CREATE TABLE IF NOT EXISTS public.email_sender_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificazione mittente
  sender_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Nome e descrizione prompt
  prompt_name TEXT,
  prompt_description TEXT,
  
  -- Prompt AI personalizzato
  ai_prompt TEXT NOT NULL,
  
  -- AI Provider Configuration
  ai_config_id UUID REFERENCES config_ai(id) ON DELETE SET NULL,
  
  -- Azione base (eseguita prima di AI analysis)
  base_action TEXT CHECK (base_action IN ('archive', 'move_to_folder', 'delete', 'none')),
  base_action_params JSONB DEFAULT '{}'::jsonb,
  
  -- Configurazione comportamento
  requires_confirmation BOOLEAN DEFAULT true NOT NULL,
  use_email_templates BOOLEAN DEFAULT true,
  use_contact_aliases BOOLEAN DEFAULT true,
  use_company_data BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  -- Metadata e statistiche
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  UNIQUE(sender_email, user_id, prompt_name)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_sender_ai_prompts_sender ON public.email_sender_ai_prompts(sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_ai_prompts_user ON public.email_sender_ai_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_ai_prompts_active ON public.email_sender_ai_prompts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sender_ai_prompts_config ON public.email_sender_ai_prompts(ai_config_id);

-- RLS Policies
ALTER TABLE public.email_sender_ai_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own AI prompts" ON public.email_sender_ai_prompts;
CREATE POLICY "Users can manage their own AI prompts"
ON public.email_sender_ai_prompts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_sender_ai_prompts_updated_at ON public.email_sender_ai_prompts;
CREATE TRIGGER update_email_sender_ai_prompts_updated_at
BEFORE UPDATE ON public.email_sender_ai_prompts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabella log esecuzioni AI
CREATE TABLE IF NOT EXISTS public.email_ai_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  prompt_id UUID REFERENCES email_sender_ai_prompts(id) ON DELETE CASCADE,
  email_uid TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input
  email_subject TEXT,
  email_body_preview TEXT,
  prompt_used TEXT NOT NULL,
  context_injected JSONB,
  ai_config_used JSONB,
  
  -- Output AI
  ai_response TEXT,
  ai_reasoning TEXT,
  proposed_actions JSONB,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Execution status
  status TEXT CHECK (status IN ('pending', 'confirmed', 'executed', 'rejected', 'failed')) DEFAULT 'pending',
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_ai_log_prompt ON public.email_ai_execution_log(prompt_id);
CREATE INDEX IF NOT EXISTS idx_email_ai_log_user ON public.email_ai_execution_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_ai_log_status ON public.email_ai_execution_log(status);
CREATE INDEX IF NOT EXISTS idx_email_ai_log_sender ON public.email_ai_execution_log(sender_email);

ALTER TABLE public.email_ai_execution_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI execution logs" ON public.email_ai_execution_log;
CREATE POLICY "Users can view their own AI execution logs"
ON public.email_ai_execution_log
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI execution logs" ON public.email_ai_execution_log;
CREATE POLICY "Users can insert their own AI execution logs"
ON public.email_ai_execution_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI execution logs" ON public.email_ai_execution_log;
CREATE POLICY "Users can update their own AI execution logs"
ON public.email_ai_execution_log
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.email_sender_ai_prompts IS 'Prompt AI personalizzati per automazione email basata su mittente';
COMMENT ON TABLE public.email_ai_execution_log IS 'Log delle esecuzioni AI automation con conferme e risultati';