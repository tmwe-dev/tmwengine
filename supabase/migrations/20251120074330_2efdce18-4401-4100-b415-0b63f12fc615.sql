-- ============================================
-- MIGRATION: Add AI tracking columns to attivita
-- Date: 2025-01-29
-- Purpose: Track AI-generated activities for CRM automation
-- ============================================

-- Add columns for AI-generated activities tracking
ALTER TABLE public.attivita 
ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Add index for querying AI-generated activities
CREATE INDEX IF NOT EXISTS idx_attivita_created_by_ai 
ON public.attivita(created_by_ai) 
WHERE created_by_ai = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.attivita.created_by_ai IS 'Indica se l''attività è stata creata automaticamente dall''AI';
COMMENT ON COLUMN public.attivita.ai_confidence IS 'Livello di confidenza dell''AI (0.00-1.00)';
COMMENT ON COLUMN public.attivita.ai_reasoning IS 'Motivazione dell''AI per la creazione dell''attività';

-- Update email_automation_config to include new CRM actions
ALTER TABLE public.email_automation_config 
ALTER COLUMN allowed_auto_actions TYPE TEXT[] USING allowed_auto_actions::TEXT[];

-- Log in project_history
INSERT INTO public.project_history (operation, tables_modified, metadata)
VALUES (
  'alter_table', 
  ARRAY['attivita', 'email_automation_config'],
  '{"columns_added": ["created_by_ai", "ai_confidence", "ai_reasoning"], "reason": "Enable AI-generated CRM activities tracking"}'::jsonb
);