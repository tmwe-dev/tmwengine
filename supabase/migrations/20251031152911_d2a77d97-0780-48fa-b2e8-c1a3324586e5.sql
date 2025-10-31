-- ============================================
-- STEP 1: Tabella AI Prompt Library (Riutilizzabili)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificazione Prompt
  prompt_name TEXT NOT NULL UNIQUE,
  prompt_description TEXT,
  category TEXT DEFAULT 'general', -- 'general', 'linkedin', 'sales', 'support', etc.
  
  -- Contenuto Prompt
  system_prompt TEXT NOT NULL,
  
  -- Azioni Predefinite
  default_actions JSONB DEFAULT '[]'::jsonb, -- Array di azioni base (archive, move, etc.)
  
  -- Context Requirements
  requires_email_templates BOOLEAN DEFAULT false,
  requires_contact_aliases BOOLEAN DEFAULT false,
  requires_company_data BOOLEAN DEFAULT false,
  
  -- AI Config
  ai_config_id UUID REFERENCES public.config_ai(id) ON DELETE SET NULL,
  suggested_temperature NUMERIC(3,2) DEFAULT 0.7,
  suggested_max_tokens INTEGER DEFAULT 1500,
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false, -- Se true, tutti possono usarlo
  tags TEXT[] DEFAULT '{}'::text[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- STEP 2: Modifica email_sender_ai_prompts (Aggiungi reference a Library)
-- ============================================

-- Aggiungi colonna per referenziare prompt library
ALTER TABLE public.email_sender_ai_prompts 
ADD COLUMN IF NOT EXISTS prompt_library_id UUID REFERENCES public.ai_prompt_library(id) ON DELETE SET NULL;

-- Aggiungi colonna per customizzazioni specifiche sender
ALTER TABLE public.email_sender_ai_prompts 
ADD COLUMN IF NOT EXISTS custom_prompt_additions TEXT; -- Prompt custom da aggiungere al base prompt

-- Aggiungi colonna per azioni custom addizionali
ALTER TABLE public.email_sender_ai_prompts
ADD COLUMN IF NOT EXISTS custom_actions JSONB DEFAULT '[]'::jsonb; -- Azioni addizionali oltre a quelle base

-- ============================================
-- STEP 3: Tabella Context Cache (Performance)
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_ai_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sender_email TEXT NOT NULL,
  rubrica_id UUID REFERENCES public.rubrica(id) ON DELETE CASCADE,
  
  -- Context Data (pre-computed)
  contact_aliases JSONB DEFAULT '{}'::jsonb, -- { "nome_completo": "...", "nome_breve": "...", "saluto": "..." }
  company_data JSONB DEFAULT '{}'::jsonb, -- { "ragione_sociale": "...", "alias": "...", "settore": "..." }
  available_templates JSONB DEFAULT '[]'::jsonb, -- Array di template applicabili
  
  -- Cache Metadata
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  
  UNIQUE(sender_email)
);

-- ============================================
-- STEP 4: Indexes per Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_category ON public.ai_prompt_library(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_public ON public.ai_prompt_library(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_email_sender_prompts_library ON public.email_sender_ai_prompts(prompt_library_id);
CREATE INDEX IF NOT EXISTS idx_email_context_cache_sender ON public.email_ai_context_cache(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_context_cache_expires ON public.email_ai_context_cache(expires_at);

-- ============================================
-- STEP 5: RLS Policies
-- ============================================

ALTER TABLE public.ai_prompt_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_ai_context_cache ENABLE ROW LEVEL SECURITY;

-- Prompt Library: tutti possono vedere i prompt pubblici, solo creator può modificare i propri
CREATE POLICY "Users can view public prompts or own prompts"
  ON public.ai_prompt_library FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create own prompts"
  ON public.ai_prompt_library FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update own prompts"
  ON public.ai_prompt_library FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own prompts"
  ON public.ai_prompt_library FOR DELETE
  USING (created_by = auth.uid());

-- Context Cache: tutti gli utenti autenticati possono leggere/scrivere
CREATE POLICY "Authenticated users can manage context cache"
  ON public.email_ai_context_cache FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 6: Trigger per aggiornamento updated_at
-- ============================================

CREATE TRIGGER update_ai_prompt_library_updated_at
  BEFORE UPDATE ON public.ai_prompt_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 7: Function per incrementare usage_count
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_prompt_library_usage(prompt_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ai_prompt_library
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = prompt_id;
END;
$$;

-- ============================================
-- STEP 8: Seed alcuni prompt di esempio
-- ============================================

INSERT INTO public.ai_prompt_library (prompt_name, prompt_description, category, system_prompt, default_actions, requires_contact_aliases, is_public, tags)
VALUES 
(
  'LinkedIn - Archivia e Notifica',
  'Archivia email LinkedIn e invia notifica per offerte lavoro',
  'linkedin',
  'Sei un assistente email specializzato in LinkedIn. Analizza il contenuto della email e:
1. Se contiene offerte di lavoro, inoltra a Gmail personale e marca come urgente
2. Altrimenti archivia semplicemente
3. Usa sempre un tono professionale nelle comunicazioni',
  '[{"type": "archive", "description": "Archivia email LinkedIn"}]'::jsonb,
  true,
  true,
  ARRAY['linkedin', 'job-alerts', 'auto-forward']
),
(
  'Partner - Inoltra Multi-Destinatari',
  'Inoltra preventivi partner a team vendite',
  'sales',
  'Sei un assistente per la gestione preventivi. Quando ricevi email da partner commerciali:
1. Analizza se contiene preventivo o richiesta commerciale
2. Inoltra a info@azienda.com e aggiungi in CC i membri del team vendite
3. Aggiungi nota contestuale nel forward spiegando tipo richiesta
4. Mantieni tono formale e usa dati azienda quando disponibili',
  '[{"type": "forward", "params": {"to": ["info@azienda.com"], "add_context": true}}]'::jsonb,
  true,
  true,
  ARRAY['sales', 'partners', 'multi-forward']
),
(
  'Risposta Automatica Template',
  'Risponde usando template predefiniti basati su contenuto',
  'support',
  'Sei un assistente customer support. Analizza email in arrivo e:
1. Identifica tipo richiesta (info prodotto, supporto tecnico, commerciale)
2. Seleziona template appropriato dal DB
3. Personalizza template usando alias contatto e dati azienda
4. Proponi bozza risposta per conferma prima invio
5. Usa saluto appropriato (formale/informale) basato su storico contatto',
  '[{"type": "reply", "params": {"use_template": true, "require_confirmation": true}}]'::jsonb,
  true,
  true,
  ARRAY['support', 'auto-reply', 'templates']
);

COMMENT ON TABLE public.ai_prompt_library IS 'Libreria di prompt AI riutilizzabili per automazione email';
COMMENT ON TABLE public.email_ai_context_cache IS 'Cache context pre-calcolato per performance AI';
COMMENT ON COLUMN public.email_sender_ai_prompts.prompt_library_id IS 'Reference a prompt riutilizzabile dalla library';
COMMENT ON COLUMN public.email_sender_ai_prompts.custom_prompt_additions IS 'Prompt custom da appendere al prompt base della library';