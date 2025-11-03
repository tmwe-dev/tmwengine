-- ============================================
-- Migration: Smart Inbox Enhancements
-- Data: 2025-11-03
-- Backup: docs/DATABASE_BACKUPS/2025-11-03_pre-migration-smart-inbox-enhancements.md
-- ============================================

-- Estendi tabella email_ai_classifications con campi intelligenti
ALTER TABLE public.email_ai_classifications
ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('critical', 'high', 'normal', 'low')),
ADD COLUMN IF NOT EXISTS action_suggested TEXT,
ADD COLUMN IF NOT EXISTS detected_patterns TEXT[],
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS custom_prompt TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Aggiungi indici per performance
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_urgency 
ON public.email_ai_classifications(urgency) WHERE urgency IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_tags 
ON public.email_ai_classifications USING GIN(tags) WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- Commento sulle colonne
COMMENT ON COLUMN public.email_ai_classifications.urgency IS 'Livello urgenza: critical, high, normal, low';
COMMENT ON COLUMN public.email_ai_classifications.action_suggested IS 'Azione suggerita da AI (es: firma contratto, conferma meeting)';
COMMENT ON COLUMN public.email_ai_classifications.detected_patterns IS 'Pattern rilevati (AWB, tracking, IATA codes)';
COMMENT ON COLUMN public.email_ai_classifications.reasoning IS 'Spiegazione classificazione AI';
COMMENT ON COLUMN public.email_ai_classifications.custom_prompt IS 'Prompt personalizzato utente per questa email';
COMMENT ON COLUMN public.email_ai_classifications.tags IS 'Tag intelligenti (follow-up, urgente, meeting, firma-richiesta)';